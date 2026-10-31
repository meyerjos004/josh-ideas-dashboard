import { useEffect, useState } from 'react'
import { Flag } from 'lucide-react'
import { useBest } from './common'

const SIZES = { small: [9, 9, 10], medium: [16, 12, 30] }
const NUM = ['', 'var(--color-navy)', 'var(--color-forest)', 'var(--color-wine)', 'var(--color-olive)', 'var(--color-rose)', 'var(--color-teal)', 'var(--color-ink)', 'var(--color-muted)']

function make(w, h, mines, safeX, safeY) {
  const cells = Array.from({ length: w * h }, () => ({ mine: false, open: false, flag: false, n: 0 }))
  let placed = 0
  while (placed < mines) {
    const i = Math.floor(Math.random() * w * h), x = i % w, y = Math.floor(i / w)
    if (cells[i].mine || (Math.abs(x - safeX) <= 1 && Math.abs(y - safeY) <= 1)) continue
    cells[i].mine = true; placed++
  }
  cells.forEach((c, i) => { const x = i % w, y = Math.floor(i / w); c.n = around(w, h, x, y).filter((j) => cells[j].mine).length })
  return cells
}
function around(w, h, x, y) {
  const out = []
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if ((dx || dy) && nx >= 0 && ny >= 0 && nx < w && ny < h) out.push(ny * w + nx) }
  return out
}

export default function Mines() {
  const [size, setSize] = useState('small')
  const [w, h, m] = SIZES[size]
  const [cells, setCells] = useState(null)
  const [state, setState] = useState('ready') // ready | play | won | lost
  const [t0, setT0] = useState(0)
  const [now, setNow] = useState(0)
  const [flagMode, setFlagMode] = useState(false)
  const [best, submit] = useBest(`mines-${size}`)
  useEffect(() => { setCells(null); setState('ready') }, [size])
  useEffect(() => { if (state !== 'play') return; const i = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(i) }, [state])
  const secs = state === 'ready' ? 0 : Math.floor(((state === 'play' ? now : now) - t0) / 1000)

  const open = (i) => {
    let cs = cells
    if (!cs) { cs = make(w, h, m, i % w, Math.floor(i / w)); setT0(Date.now()); setNow(Date.now()); setState('play') }
    if (state === 'won' || state === 'lost') return
    cs = cs.map((c) => ({ ...c }))
    const c = cs[i]
    if (c.flag) return
    if (c.open && c.n) {
      // chord: open neighbours if the right number of flags is around
      const nb = around(w, h, i % w, Math.floor(i / w))
      if (nb.filter((j) => cs[j].flag).length !== c.n) return
      nb.forEach((j) => { if (!cs[j].flag && !cs[j].open) flood(cs, j) })
    } else flood(cs, i)
    if (cs.some((x) => x.open && x.mine)) { cs.forEach((x) => { if (x.mine) x.open = true }); setState('lost') }
    else if (cs.every((x) => x.mine || x.open)) { setState('won'); submit(-Math.floor((Date.now() - (t0 || Date.now())) / 1000)) }
    setCells(cs)
  }
  const flood = (cs, i) => {
    const q = [i]
    while (q.length) {
      const j = q.pop(), c = cs[j]
      if (c.open || c.flag) continue
      c.open = true
      if (!c.n && !c.mine) q.push(...around(w, h, j % w, Math.floor(j / w)))
    }
  }
  const flag = (i, e) => {
    e?.preventDefault()
    if (!cells || state !== 'play' || cells[i].open) return
    const cs = cells.map((c) => ({ ...c })); cs[i].flag = !cs[i].flag; setCells(cs)
  }
  const left = m - (cells?.filter((c) => c.flag).length ?? 0)
  const bestTime = best ? -best : null

  return (
    <div className="mx-auto" style={{ maxWidth: w * 40 }}>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="inline-flex items-center gap-1 font-semibold tabular-nums"><Flag size={14} className="text-wine" />{left}</span>
        <span className="tabular-nums text-muted">{secs}s{bestTime != null ? ` · best ${bestTime}s` : ''}</span>
        <div className="ml-auto flex gap-1">
          {Object.keys(SIZES).map((k) => <button key={k} aria-pressed={size === k} onClick={() => setSize(k)} className={`rounded-full px-3 py-1 text-xs capitalize ${size === k ? 'bg-ink text-card' : 'bg-sunk text-muted'}`}>{k}</button>)}
          <button aria-pressed={flagMode} onClick={() => setFlagMode((v) => !v)} className={`rounded-full px-3 py-1 text-xs sm:hidden ${flagMode ? 'bg-wine text-card' : 'bg-sunk text-muted'}`}>Flag mode</button>
        </div>
      </div>
      <div className="relative grid gap-[3px] rounded-2xl bg-sunk p-2" style={{ gridTemplateColumns: `repeat(${w}, minmax(0, 1fr))` }} role="grid" aria-label="Minesweeper board">
        {Array.from({ length: w * h }).map((_, i) => {
          const c = cells?.[i]
          const shown = c?.open
          return (
            <button key={i} onClick={(e) => (flagMode ? flag(i, e) : open(i))} onContextMenu={(e) => flag(i, e)}
              aria-label={shown ? (c.mine ? 'Mine' : c.n ? `${c.n}` : 'Empty') : c?.flag ? 'Flagged' : 'Hidden'}
              className={`grid aspect-square place-items-center rounded-md text-[15px] font-bold transition-colors ${shown ? (c.mine ? 'bg-wine-soft' : 'bg-paper/70') : 'paper bg-card hover:bg-paper'}`}
              style={shown && !c.mine ? { color: NUM[c.n] } : undefined}>
              {shown ? (c.mine ? <span className="size-2.5 rounded-full bg-wine" /> : c.n || '') : c?.flag ? <Flag size={14} className="text-wine" /> : ''}
            </button>
          )
        })}
        {(state === 'won' || state === 'lost') && (
          <div className="absolute inset-0 grid place-items-center rounded-2xl bg-paper/60">
            <div className="text-center">
              <div className="display text-3xl font-bold">{state === 'won' ? `Cleared in ${secs}s` : 'Boom'}</div>
              <button onClick={() => { setCells(null); setState('ready') }} className="mt-2 rounded-full bg-wine px-4 py-1.5 text-sm font-bold text-card">Play again</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
export const minesHelp = () => 'Click to open · Right-click to flag · Click a number to clear around it'
