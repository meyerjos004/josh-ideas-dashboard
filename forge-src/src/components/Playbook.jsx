// Launch playbook: a step-by-step selling checklist for downloads, communities and courses.
import { useState } from 'react'
import { Check, ChevronDown, Rocket } from 'lucide-react'
import { useStore } from '../lib/store'
import { playbookFor, playbookProgress } from '../lib/playbooks'

export default function Playbook({ idea }) {
  const { updateIdea } = useStore()
  const [open, setOpen] = useState(null)
  const pb = playbookFor(idea.kind)
  if (!pb) {
    if (idea.kind !== 'unsure') return null
    return (
      <section className="rounded-2xl border border-dashed border-line p-4 text-sm text-muted">
        <span className="font-semibold text-ink">Launch playbook: </span>
        pick <b>Download</b>, <b>Community</b> or <b>Course</b> above to get a step-by-step plan for selling it.
      </section>
    )
  }
  const { done, total, next } = playbookProgress(idea)
  const toggle = (id) => updateIdea(idea.id, { playbook: { ...(idea.playbook ?? {}), [id]: !idea.playbook?.[id] } })
  const pct = total ? Math.round((100 * done) / total) : 0
  return (
    <section>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-bold"><Rocket size={18} className="text-wine" /> Launch playbook</h2>
        <span className="text-xs text-muted">{done}/{total} steps</span>
      </div>
      <p className="mb-3 text-sm text-muted">{pb.name}: {pb.blurb}</p>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-sunk" aria-hidden>
        <div className="h-full rounded-full bg-wine transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
      {next && <p className="mb-4 text-sm"><span className="font-semibold">Next up:</span> {next.title}</p>}
      <div className="space-y-5">
        {pb.phases.map((ph) => (
          <div key={ph.phase}>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-faint">{ph.phase}</div>
            <ul className="space-y-1">
              {ph.steps.map((s) => {
                const on = !!idea.playbook?.[s.id]
                const exp = open === s.id
                return (
                  <li key={s.id} className="rounded-xl border border-line bg-card">
                    <div className="flex items-start gap-2.5 px-3 py-2">
                      <button onClick={() => toggle(s.id)} role="checkbox" aria-checked={on} aria-label={s.title}
                        className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition-colors ${on ? 'border-wine bg-wine text-card' : 'border-line hover:border-faint'}`}>
                        {on && <Check size={13} strokeWidth={3} />}
                      </button>
                      <button onClick={() => setOpen(exp ? null : s.id)} aria-expanded={exp} className="flex min-w-0 flex-1 items-start justify-between gap-2 text-left">
                        <span className={`text-sm ${on ? 'text-muted line-through' : ''}`}>{s.title}</span>
                        <ChevronDown size={15} className={`mt-0.5 shrink-0 text-faint transition-transform ${exp ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                    {exp && <p className="px-3 pb-3 pl-[42px] text-sm text-muted">{s.how}</p>}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
