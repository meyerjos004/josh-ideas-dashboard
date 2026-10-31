import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DndContext, DragOverlay, PointerSensor, TouchSensor, KeyboardSensor, useDraggable, useDroppable, useSensor, useSensors, closestCorners } from '@dnd-kit/core'
import { motion } from 'motion/react'
import { Plus } from 'lucide-react'
import { useStore } from '../lib/store'
import { STAGES, KINDS, kindName, personHex } from '../lib/constants'
import { Button, Modal } from '../components/ui'
import { ScoreBadge } from '../components/IdeaRow'
import { ResearchStatus } from '../components/Research'

function Card({ idea, overlay }) {
  return (
    <div className={`rounded-xl border bg-card p-3 ${overlay ? 'rotate-[1.5deg] border-faint shadow-[0_18px_40px_-16px_rgba(22,33,31,.45)]' : 'border-line'}`}>
      <div className="flex items-start gap-2">
        <span className="min-w-0 flex-1 text-[14px] font-medium leading-snug">{idea.title}</span>
        <ScoreBadge ideaId={idea.id} />
      </div>
      {idea.pitch && <p className="mt-1 line-clamp-2 text-xs text-muted">{idea.pitch}</p>}
      {idea.stage === 'killed' && idea.kill_reason && <p className="mt-1.5 line-clamp-2 text-xs italic text-faint">{idea.kill_reason}</p>}
      <div className="mt-2 flex items-center gap-2 text-[11px] text-faint">
        <span>{kindName(idea.kind)}</span>
        <ResearchStatus idea={idea} />
        <span className="ml-auto size-1.5 rounded-full" style={{ background: personHex(idea.created_by) }} title={`Added by ${idea.created_by}`} />
      </div>
    </div>
  )
}

function DraggableCard({ idea }) {
  const nav = useNavigate()
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: idea.id })
  return (
    <div ref={setNodeRef} {...listeners} {...attributes}
      onClick={() => nav(`/idea/${idea.id}`)}
      onKeyDown={(e) => { listeners?.onKeyDown?.(e); if (e.key === 'Enter' && !isDragging) nav(`/idea/${idea.id}`) }}
      className={`cursor-grab touch-manipulation active:cursor-grabbing ${isDragging ? 'opacity-30' : ''}`}>
      <Card idea={idea} />
    </div>
  )
}

function Column({ stage, ideas, onAdd }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })
  return (
    <section ref={setNodeRef} aria-label={stage.name}
      className={`flex w-[78vw] max-w-[280px] shrink-0 snap-start flex-col rounded-2xl p-2 transition-colors sm:w-auto sm:max-w-none ${isOver ? 'bg-sunk' : 'bg-sunk/45'}`}>
      <header className="flex h-8 items-center gap-2 px-1.5 pt-1">
        <span className="size-2.5 rounded-full" style={{ background: stage.color }} />
        <h2 className="display text-[15px] font-semibold">{stage.name}</h2>
        <span className="text-xs tabular-nums text-faint">{ideas.length}</span>
        {stage.id === 'dump' && (
          <button onClick={onAdd} aria-label="Add an idea" className="ml-auto grid size-6 place-items-center rounded-md text-muted hover:bg-card hover:text-ink"><Plus size={15} /></button>
        )}
      </header>
      <p className="px-1.5 pb-2 text-xs text-faint">{stage.hint}</p>
      <div className="flex min-h-24 flex-1 flex-col gap-2">
        {ideas.map((i) => (
          <motion.div key={i.id} layout="position" transition={{ type: 'spring', stiffness: 500, damping: 40 }}>
            <DraggableCard idea={i} />
          </motion.div>
        ))}
      </div>
    </section>
  )
}

export default function Board() {
  const { ideas, updateIdea, addIdea, flash } = useStore()
  const [active, setActive] = useState(null)
  const [killing, setKilling] = useState(null)
  const [reason, setReason] = useState('')
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ title: '', pitch: '', kind: 'unsure' })
  const [kindFilter, setKindFilter] = useState('all')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  )

  const byStage = useMemo(() => {
    const list = kindFilter === 'all' ? ideas : ideas.filter((i) => i.kind === kindFilter)
    const out = Object.fromEntries(STAGES.map((s) => [s.id, []]))
    list.forEach((i) => out[i.stage]?.push(i))
    Object.values(out).forEach((l) => l.sort((a, b) => b.position - a.position))
    return out
  }, [ideas, kindFilter])

  const onEnd = ({ active: a, over }) => {
    setActive(null)
    if (!over) return
    const idea = ideas.find((i) => i.id === a.id)
    if (!idea || idea.stage === over.id) return
    if (over.id === 'killed') { setKilling(idea); setReason(idea.kill_reason || ''); return }
    updateIdea(idea.id, { stage: over.id, position: Date.now() / 1000 })
    flash(`Moved “${idea.title}” to ${STAGES.find((s) => s.id === over.id).name}`)
  }

  const confirmKill = () => {
    updateIdea(killing.id, { stage: 'killed', kill_reason: reason.trim(), position: Date.now() / 1000 })
    flash(`Killed “${killing.title}”`)
    setKilling(null)
  }

  const createIdea = async () => {
    if (!draft.title.trim()) return
    const made = await addIdea(draft)
    if (made) { setAdding(false); setDraft({ title: '', pitch: '', kind: 'unsure' }) }
  }

  const activeIdea = ideas.find((i) => i.id === active)

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h1 className="text-4xl font-bold">Board</h1>
          <p className="mt-1 text-muted">Drag ideas right as they earn it. Everything ends up chosen or killed.</p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-full bg-sunk p-1" role="radiogroup" aria-label="Filter by type">
          {[{ id: 'all', name: 'All' }, ...KINDS].map((k) => (
            <button key={k.id} role="radio" aria-checked={kindFilter === k.id} onClick={() => setKindFilter(k.id)}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${kindFilter === k.id ? 'bg-card font-medium text-ink shadow-[0_1px_0_var(--color-line)]' : 'text-muted'}`}>
              {k.id === 'unsure' ? 'Unsure' : k.name}
            </button>
          ))}
        </div>
      </header>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={(e) => setActive(e.active.id)} onDragEnd={onEnd} onDragCancel={() => setActive(null)}>
        <div className="scroll-thin -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0">
          {STAGES.map((s) => <Column key={s.id} stage={s} ideas={byStage[s.id]} onAdd={() => setAdding(true)} />)}
        </div>
        <DragOverlay dropAnimation={{ duration: 180 }}>{activeIdea && <Card idea={activeIdea} overlay />}</DragOverlay>
      </DndContext>

      <Modal open={!!killing} onClose={() => setKilling(null)} label="Kill idea">
        <div className="p-5">
          <h2 className="text-2xl font-semibold">Kill “{killing?.title}”?</h2>
          <p className="mt-1 text-sm text-muted">Write down why. Future you will want to know before reviving it.</p>
          <textarea autoFocus rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="Too expensive to start, market's crowded, neither of us cares…"
            className="mt-4 w-full rounded-lg border border-line bg-paper p-3 text-sm outline-none focus:border-faint" />
          <div className="mt-4 flex justify-end gap-2">
            <Button onClick={() => setKilling(null)}>Keep it</Button>
            <Button variant="primary" onClick={confirmKill}>Kill idea</Button>
          </div>
        </div>
      </Modal>

      <Modal open={adding} onClose={() => setAdding(false)} label="Add idea">
        <form className="p-5" onSubmit={(e) => { e.preventDefault(); createIdea() }}>
          <h2 className="text-2xl font-semibold">New idea</h2>
          <input autoFocus value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Name it in a few words"
            className="mt-4 w-full rounded-lg border border-line bg-paper px-3 py-2 outline-none focus:border-faint" />
          <textarea rows={2} value={draft.pitch} onChange={(e) => setDraft({ ...draft, pitch: e.target.value })} placeholder="One-line pitch (optional)"
            className="mt-2 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-faint" />
          <div className="mt-3 flex flex-wrap gap-1">
            {KINDS.map((k) => (
              <button type="button" key={k.id} onClick={() => setDraft({ ...draft, kind: k.id })}
                className={`rounded-full px-2.5 py-1 text-xs ${draft.kind === k.id ? 'bg-ink text-card' : 'bg-sunk text-muted'}`}>{k.name}</button>
            ))}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" onClick={() => setAdding(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={!draft.title.trim()}>Add to Dump</Button>
          </div>
        </form>
      </Modal>

      {ideas.length === 0 && (
        <p className="mt-6 text-center text-sm text-muted">The board fills up from <Link to="/" className="font-medium text-wine">Today</Link>. Dump a few ideas first.</p>
      )}
    </div>
  )
}
