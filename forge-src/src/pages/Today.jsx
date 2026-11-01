import { useMemo } from 'react'
import { AppChecklist } from '../components/Onboarding'
import { Link } from 'react-router-dom'
import { Sparkles, Map } from 'lucide-react'
import { useStore } from '../lib/store'
import { PEOPLE, isComplete, entrySecs, fmtDuration } from '../lib/constants'
import { useLayout } from '../lib/layout'
import { ROADMAP } from '../lib/roadmap'
import { timeAgo } from '../lib/notes'
import Capture from '../components/Capture'
import IdeaRow from '../components/IdeaRow'
import PaperCard from '../components/PaperCard'
import { ActionItem } from './Sessions'
import { Empty } from '../components/ui'
import { useNow } from '../components/Clock'

function useToday() {
  const { person, ideas, scores, actions, sessions, status, roadmap, time } = useStore()
  const done = new Set(roadmap.filter((r) => r.done).map((r) => r.step_id))
  const steps = ROADMAP.flatMap((p) => p.steps)
  const nextStep = steps.find((s) => !done.has(s.id))
  const other = PEOPLE.find((p) => p.id !== person)?.id
  const needsMe = useMemo(() => ideas.filter((i) =>
    ['exploring', 'validating'].includes(i.stage) &&
    !isComplete(scores.find((s) => s.idea_id === i.id && s.person === person)?.scores)
  ), [ideas, scores, person])
  const fresh = useMemo(() => ideas.filter((i) => i.stage === 'dump').sort((a, b) => b.created_at.localeCompare(a.created_at)), [ideas])
  const myTodos = actions.filter((a) => !a.done && a.owner === person)
  const theirTodos = actions.filter((a) => !a.done && a.owner === other)
  const lastSession = [...sessions].sort((a, b) => (b.held_on + b.created_at).localeCompare(a.held_on + a.created_at))[0]
  const chosen = ideas.filter((i) => i.stage === 'chosen')
  const line = (() => {
    if (status === 'loading') return 'Loading…'
    if (!ideas.length) return 'Nothing pinned yet. Start by dumping every idea you two have had, good or bad.'
    const bits = []
    if (chosen.length) bits.push(`${chosen.length === 1 ? `“${chosen[0].title}” is` : `${chosen.length} ideas are`} chosen`)
    if (needsMe.length) bits.push(`${needsMe.length} ${needsMe.length === 1 ? 'idea needs' : 'ideas need'} your score`)
    if (myTodos.length) bits.push(`you have ${myTodos.length} open to-do${myTodos.length === 1 ? '' : 's'}`)
    if (!bits.length) bits.push(`${ideas.length} idea${ideas.length === 1 ? '' : 's'} so far, nothing waiting on you`)
    const s = bits.join(', ')
    return s[0].toUpperCase() + s.slice(1) + '.'
  })()
  return { person, other, ideas, time, needsMe, fresh, myTodos, theirTodos, lastSession, nextStep, stepIndex: steps.indexOf(nextStep), stepCount: steps.length, doneCount: done.size, line }
}

function AiBanner() {
  const { aiReady } = useStore()
  if (aiReady !== false) return null
  return (
    <Link to="/setup" className="flex items-center gap-3 rounded-2xl bg-wine-soft px-4 py-3 text-sm text-wine">
      <Sparkles size={18} className="shrink-0" />
      <span><b className="font-bold">Turn on the AI</b> so Forge can clean up, research and coach every idea.</span>
    </Link>
  )
}

function RoadmapCard({ t }) {
  if (!t.nextStep) return null
  return (
    <Link to="/roadmap" className="paper block rounded-3xl bg-teal p-5 text-card">
      <div className="flex items-center gap-1.5 text-xs font-semibold opacity-80"><Map size={13} /> Roadmap · step {t.stepIndex + 1} of {t.stepCount}</div>
      <div className="display mt-2 text-[22px] font-bold leading-[1.1]">{t.nextStep.title}</div>
      <p className="mt-1.5 text-sm opacity-85">{t.nextStep.how}</p>
      <div className="mt-4 flex gap-1">
        {Array.from({ length: t.stepCount }).map((_, i) => (
          <span key={i} className="h-1.5 flex-1 rounded-full" style={{ background: 'currentColor', opacity: i < t.doneCount ? 1 : 0.25 }} />
        ))}
      </div>
    </Link>
  )
}

function TodosCard({ t }) {
  return (
    <section className="paper rounded-3xl bg-card p-5">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="text-lg font-bold">Your to-dos</h2>
        <span className="text-xs text-faint tabular-nums">{t.myTodos.length}</span>
      </div>
      {t.myTodos.length
        ? <ul>{t.myTodos.map((a) => <ActionItem key={a.id} a={a} showSource />)}</ul>
        : <p className="text-sm text-muted">Nothing on your plate. To-dos come from sessions and idea pages.</p>}
      {t.theirTodos.length > 0 && <p className="mt-2 text-xs text-faint">{t.other} has {t.theirTodos.length} open.</p>}
    </section>
  )
}

function HoursCard({ t }) {
  const now = useNow(30000)
  const week = Date.now() - 7 * 86400000
  const per = Object.fromEntries(PEOPLE.map((p) => [p.id, 0]))
  t.time.forEach((e) => { if (per[e.person] != null && new Date(e.started_at).getTime() >= week) per[e.person] += entrySecs(e, now) })
  return (
    <Link to="/hours" className="paper grid grid-cols-2 gap-2 rounded-3xl bg-card p-5">
      {PEOPLE.map((p) => (
        <div key={p.id}>
          <div className="display text-[26px] font-extrabold tabular-nums leading-none" style={{ color: p.color }}>{fmtDuration(per[p.id])}</div>
          <div className="mt-1 text-xs text-muted">{p.id}, last 7 days</div>
        </div>
      ))}
    </Link>
  )
}

function SessionCard({ t }) {
  const s = t.lastSession
  if (!s) return <Empty action={<Link to="/sessions" className="text-sm font-semibold text-wine">Start a session</Link>}>Log your brainstorms as sessions so decisions don't get lost.</Empty>
  return (
    <Link to={`/sessions/${s.id}`} className="paper block rounded-3xl bg-card p-5">
      <div className="text-xs text-faint">Last session · {new Date(s.held_on + 'T12:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
      <div className="display mt-1 text-lg font-bold">{s.title}</div>
      {s.decisions && <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-muted">{s.decisions}</p>}
    </Link>
  )
}

function Wall({ list, empty }) {
  if (!list.length) return <Empty>{empty}</Empty>
  return <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">{list.map((i, k) => <PaperCard key={i.id} idea={i} i={k} note={undefined} />)}</div>
}



export default function Today() {
  const t = useToday()
  const { mode } = useLayout()

  return (
    <div className="space-y-9">
      <header>
        <h1 className="text-[40px] font-extrabold leading-[0.98] tracking-[-0.02em] sm:text-[52px]">What are we<br className="sm:hidden" /> building, {t.person}?</h1>
        <p className="mt-3 max-w-xl text-muted">{t.line}</p>
      </header>

      <div className={`grid grid-cols-1 gap-9 ${mode === 'phone' ? '' : 'lg:grid-cols-[minmax(0,1fr)_340px]'} ${mode === 'wide' ? 'lg:grid-cols-[minmax(0,1fr)_380px]' : ''}`}>
        <div className="min-w-0 space-y-9">
          <AiBanner />
          <Capture big />
          {t.needsMe.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-bold">Needs your score</h2>
              <Wall list={t.needsMe} />
            </section>
          )}
          <section>
            <div className="mb-1 flex items-baseline justify-between">
              <h2 className="text-lg font-bold">Fresh in the dump</h2>
              <Link to="/board" className="text-sm text-muted hover:text-ink">See the board</Link>
            </div>
            {t.fresh.length
              ? <div className="divide-y divide-line">{t.fresh.slice(0, 8).map((i) => <IdeaRow key={i.id} idea={i} showStage={false} />)}</div>
              : <Empty>The dump is empty. Anything you pin above lands here first.</Empty>}
          </section>
        </div>
        <div className="space-y-5">
          <AppChecklist />
          <RoadmapCard t={t} />
          <TodosCard t={t} />
          <HoursCard t={t} />
          <SessionCard t={t} />
          <p className="px-1 text-xs text-faint">Added {t.ideas.length ? timeAgo([...t.ideas].sort((a, b) => b.created_at.localeCompare(a.created_at))[0].created_at) : 'nothing yet'} · {t.ideas.length} idea{t.ideas.length === 1 ? "" : "s"} total</p>
        </div>
      </div>
    </div>
  )
}
