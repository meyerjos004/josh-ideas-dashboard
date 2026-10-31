import { useRef, useState } from 'react'
import { Card, DIRS, KEYDIR, OPP, Stage, palette, useBest, useKeys, useLoop, useSwipe } from './common'

const C = 32, R = 20, S = 22, W = C * S, H = R * S
const fresh = () => ({ body: [[8, 10], [7, 10], [6, 10]], d: 'right', q: [], food: [20, 10], acc: 0, score: 0, state: 'ready', eat: 0 })

export default function Snake() {
  const cv = useRef(), g = useRef(fresh())
  const [best, submit] = useBest('snake')
  const [, force] = useState(0)
  const turn = (d) => {
    const s = g.current
    const last = s.q[s.q.length - 1] ?? s.d
    if (d !== last && d !== OPP[last] && s.q.length < 3) s.q.push(d)
    if (s.state === 'ready') { s.state = 'play'; force((n) => n + 1) }
  }
  useKeys((e, down) => {
    if (!down) return
    const s = g.current
    if (KEYDIR[e.key]) turn(KEYDIR[e.key])
    if (e.key === ' ') { if (s.state === 'over') g.current = { ...fresh(), state: 'play' }; else if (s.state === 'ready') s.state = 'play'; else s.state = s.state === 'play' ? 'paused' : 'play'; force((n) => n + 1) }
  })
  useSwipe(cv, turn)
  const place = (s) => { let f; do f = [Math.floor(Math.random() * C), Math.floor(Math.random() * R)]; while (s.body.some(([x, y]) => x === f[0] && y === f[1])); s.food = f }

  useLoop((dt, t) => {
    const s = g.current
    if (s.state === 'play') {
      s.acc += dt * Math.min(16, 8 + s.score * 0.25)
      while (s.acc >= 1) {
        s.acc -= 1
        if (s.q.length) s.d = s.q.shift()
        const [hx, hy] = s.body[0], nx = hx + DIRS[s.d][0], ny = hy + DIRS[s.d][1]
        if (nx < 0 || ny < 0 || nx >= C || ny >= R || s.body.some(([x, y], i) => i < s.body.length - 1 && x === nx && y === ny)) { s.state = 'over'; submit(s.score); force((n) => n + 1); break }
        s.body.unshift([nx, ny])
        if (nx === s.food[0] && ny === s.food[1]) { s.score++; s.eat = 1; place(s) } else s.body.pop()
      }
    }
    s.eat = Math.max(0, s.eat - dt * 3)
    draw(s, t)
  })

  function draw(s, t) {
    const c = cv.current; if (!c) return
    const ctx = c.getContext('2d'), p = palette()
    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = p.line; ctx.globalAlpha = 0.5
    for (let x = 0; x < C; x++) for (let y = 0; y < R; y++) if ((x + y) % 2) ctx.fillRect(x * S, y * S, S, S)
    ctx.globalAlpha = 1
    // food: a little pulsing seed
    const pulse = 1 + Math.sin(t * 5) * 0.12
    ctx.fillStyle = p.wine; ctx.beginPath(); ctx.arc(s.food[0] * S + S / 2, s.food[1] * S + S / 2, S * 0.3 * pulse, 0, Math.PI * 2); ctx.fill()
    // body: a smooth rounded line that tapers toward the tail
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    for (let i = s.body.length - 1; i > 0; i--) {
      const [x1, y1] = s.body[i], [x2, y2] = s.body[i - 1]
      ctx.strokeStyle = p.forest; ctx.globalAlpha = 0.55 + 0.45 * (1 - i / s.body.length)
      ctx.lineWidth = S * (0.55 + 0.25 * (1 - i / s.body.length)) + s.eat * 3
      ctx.beginPath(); ctx.moveTo(x1 * S + S / 2, y1 * S + S / 2); ctx.lineTo(x2 * S + S / 2, y2 * S + S / 2); ctx.stroke()
    }
    ctx.globalAlpha = 1
    const [hx, hy] = s.body[0]
    ctx.fillStyle = p.forest; ctx.beginPath(); ctx.arc(hx * S + S / 2, hy * S + S / 2, S * 0.45, 0, Math.PI * 2); ctx.fill()
    const [dx, dy] = DIRS[s.d]
    ctx.fillStyle = p.card
    for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.arc(hx * S + S / 2 + dx * 4 - dy * 5 * sgn, hy * S + S / 2 + dy * 4 + dx * 5 * sgn, 2.6, 0, Math.PI * 2); ctx.fill() }
    ctx.fillStyle = p.muted; ctx.font = '600 13px Inter, sans-serif'; ctx.textAlign = 'right'; ctx.fillText(`${s.score}   Best ${Math.max(best, s.score)}`, W - 12, 20)
  }

  const s = g.current
  return (
    <Stage canvasRef={cv} w={W} h={H} label="Snake" touch>
      <Card show={s.state === 'ready'} title="Snake" lines={['Arrows or W A S D, or swipe', 'Press any direction to start']} />
      <Card show={s.state === 'paused'} title="Paused" lines={['Press Space to resume']} />
      <Card show={s.state === 'over'} title={`Score ${s.score}`} lines={[`Best ${best}`, 'Press Space to play again']} />
    </Stage>
  )
}
export const snakeHelp = () => 'Steer: arrows or W A S D · Swipe on a phone · Pause: Space'
