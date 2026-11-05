import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Check, ChevronDown, ChevronRight, Map, Sparkles, Star, X, Zap } from 'lucide-react'
import { useStore } from '../lib/store'
import { ADVISOR, PEOPLE, entrySecs, fmtDuration, isComplete, personHex } from '../lib/constants'
import { ROADMAP } from '../lib/roadmap'
import Capture from '../components/Capture'
import IdeaRow from '../components/IdeaRow'
import { Empty } from '../components/ui'
import { useNow } from '../components/Clock'
import { useSinceLast } from '../components/SinceLast'
import { useWeeklies } from './Weekly'
import { useStarter } from '../components/Onboarding'

// Today, kept simple: add an idea, see what needs you (one list), glance at the week.

const greet = () => { const h = new Date().getHours(); return h < 5 ? 'Late night' : h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening' }

function Row({ icon: Icon, tint, children, sub, to, onClick, right }) {
  const inner = (
    <>
      <span className="grid size-8 shrink-0 place-items-center rounded-full" style={{ background: `${tint}1f`, color: tint }}><Icon size={16} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] leading-snug">{children}</span>
        {sub && <span className="mt-0.5 block truncate text-[13px] text-muted">{sub}</span>}
      </span>
      {right ?? ((to || onClick) && <ChevronRight size={17} className="shrink-0 text-faint" />)}
    </>
  )
  const cls = 'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-sunk/50'
  if (to) return <Link to={to} className={cls}>{inner}</Link>
  if (onClick) return <button onClick={onClick} className={cls}>{inner}</button>
  return <div className={cls.replace(' hover:bg-sunk/50', '')}>{inner}</div>
}

function TodoRow({ a }) {
  const { updateAction, allIdeas, sessions } = useStore()
  const src = a.idea_id ? allIdeas.find((i) => i.id === a.idea_id) : sessions.find((s) => s.id === a.session_id)
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <button onClick={() => updateAction(a.id, { done: true })} aria-label={`Mark “${a.text}” done`}
        className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-line text-transparent transition-colors hover:border-forest hover:text-forest">
        <Check size={15} strokeWidth={3} />
      </button>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] leading-snug">{a.text}</span>
        <span className="mt-0.5 block truncate text-[13px] text-muted">
          To-do{a.assigned_by && a.assigned_by !== a.owner ? ` from ${a.assigned_by}` : ''}
          {src && <> · <Link to={a.idea_id ? `/idea/${a.idea_id}` : `/sessions/${a.session_id}`} className="hover:text-ink">{src.title}</Link></>}
        </span>
      </span>
    </div>
  )
}

function UpNext() {
  const { person, ideas, scores, actions, roadmap, aiReady, settings } = useStore()
  const updates = useSinceLast()
  const weeklies = useWeeklies()
  const starter = useStarter()
  const [openUpdates, setOpenUpdates] = useState(false)

  const done = new Set(roadmap.filter((r) => r.done).map((r) => r.step_id))
  const steps = ROADMAP.flatMap((p) => p.steps)
  const next = steps.find((s) => !done.has(s.id))
  const myTodos = actions.filter((a) => !a.done && a.owner === person)
  const toScore = ideas.filter((i) => ['exploring', 'validating'].includes(i.stage) && !isComplete(scores.find((s) => s.idea_id === i.id && s.person === person)?.scores))
  const latest = weeklies?.[0]
  const weekly = latest && settings.seen_weekly !== latest.id && Date.now() - new Date(latest.created_at) < 7 * 86400000
  const who = [...new Set(updates.map((u) => u.who))]
  const starterNext = starter.left[0]

  const rows = [
    aiReady === false && <Row key="ai" icon={Zap} tint="#B04A64" to="/setup" sub="So Forge can clean up, research and coach every idea">Turn on the AI</Row>,
    weekly && <Row key="wk" icon={Sparkles} tint={ADVISOR.hex} to="/week" sub="Hours, new ideas and Claude's take on your week">Claude's weekly review is ready</Row>,
    updates.length > 0 && (
      <div key="upd">
        <Row icon={Star} tint={personHex(who[0])} onClick={() => setOpenUpdates((v) => !v)} right={<ChevronDown size={17} className={`shrink-0 text-faint transition-transform ${openUpdates ? 'rotate-180' : ''}`} />}
          sub={openUpdates ? 'Since you were last here' : 'Since you were last here · tap to see'}>
          {updates.length} update{updates.length === 1 ? '' : 's'} from {who.join(' and ')}
        </Row>
        {openUpdates && (
          <motion.ul initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-1.5 overflow-hidden px-4 pb-3 pl-[60px]">
            {updates.slice(0, 10).map((u, k) => <li key={k} className="text-[14px] text-muted"><b className="font-semibold text-ink">{u.who}</b> {u.text}</li>)}
          </motion.ul>
        )}
      </div>
    ),
    ...myTodos.slice(0, 5).map((a) => <TodoRow key={a.id} a={a} />),
    myTodos.length > 5 && <Row key="more" icon={Check} tint="#5F6C66" to="/sessions">{myTodos.length - 5} more to-dos</Row>,
    toScore.length > 0 && <Row key="score" icon={Star} tint="#7A6614" to={`/idea/${toScore[0].id}`} sub={toScore.slice(0, 3).map((i) => i.title).join(' · ')}>Score {toScore.length === 1 ? 'this idea' : `${toScore.length} ideas`}</Row>,
    starterNext && (
      <Row key="start" icon={Check} tint="#3A8FA8" sub={`Getting started, ${starter.count} of 5 done · ${starterNext.hint}`}
        right={<button onClick={starter.hide} aria-label="Hide getting started" className="rounded-full p-1.5 text-faint hover:bg-sunk hover:text-ink"><X size={15} /></button>}>
        {starterNext.label}
      </Row>
    ),
    next && <Row key="road" icon={Map} tint="#123F45" to="/roadmap" sub={`Roadmap step ${steps.indexOf(next) + 1} of ${steps.length} · ${next.how}`}>{next.title}</Row>,
  ].filter(Boolean)

  return (
    <section aria-labelledby="up-next">
      <h2 id="up-next" className="mb-3 text-lg font-bold">Up next</h2>
      <div className="paper divide-y divide-line overflow-hidden rounded-3xl bg-card">
        {rows.length ? rows : <Row icon={Check} tint="#2F6B47">You're all caught up.</Row>}
      </div>
    </section>
  )
}

function ThisWeek() {
  const { time, goals, ideas, person } = useStore()
  const now = useNow(30000)
  const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  const per = Object.fromEntries(PEOPLE.map((p) => [p.id, 0]))
  time.forEach((e) => { if (per[e.person] != null && new Date(e.started_at) >= start) per[e.person] += entrySecs(e, now) })
  const newIdeas = ideas.filter((i) => new Date(i.created_at) >= start).length
  const order = [...PEOPLE].sort((a, b) => (a.id === person ? -1 : b.id === person ? 1 : 0))
  return (
    <section aria-labelledby="this-week">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 id="this-week" className="text-lg font-bold">This week</h2>
        <Link to="/hours" className="text-sm text-muted hover:text-ink">Hours</Link>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {order.map((p) => {
          const goal = goals[p.id] ?? 5
          const pct = Math.min(100, (per[p.id] / 3600 / Math.max(goal, 0.1)) * 100)
          return (
            <Link key={p.id} to="/hours" className="paper rounded-2xl bg-card p-3 sm:p-4">
              <div className="text-xs text-muted">{p.id === person ? 'You' : p.id}</div>
              <div className="display mt-1 whitespace-nowrap text-[17px] font-extrabold tabular-nums leading-none sm:text-[22px]" style={{ color: p.color }}>{fmtDuration(per[p.id])}</div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sunk"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: p.color }} /></div>
              <div className="mt-1 text-[11px] text-faint">of {goal}h goal</div>
            </Link>
          )
        })}
        <Link to="/board" className="paper rounded-2xl bg-card p-3 sm:p-4">
          <div className="text-xs text-muted">New ideas</div>
          <div className="display mt-1 text-[22px] font-extrabold tabular-nums leading-none">{newIdeas}</div>
          <div className="mt-[18px] text-[11px] text-faint">{ideas.length} on the board</div>
        </Link>
      </div>
    </section>
  )
}

export default function Today() {
  const { person, ideas, status } = useStore()
  const recent = useMemo(() => [...ideas].filter((i) => i.stage !== 'killed').sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5), [ideas])
  return (
    <div className="mx-auto max-w-[860px] space-y-10">
      <header>
        <h1 className="text-[36px] font-extrabold leading-[1.02] tracking-[-0.02em] sm:text-[44px]">{greet()}, {person}.</h1>
        <p className="mt-2 text-muted">{status === 'loading' ? 'Loading…' : ideas.length ? 'Drop a new idea, or pick something from Up next.' : 'Start by dumping every idea you have had, good or bad.'}</p>
      </header>

      <Capture big />
      <UpNext />
      <ThisWeek />

      <section aria-labelledby="recent">
        <div className="mb-1 flex items-baseline justify-between">
          <h2 id="recent" className="text-lg font-bold">Latest ideas</h2>
          <Link to="/board" className="text-sm text-muted hover:text-ink">See the board</Link>
        </div>
        {recent.length
          ? <div className="divide-y divide-line">{recent.map((i) => <IdeaRow key={i.id} idea={i} />)}</div>
          : <Empty>Nothing here yet. Anything you pin above lands here first.</Empty>}
      </section>
    </div>
  )
}
