import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { KEYDIR, useBest, useKeys, useSwipe } from './common'

const N = 4
let uid = 1
const empty = () => Array.from({ length: N }, () => Array(N).fill(null))
function spawn(b) {
  const free = []; b.forEach((r, y) => r.forEach((c, x) => !c && free.push([x, y])))
  if (!free.length) return b
  const [x, y] = free[Math.floor(Math.random() * free.length)]
  b[y][x] = { v: Math.random() < 0.9 ? 2 : 4, id: uid++, born: true }
  return b
}
const start = () => spawn(spawn(empty()))
function slide(board, dir) {
  const b = board.map((r) => r.map((c) => (c ? { ...c, born: false, merged: false } : null)))
  let moved = false, gained = 0
  const lines = []
  for (let i = 0; i < N; i++) {
    const cells = []
    for (let j = 0; j < N; j++) {
      const [x, y] = dir === 'left' ? [j, i] : dir === 'right' ? [N - 1 - j, i] : dir === 'up' ? [i, j] : [i, N - 1 - j]
      cells.push([x, y])
    }
    lines.push(cells)
  }
  for (const cells of lines) {
    const tiles = cells.map(([x, y]) => b[y][x]).filter(Boolean)
    const out = []
    for (let k = 0; k < tiles.length; k++) {
      if (tiles[k + 1] && tiles[k].v === tiles[k + 1].v) { out.push({ v: tiles[k].v * 2, id: uid++, merged: true }); gained += tiles[k].v * 2; k++ }
      else out.push(tiles[k])
    }
    cells.forEach(([x, y], k) => { const nv = out[k] ?? null; if ((b[y][x]?.id ?? null) !== (nv?.id ?? null)) moved = true; b[y][x] = nv })
  }
  return { b, moved, gained }
}
const canMove = (b) => ['left', 'right', 'up', 'down'].some((d) => slide(b, d).moved)

const TONES = ['var(--color-card)', 'var(--color-tint-teal)', 'var(--color-tint-olive)', 'var(--color-tint-rose)', 'var(--color-tint-lilac)']
const INKS = ['var(--color-ink)', 'var(--color-on-teal)', 'var(--color-on-olive)', 'var(--color-on-rose)', 'var(--color-on-lilac)']
const tone = (v) => { const k = Math.log2(v); return k >= 11 ? ['var(--color-wine)', 'var(--color-card)'] : [TONES[(k - 1) % 5], INKS[(k - 1) % 5]] }

export default function Twenty48() {
  const [board, setBoard] = useState(start)
  const [score, setScore] = useState(0)
  const [over, setOver] = useState(false)
  const [best, submit] = useBest('2048')
  const ref = useRef()
  const move = (d) => {
    if (over) return
    const { b, moved, gained } = slide(board, d)
    if (!moved) return
    spawn(b); setBoard(b); setScore((s) => s + gained)
    if (!canMove(b)) { setOver(true); submit(score + gained) }
  }
  const reset = () => { setBoard(start()); setScore(0); setOver(false) }
  useKeys((e, down) => { if (!down) return; if (KEYDIR[e.key]) move(KEYDIR[e.key]); if (e.key === ' ' && over) reset() }, [board, over, score])
  useSwipe(ref, move)
  const tiles = board.flatMap((r, y) => r.map((c, x) => c && { ...c, x, y })).filter(Boolean)

  return (
    <div className="mx-auto max-w-[420px]">
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="display text-2xl font-bold tabular-nums">{score}</span>
        <span className="text-muted">Best {Math.max(best, score)}</span>
        <button onClick={reset} className="rounded-full bg-sunk px-3 py-1 text-xs font-semibold text-muted hover:text-ink">New game</button>
      </div>
      <div ref={ref} className="relative aspect-square w-full touch-none rounded-2xl bg-sunk p-2" role="grid" aria-label="2048 board">
        {Array.from({ length: N * N }).map((_, i) => (
          <div key={i} className="absolute rounded-xl bg-paper/60" style={{ left: `calc(${(i % N) * 25}% + 8px)`, top: `calc(${Math.floor(i / N) * 25}% + 8px)`, width: 'calc(25% - 12px)', height: 'calc(25% - 12px)' }} />
        ))}
        <AnimatePresence>
          {tiles.map((t) => {
            const [bg, fg] = tone(t.v)
            return (
              <motion.div key={t.id} layout initial={t.born ? { scale: 0.4, opacity: 0 } : false} animate={{ scale: t.merged ? [1.14, 1] : 1, opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 520, damping: 34 }}
                className="paper absolute grid place-items-center rounded-xl display font-bold"
                style={{ left: `calc(${t.x * 25}% + 8px)`, top: `calc(${t.y * 25}% + 8px)`, width: 'calc(25% - 12px)', height: 'calc(25% - 12px)', background: bg, color: fg, fontSize: t.v >= 1024 ? 26 : t.v >= 128 ? 32 : 38 }}>
                {t.v}
              </motion.div>
            )
          })}
        </AnimatePresence>
        {over && (
          <div className="absolute inset-0 grid place-items-center rounded-2xl bg-paper/70">
            <div className="text-center"><div className="display text-3xl font-bold">No moves left</div><button onClick={reset} className="mt-2 rounded-full bg-wine px-4 py-1.5 text-sm font-bold text-card">Play again</button></div>
          </div>
        )}
      </div>
    </div>
  )
}
export const twenty48Help = () => 'Slide: arrows or W A S D, or swipe · Match tiles to double them'
