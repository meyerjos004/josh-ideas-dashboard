import { useRef, useState } from 'react'
import { Card, Stage, palette, useBest, useKeys, useLoop } from './common'

const W = 800, H = 460, TAU = Math.PI * 2
const rock = (x, y, size) => {
  const n = 9 + Math.floor(Math.random() * 4)
  return { x, y, vx: (Math.random() - 0.5) * (130 / size), vy: (Math.random() - 0.5) * (130 / size), r: size * 15, size, a: 0, va: (Math.random() - 0.5) * 1.2, shape: Array.from({ length: n }, () => 0.75 + Math.random() * 0.35) }
}
const wave = (n) => Array.from({ length: n }, () => { let x, y; do { x = Math.random() * W; y = Math.random() * H } while (Math.hypot(x - W / 2, y - H / 2) < 140); return rock(x, y, 3) })
const fresh = () => ({ ship: { x: W / 2, y: H / 2, vx: 0, vy: 0, a: -Math.PI / 2, safe: 2 }, shots: [], rocks: wave(4), bits: [], score: 0, lives: 3, level: 1, state: 'ready', cool: 0 })
const wrap = (o) => { o.x = (o.x + W) % W; o.y = (o.y + H) % H }

export default function Asteroids() {
  const cv = useRef(), g = useRef(fresh()), keys = useRef({})
  const [best, submit] = useBest('asteroids')
  const [, force] = useState(0)
  useKeys((e, down) => {
    keys.current[e.key] = down
    if (!down || e.key !== ' ') return
    const s = g.current
    if (s.state === 'ready') s.state = 'play'
    else if (s.state === 'over') { g.current = fresh(); g.current.state = 'play' }
    force((n) => n + 1)
  })

  useLoop((dt, t) => {
    const s = g.current, k = keys.current, sh = s.ship
    if (s.state === 'play') {
      if (k.ArrowLeft || k.a || k.A) sh.a -= 4.2 * dt
      if (k.ArrowRight || k.d || k.D) sh.a += 4.2 * dt
      sh.thrust = !!(k.ArrowUp || k.w || k.W)
      if (sh.thrust) { sh.vx += Math.cos(sh.a) * 260 * dt; sh.vy += Math.sin(sh.a) * 260 * dt }
      sh.vx *= 0.992; sh.vy *= 0.992
      sh.x += sh.vx * dt; sh.y += sh.vy * dt; wrap(sh)
      sh.safe = Math.max(0, sh.safe - dt)
      s.cool -= dt
      if (k[' '] && s.cool <= 0 && s.shots.length < 6) { s.shots.push({ x: sh.x + Math.cos(sh.a) * 12, y: sh.y + Math.sin(sh.a) * 12, vx: Math.cos(sh.a) * 520 + sh.vx, vy: Math.sin(sh.a) * 520 + sh.vy, t: 0 }); s.cool = 0.18 }
      for (const b of s.shots) { b.x += b.vx * dt; b.y += b.vy * dt; b.t += dt; wrap(b) }
      s.shots = s.shots.filter((b) => b.t < 0.9)
      for (const r of s.rocks) { r.x += r.vx * dt; r.y += r.vy * dt; r.a += r.va * dt; wrap(r) }
      const born = []
      for (const r of s.rocks) {
        for (const b of s.shots) {
          if (!b.dead && Math.hypot(b.x - r.x, b.y - r.y) < r.r) {
            b.dead = r.dead = true; s.score += [0, 100, 50, 20][r.size]
            if (r.size > 1) born.push(rock(r.x, r.y, r.size - 1), rock(r.x, r.y, r.size - 1))
            for (let i = 0; i < 10; i++) s.bits.push({ x: r.x, y: r.y, vx: (Math.random() - 0.5) * 220, vy: (Math.random() - 0.5) * 220, t: 0 })
            break
          }
        }
        if (!r.dead && sh.safe <= 0 && Math.hypot(sh.x - r.x, sh.y - r.y) < r.r + 8) {
          s.lives--; for (let i = 0; i < 18; i++) s.bits.push({ x: sh.x, y: sh.y, vx: (Math.random() - 0.5) * 260, vy: (Math.random() - 0.5) * 260, t: 0 })
          Object.assign(sh, { x: W / 2, y: H / 2, vx: 0, vy: 0, safe: 2.5 })
          if (s.lives <= 0) { s.state = 'over'; submit(s.score); force((n) => n + 1) }
        }
      }
      s.shots = s.shots.filter((b) => !b.dead)
      s.rocks = s.rocks.filter((r) => !r.dead).concat(born)
      if (!s.rocks.length) { s.level++; s.rocks = wave(3 + s.level); sh.safe = 2 }
    }
    for (const b of s.bits) { b.t += dt; b.x += b.vx * dt; b.y += b.vy * dt }
    s.bits = s.bits.filter((b) => b.t < 0.7)
    draw(s, t)
  })

  function draw(s, t) {
    const c = cv.current; if (!c) return
    const ctx = c.getContext('2d'), p = palette()
    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, W, H)
    ctx.lineJoin = 'round'
    for (const r of s.rocks) {
      ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.a)
      ctx.fillStyle = p.card; ctx.strokeStyle = p.muted; ctx.lineWidth = 1.6
      ctx.beginPath(); r.shape.forEach((m, i) => { const a = (i / r.shape.length) * TAU; const px = Math.cos(a) * r.r * m, py = Math.sin(a) * r.r * m; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py) }); ctx.closePath(); ctx.fill(); ctx.stroke()
      ctx.restore()
    }
    ctx.fillStyle = p.wine
    for (const b of s.shots) { ctx.beginPath(); ctx.arc(b.x, b.y, 2.4, 0, TAU); ctx.fill() }
    ctx.fillStyle = p.faint
    for (const b of s.bits) { ctx.globalAlpha = 1 - b.t / 0.7; ctx.fillRect(b.x, b.y, 2, 2) }
    ctx.globalAlpha = 1
    const sh = s.ship
    if (s.state !== 'over' && !(sh.safe > 0 && Math.floor(t * 8) % 2)) {
      ctx.save(); ctx.translate(sh.x, sh.y); ctx.rotate(sh.a)
      if (sh.thrust) { ctx.fillStyle = p.olive; ctx.beginPath(); ctx.moveTo(-8, -4); ctx.lineTo(-14 - Math.random() * 6, 0); ctx.lineTo(-8, 4); ctx.fill() }
      ctx.fillStyle = p.p2; ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(-9, -8); ctx.lineTo(-5, 0); ctx.lineTo(-9, 8); ctx.closePath(); ctx.fill()
      ctx.restore()
    }
    ctx.fillStyle = p.muted; ctx.font = '600 13px Inter, sans-serif'
    ctx.textAlign = 'left'; ctx.fillText(`${s.score}`, 14, 22)
    ctx.textAlign = 'right'; ctx.fillText(`${'▲ '.repeat(Math.max(0, s.lives)).trim()}   Wave ${s.level}   Best ${Math.max(best, s.score)}`, W - 14, 22)
  }

  const s = g.current
  return (
    <Stage canvasRef={cv} w={W} h={H} label="Asteroids">
      <Card show={s.state === 'ready'} title="Asteroids" lines={['Turn ← →, thrust ↑, fire Space', 'Press Space to start']} />
      <Card show={s.state === 'over'} title={`Score ${s.score}`} lines={[`Best ${best}`, 'Press Space to play again']} />
    </Stage>
  )
}
export const asteroidsHelp = () => 'Turn: ← → or A D · Thrust: ↑ or W · Fire: Space · Best on a keyboard'
