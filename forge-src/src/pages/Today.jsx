import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { useStore } from '../lib/store'
import { STAGES, PEOPLE, isComplete } from '../lib/constants'
import Capture from '../components/Capture'
import IdeaRow from '../components/IdeaRow'
import { ActionItem } from './Sessions'
import { Empty } from '../components/ui'
import { timeAgo } from '../lib/notes'

function Funnel({ ideas }) {
  const counts = STAGES.map((s) => ({ ...s, n: ideas.filter((i) => i.stage === s.id).length }))
  const total = ideas.length || 1
  return (
    <Link to="/board" className="block" aria-label="Open the board">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-sunk">
        {counts.filter((c) => c.n).map((c, i) => (
          <motion.span key={c.id} style={{ background: c.color }} className="h-full"
            initial={{ width: 0 }} animate={{ width: `${(c.n / total) * 100}%` }} transition={{ delay: .15 + i * .07, type: 'spring', stiffness: 120, damping: 20 }} />
        ))}
      </div>
      <div className="mt-2.5 grid grid-cols-5 gap-2">
        {counts.map((c) => (
          <div key={c.id} className="min-w-0">
            <div className="display text-2xl font-semibold tabular-nums sm:text-3xl" style={{ color: c.n ? c.color : 'var(--color-faint)' }}>{c.n}</div>
            <div className="truncate text-xs text-muted">{c.name}</div>
          </div>
        ))}
      </div>
    </Link>
  )
}

export default function Today() {
  const { person, ideas, scores, actions, sessions, status } = useStore()
  const other = PEOPLE.find((p) => p.id !== person)?.id

  const needsMe = useMemo(() => ideas.filter((i) =>
    ['exploring', 'validating'].includes(i.stage) &&
    !isComplete(scores.find((s) => s.idea_id === i.id && s.person === person)?.scores)
  ), [ideas, scores, person])
  const fresh = useMemo(() => ideas.filter((i) => i.stage === 'dump').sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6), [ideas])
  const myTodos = actions.filter((a) => !a.done && a.owner === person)
  const theirTodos = actions.filter((a) => !a.done && a.owner === other)
  const lastSession = [...sessions].sort((a, b) => (b.held_on + b.created_at).localeCompare(a.held_on + a.created_at))[0]
  const chosen = ideas.filter((i) => i.stage === 'chosen')

  const line = (() => {
    if (status === 'loading') return 'Loading…'
    if (!ideas.length) return 'Nothing in here yet. Start by dumping every idea you two have had, good or bad.'
    const bits = []
    if (chosen.length) bits.push(`${chosen.length === 1 ? `“${chosen[0].title}” is` : `${chosen.length} ideas are`} chosen`)
    if (needsMe.length) bits.push(`${needsMe.length} ${needsMe.length === 1 ? 'idea needs' : 'ideas need'} your score`)
    if (myTodos.length) bits.push(`you have ${myTodos.length} open to-do${myTodos.length === 1 ? '' : 's'}`)
    if (!bits.length) bits.push(`${ideas.length} ideas so far, nothing waiting on you`)
    const s = bits.join(', ')
    return s[0].toUpperCase() + s.slice(1) + '.'
  })()

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-4xl font-bold sm:text-5xl">Hey {person}.</h1>
        <p className="mt-2 max-w-xl text-muted">{line}</p>
      </header>

      <Capture big />

      {ideas.length > 0 && <Funnel ideas={ideas} />}

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-10">
          {needsMe.length > 0 && (
            <section>
              <h2 className="mb-2 text-lg font-semibold">Needs your score</h2>
              <div className="divide-y divide-line">{needsMe.map((i) => <IdeaRow key={i.id} idea={i} />)}</div>
            </section>
          )}
          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-lg font-semibold">Fresh in the dump</h2>
              <Link to="/board" className="text-sm text-muted hover:text-ink">See the board</Link>
            </div>
            {fresh.length
              ? <div className="divide-y divide-line">{fresh.map((i) => <IdeaRow key={i.id} idea={i} showStage={false} />)}</div>
              : <Empty>The dump is empty. Anything you type above lands here first.</Empty>}
          </section>
        </div>

        <div className="space-y-10">
          <section>
            <h2 className="mb-2 text-lg font-semibold">Your to-dos</h2>
            {myTodos.length
              ? <ul className="space-y-1">{myTodos.map((a) => <ActionItem key={a.id} a={a} showSource />)}</ul>
              : <p className="text-sm text-muted">Nothing on your plate. To-dos come from sessions and idea pages.</p>}
            {theirTodos.length > 0 && (
              <p className="mt-3 text-sm text-muted">{other} has {theirTodos.length} open.</p>
            )}
          </section>
          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-lg font-semibold">Last session</h2>
              <Link to="/sessions" className="text-sm text-muted hover:text-ink">All sessions</Link>
            </div>
            {lastSession ? (
              <Link to={`/sessions/${lastSession.id}`} className="block rounded-xl border border-line bg-card p-4 hover:border-faint">
                <div className="font-medium">{lastSession.title}</div>
                <div className="text-xs text-faint">{new Date(lastSession.held_on + 'T12:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · {timeAgo(lastSession.created_at)}</div>
                {lastSession.decisions && <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm text-muted">{lastSession.decisions}</p>}
              </Link>
            ) : <Empty action={<Link to="/sessions" className="text-sm font-medium text-wine">Start a session</Link>}>When you two sit down to brainstorm, log it as a session so decisions don't get lost.</Empty>}
          </section>
        </div>
      </div>
    </div>
  )
}
