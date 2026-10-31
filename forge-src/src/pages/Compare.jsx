import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../lib/store'
import { CRITERIA, PEOPLE, avg, isComplete } from '../lib/constants'
import { ScoreRadar } from '../components/Score'
import { Empty, StageDot, Button } from '../components/ui'
import { timeAgo } from '../lib/notes'

const PICK_COLORS = ['#5D2535', '#2B6C82', '#7A6A2A']

export default function Compare() {
  const { ideas, scores } = useStore()
  const [picked, setPicked] = useState([])

  const rows = useMemo(() => ideas.map((i) => {
    const by = Object.fromEntries(PEOPLE.map((p) => [p.id, scores.find((s) => s.idea_id === i.id && s.person === p.id)?.scores]))
    const both = PEOPLE.every((p) => isComplete(by[p.id]))
    const merged = both ? Object.fromEntries(CRITERIA.map((c) => [c.id, PEOPLE.reduce((sum, p) => sum + by[p.id][c.id], 0) / PEOPLE.length])) : null
    const gap = both ? Math.max(...CRITERIA.map((c) => Math.abs(by.Josh[c.id] - by.Jake[c.id]))) : 0
    return { idea: i, by, both, merged, total: merged ? avg(merged) : null, gap }
  }), [ideas, scores])

  const ranked = rows.filter((r) => r.both).sort((a, b) => b.total - a.total)
  const partial = rows.filter((r) => !r.both && PEOPLE.some((p) => isComplete(r.by[p.id])))
  const shown = picked.length ? picked : ranked.slice(0, 3).map((r) => r.idea.id)

  const toggle = (id) => setPicked((l) => {
    const base = l.length ? l : ranked.slice(0, 3).map((r) => r.idea.id)
    if (base.includes(id)) return base.filter((x) => x !== id)
    return [...base, id].slice(-3)
  })

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-[40px] font-extrabold leading-none tracking-[-0.02em]">Compare</h1>
        <p className="mt-1 max-w-xl text-muted">Ideas you've both scored, best first. Pick up to three to overlay.</p>
      </header>

      {ranked.length === 0 ? (
        <Empty>Nothing to compare yet. Move ideas into Exploring and both of you score them. They show up here once both scores are in.</Empty>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full min-w-[560px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="pb-2 pl-2 font-medium">Idea</th>
                  {CRITERIA.map((c) => <th key={c.id} className="pb-2 text-center font-medium" title={c.ask}>{c.name}</th>)}
                  <th className="pb-2 pr-2 text-right font-medium">Overall</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((r) => {
                  const k = shown.indexOf(r.idea.id)
                  return (
                    <tr key={r.idea.id} onClick={() => toggle(r.idea.id)} className="cursor-pointer">
                      <td className="border-t border-line py-2.5 pl-2">
                        <div className="flex items-center gap-2">
                          <span className="size-3 shrink-0 rounded-[4px] border" style={k >= 0 ? { background: PICK_COLORS[k], borderColor: PICK_COLORS[k] } : { borderColor: 'var(--color-faint)' }} />
                          <Link to={`/idea/${r.idea.id}`} onClick={(e) => e.stopPropagation()} className="truncate font-medium hover:text-wine">{r.idea.title}</Link>
                          {r.gap >= 3 && <span className="shrink-0 rounded bg-wine-soft px-1.5 text-[11px] text-wine" title="You two disagree a lot on at least one thing">Talk it out</span>}
                        </div>
                      </td>
                      {CRITERIA.map((c) => {
                        const v = r.merged[c.id]
                        return (
                          <td key={c.id} className="border-t border-line text-center tabular-nums">
                            <span className="inline-block min-w-8 rounded px-1 py-0.5" style={{ background: `color-mix(in oklab, var(--color-forest) ${Math.round((v - 1) / 4 * 38)}%, transparent)` }}
                              title={`Josh ${r.by.Josh[c.id]} · Jake ${r.by.Jake[c.id]}`}>{v.toFixed(1)}</span>
                          </td>
                        )
                      })}
                      <td className="border-t border-line pr-2 text-right"><span className="display text-lg font-semibold tabular-nums">{r.total.toFixed(1)}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-faint">Hover a number to see each person's score. “Talk it out” means you're 3+ points apart on something.</p>
          </div>

          <div className="rounded-2xl border border-line bg-card p-4">
            <ScoreRadar height={300} series={shown.map((id, k) => ({ key: rows.find((r) => r.idea.id === id)?.idea.title ?? id, color: PICK_COLORS[k], scores: rows.find((r) => r.idea.id === id)?.merged }))} />
            <ul className="mt-1 space-y-1">
              {shown.map((id, k) => (
                <li key={id} className="flex items-center gap-2 text-sm">
                  <span className="size-2.5 rounded-full" style={{ background: PICK_COLORS[k] }} />
                  <span className="truncate">{rows.find((r) => r.idea.id === id)?.idea.title}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {partial.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">Waiting on one score</h2>
          <ul className="divide-y divide-line">
            {partial.map((r) => {
              const missing = PEOPLE.filter((p) => !isComplete(r.by[p.id])).map((p) => p.id).join(' & ')
              return (
                <li key={r.idea.id}>
                  <Link to={`/idea/${r.idea.id}`} className="flex items-center gap-3 py-2.5 hover:text-wine">
                    <StageDot stage={r.idea.stage} /><span className="flex-1 truncate font-medium">{r.idea.title}</span>
                    <span className="text-xs text-faint">{missing} still to score</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}

    </div>
  )
}

export function TrashList({ trash, restoreIdea }) {
  return (
    <ul className="divide-y divide-line">
      {trash.sort((a, b) => b.deleted_at.localeCompare(a.deleted_at)).map((i) => (
        <li key={i.id} className="flex items-center gap-3 py-2.5">
          <Link to={`/idea/${i.id}`} className="min-w-0 flex-1 truncate font-medium hover:text-wine">{i.title}</Link>
          <span className="text-xs text-faint">trashed {timeAgo(i.deleted_at)}</span>
          <Button onClick={() => restoreIdea(i.id)}>Restore</Button>
        </li>
      ))}
    </ul>
  )
}

export function Trash() {
  const { trash, restoreIdea } = useStore()
  return (
    <div className="max-w-3xl">
      <h1 className="text-[40px] font-extrabold leading-none tracking-[-0.02em]">Trash</h1>
      <p className="mt-1 mb-8 text-muted">Ideas you've thrown out. Restore puts them back where they were.</p>
      {trash.length ? <TrashList trash={trash} restoreIdea={restoreIdea} /> : <Empty>Trash is empty.</Empty>}
    </div>
  )
}
