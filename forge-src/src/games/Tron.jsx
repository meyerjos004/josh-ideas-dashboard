import { useEffect, useRef, useState } from 'react'
import { Card, DIRS, OPP, Stage, palette, useKeys, useLoop, useSwipe } from './common'

const C = 80, R = 50, S = 9 // cells and pixels per cell
const W = C * S, H = R * S
const LEVELS = { easy: { look: 6, noise: 2.5, area: false }, medium: { look: 14, noise: 1, area: false }, hard: { look: 24, noise: 0.3, area: true } }

function rider(x, y, d) { return { x, y, px: x, py: y, d, next: d, trail: [[x, y]], alive: true, boost: 1, boosting: false } }
function newRound() {
  return { grid: new Uint8Array(C * R), a: rider(14, R / 2, 'right'), b: rider(C - 15, R / 2, 'left'), acc: 0, speed: 11, t: 0, count: 3, state: 'count' }
}
const free = (g, x, y) => x >= 0 && y >= 0 && x < C && y < R && !g.grid[y * C + x]

function reach(g, x, y, cap = 400) {
  // how much open space is reachable from (x,y): the hard AI uses this to avoid boxing itself in
  if (!free(g, x, y)) return 0
  const seen = new Set([y * C + x]), q = [[x, y]]
  while (q.length && seen.size < cap) {
    const [cx, cy] = q.shift()
    for (const [dx, dy] of Object.values(DIRS)) {
      const nx = cx + dx, ny = cy + dy, k = ny * C + nx
      if (free(g, nx, ny) && !seen.has(k)) { seen.add(k); q.push([nx, ny]) }
    }
  }
  return seen.size
}
function think(g, me, foe, lvl) {
  const L = LEVELS[lvl]
  let best = me.d, score = -1e9
  for (const d of Object.keys(DIRS)) {
    if (d === OPP[me.d]) continue
    let n = 0, x = me.x, y = me.y
    while (n < L.look) { x += DIRS[d][0]; y += DIRS[d][1]; if (!free(g, x, y)) break; n++ }
    if (n === 0) { if (score < -1e8) { best = d; score = -1e8 } continue }
    let s = n + (d === me.d ? 1 : 0) + Math.random() * L.noise
    if (L.area) {
      s += reach(g, me.x + DIRS[d][0], me.y + DIRS[d][1]) * 0.08
      const dist = Math.abs(foe.x - (me.x + DIRS[d][0])) + Math.abs(foe.y - (me.y + DIRS[d][1]))
      s += Math.max(0, 12 - dist) * 0.15 // lean in to cut the other rider off
    }
    if (s > score) { score = s; best = d }
  }
  me.next = best
  me.boosting = lvl === 'hard' && me.boost > 0.6 && score > 20 && Math.random() < 0.02
}

export default function Tron({ twoPlayer }) {
  const cv = useRef(), game = useRef(newRound())
  const [score, setScore] = useState([0, 0])
  const [level, setLevel] = useState('medium')
  const [match, setMatch] = useState('ready') // ready | playing | over
  const [banner, setBanner] = useState(null)
  const scoreRef = useRef(score); scoreRef.current = score
  const keys = useRef({})

  const startMatch = () => { setScore([0, 0]); game.current = newRound(); setMatch('playing'); setBanner(null) }
  useEffect(() => { setMatch('ready'); setScore([0, 0]); game.current = newRound() }, [twoPlayer])

  useKeys((e, down) => {
    const g = game.current
    keys.current[e.key] = down
    if (!down) { if (e.key === 'Shift' || e.key === 'q' || e.key === 'Q') g.a.boosting = false; if (e.key === '/' || e.key === 'Enter') g.b.boosting = false; return }
    if (e.key === ' ') { if (match !== 'playing') startMatch(); else g.state = g.state === 'paused' ? 'play' : g.state === 'play' ? 'paused' : g.state; return }
    const a = { w: 'up', W: 'up', s: 'down', S: 'down', a: 'left', A: 'left', d: 'right', D: 'right' }
    const b = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }
    if (a[e.key]) g.a.next = a[e.key]
    if (b[e.key]) { if (twoPlayer) g.b.next = b[e.key]; else g.a.next = b[e.key] }
    if (e.key === 'Shift' || e.key === 'q' || e.key === 'Q') g.a.boosting = true
    if (twoPlayer && (e.key === '/' || e.key === 'Enter')) g.b.boosting = true
  }, [twoPlayer, match])
  useSwipe(cv, (d) => { game.current.a.next = d; if (match !== 'playing') startMatch() })

  useLoop((dt) => {
    const g = game.current
    if (match === 'playing') {
      if (g.state === 'count') { g.count -= dt; if (g.count <= 0) g.state = 'play' }
      else if (g.state === 'play') {
        g.t += dt
        g.speed = Math.min(20, 11 + g.t * 0.25) // slowly speeds up
        if (!twoPlayer) think(g, g.b, g.a, level)
        for (const r of [g.a, g.b]) {
          r.boost = r.boosting ? Math.max(0, r.boost - dt * 0.9) : Math.min(1, r.boost + dt * 0.18)
          if (r.boost <= 0) r.boosting = false
        }
        g.acc += dt * g.speed
        while (g.acc >= 1 && g.state === 'play') {
          g.acc -= 1
          for (const r of [g.a, g.b]) { if (r.next !== OPP[r.d]) r.d = r.next }
          // boosting riders move two cells this tick
          const steps = [g.a.boosting ? 2 : 1, g.b.boosting ? 2 : 1]
          for (let k = 0; k < 2; k++) {
            const movers = [[g.a, steps[0] > k], [g.b, steps[1] > k]].filter(([, m]) => m).map(([r]) => r)
            const nexts = movers.map((r) => [r.x + DIRS[r.d][0], r.y + DIRS[r.d][1]])
            movers.forEach((r, i) => {
              const [nx, ny] = nexts[i]
              const other = movers[1 - i] ? nexts[1 - i] : null
              r.alive = r.alive && free(g, nx, ny) && !(other && other[0] === nx && other[1] === ny)
            })
            if (!g.a.alive || !g.b.alive) break
            movers.forEach((r, i) => { r.px = r.x; r.py = r.y; r.x = nexts[i][0]; r.y = nexts[i][1]; g.grid[r.y * C + r.x] = r === g.a ? 1 : 2; r.trail.push([r.x, r.y]) })
          }
          if (!g.a.alive || !g.b.alive) {
            g.state = 'between'
            const win = g.a.alive ? 0 : g.b.alive ? 1 : -1
            const sc = [...scoreRef.current]; if (win >= 0) sc[win]++
            setScore(sc)
            const done = sc[0] >= 3 || sc[1] >= 3
            setBanner(win < 0 ? 'Head-on. No point.' : `${win === 0 ? (twoPlayer ? 'Left rider' : 'You') : (twoPlayer ? 'Right rider' : 'Computer')} ${done ? 'wins the match' : 'takes the round'}`)
            setTimeout(() => { if (done) setMatch('over'); else { game.current = newRound(); setBanner(null) } }, 1300)
          }
        }
      }
    }
    draw(g)
  })

  function draw(g) {
    const c = cv.current; if (!c) return
    const ctx = c.getContext('2d'), p = palette()
    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, W, H)
    ctx.strokeStyle = p.line; ctx.globalAlpha = 0.45; ctx.lineWidth = 1
    for (let x = 0; x <= C; x += 5) { ctx.beginPath(); ctx.moveTo(x * S + 0.5, 0); ctx.lineTo(x * S + 0.5, H); ctx.stroke() }
    for (let y = 0; y <= R; y += 5) { ctx.beginPath(); ctx.moveTo(0, y * S + 0.5); ctx.lineTo(W, y * S + 0.5); ctx.stroke() }
    ctx.globalAlpha = 1
    const frac = g.state === 'play' ? Math.min(1, g.acc) : 1
    for (const [r, col] of [[g.a, p.p1], [g.b, p.p2]]) {
      const pts = r.trail
      const hx = (r.px + (r.x - r.px) * frac) * S + S / 2, hy = (r.py + (r.y - r.py) * frac) * S + S / 2
      ctx.lineJoin = 'round'; ctx.lineCap = 'round'
      // soft under-glow, then the crisp trail
      ctx.strokeStyle = col; ctx.globalAlpha = 0.18; ctx.lineWidth = S * 1.25
      ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * S + S / 2, y * S + S / 2) : ctx.moveTo(x * S + S / 2, y * S + S / 2))); ctx.lineTo(hx, hy); ctx.stroke()
      ctx.globalAlpha = 1; ctx.lineWidth = S * 0.45
      ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * S + S / 2, y * S + S / 2) : ctx.moveTo(x * S + S / 2, y * S + S / 2))); ctx.lineTo(hx, hy); ctx.stroke()
      // bike
      ctx.fillStyle = r.alive ? p.card : p.faint; ctx.strokeStyle = col; ctx.lineWidth = 2.5
      ctx.beginPath(); ctx.arc(hx, hy, S * 0.55, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      if (r.boosting) { ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.arc(hx, hy, S * 1.2, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1 }
    }
    // boost meters
    for (const [r, col, x] of [[g.a, p.p1, 12], [g.b, p.p2, W - 72]]) {
      ctx.fillStyle = p.line; ctx.fillRect(x, H - 14, 60, 4)
      ctx.fillStyle = col; ctx.fillRect(x, H - 14, 60 * r.boost, 4)
    }
  }

  const g = game.current
  const countNum = g.state === 'count' && match === 'playing' ? Math.ceil(g.count) : null
  return (
    <div>
      <Stage canvasRef={cv} w={W} h={H} label="Light cycles" touch>
        <div className="pointer-events-none absolute left-4 top-3 display text-2xl font-bold tabular-nums" style={{ color: 'var(--color-josh)' }}>{score[0]}</div>
        <div className="pointer-events-none absolute right-4 top-3 display text-2xl font-bold tabular-nums" style={{ color: 'var(--color-jake)' }}>{score[1]}</div>
        {countNum && <div className="pointer-events-none absolute inset-0 grid place-items-center display text-7xl font-extrabold text-ink/70">{countNum}</div>}
        <Card show={!!banner} title={banner} />
        <Card show={match === 'ready'} title="Light cycles" lines={['First to 3 rounds wins', 'Press Space to start']} />
        <Card show={match === 'over'} title={score[0] > score[1] ? (twoPlayer ? 'Left rider wins' : 'You win the match') : (twoPlayer ? 'Right rider wins' : 'Computer wins the match')} lines={[`${score[0]} – ${score[1]}`, 'Press Space for a rematch']} />
        <Card show={g.state === 'paused'} title="Paused" lines={['Press Space to resume']} />
      </Stage>
      {!twoPlayer && (
        <div className="mt-3 flex items-center justify-center gap-1" role="radiogroup" aria-label="Difficulty">
          {Object.keys(LEVELS).map((l) => (
            <button key={l} role="radio" aria-checked={level === l} onClick={() => setLevel(l)}
              className={`rounded-full px-3 py-1 text-xs capitalize ${level === l ? 'bg-ink text-card' : 'bg-sunk text-muted'}`}>{l}</button>
          ))}
        </div>
      )}
    </div>
  )
}

export const tronHelp = (two) => (two ? 'Left: W A S D, boost Q · Right: arrows, boost /' : 'Steer: W A S D or arrows · Boost: Shift · Swipe on a phone')
