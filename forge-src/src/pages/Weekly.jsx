import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { sb } from '../lib/sb'
import { useStore } from '../lib/store'
import { ADVISOR, CRITERIA, PEOPLE, avg, personHex } from '../lib/constants'
import { Empty } from '../components/ui'

// The Sunday review: the week's numbers plus Claude's brief and scores.
export function useWeeklies() {
  const [list, setList] = useState(null)
  useEffect(() => {
    let alive = true
    sb.from('forge_weekly').select('*').order('week_of', { ascending: false }).limit(12).then(({ data }) => alive && setList(data ?? []))
    const ch = sb.channel('forge-weekly').on('postgres_changes', { event: '*', schema: 'public', table: 'forge_weekly' }, () =>
      sb.from('forge_weekly').select('*').order('week_of', { ascending: false }).limit(12).then(({ data }) => alive && setList(data ?? []))).subscribe()
    return () => { alive = false; sb.removeChannel(ch) }
  }, [])
  return list
}

const fmtWeek = (d) => new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })

function Brief({ text }) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  return (
    <div className="space-y-2 text-[15px] leading-relaxed">
      {lines.map((l, i) => l.startsWith('- ')
        ? <p key={i} className="flex gap-2"><span className="mt-[9px] size-1.5 shrink-0 rounded-full" style={{ background: ADVISOR.hex }} /><span>{l.slice(2)}</span></p>
        : <p key={i} className={/^this week:/i.test(l) ? 'mt-3 rounded-xl bg-sunk px-3 py-2 font-semibold' : ''}>{l}</p>)}
    </div>
  )
}

export default function Weekly() {
  const list = useWeeklies()
  const { settings, saveSettings } = useStore()
  const [pick, setPick] = useState(0)
  const w = list?.[pick]
  useEffect(() => { if (w && settings.seen_weekly !== w.id) saveSettings({ seen_weekly: w.id }) }, [w?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="max-w-3xl space-y-8">
      <header className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h1 className="text-[40px] font-extrabold leading-none tracking-[-0.02em]">Your week</h1>
          <p className="mt-1.5 text-muted">{w ? `Week ending ${fmtWeek(w.week_of)}. Claude writes this every Sunday evening.` : 'Claude writes a review every Sunday evening.'}</p>
        </div>
        {list?.length > 1 && (
          <select value={pick} onChange={(e) => setPick(+e.target.value)} aria-label="Pick a week" className="rounded-full border border-line bg-card px-3 py-1.5 text-sm">
            {list.map((x, i) => <option key={x.id} value={i}>Week ending {fmtWeek(x.week_of)}</option>)}
          </select>
        )}
      </header>

      {list == null ? <p className="text-faint">Loading…</p> : !w ? (
        <Empty>The first review lands this Sunday evening. You'll get a notification when it's ready.</Empty>
      ) : (
        <>
          <section className="paper rounded-3xl bg-card p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold" style={{ color: ADVISOR.hex }}><Sparkles size={16} /> From Claude</div>
            {w.brief ? <Brief text={w.brief} /> : <p className="text-muted">Claude couldn't write a brief this week. The numbers below are still accurate.</p>}
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(w.stats.hours ?? []).map((h) => {
              const pct = Math.min(100, (h.hours / Math.max(h.goal, 0.1)) * 100)
              const color = PEOPLE.find((p) => p.id === h.person)?.color
              return (
                <div key={h.person} className="paper rounded-2xl bg-card p-4">
                  <div className="flex items-baseline justify-between"><span className="display text-2xl font-extrabold tabular-nums" style={{ color }}>{h.hours}h</span><span className="text-xs text-muted">{h.person} · goal {h.goal}h{pct >= 100 ? ' ✓' : ''}</span></div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-sunk"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} /></div>
                </div>
              )
            })}
          </section>

          <section className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
            <List title={`New ideas (${w.stats.new_ideas?.length ?? 0})`} items={w.stats.new_ideas} render={(i) => <><Link to={`/idea/${i.id}`} className="hover:underline">{i.title}</Link> <span className="text-xs" style={{ color: personHex(i.by) }}>· {i.by}</span></>} empty="None this week." />
            <List title="Going stale" items={w.stats.stale} render={(i) => <><Link to={`/idea/${i.id}`} className="hover:underline">{i.title}</Link> <span className="text-xs text-faint">· untouched 2+ weeks</span></>} empty="Nothing stale." />
            <List title="Killed this week" items={w.stats.killed} render={(i) => <Link to={`/idea/${i.id}`} className="hover:underline">{i.title}</Link>} empty="Nothing killed." />
            <div>
              <h2 className="mb-2 text-sm font-bold">Up next</h2>
              <p className="text-[15px]">{w.stats.next_step ? <Link to="/roadmap" className="hover:underline">Roadmap: {w.stats.next_step}</Link> : 'Roadmap complete.'}</p>
              <p className="mt-1 text-sm text-muted">Open to-dos: {(w.stats.open_todos ?? []).map((t) => `${t.person} ${t.count}`).join(' · ')}</p>
            </div>
          </section>

          {w.scored?.length > 0 && (
            <section>
              <h2 className="mb-1 text-lg font-bold">Claude's scores</h2>
              <p className="mb-3 text-sm text-muted">Its own take on ideas it hadn't scored yet. Never counted in your averages.</p>
              <div className="paper divide-y divide-line rounded-2xl bg-card">
                {w.scored.map((s) => (
                  <div key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
                    <Link to={`/idea/${s.id}`} className="min-w-0 flex-1 font-medium hover:underline">{s.title}</Link>
                    <div className="flex gap-2 text-xs text-muted">{CRITERIA.map((c) => <span key={c.id} title={c.name}>{c.name.split(' ')[0]} <b className="text-ink">{s.scores[c.id]}</b></span>)}</div>
                    <span className="display w-10 text-right text-lg font-bold tabular-nums" style={{ color: ADVISOR.hex }}>{avg(s.scores).toFixed(1)}</span>
                    {s.why && <p className="w-full text-[13px] text-muted">{s.why}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function List({ title, items, render, empty }) {
  return (
    <div>
      <h2 className="mb-2 text-sm font-bold">{title}</h2>
      {items?.length ? <ul className="space-y-1 text-[15px]">{items.slice(0, 8).map((i) => <li key={i.id}>{render(i)}</li>)}</ul> : <p className="text-sm text-faint">{empty}</p>}
    </div>
  )
}
