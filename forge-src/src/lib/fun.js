// Small celebrations. Colors come from the app palette; nothing runs with "reduce motion" on.
import confetti from 'canvas-confetti'

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const colors = () => {
  const cs = getComputedStyle(document.documentElement)
  return ['--color-wine', '--color-teal', '--color-olive', '--color-tint-rose', '--color-tint-teal', '--color-josh', '--color-jake'].map((v) => cs.getPropertyValue(v).trim())
}

// An idea was chosen: a soft burst from both sides
export function celebrate() {
  if (reduced()) return
  const c = colors()
  const base = { particleCount: 70, spread: 62, startVelocity: 42, ticks: 220, gravity: 0.9, scalar: 0.95, colors: c, disableForReducedMotion: true }
  confetti({ ...base, angle: 60, origin: { x: 0, y: 0.75 } })
  confetti({ ...base, angle: 120, origin: { x: 1, y: 0.75 } })
}

// A roadmap step was checked off: a tiny pop at the click point
export function pop(x, y) {
  if (reduced()) return
  confetti({ particleCount: 18, spread: 50, startVelocity: 18, ticks: 90, gravity: 1.1, scalar: 0.6, colors: colors(), origin: { x: x / innerWidth, y: y / innerHeight }, disableForReducedMotion: true })
}
