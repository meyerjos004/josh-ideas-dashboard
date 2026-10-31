import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Play, Square } from 'lucide-react'
import { useStore } from '../lib/store'
import { ACTIVITIES, PEOPLE, activityName, entrySecs, fmtDuration, personHex } from '../lib/constants'
import { Button, Modal } from './ui'

export function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t) }, [ms])
  return now
}

const lastActivity = () => { try { return localStorage.getItem('forge.activity') || 'research' } catch { return 'research' } }

// Dropdown of what the time is for: General or one idea
export function IdeaPicker({ value, onChange, className = '' }) {
  const { ideas } = useStore()
  const list = ideas.filter((i) => i.stage !== 'killed' || i.id === value).sort((a, b) => a.title.localeCompare(b.title))
  return (
    <select value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} aria-label="Which idea this time is for"
      className={`min-w-0 rounded-md bg-sunk px-2 py-1 text-xs text-muted outline-none ${className}`}>
      <option value="">General business</option>
      {list.map((i) => <option key={i.id} value={i.id}>{i.title.length > 40 ? i.title.slice(0, 38) + '…' : i.title}</option>)}
    </select>
  )
}

export function useClock() {
  const { time, person } = useStore()
  const mine = time.find((t) => t.person === person && !t.ended_at)
  const others = time.filter((t) => t.person !== person && !t.ended_at)
  return { mine, others }
}

function ClockOutModal({ entry, onClose }) {
  const { clockOut, deleteTime, flash } = useStore()
  const now = useNow()
  const [note, setNote] = useState('')
  const [activity, setActivity] = useState(entry?.activity ?? 'research')
  const [ideaId, setIdeaId] = useState(entry?.idea_id ?? null)
  useEffect(() => { if (entry) { setNote(entry.note || ''); setActivity(entry.activity); setIdeaId(entry.idea_id ?? null) } }, [entry])
  if (!entry) return null
  const secs = entrySecs(entry, now)
  const done = async () => {
    await clockOut(entry.id, { note: note.trim(), activity, idea_id: ideaId })
    flash(`Clocked out. ${fmtDuration(secs)} logged.`)
    onClose()
  }
  return (
    <Modal open={!!entry} onClose={onClose} label="Clock out">
      <form className="p-5" onSubmit={(e) => { e.preventDefault(); done() }}>
        <p className="text-sm text-muted">You've been on the clock for</p>
        <div className="display mt-1 text-5xl font-bold tabular-nums">{fmtDuration(secs, { clock: true })}</div>
        <div className="mt-5 flex flex-wrap gap-1">
          {ACTIVITIES.map((a) => (
            <button type="button" key={a.id} onClick={() => setActivity(a.id)}
              className={`rounded-full px-2.5 py-1 text-xs ${activity === a.id ? 'bg-ink text-card' : 'bg-sunk text-muted'}`}>{a.name}</button>
          ))}
        </div>
        <IdeaPicker value={ideaId} onChange={setIdeaId} className="mt-3 w-full py-1.5 text-sm" />
        <textarea autoFocus rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What did you get done? (optional)"
          className="mt-3 w-full rounded-lg border border-line bg-paper p-3 text-sm outline-none focus:border-faint" />
        <div className="mt-4 flex items-center gap-2">
          <button type="button" className="text-xs text-faint hover:text-wine" onClick={async () => { await deleteTime(entry.id); flash('Discarded that time.'); onClose() }}>Discard this time</button>
          <Button type="button" className="ml-auto" onClick={onClose}>Keep going</Button>
          <Button type="submit" variant="primary">Clock out</Button>
        </div>
      </form>
    </Modal>
  )
}

// Sidebar version (desktop)
export function ClockPanel() {
  const { clockIn, updateTime, person, ideas } = useStore()
  const { mine, others } = useClock()
  const now = useNow()
  const [closing, setClosing] = useState(null)

  const start = async () => {
    const e = await clockIn(lastActivity())
    if (!e) return
  }
  const setAct = (id) => { try { localStorage.setItem('forge.activity', id) } catch { /* ignore */ } updateTime(mine.id, { activity: id }) }

  return (
    <div className="rounded-xl border border-line bg-card p-3">
      {mine ? (
        <>
          <div className="flex items-center gap-2">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full opacity-60" style={{ background: personHex(person) }} />
              <span className="relative inline-flex size-2.5 rounded-full" style={{ background: personHex(person) }} />
            </span>
            <span className="text-xs text-muted">On the clock</span>
          </div>
          <div className="display mt-1 text-2xl font-bold tabular-nums">{fmtDuration(entrySecs(mine, now), { clock: true })}</div>
          <select value={mine.activity} onChange={(e) => setAct(e.target.value)} aria-label="What you're working on"
            className="mt-1 w-full rounded-md bg-sunk px-2 py-1 text-xs text-muted outline-none">
            {ACTIVITIES.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <IdeaPicker value={mine.idea_id} onChange={(id) => updateTime(mine.id, { idea_id: id })} className="mt-1 w-full" />
          <Button variant="quiet" className="mt-2 w-full" onClick={() => setClosing(mine)}><Square size={12} fill="currentColor" /> Clock out</Button>
        </>
      ) : (
        <button onClick={start} className="flex w-full items-center gap-2 text-left">
          <span className="grid size-8 place-items-center rounded-full bg-forest text-card"><Play size={14} fill="currentColor" /></span>
          <span>
            <span className="block text-sm font-medium">Clock in</span>
            <span className="block text-xs text-faint">Track time on the business</span>
          </span>
        </button>
      )}
      {others.map((o) => (
        <Link key={o.id} to="/hours" className="mt-2 flex min-w-0 items-center gap-1.5 border-t border-line pt-2 text-xs text-muted">
          <span className="size-2 shrink-0 rounded-full" style={{ background: personHex(o.person) }} />
          <span className="truncate">{o.person} is on · {o.idea_id ? (ideas.find((i) => i.id === o.idea_id)?.title ?? activityName(o.activity).toLowerCase()) : activityName(o.activity).toLowerCase()}</span>
          <span className="ml-auto shrink-0 whitespace-nowrap tabular-nums">{fmtDuration(entrySecs(o, now))}</span>
        </Link>
      ))}
      <ClockOutModal entry={closing} onClose={() => setClosing(null)} />
    </div>
  )
}

// Compact pill for the phone top bar
export function ClockPill() {
  const { clockIn, person } = useStore()
  const { mine } = useClock()
  const now = useNow()
  const [closing, setClosing] = useState(null)
  return (
    <>
      {mine ? (
        <button onClick={() => setClosing(mine)} className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums text-card" style={{ background: personHex(person) }} aria-label="Clock out">
          <Square size={9} fill="currentColor" /> {fmtDuration(entrySecs(mine, now), { clock: true })}
        </button>
      ) : (
        <button onClick={() => clockIn(lastActivity())} className="flex items-center gap-1.5 rounded-full bg-forest px-2.5 py-1 text-xs font-medium text-card">
          <Play size={10} fill="currentColor" /> Clock in
        </button>
      )}
      <ClockOutModal entry={closing} onClose={() => setClosing(null)} />
    </>
  )
}

export const PEOPLE_IDS = PEOPLE.map((p) => p.id)

// On an idea page: time spent + clock in on this idea
export function IdeaTime({ idea }) {
  const { time, clockIn, flash } = useStore()
  const { mine } = useClock()
  const now = useNow(15000)
  const entries = time.filter((t) => t.idea_id === idea.id)
  const by = Object.fromEntries(PEOPLE.map((p) => [p.id, 0]))
  entries.forEach((t) => { if (by[t.person] != null) by[t.person] += entrySecs(t, now) })
  const total = Object.values(by).reduce((a, b) => a + b, 0)
  const onThis = mine?.idea_id === idea.id
  const go = async () => {
    const e = await clockIn(lastActivity(), '', idea.id)
    if (e) flash(mine ? `Switched your clock to “${idea.title}”` : `Clocked in on “${idea.title}”`)
  }
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold">Time spent</h2>
      {total > 0 ? (
        <>
          <div className="display text-2xl font-bold tabular-nums">{fmtDuration(total)}</div>
          <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted">
            {PEOPLE.filter((p) => by[p.id] > 0).map((p) => (
              <span key={p.id} className="inline-flex items-center gap-1"><span className="size-1.5 rounded-full" style={{ background: p.hex }} />{p.id} {fmtDuration(by[p.id])}</span>
            ))}
          </div>
        </>
      ) : <p className="text-sm text-faint">No time logged on this idea yet.</p>}
      {onThis
        ? <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-forest"><span className="size-1.5 animate-pulse rounded-full bg-forest" /> You're clocked in on this</p>
        : <button onClick={go} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-2.5 py-1 text-xs font-medium hover:border-faint">
            <Play size={10} fill="currentColor" className="text-forest" /> {mine ? 'Switch clock to this idea' : 'Clock in on this idea'}
          </button>}
    </section>
  )
}
