import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { RefreshCw, Sparkles, Plus, ExternalLink, AlertTriangle } from 'lucide-react'
import { useStore } from '../lib/store'
import { Button } from './ui'
import { timeAgo } from '../lib/notes'

const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, '') } catch { return u } }

function Thinking({ label = 'Researching' }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5" role="status">
      <div className="flex items-center gap-2 text-sm font-medium">
        <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2.4, ease: 'linear' }}><Sparkles size={16} className="text-wine" /></motion.span>
        {label}: searching competitors, prices and demand…
      </div>
      <p className="mt-1 text-xs text-muted">Usually 30–90 seconds. You can leave this page; it keeps going.</p>
      <div className="mt-4 space-y-2">
        {[92, 78, 85, 60].map((w, i) => (
          <motion.div key={i} className="h-3 rounded-full bg-sunk" style={{ width: `${w}%` }}
            animate={{ opacity: [0.45, 1, 0.45] }} transition={{ repeat: Infinity, duration: 1.6, delay: i * 0.15 }} />
        ))}
      </div>
    </div>
  )
}

export function ResearchStatus({ idea }) {
  if (idea.ai_status === 'working') return <span className="inline-flex items-center gap-1 text-[11px] text-wine"><Sparkles size={11} className="animate-pulse" /> Researching</span>
  if (idea.ai_status === 'error') return <span className="text-[11px] text-wine">Research failed</span>
  return null
}

export default function ResearchPanel({ idea }) {
  const { researchIdea, aiReady, addAction, person, flash } = useStore()
  const ai = idea.ai

  if (idea.ai_status === 'working') return <Thinking />

  if (!ai) {
    return (
      <div className="rounded-2xl border border-dashed border-line p-5">
        <div className="flex items-start gap-3">
          <Sparkles size={18} className="mt-0.5 text-wine" />
          <div className="flex-1">
            <h2 className="text-lg font-semibold">Research this idea</h2>
            {idea.ai_status === 'error'
              ? <p className="mt-1 text-sm text-wine">Last try failed: {idea.ai_error || 'unknown error'}.</p>
              : <p className="mt-1 text-sm text-muted">Forge will look up competitors, prices and demand, then suggest your next 3 steps.</p>}
            {aiReady === false
              ? <p className="mt-3 text-sm"><Link to="/setup" className="font-medium text-wine">Connect the AI first</Link> <span className="text-muted">(one-time setup).</span></p>
              : <Button variant="primary" className="mt-3" onClick={() => researchIdea(idea.id)} disabled={!aiReady}><Sparkles size={14} /> Research it</Button>}
          </div>
        </div>
      </div>
    )
  }

  const addTodo = async (text) => { await addAction({ text, idea_id: idea.id, owner: person }); flash('Added to to-dos') }

  return (
    <section aria-labelledby="research-h" className="space-y-8">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id="research-h" className="text-xl font-semibold">Research</h2>
        <span className="text-xs text-faint">by Forge AI · {timeAgo(ai.researched_at)}</span>
        <button onClick={() => researchIdea(idea.id)} className="ml-auto inline-flex items-center gap-1 text-xs text-muted hover:text-ink"><RefreshCw size={12} /> Redo research</button>
      </div>

      {idea.ai_status === 'error' && <p className="text-sm text-wine">The latest re-run failed ({idea.ai_error}). Showing the earlier research.</p>}

      {ai.verdict && (
        <blockquote className="border-l-4 border-wine pl-4 text-[17px] leading-relaxed">{ai.verdict}</blockquote>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {ai.who_buys && <div><h3 className="mb-1 text-sm font-semibold">Who buys it</h3><p className="text-sm text-muted">{ai.who_buys}</p></div>}
        {ai.market && (
          <div>
            <h3 className="mb-1 text-sm font-semibold">Market</h3>
            {ai.market.price_range && <p className="text-sm"><span className="text-muted">Typical price:</span> {ai.market.price_range}</p>}
            {ai.market.demand && <p className="mt-1 text-sm text-muted">{ai.market.demand}</p>}
          </div>
        )}
      </div>

      {ai.competitors?.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Who already does this</h3>
          <ul className="divide-y divide-line rounded-xl border border-line bg-card">
            {ai.competitors.map((c, i) => (
              <li key={i} className="flex items-start gap-3 px-4 py-3">
                {c.url && <img alt="" className="mt-0.5 size-4 rounded-sm" src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host(c.url))}&sz=32`} />}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    {c.url ? <a href={c.url} target="_blank" rel="noreferrer" className="font-medium hover:text-wine">{c.name}</a> : <span className="font-medium">{c.name}</span>}
                    {c.price && <span className="text-xs text-muted">{c.price}</span>}
                  </div>
                  {c.note && <p className="text-sm text-muted">{c.note}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {ai.next_steps?.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Do these next</h3>
          <ol className="space-y-2">
            {ai.next_steps.map((s, i) => (
              <li key={i} className="flex items-start gap-3 rounded-xl bg-card p-3">
                <span className="display grid size-6 shrink-0 place-items-center rounded-full bg-forest text-xs font-bold text-card">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{s.step}</div>
                  <div className="text-xs text-muted">{s.why}{s.cost ? ` · ${s.cost}` : ''}</div>
                </div>
                <button onClick={() => addTodo(s.step)} title="Add as a to-do" aria-label="Add as a to-do" className="grid size-7 shrink-0 place-items-center rounded-md text-muted hover:bg-sunk hover:text-ink"><Plus size={15} /></button>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {ai.open_questions?.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold">You still need to find out</h3>
            <ul className="space-y-1">
              {ai.open_questions.map((q, i) => (
                <li key={i} className="group flex items-start gap-2 text-sm">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-navy" />
                  <span className="flex-1">{q}</span>
                  <button onClick={() => addTodo(q)} aria-label="Add as a to-do" className="text-faint opacity-0 hover:text-ink group-hover:opacity-100 focus:opacity-100"><Plus size={14} /></button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {ai.risks?.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold">Risks</h3>
            <ul className="space-y-1">
              {ai.risks.map((r, i) => <li key={i} className="flex items-start gap-2 text-sm"><AlertTriangle size={13} className="mt-1 shrink-0 text-olive" />{r}</li>)}
            </ul>
          </div>
        )}
      </div>

      {ai.sources?.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-xs text-muted">{ai.sources.length} source{ai.sources.length === 1 ? '' : 's'}</summary>
          <ul className="mt-2 space-y-1">
            {ai.sources.map((s) => (
              <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-muted hover:text-ink"><ExternalLink size={11} />{s.title || host(s.url)}</a></li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
