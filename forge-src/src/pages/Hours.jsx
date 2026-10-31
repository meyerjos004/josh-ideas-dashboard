import { useMemo, useState } from 'react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Plus, X } from 'lucide-react'
import { useStore } from '../lib/store'
import { ACTIVITIES, PEOPLE, activityName, entrySecs, fmtDuration, personHex } from '../lib/constants'
import { AutoText, Button, Empty, Modal } from '../components/ui'
import { useNow, IdeaPicker } from '../components/Clock'
import { Link } from 'react-router-dom'

const dayKey = (d) => new Date(d).toLocaleDateString('en-CA') // YYYY-MM-DD in local time
const startOfWeek = () => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d } // Monday
const hhmm = (iso) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

function AddTime({ open, onClose }) {
  const { addTime, person } = useStore()
  const today = new Date().toLocaleDateString('en-CA')
  const [f, setF] = useState({ who: person, day: today, from: '18:00', to: '19:00', activity: 'research', note: '', idea_id: null })
  const set = (k) => (e) => setF({ ...f, [k]: e.target?.value ?? e })
  const start = new Date(`${f.day}T${f.from}`), end = new Date(`${f.day}T${f.to}`)
  if (end <= start) end.setDate(end.getDate() + 1) // past midnight
  const secs = (end - start) / 1000
  const save = async (e) => {
    e.preventDefault()
    const ok = await addTime({ person: f.who, started_at: start.toISOString(), ended_at: end.toISOString(), activity: f.activity, note: f.note.trim(), idea_id: f.idea_id })
    if (ok) onClose()
  }
  const field = 'w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-faint'
  return (
    <Modal open={open} onClose={onClose} label="Add time">
      <form className="p-5" onSubmit={save}>
        <h2 className="text-2xl font-semibold">Add time</h2>
        <p className="mt-1 text-sm text-muted">For when you forgot to clock in. It's logged as your time.</p>

        <div className="mt-3 grid grid-cols-[1.3fr_1fr_1fr] gap-2">
          <label className="text-xs text-muted">Day<input type="date" value={f.day} onChange={set('day')} className={field} /></label>
          <label className="text-xs text-muted">From<input type="time" value={f.from} onChange={set('from')} className={field} /></label>
          <label className="text-xs text-muted">To<input type="time" value={f.to} onChange={set('to')} className={field} /></label>
        </div>
        <div className="mt-3 flex flex-wrap gap-1">
          {ACTIVITIES.map((a) => (
            <button type="button" key={a.id} onClick={() => setF({ ...f, activity: a.id })}
              className={`rounded-full px-2.5 py-1 text-xs ${f.activity === a.id ? 'bg-ink text-card' : 'bg-sunk text-muted'}`}>{a.name}</button>
          ))}
        </div>
        <IdeaPicker value={f.idea_id} onChange={(id) => setF({ ...f, idea_id: id })} className="mt-3 w-full py-2 text-sm" />
        <input value={f.note} onChange={set('note')} placeholder="What did you work on? (optional)" className={`${field} mt-3`} />
        <div className="mt-5 flex items-center justify-end gap-2">
          <span className="mr-auto text-sm tabular-nums text-muted">{fmtDuration(secs)}</span>
          <Button type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={secs <= 0 || secs > 86400}>Add {fmtDuration(secs)}</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Hours() {
  const { time, updateTime, deleteTime, allIdeas } = useStore()
  const now = useNow(15000)
  const [adding, setAdding] = useState(false)
  const [range, setRange] = useState(14)

  const stats = useMemo(() => {
    const week = startOfWeek().getTime()
    const out = Object.fromEntries(PEOPLE.map((p) => [p.id, { week: 0, all: 0 }]))
    const byAct = Object.fromEntries(ACTIVITIES.map((a) => [a.id, 0]))
    time.forEach((t) => {
      const s = entrySecs(t, now)
      if (!out[t.person]) return
      out[t.person].all += s
      if (new Date(t.started_at).getTime() >= week) out[t.person].week += s
      byAct[t.activity] = (byAct[t.activity] ?? 0) + s
    })
    const total = PEOPLE.reduce((a, p) => a + out[p.id].all, 0)
    const weekTotal = PEOPLE.reduce((a, p) => a + out[p.id].week, 0)
    return { out, byAct, total, weekTotal }
  }, [time, now])

  const chart = useMemo(() => {
    const days = []
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - i)
      const row = { key: dayKey(d), label: range <= 14 ? d.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2) + ' ' + d.getDate() : `${d.getMonth() + 1}/${d.getDate()}` }
      PEOPLE.forEach((p) => { row[p.id] = 0 })
      days.push(row)
    }
    const idx = Object.fromEntries(days.map((d, i) => [d.key, i]))
    time.forEach((t) => { const i = idx[dayKey(t.started_at)]; if (i != null && days[i][t.person] != null) days[i][t.person] += entrySecs(t, now) / 3600 })
    days.forEach((d) => PEOPLE.forEach((p) => { d[p.id] = Math.round(d[p.id] * 100) / 100 }))
    return days
  }, [time, now, range])

  const byIdea = useMemo(() => {
    const m = {}
    time.forEach((t) => {
      const k = t.idea_id ?? 'general'
      m[k] ??= { secs: 0, people: Object.fromEntries(PEOPLE.map((p) => [p.id, 0])) }
      const s = entrySecs(t, now)
      m[k].secs += s
      if (m[k].people[t.person] != null) m[k].people[t.person] += s
    })
    return Object.entries(m).map(([id, v]) => ({ id, ...v, idea: allIdeas.find((i) => i.id === id) }))
      .filter((r) => r.id === 'general' || r.idea).sort((a, b) => b.secs - a.secs)
  }, [time, now, allIdeas])
  const ideaMax = Math.max(1, ...byIdea.map((r) => r.secs))

  const grouped = useMemo(() => {
    const g = {}
    ;[...time].sort((a, b) => b.started_at.localeCompare(a.started_at)).forEach((t) => { (g[dayKey(t.started_at)] ??= []).push(t) })
    return Object.entries(g)
  }, [time])

  const actMax = Math.max(1, ...Object.values(stats.byAct))

  return (
    <div className="space-y-12">
      <header className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h1 className="text-[40px] font-extrabold leading-none tracking-[-0.02em]">Hours</h1>
          <p className="mt-1 max-w-xl text-muted">
            {stats.total ? `You two have put ${fmtDuration(stats.total)} into the business, ${fmtDuration(stats.weekTotal)} of it this week.` : 'Clock in from the sidebar whenever you work on the business. Research counts.'}
          </p>
        </div>
        <Button onClick={() => setAdding(true)}><Plus size={15} /> Add time</Button>
      </header>

      <section className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
        {PEOPLE.map((p) => (
          <div key={p.id}>
            <div className="flex items-center gap-1.5 text-sm text-muted"><span className="size-2.5 rounded-full" style={{ background: p.hex }} />{p.id} this week</div>
            <div className="display mt-1 text-4xl font-bold tabular-nums" style={{ color: p.hex }}>{fmtDuration(stats.out[p.id].week)}</div>
            <div className="text-xs text-faint">{fmtDuration(stats.out[p.id].all)} all time</div>
          </div>
        ))}
        <div className="col-span-2 sm:pl-6 sm:border-l sm:border-line">
          <div className="text-sm text-muted">By activity, all time</div>
          <ul className="mt-2 space-y-1.5">
            {ACTIVITIES.filter((a) => stats.byAct[a.id] > 0).map((a) => (
              <li key={a.id} className="grid grid-cols-[72px_1fr_56px] items-center gap-2 text-xs">
                <span className="text-muted">{a.name}</span>
                <span className="h-2 rounded-full bg-sunk"><span className="block h-full rounded-full bg-teal" style={{ width: `${(stats.byAct[a.id] / actMax) * 100}%` }} /></span>
                <span className="text-right tabular-nums">{fmtDuration(stats.byAct[a.id])}</span>
              </li>
            ))}
            {!stats.total && <li className="text-xs text-faint">Nothing logged yet.</li>}
          </ul>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-3">
          <h2 className="mr-auto text-xl font-semibold">Hours per day</h2>
          <div className="flex gap-1 rounded-full bg-sunk p-1">
            {[14, 30].map((n) => (
              <button key={n} onClick={() => setRange(n)} className={`rounded-full px-3 py-0.5 text-xs ${range === n ? 'bg-card font-medium shadow-[0_1px_0_var(--color-line)]' : 'text-muted'}`}>{n} days</button>
            ))}
          </div>
        </div>
        <div className="h-56 rounded-2xl border border-line bg-card p-3 pr-1">
          <ResponsiveContainer>
            <BarChart data={chart} barCategoryGap="22%">
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--color-faint)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={14} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-faint)' }} axisLine={false} tickLine={false} width={28} allowDecimals={false} unit="h" />
              <Tooltip cursor={{ fill: 'var(--color-sunk)' }} formatter={(v, n) => [fmtDuration(v * 3600), n]}
                contentStyle={{ borderRadius: 10, border: '1px solid var(--color-line)', background: 'var(--color-card)', fontSize: 12 }} />
              {PEOPLE.map((p, i) => <Bar key={p.id} dataKey={p.id} stackId="h" fill={p.hex} radius={i === PEOPLE.length - 1 ? [4, 4, 0, 0] : 0} />)}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {byIdea.length > 0 && (
        <section className="max-w-3xl">
          <h2 className="mb-3 text-xl font-semibold">Time by idea</h2>
          <ul className="space-y-2.5">
            {byIdea.map((r) => (
              <li key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1">
                {r.idea
                  ? <Link to={`/idea/${r.id}`} className="truncate text-sm font-medium hover:text-wine">{r.idea.title}</Link>
                  : <span className="text-sm font-medium text-muted">General business</span>}
                <span className="text-right text-sm font-medium tabular-nums">{fmtDuration(r.secs)}</span>
                <span className="col-span-2 flex h-2 overflow-hidden rounded-full bg-sunk" style={{ width: `${Math.max(4, (r.secs / ideaMax) * 100)}%` }}>
                  {PEOPLE.map((p) => r.people[p.id] > 0 && <span key={p.id} title={`${p.id} ${fmtDuration(r.people[p.id])}`} style={{ width: `${(r.people[p.id] / r.secs) * 100}%`, background: p.hex }} />)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="max-w-3xl">
        <h2 className="mb-3 text-xl font-semibold">Log</h2>
        {grouped.length === 0 ? <Empty>No time logged yet. Hit Clock in when you start working, or add time you forgot.</Empty> : (
          <div className="space-y-6">
            {grouped.map(([day, list]) => (
              <div key={day}>
                <div className="mb-1 flex items-baseline text-sm">
                  <span className="font-semibold">{new Date(day + 'T12:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                  <span className="ml-auto tabular-nums text-muted">{fmtDuration(list.reduce((a, t) => a + entrySecs(t, now), 0))}</span>
                </div>
                <ul className="divide-y divide-line border-y border-line">
                  {list.map((t) => (
                    <li key={t.id} className="group grid grid-cols-[auto_1fr_auto] items-center gap-x-3 py-2 text-sm">
                      <span className="size-2.5 rounded-full" style={{ background: personHex(t.person) }} title={t.person} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
                          <span className="font-medium text-ink">{t.person}</span>
                          <select value={t.activity} onChange={(e) => updateTime(t.id, { activity: e.target.value })} className="rounded bg-transparent text-xs text-muted outline-none hover:bg-sunk" aria-label="Activity">
                            {ACTIVITIES.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                          </select>
                          <IdeaPicker value={t.idea_id} onChange={(id) => updateTime(t.id, { idea_id: id })} className="max-w-[180px] bg-transparent px-0 hover:bg-sunk" />
                          <span>{hhmm(t.started_at)}–{t.ended_at ? hhmm(t.ended_at) : <b className="font-medium text-forest">now</b>}</span>
                        </div>
                        <AutoText value={t.note} onSave={(v) => updateTime(t.id, { note: v })} placeholder="Add a note" className="text-sm" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums font-medium">{fmtDuration(entrySecs(t, now))}</span>
                        <button onClick={() => deleteTime(t.id)} aria-label="Delete entry" className="text-faint opacity-0 hover:text-wine group-hover:opacity-100 focus:opacity-100"><X size={14} /></button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <AddTime open={adding} onClose={() => setAdding(false)} />
    </div>
  )
}

export { activityName }
