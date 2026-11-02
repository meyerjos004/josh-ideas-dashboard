import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, X } from 'lucide-react'
import { useStore } from '../lib/store'
import { ADVISOR, personHex, stageOf } from '../lib/constants'
import { ROADMAP } from '../lib/roadmap'
import { useWeeklies } from '../pages/Weekly'

// "Since you were last here": what the other person (and Claude) did since your last visit.
// The visit time is saved to your account, so it works across phone and PC.
const STEP = Object.fromEntries(ROADMAP.flatMap((p) => p.steps).map((s) => [s.id, s.title]))

export function useSinceLast() {
  const { person, settings, saveSettings, ideas, scores, sessions, actions, roadmap, chats, member } = useStore()
  const since = useRef(null)
  if (since.current == null && member) since.current = settings.last_seen ?? ''
  // Mark this visit a few seconds in, so a quick glance still counts
  useEffect(() => {
    if (!person) return
    const t = setTimeout(() => saveSettings({ last_seen: new Date().toISOString() }), 4000)
    return () => clearTimeout(t)
  }, [person]) // eslint-disable-line react-hooks/exhaustive-deps

  const items = useMemo(() => {
    const s = since.current
    if (!s || !person) return []
    const after = (iso) => iso && iso > s
    const title = Object.fromEntries(ideas.map((i) => [i.id, i.title]))
    const out = []
    ideas.forEach((i) => { if (i.created_by !== person && after(i.created_at)) out.push({ at: i.created_at, who: i.created_by, text: <>added <Link to={`/idea/${i.id}`} className="font-medium hover:underline">{i.title}</Link></> }) })
    scores.forEach((x) => { if (x.person !== person && after(x.updated_at) && title[x.idea_id]) out.push({ at: x.updated_at, who: x.person, text: <>scored <Link to={`/idea/${x.idea_id}`} className="font-medium hover:underline">{title[x.idea_id]}</Link></> }) })
    actions.forEach((a) => { if (a.owner === person && a.assigned_by !== person && after(a.created_at)) out.push({ at: a.created_at, who: a.assigned_by, text: <>gave you a to-do: {a.text}</> }) })
    sessions.forEach((x) => { if (x.created_by !== person && after(x.created_at)) out.push({ at: x.created_at, who: x.created_by, text: <>logged a session: <Link to={`/sessions/${x.id}`} className="font-medium hover:underline">{x.title}</Link></> }) })
    roadmap.forEach((r) => { if (r.done && r.done_by && r.done_by !== person && after(r.done_at)) out.push({ at: r.done_at, who: r.done_by, text: <>checked off <Link to="/roadmap" className="font-medium hover:underline">{STEP[r.step_id] ?? 'a roadmap step'}</Link></> }) })
    chats.forEach((c) => { if (c.role === 'user' && c.person && c.person !== person && after(c.created_at)) out.push({ at: c.created_at, who: c.person, text: <>asked the coach{c.idea_id && title[c.idea_id] ? <> about <Link to={`/idea/${c.idea_id}`} className="font-medium hover:underline">{title[c.idea_id]}</Link></> : ''}</> }) })
    return out.sort((a, b) => b.at.localeCompare(a.at))
  }, [ideas, scores, sessions, actions, roadmap, chats, person, member]) // eslint-disable-line react-hooks/exhaustive-deps
  return items
}

const ago = (iso) => {
  const m = (Date.now() - new Date(iso)) / 60000
  return m < 60 ? `${Math.max(1, Math.round(m))}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`
}

export default function SinceLast() {
  const items = useSinceLast()
  const { settings } = useStore()
  const weeklies = useWeeklies()
  const [hidden, setHidden] = useState(false)
  const latest = weeklies?.[0]
  const freshWeekly = latest && settings.seen_weekly !== latest.id && Date.now() - new Date(latest.created_at) < 7 * 86400000
  if (hidden || (!items.length && !freshWeekly)) return null
  const names = [...new Set(items.map((i) => i.who))]
  return (
    <section className="paper rounded-3xl bg-card p-5" aria-label="Since you were last here">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-bold">Since you were last here</h2>
        <button onClick={() => setHidden(true)} aria-label="Hide" className="-mr-1 -mt-1 rounded-full p-1.5 text-faint hover:bg-sunk hover:text-ink"><X size={16} /></button>
      </div>
      {freshWeekly && (
        <Link to="/week" className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-[14px] font-medium" style={{ background: `${ADVISOR.hex}22`, color: ADVISOR.hex }}>
          <Sparkles size={15} /> Claude's weekly review is in. Read it →
        </Link>
      )}
      {items.length > 0 && (
        <>
          <p className="mt-1 text-sm text-muted">{items.length} update{items.length === 1 ? '' : 's'} from {names.join(' and ')}.</p>
          <ul className="mt-3 space-y-2">
            {items.slice(0, 8).map((i, k) => (
              <li key={k} className="flex items-baseline gap-2 text-[14px]">
                <span className="size-2 shrink-0 translate-y-[-1px] rounded-full" style={{ background: personHex(i.who) }} />
                <span className="min-w-0 flex-1"><b className="font-semibold">{i.who}</b> {i.text}</span>
                <span className="shrink-0 text-xs tabular-nums text-faint">{ago(i.at)}</span>
              </li>
            ))}
          </ul>
          {items.length > 8 && <p className="mt-2 text-xs text-faint">and {items.length - 8} more</p>}
        </>
      )}
    </section>
  )
}

