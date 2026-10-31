import { useEffect, useRef, useState } from 'react'

// Shared bits for the arcade: palette from the app, a frame loop, best scores, and the start/pause card.
export function palette() {
  const cs = getComputedStyle(document.documentElement)
  const v = (n) => cs.getPropertyValue(n).trim()
  return {
    bg: v('--color-sunk'), line: v('--color-line'), ink: v('--color-ink'), muted: v('--color-muted'), faint: v('--color-faint'),
    card: v('--color-card'), paper: v('--color-paper'), p1: v('--color-josh'), p2: v('--color-jake'), wine: v('--color-wine'),
    forest: v('--color-forest'), olive: v('--color-olive'), teal: v('--color-teal'),
    tints: [['--color-tint-rose', '--color-on-rose'], ['--color-tint-teal', '--color-on-teal'], ['--color-tint-olive', '--color-on-olive'], ['--color-tint-lilac', '--color-on-lilac']].map(([a, b]) => [v(a), v(b)]),
  }
}

export function useLoop(cb, on = true) {
  const ref = useRef(cb); ref.current = cb
  useEffect(() => {
    if (!on) return
    let raf, last = performance.now()
    const f = (t) => { const dt = Math.min(0.05, (t - last) / 1000); last = t; ref.current(dt, t / 1000); raf = requestAnimationFrame(f) }
    raf = requestAnimationFrame(f)
    return () => cancelAnimationFrame(raf)
  }, [on])
}

export function useBest(game) {
  const key = `forge.best.${game}`
  const [best, setBest] = useState(() => { try { return +localStorage.getItem(key) || 0 } catch { return 0 } })
  const submit = (score) => { if (score > best) { setBest(score); try { localStorage.setItem(key, String(score)) } catch { /* ignore */ } } }
  return [best, submit]
}

export function useKeys(handler, deps = []) {
  useEffect(() => {
    const dn = (e) => {
      if (/INPUT|TEXTAREA/.test(document.activeElement?.tagName)) return
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault()
      handler(e, true)
    }
    const up = (e) => handler(e, false)
    window.addEventListener('keydown', dn); window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up) }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps
}

export function useSwipe(ref, onDir) {
  useEffect(() => {
    const el = ref.current; if (!el) return
    let s = null
    const st = (e) => { const t = e.touches[0]; s = [t.clientX, t.clientY] }
    const mv = (e) => {
      if (!s) return
      const t = e.touches[0], dx = t.clientX - s[0], dy = t.clientY - s[1]
      if (Math.hypot(dx, dy) < 22) return
      onDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'))
      s = [t.clientX, t.clientY]; e.preventDefault()
    }
    el.addEventListener('touchstart', st, { passive: true }); el.addEventListener('touchmove', mv, { passive: false })
    return () => { el.removeEventListener('touchstart', st); el.removeEventListener('touchmove', mv) }
  })
}

export function Card({ title, lines = [], show }) {
  if (!show) return null
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center">
      <div className="rounded-2xl bg-card/95 px-6 py-4 text-center shadow-lg">
        <div className="display text-2xl font-bold">{title}</div>
        {lines.map((l, i) => <div key={i} className="mt-0.5 text-sm text-muted">{l}</div>)}
      </div>
    </div>
  )
}

export function Stage({ canvasRef, w, h, label, children, touch }) {
  return (
    <div className="relative">
      <canvas ref={canvasRef} width={w} height={h} className="block w-full rounded-2xl" style={{ aspectRatio: `${w}/${h}`, touchAction: touch ? 'none' : 'auto' }} role="img" aria-label={label} />
      {children}
    </div>
  )
}

export const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }
export const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' }
export const KEYDIR = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', W: 'up', s: 'down', S: 'down', a: 'left', A: 'left', d: 'right', D: 'right' }
