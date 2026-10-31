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
  useEffect(() => { if (entry) { setNote(entry.note || ''); setActivity(entry.activity) } }, [entry])
  if (!entry) return null
  const secs = entrySecs(entry, now)
  const done = async () => {
    await clockOut(entry.id, { note: note.trim(), activity })
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
  const { clockIn, updateTime, person } = useStore()
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
        <Link key={o.id} to="/hours" className="mt-2 flex items-center gap-1.5 border-t border-line pt-2 text-xs text-muted">
          <span className="size-2 rounded-full" style={{ background: personHex(o.person) }} />
          {o.person} is on · {activityName(o.activity).toLowerCase()}
          <span className="ml-auto tabular-nums">{fmtDuration(entrySecs(o, now))}</span>
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
