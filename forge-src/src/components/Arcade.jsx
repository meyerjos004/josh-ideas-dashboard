import { Suspense, lazy, useEffect, useRef, useState } from 'react'
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

const GAMES = [
  { id: 'pong', name: 'Pong', two: true },
  { id: 'tron', name: 'Light cycles', two: true },
  { id: 'breakout', name: 'Breakout' },
  { id: 'snake', name: 'Snake' },
  { id: 'asteroids', name: 'Asteroids' },
  { id: '2048', name: '2048' },
  { id: 'mines', name: 'Minesweeper' },
]
const LazyTron = lazy(() => import('../games/Tron'))
const LazyBreakout = lazy(() => import('../games/Breakout'))
const LazySnake = lazy(() => import('../games/Snake'))
const LazyAsteroids = lazy(() => import('../games/Asteroids'))
const Lazy2048 = lazy(() => import('../games/Twenty48'))
const LazyMines = lazy(() => import('../games/Mines'))
const HELP = {
  pong: (two) => (two ? 'Left: W / S · Right: ↑ / ↓ · Space to start or pause' : 'Move with W / S or ↑ / ↓, or drag on a phone · Space to start or pause'),
  tron: (two) => (two ? 'Left: W A S D, boost Q · Right: arrows, boost / · Space to start' : 'Steer: W A S D or arrows · Boost: Shift · Swipe on a phone · Space to start'),
  breakout: () => 'Move: mouse, ← → or A D · Launch or pause: Space',
  snake: () => 'Steer: arrows or W A S D, or swipe · Pause: Space',
  asteroids: () => 'Turn: ← → · Thrust: ↑ · Fire: Space',
  '2048': () => 'Slide: arrows or W A S D, or swipe',
  mines: () => 'Click to open · Right-click to flag · Click a number to clear around it',
}

export function ArcadeWindow({ open, onClose }) {
  const [game, setGame] = useState(() => { try { return localStorage.getItem('forge.game') || 'pong' } catch { return 'pong' } })
  const [two, setTwo] = useState(false)
  const pick = (id) => { setGame(id); try { localStorage.setItem('forge.game', id) } catch { /* ignore */ } }
  useEffect(() => {
    if (!open) return
    const k = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open, onClose])
  const meta = GAMES.find((g) => g.id === game) ?? GAMES[0]
  const twoOk = !!meta.two
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center bg-ink/30 p-3 backdrop-blur-[2px] sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.div role="dialog" aria-label="Arcade" onMouseDown={(e) => e.stopPropagation()}
            className="max-h-[94dvh] w-full max-w-[880px] overflow-y-auto rounded-[28px] border border-line bg-card p-4 shadow-2xl scroll-thin sm:p-6"
            initial={{ scale: 0.94, y: 14 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 32 }}>
            <div className="mb-4 flex items-start gap-3">
              <div className="flex flex-wrap gap-1" role="tablist" aria-label="Games">
                {GAMES.map((g) => (
                  <button key={g.id} role="tab" aria-selected={game === g.id} onClick={() => pick(g.id)}
                    className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${game === g.id ? 'bg-ink font-semibold text-card' : 'bg-sunk text-muted hover:text-ink'}`}>{g.name}</button>
                ))}
              </div>
              <button onClick={onClose} aria-label="Close arcade" className="ml-auto grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-sunk hover:text-ink"><X size={18} /></button>
            </div>
            {twoOk && (
              <div className="mb-3 flex gap-1">
                {[[false, 'vs computer'], [true, '2 players']].map(([v, name]) => (
                  <button key={name} aria-pressed={two === v} onClick={() => setTwo(v)}
                    className={`rounded-full px-3 py-1 text-xs ${two === v ? 'bg-sunk font-semibold text-ink' : 'text-muted hover:text-ink'}`}>{name}</button>
                ))}
              </div>
            )}
            <Suspense fallback={<div className="grid aspect-[8/5] place-items-center rounded-2xl bg-sunk text-sm text-muted">Loading…</div>}>
              {game === 'pong' && <Pong twoPlayer={two} />}
              {game === 'tron' && <LazyTron twoPlayer={two} />}
              {game === 'breakout' && <LazyBreakout />}
              {game === 'snake' && <LazySnake />}
              {game === 'asteroids' && <LazyAsteroids />}
              {game === '2048' && <Lazy2048 />}
              {game === 'mines' && <LazyMines />}
            </Suspense>
            <p className="mt-3 text-center text-xs text-muted">{HELP[game]?.(two && twoOk)} · Esc to close</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
