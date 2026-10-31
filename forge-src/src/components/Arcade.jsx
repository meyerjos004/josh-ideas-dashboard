import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'

// Colors come from the app's own palette, so the games match light/dark mode.
function palette() {
  const cs = getComputedStyle(document.documentElement)
  const v = (n) => cs.getPropertyValue(n).trim()
  return { bg: v('--color-sunk'), line: v('--color-line'), ink: v('--color-ink'), faint: v('--color-faint'), p1: v('--color-josh'), p2: v('--color-jake'), card: v('--color-card') }
}

const prefersReduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// ---------------- Pong ----------------
const PW = 640, PH = 400, PAD_H = 64, PAD_W = 8, BALL = 8, WIN = 7

function newPong() {
  return { l: PH / 2, r: PH / 2, bx: PW / 2, by: PH / 2, vx: 0, vy: 0, ls: 0, rs: 0, state: 'ready', winner: null }
}
function serve(g, dir = Math.random() < 0.5 ? -1 : 1) {
  g.bx = PW / 2; g.by = PH / 2
  const a = (Math.random() * 0.6 - 0.3)
  g.vx = dir * 320 * Math.cos(a); g.vy = 320 * Math.sin(a)
}
function stepPong(g, dt, keys, cpuLeft, cpuRight) {
  const sp = 380 * dt
  const cpu = (y) => { const target = g.vx !== 0 ? g.by : PH / 2; const d = target - y; return y + Math.max(-sp * 0.82, Math.min(sp * 0.82, d * 0.12 + Math.sign(d) * 1)) }
  if (cpuLeft) g.l = cpu(g.l); else g.l += (keys.s ? sp : 0) - (keys.w ? sp : 0)
  if (cpuRight) g.r = cpu(g.r); else g.r += (keys.down ? sp : 0) - (keys.up ? sp : 0)
  g.l = Math.max(PAD_H / 2, Math.min(PH - PAD_H / 2, g.l)); g.r = Math.max(PAD_H / 2, Math.min(PH - PAD_H / 2, g.r))
  if (g.state !== 'play') return
  g.bx += g.vx * dt; g.by += g.vy * dt
  if (g.by < BALL / 2) { g.by = BALL / 2; g.vy = Math.abs(g.vy) }
  if (g.by > PH - BALL / 2) { g.by = PH - BALL / 2; g.vy = -Math.abs(g.vy) }
  const hit = (py) => { const off = (g.by - py) / (PAD_H / 2); const speed = Math.min(Math.hypot(g.vx, g.vy) * 1.05, 760); const ang = off * 0.95; return { sp: speed, ang } }
  if (g.vx < 0 && g.bx < 24 + PAD_W && g.bx > 16 && Math.abs(g.by - g.l) < PAD_H / 2 + BALL / 2) { const h = hit(g.l); g.vx = h.sp * Math.cos(h.ang); g.vy = h.sp * Math.sin(h.ang) }
  if (g.vx > 0 && g.bx > PW - 24 - PAD_W && g.bx < PW - 16 && Math.abs(g.by - g.r) < PAD_H / 2 + BALL / 2) { const h = hit(g.r); g.vx = -h.sp * Math.cos(h.ang); g.vy = h.sp * Math.sin(h.ang) }
  if (g.bx < -20) { g.rs++; g.winner = g.rs >= WIN ? 'right' : null; g.state = g.winner ? 'over' : 'play'; if (!g.winner) serve(g, 1) }
  if (g.bx > PW + 20) { g.ls++; g.winner = g.ls >= WIN ? 'left' : null; g.state = g.winner ? 'over' : 'play'; if (!g.winner) serve(g, -1) }
}
function drawPong(ctx, g, c, mini) {
  ctx.fillStyle = c.bg; ctx.fillRect(0, 0, PW, PH)
  ctx.strokeStyle = c.line; ctx.lineWidth = 2; ctx.setLineDash([8, 10]); ctx.beginPath(); ctx.moveTo(PW / 2, 0); ctx.lineTo(PW / 2, PH); ctx.stroke(); ctx.setLineDash([])
  if (!mini) {
    ctx.fillStyle = c.faint; ctx.font = '600 56px "Bricolage Grotesque", sans-serif'; ctx.textAlign = 'center'
    ctx.fillText(g.ls, PW / 2 - 70, 72); ctx.fillText(g.rs, PW / 2 + 70, 72)
  }
  const pad = (x, y, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(x, y - PAD_H / 2, PAD_W, PAD_H, 4); ctx.fill() }
  pad(16, g.l, c.p1); pad(PW - 16 - PAD_W, g.r, c.p2)
  ctx.fillStyle = c.ink; ctx.beginPath(); ctx.arc(g.bx, g.by, BALL / 2 + 1, 0, Math.PI * 2); ctx.fill()
}

// ---------------- Tron ----------------
const TC = 64, TR = 40, CELL = 10
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }
const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' }

function newTron() {
  const grid = new Uint8Array(TC * TR)
  const a = { x: 12, y: TR / 2, d: 'right', next: 'right', alive: true }
  const b = { x: TC - 13, y: TR / 2, d: 'left', next: 'left', alive: true }
  grid[a.y * TC + a.x] = 1; grid[b.y * TC + b.x] = 2
  return { grid, a, b, state: 'ready', winner: null, acc: 0, score: [0, 0] }
}
const free = (g, x, y) => x >= 0 && y >= 0 && x < TC && y < TR && !g.grid[y * TC + x]
function cpuTurn(g, me) {
  // Look ahead: prefer the direction with the most open run, small randomness so it isn't perfect
  const opts = Object.keys(DIRS).filter((d) => d !== OPP[me.d])
  let best = me.d, bestScore = -1
  for (const d of opts) {
    let n = 0, x = me.x, y = me.y
    while (n < 20) { x += DIRS[d][0]; y += DIRS[d][1]; if (!free(g, x, y)) break; n++ }
    const s = n + (d === me.d ? 1.5 : 0) + Math.random() * 1.2
    if (s > bestScore) { bestScore = s; best = d }
  }
  me.next = best
}
function stepTron(g, dt, cpuA, cpuB) {
  if (g.state !== 'play') return
  g.acc += dt
  const tick = 1 / 14
  while (g.acc >= tick) {
    g.acc -= tick
    if (cpuA) cpuTurn(g, g.a)
    if (cpuB) cpuTurn(g, g.b)
    for (const p of [g.a, g.b]) { if (p.next !== OPP[p.d]) p.d = p.next }
    const na = [g.a.x + DIRS[g.a.d][0], g.a.y + DIRS[g.a.d][1]]
    const nb = [g.b.x + DIRS[g.b.d][0], g.b.y + DIRS[g.b.d][1]]
    const head = na[0] === nb[0] && na[1] === nb[1]
    g.a.alive = free(g, na[0], na[1]) && !head
    g.b.alive = free(g, nb[0], nb[1]) && !head
    if (!g.a.alive || !g.b.alive) {
      g.state = 'over'
      g.winner = g.a.alive ? 'a' : g.b.alive ? 'b' : 'tie'
      if (g.winner === 'a') g.score[0]++
      if (g.winner === 'b') g.score[1]++
      return
    }
    g.a.x = na[0]; g.a.y = na[1]; g.b.x = nb[0]; g.b.y = nb[1]
    g.grid[g.a.y * TC + g.a.x] = 1; g.grid[g.b.y * TC + g.b.x] = 2
  }
}
function drawTron(ctx, g, c) {
  ctx.fillStyle = c.bg; ctx.fillRect(0, 0, TC * CELL, TR * CELL)
  ctx.strokeStyle = c.line; ctx.globalAlpha = 0.5; ctx.lineWidth = 1
  for (let x = 0; x <= TC; x += 4) { ctx.beginPath(); ctx.moveTo(x * CELL + 0.5, 0); ctx.lineTo(x * CELL + 0.5, TR * CELL); ctx.stroke() }
  for (let y = 0; y <= TR; y += 4) { ctx.beginPath(); ctx.moveTo(0, y * CELL + 0.5); ctx.lineTo(TC * CELL, y * CELL + 0.5); ctx.stroke() }
  ctx.globalAlpha = 1
  for (let i = 0; i < g.grid.length; i++) {
    const v = g.grid[i]; if (!v) continue
    ctx.fillStyle = v === 1 ? c.p1 : c.p2
    ctx.fillRect((i % TC) * CELL + 1, Math.floor(i / TC) * CELL + 1, CELL - 2, CELL - 2)
  }
  for (const [p, col] of [[g.a, c.p1], [g.b, c.p2]]) {
    ctx.fillStyle = c.card; ctx.fillRect(p.x * CELL + 2, p.y * CELL + 2, CELL - 4, CELL - 4)
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.strokeRect(p.x * CELL + 1, p.y * CELL + 1, CELL - 2, CELL - 2)
  }
}

// ---------------- shared runner ----------------
function useLoop(cb, on = true) {
  const ref = useRef(cb); ref.current = cb
  useEffect(() => {
    if (!on) return
    let raf, last = performance.now()
    const f = (t) => { const dt = Math.min(0.05, (t - last) / 1000); last = t; ref.current(dt); raf = requestAnimationFrame(f) }
    raf = requestAnimationFrame(f)
    return () => cancelAnimationFrame(raf)
  }, [on])
}

function Pong({ twoPlayer }) {
  const cv = useRef(), game = useRef(newPong()), keys = useRef({}), touch = useRef(null)
  const [, force] = useState(0)
  useEffect(() => { game.current = newPong(); force((n) => n + 1) }, [twoPlayer])
  useEffect(() => {
    const map = { w: 'w', W: 'w', s: 's', S: 's', ArrowUp: 'up', ArrowDown: 'down' }
    const dn = (e) => {
      if (map[e.key]) { keys.current[map[e.key]] = true; e.preventDefault() }
      if (e.key === ' ') {
        e.preventDefault()
        const g = game.current
        if (g.state === 'ready') { g.state = 'play'; serve(g) }
        else if (g.state === 'over') { game.current = newPong(); game.current.state = 'play'; serve(game.current) }
        else g.state = g.state === 'paused' ? 'play' : 'paused'
        force((n) => n + 1)
      }
    }
    const up = (e) => { if (map[e.key]) keys.current[map[e.key]] = false }
    window.addEventListener('keydown', dn); window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up) }
  }, [])
  const prev = useRef('')
  useLoop((dt) => {
    const g = game.current
    if (touch.current != null) { g.l += (touch.current - g.l) * 0.35 }
    const k = keys.current
    stepPong(g, dt, twoPlayer ? k : { w: k.w || k.up, s: k.s || k.down }, false, !twoPlayer)
    const c = cv.current; if (!c) return
    drawPong(c.getContext('2d'), g, palette(), false)
    const sig = g.state + g.ls + g.rs
    if (sig !== prev.current) { prev.current = sig; force((n) => n + 1) }
  })
  const g = game.current
  const onTouch = (e) => {
    const r = cv.current.getBoundingClientRect(); const t = e.touches[0]
    touch.current = ((t.clientY - r.top) / r.height) * PH
    if (g.state === 'ready') { g.state = 'play'; serve(g) }
  }
  return (
    <div className="relative">
      <canvas ref={cv} width={PW} height={PH} className="block w-full rounded-xl" style={{ aspectRatio: `${PW}/${PH}`, touchAction: 'none' }}
        onTouchStart={onTouch} onTouchMove={onTouch} onTouchEnd={() => { touch.current = null }} aria-label="Pong game" role="img" />
      {g.state !== 'play' && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="rounded-xl bg-card/90 px-5 py-3 text-center shadow">
            <div className="display text-xl font-bold">{g.state === 'over' ? `${g.winner === 'left' ? 'Left' : 'Right'} side wins ${g.ls}–${g.rs}` : g.state === 'paused' ? 'Paused' : 'Pong'}</div>
            <div className="text-sm text-muted">Press Space to {g.state === 'paused' ? 'resume' : 'start'} · first to {WIN}</div>
          </div>
        </div>
      )}
    </div>
  )
}

function Tron({ twoPlayer }) {
  const cv = useRef(), game = useRef(newTron()), swipe = useRef(null)
  const [, force] = useState(0)
  useEffect(() => { game.current = newTron(); force((n) => n + 1) }, [twoPlayer])
  const restart = () => { const s = game.current.score; game.current = newTron(); game.current.score = s; game.current.state = 'play' }
  useEffect(() => {
    const a = { w: 'up', W: 'up', s: 'down', S: 'down', a: 'left', A: 'left', d: 'right', D: 'right' }
    const b = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }
    const dn = (e) => {
      const g = game.current
      if (a[e.key]) { g.a.next = a[e.key]; e.preventDefault() }
      if (b[e.key]) { if (twoPlayer) g.b.next = b[e.key]; else g.a.next = b[e.key]; e.preventDefault() }
      if (e.key === ' ') {
        e.preventDefault()
        if (g.state === 'ready') g.state = 'play'
        else if (g.state === 'over') restart()
        else g.state = g.state === 'paused' ? 'play' : 'paused'
        force((n) => n + 1)
      }
    }
    window.addEventListener('keydown', dn)
    return () => window.removeEventListener('keydown', dn)
  }, [twoPlayer])
  const prev = useRef('')
  useLoop((dt) => {
    const g = game.current
    stepTron(g, dt, false, !twoPlayer)
    const c = cv.current; if (!c) return
    drawTron(c.getContext('2d'), g, palette())
    const sig = g.state + g.score.join()
    if (sig !== prev.current) { prev.current = sig; force((n) => n + 1) }
  })
  const g = game.current
  const W = TC * CELL, H = TR * CELL
  const onStart = (e) => { const t = e.touches[0]; swipe.current = [t.clientX, t.clientY]; if (g.state !== 'play') { g.state === 'over' ? restart() : (g.state = 'play'); force((n) => n + 1) } }
  const onMove = (e) => {
    if (!swipe.current) return
    const t = e.touches[0], dx = t.clientX - swipe.current[0], dy = t.clientY - swipe.current[1]
    if (Math.hypot(dx, dy) < 24) return
    game.current.a.next = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up')
    swipe.current = [t.clientX, t.clientY]
  }
  return (
    <div className="relative">
      <canvas ref={cv} width={W} height={H} className="block w-full rounded-xl" style={{ aspectRatio: `${W}/${H}`, touchAction: 'none' }}
        onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={() => { swipe.current = null }} aria-label="Tron light cycles game" role="img" />
      <div className="pointer-events-none absolute left-3 top-2 text-sm font-semibold tabular-nums" style={{ color: 'var(--color-josh)' }}>{g.score[0]}</div>
      <div className="pointer-events-none absolute right-3 top-2 text-sm font-semibold tabular-nums" style={{ color: 'var(--color-jake)' }}>{g.score[1]}</div>
      {g.state !== 'play' && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="rounded-xl bg-card/90 px-5 py-3 text-center shadow">
            <div className="display text-xl font-bold">{g.state === 'over' ? (g.winner === 'tie' ? 'Head-on crash, tie' : `${g.winner === 'a' ? 'Left' : 'Right'} rider wins`) : g.state === 'paused' ? 'Paused' : 'Light cycles'}</div>
            <div className="text-sm text-muted">Press Space to {g.state === 'over' ? 'race again' : g.state === 'paused' ? 'resume' : 'start'} · don't hit a wall or a trail</div>
          </div>
        </div>
      )}
    </div>
  )
}

// The small tile: a quiet, self-playing rally. Click to open the arcade.
export function ArcadeTile({ onOpen, className = '' }) {
  const cv = useRef(), game = useRef(null)
  const still = prefersReduced()
  useEffect(() => { const g = newPong(); g.state = 'play'; serve(g); game.current = g }, [])
  useLoop((dt) => {
    const g = game.current, c = cv.current; if (!g || !c) return
    stepPong(g, dt * 0.7, {}, true, true)
    if (g.state === 'over' || Math.abs(g.vx) < 1) { g.ls = g.rs = 0; g.state = 'play'; serve(g) }
    drawPong(c.getContext('2d'), g, palette(), true)
  }, !still)
  useEffect(() => { if (still && cv.current) { const g = newPong(); drawPong(cv.current.getContext('2d'), g, palette(), true) } }, [still])
  return (
    <button onClick={onOpen} aria-label="Open the arcade: Pong and light cycles" title="Take a break: Pong and Tron"
      className={`group relative block overflow-hidden rounded-xl border border-line transition-transform hover:-translate-y-0.5 ${className}`}>
      <canvas ref={cv} width={PW} height={PH} className="block w-full opacity-80 transition-opacity group-hover:opacity-100" style={{ aspectRatio: `${PW}/${PH}` }} aria-hidden="true" />
      <span className="absolute bottom-1 right-1.5 rounded bg-card/85 px-1.5 text-[10px] font-semibold text-muted">Arcade</span>
    </button>
  )
}

export function ArcadeWindow({ open, onClose }) {
  const [game, setGame] = useState('pong')
  const [two, setTwo] = useState(false)
  useEffect(() => {
    if (!open) return
    const k = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center bg-ink/30 p-4 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.div role="dialog" aria-label="Arcade" onMouseDown={(e) => e.stopPropagation()}
            className="w-full max-w-3xl rounded-3xl border border-line bg-card p-4 shadow-2xl sm:p-5"
            initial={{ scale: 0.92, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 30 }}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="flex gap-1 rounded-full bg-sunk p-1" role="tablist">
                {[['pong', 'Pong'], ['tron', 'Light cycles']].map(([id, name]) => (
                  <button key={id} role="tab" aria-selected={game === id} onClick={() => setGame(id)}
                    className={`rounded-full px-3.5 py-1 text-sm ${game === id ? 'bg-card font-semibold shadow-sm' : 'text-muted'}`}>{name}</button>
                ))}
              </div>
              <div className="flex gap-1 rounded-full bg-sunk p-1">
                {[[false, 'vs computer'], [true, '2 players']].map(([v, name]) => (
                  <button key={name} aria-pressed={two === v} onClick={() => setTwo(v)}
                    className={`rounded-full px-3 py-1 text-xs ${two === v ? 'bg-card font-semibold shadow-sm' : 'text-muted'}`}>{name}</button>
                ))}
              </div>
              <button onClick={onClose} aria-label="Close arcade" className="ml-auto grid size-9 place-items-center rounded-full text-muted hover:bg-sunk hover:text-ink"><X size={18} /></button>
            </div>
            {game === 'pong' ? <Pong twoPlayer={two} /> : <Tron twoPlayer={two} />}
            <p className="mt-3 text-center text-xs text-muted">
              {game === 'pong'
                ? (two ? 'Left: W / S · Right: ↑ / ↓' : 'Move with W / S or ↑ / ↓, or drag on a phone')
                : (two ? 'Left: W A S D · Right: arrow keys' : 'Steer with W A S D or arrows, or swipe on a phone')}
              {' · '}Space to start or pause · Esc to close
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
