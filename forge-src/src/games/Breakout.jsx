import { useEffect, useRef, useState } from 'react'
import { Card, Stage, palette, useBest, useKeys, useLoop } from './common'
import { useStore } from '../lib/store'

const W = 720, H = 460, PW = 96, PH = 10, BR = 6
const FALLBACK = ['Notes', 'Ideas', 'Research', 'Scores', 'Coach', 'Board', 'Roadmap', 'Hours', 'Sessions', 'Pins', 'Sparks', 'Forge']

// Bricks are your own idea titles (shortened), one row per stage-ish
function buildBricks(titles, level) {
  const words = titles.length ? titles.map((t) => (t.length > 16 ? t.slice(0, 15) + '…' : t)) : FALLBACK
  const rows = Math.min(6, 3 + level), bricks = []
  const ctx = document.createElement('canvas').getContext('2d'); ctx.font = '600 12px Inter, sans-serif'
  let k = 0
  for (let r = 0; r < rows; r++) {
    let x = 14
    while (x < W - 14) {
      const label = words[k++ % words.length]
      const bw = Math.min(W - 14 - x, Math.max(64, ctx.measureText(label).width + 22))
      if (bw < 40) break
      bricks.push({ x, y: 52 + r * 26, w: bw - 6, h: 20, label, hp: r < level - 1 ? 2 : 1, tint: r % 4 })
      x += bw
    }
  }
  return bricks
}

export default function Breakout() {
  const { ideas } = useStore()
  const titles = ideas.map((i) => i.title)
  const cv = useRef()
  const [best, submit] = useBest('breakout')
  const g = useRef(null)
  const [, force] = useState(0)
  const reset = (level = 1, keep) => {
    g.current = { px: W / 2, bx: W / 2, by: H - 40, vx: 0, vy: 0, stuck: true, bricks: buildBricks(titles, level), lives: keep?.lives ?? 3, score: keep?.score ?? 0, level, state: 'ready', bits: [] }
    force((n) => n + 1)
  }
  useEffect(() => { reset() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const keys = useRef({})
  const launch = () => { const s = g.current; if (s.stuck) { s.stuck = false; const a = -Math.PI / 2 + (Math.random() - 0.5) * 0.6; s.vx = Math.cos(a) * 340; s.vy = Math.sin(a) * 340 } }

  useKeys((e, down) => {
    keys.current[e.key] = down
    const s = g.current; if (!s || !down) return
    if (e.key === ' ') {
      if (s.state === 'over' || s.state === 'won') reset(s.state === 'won' ? s.level + 1 : 1, s.state === 'won' ? s : null)
      else if (s.state === 'ready') { s.state = 'play'; launch() }
      else if (s.state === 'play') s.stuck ? launch() : (s.state = 'paused')
      else if (s.state === 'paused') s.state = 'play'
      force((n) => n + 1)
    }
  })
  const onPointer = (e) => {
    const r = cv.current.getBoundingClientRect()
    const x = ((e.touches?.[0]?.clientX ?? e.clientX) - r.left) / r.width * W
    if (g.current) g.current.px = Math.max(PW / 2, Math.min(W - PW / 2, x))
  }

  useLoop((dt) => {
    const s = g.current; if (!s) return
    const k = keys.current
    if (k.ArrowLeft || k.a || k.A) s.px -= 520 * dt
    if (k.ArrowRight || k.d || k.D) s.px += 520 * dt
    s.px = Math.max(PW / 2, Math.min(W - PW / 2, s.px))
    if (s.state === 'play') {
      if (s.stuck) { s.bx = s.px; s.by = H - 40 }
      else {
        s.bx += s.vx * dt; s.by += s.vy * dt
        if (s.bx < BR) { s.bx = BR; s.vx = Math.abs(s.vx) }
        if (s.bx > W - BR) { s.bx = W - BR; s.vx = -Math.abs(s.vx) }
        if (s.by < BR) { s.by = BR; s.vy = Math.abs(s.vy) }
        // paddle: angle depends on where it hits
        if (s.vy > 0 && s.by > H - 30 - BR && s.by < H - 30 + PH && Math.abs(s.bx - s.px) < PW / 2 + BR) {
          const off = (s.bx - s.px) / (PW / 2), sp = Math.min(Math.hypot(s.vx, s.vy) * 1.02, 620)
          const a = -Math.PI / 2 + off * 1.05
          s.vx = Math.cos(a) * sp; s.vy = Math.sin(a) * sp
        }
        for (const b of s.bricks) {
          if (b.dead) continue
          if (s.bx + BR > b.x && s.bx - BR < b.x + b.w && s.by + BR > b.y && s.by - BR < b.y + b.h) {
            const ox = Math.min(s.bx + BR - b.x, b.x + b.w - (s.bx - BR)), oy = Math.min(s.by + BR - b.y, b.y + b.h - (s.by - BR))
            if (ox < oy) s.vx = -s.vx; else s.vy = -s.vy
            b.hp--; if (b.hp <= 0) { b.dead = true; s.score += 10 * s.level; for (let i = 0; i < 8; i++) s.bits.push({ x: b.x + b.w / 2, y: b.y + b.h / 2, vx: (Math.random() - 0.5) * 200, vy: (Math.random() - 0.7) * 160, t: 0, c: b.tint }) }
            break
          }
        }
        if (s.by > H + 20) { s.lives--; s.stuck = true; if (s.lives <= 0) { s.state = 'over'; submit(s.score) }; force((n) => n + 1) }
        if (s.bricks.every((b) => b.dead)) { s.state = 'won'; submit(s.score); force((n) => n + 1) }
      }
    }
    for (const b of s.bits) { b.t += dt; b.vy += 400 * dt; b.x += b.vx * dt; b.y += b.vy * dt }
    s.bits = s.bits.filter((b) => b.t < 0.8)
    draw(s)
  })

  function draw(s) {
    const c = cv.current; if (!c) return
    const ctx = c.getContext('2d'), p = palette()
    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, W, H)
    ctx.font = '600 12px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    for (const b of s.bricks) {
      if (b.dead) continue
      const [bg, fg] = p.tints[b.tint]
      ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 6); ctx.fill()
      if (b.hp > 1) { ctx.strokeStyle = fg; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.5; ctx.stroke(); ctx.globalAlpha = 1 }
      ctx.fillStyle = fg; ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 0.5)
    }
    for (const b of s.bits) { ctx.fillStyle = p.tints[b.c][1]; ctx.globalAlpha = 1 - b.t / 0.8; ctx.fillRect(b.x, b.y, 3, 3); ctx.globalAlpha = 1 }
    ctx.fillStyle = p.wine; ctx.beginPath(); ctx.roundRect(s.px - PW / 2, H - 30, PW, PH, 5); ctx.fill()
    ctx.fillStyle = p.ink; ctx.beginPath(); ctx.arc(s.bx, s.by, BR, 0, Math.PI * 2); ctx.fill()
    ctx.textAlign = 'left'; ctx.fillStyle = p.muted; ctx.font = '600 13px Inter, sans-serif'
    ctx.fillText(`Score ${s.score}`, 14, 22); ctx.textAlign = 'right'; ctx.fillText(`${'● '.repeat(s.lives).trim()}   Level ${s.level}   Best ${Math.max(best, s.score)}`, W - 14, 22)
  }

  const s = g.current
  return (
    <div onMouseMove={onPointer} onTouchMove={onPointer} onTouchStart={(e) => { onPointer(e); const st = g.current; if (st?.state === 'ready') { st.state = 'play'; launch(); force((n) => n + 1) } else if (st?.stuck) launch() }}>
      <Stage canvasRef={cv} w={W} h={H} label="Breakout with your idea titles as bricks" touch>
        <Card show={s?.state === 'ready'} title="Break your backlog" lines={['The bricks are your ideas', 'Press Space to launch']} />
        <Card show={s?.state === 'paused'} title="Paused" lines={['Press Space to resume']} />
        <Card show={s?.state === 'over'} title={`Game over · ${s?.score}`} lines={[`Best ${best}`, 'Press Space to play again']} />
        <Card show={s?.state === 'won'} title="Board cleared" lines={['Press Space for the next level']} />
      </Stage>
    </div>
  )
}
export const breakoutHelp = () => 'Move: mouse, ← → or A D · Launch / pause: Space'
