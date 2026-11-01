import { Link } from 'react-router-dom'
import { PageTip } from '../components/Onboarding'
import { motion } from 'motion/react'
import { Check, MessageCircle } from 'lucide-react'
import { useStore } from '../lib/store'
import { ROADMAP } from '../lib/roadmap'
import { personHex } from '../lib/constants'
import { timeAgo } from '../lib/notes'
import { pop } from '../lib/fun'

export default function Roadmap() {
  const { roadmap, toggleStep } = useStore()
  const done = Object.fromEntries(roadmap.filter((r) => r.done).map((r) => [r.step_id, r]))
  const all = ROADMAP.flatMap((p) => p.steps)
  const count = all.filter((s) => done[s.id]).length
  const next = all.find((s) => !done[s.id])

  return (
    <div className="max-w-3xl">
      <PageTip id="roadmap" />
      <header>
        <h1 className="text-[40px] font-extrabold leading-none tracking-[-0.02em]">Roadmap</h1>
        <p className="mt-1 text-muted">The path from “we have ideas” to a real company, in order. Check steps off together.</p>
      </header>

      <div className="mt-6 flex items-center gap-3">
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-sunk">
          <motion.div className="h-full rounded-full bg-forest" initial={{ width: 0 }} animate={{ width: `${(count / all.length) * 100}%` }} transition={{ type: 'spring', stiffness: 90, damping: 20 }} />
        </div>
        <span className="text-sm tabular-nums text-muted">{count} of {all.length}</span>
      </div>

      {next && (
        <div className="mt-6 rounded-2xl border border-line bg-card p-5">
          <div className="text-sm text-muted">Up next</div>
          <div className="display mt-1 text-2xl font-semibold">{next.title}</div>
          <p className="mt-1 text-sm text-muted">{next.how}</p>
          <Link to={`/coach?q=${encodeURIComponent(`Help us with this step: "${next.title}". Give us a concrete plan for this week.`)}`}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-wine"><MessageCircle size={15} /> Get a plan from the coach</Link>
        </div>
      )}

      <div className="mt-10 space-y-10">
        {ROADMAP.map((phase, pi) => {
          const n = phase.steps.filter((s) => done[s.id]).length
          return (
            <section key={phase.phase}>
              <div className="mb-3 flex items-baseline gap-3">
                <span className="display text-sm font-bold text-faint">{pi + 1}</span>
                <h2 className="text-xl font-semibold">{phase.phase}</h2>
                <span className="ml-auto text-xs tabular-nums text-faint">{n}/{phase.steps.length}</span>
              </div>
              <ul className="space-y-1">
                {phase.steps.map((s) => {
                  const d = done[s.id]
                  return (
                    <li key={s.id} className="group flex items-start gap-3 rounded-xl px-2 py-2.5 hover:bg-card">
                      <button onClick={(e) => { if (!d) pop(e.clientX, e.clientY); toggleStep(s.id, !d) }} aria-label={d ? `Mark “${s.title}” not done` : `Mark “${s.title}” done`}
                        className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition-colors ${d ? 'border-forest bg-forest text-card' : 'border-faint bg-card hover:border-ink'}`}>
                        {d && <motion.span initial={{ scale: .3 }} animate={{ scale: 1 }}><Check size={13} strokeWidth={3} /></motion.span>}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className={`font-medium ${d ? 'text-muted line-through decoration-faint' : ''}`}>{s.title}</div>
                        <p className="text-sm text-muted">{s.how}</p>
                        {d && <p className="mt-0.5 flex items-center gap-1.5 text-xs text-faint"><span className="size-1.5 rounded-full" style={{ background: personHex(d.done_by) }} />Done by {d.done_by || 'one of you'} {timeAgo(d.done_at)}</p>}
                      </div>
                      <Link to={`/coach?q=${encodeURIComponent(`Help us with this step: "${s.title}". Give us a concrete plan for this week.`)}`}
                        title="Ask the coach about this step" aria-label={`Ask the coach about ${s.title}`}
                        className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md text-faint opacity-0 hover:bg-sunk hover:text-ink group-hover:opacity-100 focus:opacity-100"><MessageCircle size={15} /></Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
      <p className="mt-10 text-xs text-faint">Legal and tax steps are the general basics for Utah. For anything with real money or a partnership split at stake, a one-time chat with a local attorney or accountant is worth it.</p>
    </div>
  )
}
