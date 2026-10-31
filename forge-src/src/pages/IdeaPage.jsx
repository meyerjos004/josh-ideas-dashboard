import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Plus, Trash2, X } from 'lucide-react'
import { motion } from 'motion/react'
import { useStore } from '../lib/store'
import { STAGES, KINDS, PEOPLE } from '../lib/constants'
import { linkedTitles, timeAgo } from '../lib/notes'
import { AutoText, Button, PersonChip, StageDot } from '../components/ui'
import NotesEditor from '../components/NotesEditor'
import ScorePanel from '../components/Score'
import ResearchPanel from '../components/Research'
import CoachChat from '../components/Coach'
import { IdeaTime } from '../components/Clock'
import { useLayout } from '../lib/layout'
import { Maximize2 } from 'lucide-react'
import { ActionItem } from './Sessions'

function Stepper({ idea, onMove }) {
  const flow = STAGES.filter((s) => s.id !== 'killed')
  const idx = flow.findIndex((s) => s.id === idea.stage)
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Stage">
      {flow.map((s, i) => {
        const on = s.id === idea.stage
        const past = idea.stage !== 'killed' && i < idx
        return (
          <button key={s.id} role="radio" aria-checked={on} onClick={() => onMove(s.id)}
            className={`relative rounded-full px-3 py-1 text-xs font-medium transition-colors ${on ? 'text-card' : past ? 'text-ink' : 'text-faint hover:text-muted'}`}
            style={past ? { background: 'var(--color-sunk)' } : undefined}>
            {on && <motion.span layoutId="stage-pill" className="absolute inset-0 rounded-full" style={{ background: s.color }} transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
            <span className="relative">{s.name}</span>
          </button>
        )
      })}
      <span className="mx-1 h-4 w-px bg-line" />
      <button role="radio" aria-checked={idea.stage === 'killed'} onClick={() => onMove('killed')}
        className={`relative rounded-full px-3 py-1 text-xs font-medium ${idea.stage === 'killed' ? 'text-card' : 'text-faint hover:text-muted'}`}>
        {idea.stage === 'killed' && <motion.span layoutId="stage-pill" className="absolute inset-0 rounded-full bg-stone" />}
        <span className="relative">Killed</span>
      </button>
    </div>
  )
}

function Links({ idea, onSave }) {
  const links = Array.isArray(idea.links) ? idea.links : []
  const [url, setUrl] = useState('')
  const add = (e) => {
    e.preventDefault()
    let u = url.trim(); if (!u) return
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u
    onSave([...links, { url: u, label: '' }]); setUrl('')
  }
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold">Links & competitors</h2>
      <ul className="space-y-1">
        {links.map((l, i) => {
          let host = l.url; try { host = new URL(l.url).hostname.replace(/^www\./, '') } catch { /* raw */ }
          return (
            <li key={i} className="group flex items-center gap-2 text-sm">
              <img alt="" className="size-4 rounded-sm" src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=32`} />
              <a href={l.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate hover:text-wine">{host}<span className="text-faint">{(() => { try { const p = new URL(l.url).pathname; return p.length > 1 ? p : '' } catch { return '' } })()}</span></a>
              <ExternalLink size={12} className="text-faint" />
              <button aria-label="Remove link" onClick={() => onSave(links.filter((_, j) => j !== i))} className="text-faint opacity-0 hover:text-wine group-hover:opacity-100 focus:opacity-100"><X size={14} /></button>
            </li>
          )
        })}
      </ul>
      <form onSubmit={add} className="mt-2 flex items-center gap-2 rounded-lg border border-dashed border-line px-2.5 py-1.5 focus-within:border-faint">
        <Plus size={14} className="text-faint" />
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste a link" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-faint" />
      </form>
    </section>
  )
}

export default function IdeaPage({ id: idProp, panel = false, onClose }) {
  const params = useParams()
  const id = idProp ?? params.id
  const { mode } = useLayout()
  const ultra = mode === 'ultra' && !panel
  const nav = useNavigate()
  const { allIdeas, ideas, sessions, actions, updateIdea, trashIdea, restoreIdea, addAction, flash, status, person } = useStore()
  const idea = allIdeas.find((i) => i.id === id)
  const [todo, setTodo] = useState('')
  const [owner, setOwner] = useState(null)

  const mentions = useMemo(() => {
    if (!idea) return []
    const t = idea.title.trim().toLowerCase()
    return [
      ...ideas.filter((i) => i.id !== idea.id && linkedTitles(i.notes).includes(t)).map((i) => ({ key: i.id, to: `/idea/${i.id}`, title: i.title, stage: i.stage })),
      ...sessions.filter((s) => linkedTitles(`${s.notes}\n${s.decisions}`).includes(t)).map((s) => ({ key: s.id, to: `/sessions/${s.id}`, title: s.title, session: true })),
    ]
  }, [idea, ideas, sessions])

  if (!idea) {
    return status === 'loading'
      ? <p className="text-muted">Loading…</p>
      : <div><h1 className="text-3xl font-bold">This idea doesn't exist</h1><p className="mt-2 text-muted">It may have been deleted for good. <Link to="/board" className="text-wine">Back to the board</Link></p></div>
  }

  const myActions = actions.filter((a) => a.idea_id === idea.id)
  const move = (stage) => {
    if (stage === idea.stage) return
    updateIdea(idea.id, { stage, position: Date.now() / 1000 })
  }

  const addTodo = async (e) => {
    e.preventDefault()
    if (!todo.trim()) return
    await addAction({ text: todo.trim(), idea_id: idea.id, owner: owner ?? person })
    setTodo('')
  }

  return (
    <article>
      {panel ? (
        <div className="mb-5 flex items-center gap-2">
          <Link to={`/idea/${idea.id}`} className="inline-flex items-center gap-1.5 rounded-full bg-sunk px-3 py-1 text-xs font-semibold text-muted hover:text-ink"><Maximize2 size={12} /> Full page</Link>
          <button onClick={onClose} aria-label="Close panel" className="ml-auto grid size-8 place-items-center rounded-full text-muted hover:bg-sunk hover:text-ink"><X size={17} /></button>
        </div>
      ) : (
        <Link to="/board" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft size={15} /> Board</Link>
      )}

      {idea.deleted_at && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-sunk px-4 py-3 text-sm">
          <span className="text-muted">This idea is in the trash.</span>
          <Button variant="quiet" onClick={() => restoreIdea(idea.id)}>Restore</Button>
        </div>
      )}

      <Stepper idea={idea} onMove={move} />

      <header className="mt-5 max-w-3xl">
        <AutoText multiline rows={1} value={idea.title} onSave={(v) => v.trim() && updateIdea(idea.id, { title: v.replace(/\n/g, ' ').trim() })}
          className={`display font-extrabold leading-[1.02] tracking-[-0.015em] ${panel ? 'text-3xl' : 'text-4xl sm:text-[52px]'}`} placeholder="Name this idea" />
        <AutoText multiline rows={1} value={idea.pitch} onSave={(v) => updateIdea(idea.id, { pitch: v })}
          className="mt-2 text-lg text-muted" placeholder="One-line pitch: who buys it and why" />
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Type of product">
            {KINDS.map((k) => (
              <button key={k.id} role="radio" aria-checked={idea.kind === k.id} onClick={() => updateIdea(idea.id, { kind: k.id })}
                className={`rounded-full px-2.5 py-1 text-xs transition-colors ${idea.kind === k.id ? 'bg-ink text-card' : 'text-muted hover:bg-sunk'}`}>{k.name}</button>
            ))}
          </div>
          <span className="text-xs text-faint">Added by <PersonChip person={idea.created_by} small /> {timeAgo(idea.created_at)}</span>
          {idea.tags?.length > 0 && <span className="flex flex-wrap gap-1">{idea.tags.map((t) => <span key={t} className="rounded bg-sunk px-1.5 py-0.5 text-[11px] text-muted">#{t}</span>)}</span>}
        </div>
        {idea.raw_input && idea.raw_input !== idea.title && (
          <p className="mt-3 text-xs text-faint">You wrote: “{idea.raw_input}”</p>
        )}
      </header>

      {idea.stage === 'killed' && (
        <div className="mt-6 max-w-3xl rounded-xl border border-line bg-card p-4">
          <div className="mb-1 text-sm font-semibold">Why we passed</div>
          <AutoText multiline rows={2} value={idea.kill_reason} onSave={(v) => updateIdea(idea.id, { kill_reason: v })} className="text-sm" placeholder="Write the reason so you don't relitigate it later" />
        </div>
      )}

      {(() => {
        const research = <ResearchPanel idea={idea} />
        const notes = (
          <section>
            <h2 className="mb-2 text-xl font-bold">Notes</h2>
            <NotesEditor value={idea.notes} excludeId={idea.id} onSave={(v) => updateIdea(idea.id, { notes: v })}
              placeholder={'Who would buy this? What would it cost to make? Who already sells something like it?\n\n- Bullet points work\n- Type [[ to link another idea'} />
          </section>
        )
        const score = <div className="paper rounded-3xl bg-card p-4 sm:p-5"><ScorePanel ideaId={idea.id} /></div>
        const coach = (
          <section>
            <h2 className="mb-1 text-xl font-bold">Ask the coach</h2>
            <p className="mb-4 text-sm text-muted">It knows this idea, its research, your scores and notes. Both of you see the same chat.</p>
            <CoachChat ideaId={idea.id} />
          </section>
        )
        const side = (
          <div className="space-y-8">
            <IdeaTime idea={idea} />
            <Links idea={idea} onSave={(links) => updateIdea(idea.id, { links })} />
            <section>
              <h2 className="mb-2 text-sm font-bold">To-dos</h2>
              {myActions.length > 0 && <ul className="mb-2 space-y-1">{myActions.map((a) => <ActionItem key={a.id} a={a} />)}</ul>}
              <form onSubmit={addTodo} className="flex items-center gap-2 rounded-xl border border-dashed border-line px-2.5 py-1.5 focus-within:border-faint">
                <Plus size={14} className="text-faint" />
                <input value={todo} onChange={(e) => setTodo(e.target.value)} placeholder="Next step for this idea" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-faint" />
                <div className="flex gap-0.5">
                  {PEOPLE.map((p) => (
                    <button type="button" key={p.id} onClick={() => setOwner(p.id)} aria-label={`Assign to ${p.id}`} aria-pressed={(owner ?? person) === p.id}
                      className={`size-4 rounded-full transition-opacity ${(owner ?? person) === p.id ? 'opacity-100 ring-2 ring-offset-1 ring-offset-card' : 'opacity-30'}`}
                      style={{ background: p.hex, '--tw-ring-color': p.hex }} />
                  ))}
                </div>
              </form>
            </section>
            <section>
              <h2 className="mb-2 text-sm font-bold">Mentioned in</h2>
              {mentions.length
                ? <ul className="space-y-1">{mentions.map((m) => (
                    <li key={m.key}><Link to={m.to} className="flex items-center gap-2 text-sm hover:text-wine">{m.session ? <span className="text-xs text-faint">Session</span> : <StageDot stage={m.stage} />}<span className="truncate">{m.title}</span></Link></li>
                  ))}</ul>
                : <p className="text-sm text-faint">No other notes link here yet. Write [[{idea.title}]] anywhere to connect it.</p>}
            </section>
            {!idea.deleted_at && (
              <Button variant="danger" className="-ml-3" onClick={async () => { await trashIdea(idea.id); flash(`Moved “${idea.title}” to trash`); if (panel) onClose?.(); else nav('/board') }}>
                <Trash2 size={14} /> Move to trash
              </Button>
            )}
          </div>
        )
        if (ultra) {
          return (
            <div className="mt-10 grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)_260px] gap-10">
              <div className="min-w-0">{research}</div>
              <div className="min-w-0 space-y-10">{notes}{score}</div>
              <div className="min-w-0">{coach}</div>
              {side}
            </div>
          )
        }
        if (panel) return <div className="mt-8 space-y-10">{research}{score}{notes}{coach}{side}</div>
        return (
          <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="min-w-0 space-y-12">{research}{notes}{score}{coach}</div>
            {side}
          </div>
        )
      })()}
    </article>
  )
}
