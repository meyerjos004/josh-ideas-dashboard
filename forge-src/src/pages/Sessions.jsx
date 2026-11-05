import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Plus, Trash2, X } from 'lucide-react'
import { motion } from 'motion/react'
import { useStore } from '../lib/store'
import { PEOPLE, personHex } from '../lib/constants'
import { AutoText, Button, Empty, Modal } from '../components/ui'
import NotesEditor from '../components/NotesEditor'

export function ActionItem({ a, showSource }) {
  const { updateAction, deleteAction, allIdeas, sessions, person } = useStore()
  const src = showSource && (a.idea_id ? allIdeas.find((i) => i.id === a.idea_id) : sessions.find((s) => s.id === a.session_id))
  const srcTo = a.idea_id ? `/idea/${a.idea_id}` : `/sessions/${a.session_id}`
  const next = PEOPLE.find((p) => p.id !== a.owner)?.id ?? PEOPLE[0].id
  return (
    <li className="group flex items-start gap-2.5 py-1">
      <button onClick={() => updateAction(a.id, { done: !a.done })} aria-label={a.done ? 'Mark not done' : 'Mark done'}
        className={`mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-[5px] border transition-colors ${a.done ? 'border-forest bg-forest text-card' : 'border-faint bg-card hover:border-ink'}`}>
        {a.done && <motion.span initial={{ scale: .4 }} animate={{ scale: 1 }}><Check size={12} strokeWidth={3} /></motion.span>}
      </button>
      <span className="min-w-0 flex-1 text-sm">
        <span className={a.done ? 'text-faint line-through' : ''}>{a.text}</span>
        {src && <Link to={srcTo} className="block truncate text-xs text-faint hover:text-muted">{src.title}</Link>}
      </span>
      <button onClick={() => updateAction(a.id, { owner: next, assigned_by: person })} title={`${a.owner || 'Nobody'} — click to hand to ${next}`}
        className="mt-1 size-3 shrink-0 rounded-full" style={{ background: personHex(a.owner) }} aria-label={`Owner ${a.owner}. Hand to ${next}`} />
      <button onClick={() => deleteAction(a.id)} aria-label="Delete to-do" className="mt-0.5 text-faint opacity-0 hover:text-wine group-hover:opacity-100 focus:opacity-100"><X size={14} /></button>
    </li>
  )
}

export default function Sessions() {
  const { sessions, actions, addSession } = useStore()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const sorted = [...sessions].sort((a, b) => (b.held_on + b.created_at).localeCompare(a.held_on + a.created_at))

  const start = async (e) => {
    e.preventDefault()
    const t = title.trim() || `Brainstorm, ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
    const s = await addSession(t)
    if (s) { setOpen(false); setTitle(''); nav(`/sessions/${s.id}`) }
  }

  return (
    <div className="max-w-3xl">
      <header className="mb-8 flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h1 className="text-[40px] font-extrabold leading-none tracking-[-0.02em]">Sessions</h1>
          <p className="mt-1 text-muted">Every time you sit down together, log what you talked about and what you decided.</p>
        </div>
        <Button variant="primary" onClick={() => setOpen(true)}><Plus size={15} /> Start a session</Button>
      </header>

      {sorted.length === 0 ? (
        <Empty action={<Button variant="primary" onClick={() => setOpen(true)}>Start your first session</Button>}>
          No sessions yet. Start one next time you all talk business, even if it's 10 minutes.
        </Empty>
      ) : (
        <ol className="relative space-y-3 border-l border-line pl-6">
          {sorted.map((s) => {
            const open = actions.filter((a) => a.session_id === s.id && !a.done).length
            const d = new Date(s.held_on + 'T12:00')
            return (
              <li key={s.id} className="relative">
                <span className="absolute -left-[29px] top-5 size-2.5 rounded-full border-2 border-paper bg-wine" />
                <Link to={`/sessions/${s.id}`} className="block rounded-xl border border-line bg-card p-4 hover:border-faint">
                  <div className="flex items-baseline gap-3">
                    <span className="display text-lg font-semibold">{s.title}</span>
                    <span className="ml-auto shrink-0 text-xs text-faint">{d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                  </div>
                  {s.decisions && <p className="mt-1 line-clamp-2 whitespace-pre-line text-sm text-muted">{s.decisions}</p>}
                  {open > 0 && <p className="mt-2 text-xs text-faint">{open} open to-do{open === 1 ? '' : 's'}</p>}
                </Link>
              </li>
            )
          })}
        </ol>
      )}

      <Modal open={open} onClose={() => setOpen(false)} label="Start a session">
        <form className="p-5" onSubmit={start}>
          <h2 className="text-2xl font-semibold">Start a session</h2>
          <p className="mt-1 text-sm text-muted">Give it a name, or leave it blank and we'll date it.</p>
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What's this one about?"
            className="mt-4 w-full rounded-lg border border-line bg-paper px-3 py-2 outline-none focus:border-faint" />
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Start session</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export function SessionPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const { sessions, actions, updateSession, deleteSession, addAction, person, status } = useStore()
  const s = sessions.find((x) => x.id === id)
  const [todo, setTodo] = useState('')
  const [owner, setOwner] = useState(null)
  const [confirm, setConfirm] = useState(false)

  if (!s) return status === 'loading' ? <p className="text-muted">Loading…</p>
    : <div><h1 className="text-3xl font-bold">This session doesn't exist</h1><Link to="/sessions" className="mt-2 inline-block text-wine">Back to sessions</Link></div>

  const items = actions.filter((a) => a.session_id === s.id)
  const addTodo = async (e) => {
    e.preventDefault()
    if (!todo.trim()) return
    await addAction({ text: todo.trim(), session_id: s.id, owner: owner ?? person })
    setTodo('')
  }

  return (
    <article className="max-w-3xl">
      <Link to="/sessions" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft size={15} /> Sessions</Link>
      <input type="date" value={s.held_on} onChange={(e) => e.target.value && updateSession(s.id, { held_on: e.target.value })}
        className="block bg-transparent text-sm text-muted outline-none" aria-label="Date" />
      <AutoText value={s.title} onSave={(v) => v.trim() && updateSession(s.id, { title: v.trim() })} className="display mt-1 text-4xl font-bold" />

      <section className="mt-10">
        <h2 className="mb-2 text-xl font-semibold">What we talked about</h2>
        <NotesEditor value={s.notes} onSave={(v) => updateSession(s.id, { notes: v })} minRows={5}
          placeholder={'Rough notes. Mention ideas with [[ so they link up.'} />
      </section>

      <section className="mt-10">
        <h2 className="mb-2 text-xl font-semibold">What we decided</h2>
        <div className="rounded-xl border-l-4 border-forest bg-card p-4">
          <AutoText multiline rows={3} value={s.decisions} onSave={(v) => updateSession(s.id, { decisions: v })}
            placeholder="The calls you made. One per line." className="text-[15px] leading-relaxed" />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-2 text-xl font-semibold">Who does what</h2>
        {items.length > 0 && <ul className="mb-2">{items.map((a) => <ActionItem key={a.id} a={a} />)}</ul>}
        <form onSubmit={addTodo} className="flex items-center gap-2 rounded-lg border border-dashed border-line px-3 py-2 focus-within:border-faint">
          <Plus size={15} className="text-faint" />
          <input value={todo} onChange={(e) => setTodo(e.target.value)} placeholder="Add a to-do and pick who owns it" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-faint" />
          <div className="flex items-center gap-1.5">
            {PEOPLE.map((p) => (
              <button type="button" key={p.id} onClick={() => setOwner(p.id)} aria-pressed={(owner ?? person) === p.id}
                className={`rounded-full px-2 py-0.5 text-xs transition-colors ${(owner ?? person) === p.id ? 'text-card' : 'text-muted'}`}
                style={(owner ?? person) === p.id ? { background: p.hex } : undefined}>{p.id}</button>
            ))}
          </div>
        </form>
      </section>

      <Button variant="danger" className="-ml-3 mt-12" onClick={() => setConfirm(true)}><Trash2 size={14} /> Delete session</Button>
      <Modal open={confirm} onClose={() => setConfirm(false)} label="Delete session">
        <div className="p-5">
          <h2 className="text-2xl font-semibold">Delete this session?</h2>
          <p className="mt-1 text-sm text-muted">Its notes, decisions and to-dos go with it. This can't be undone.</p>
          <div className="mt-5 flex justify-end gap-2">
            <Button onClick={() => setConfirm(false)}>Keep it</Button>
            <Button variant="primary" onClick={async () => { await deleteSession(s.id); nav('/sessions') }}>Delete session</Button>
          </div>
        </div>
      </Modal>
    </article>
  )
}
