import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { DndContext, DragOverlay, PointerSensor, TouchSensor, KeyboardSensor, useDraggable, useDroppable, useSensor, useSensors, closestCorners } from '@dnd-kit/core'
import { motion, AnimatePresence } from 'motion/react'
import { Plus } from 'lucide-react'
import { useStore } from '../lib/store'
import { STAGES, KINDS, kindName, personHex } from '../lib/constants'
import { Button, Modal } from '../components/ui'
import { ScoreBadge } from '../components/IdeaRow'
import { ResearchStatus } from '../components/Research'
import PaperCard from '../components/PaperCard'
import IdeaPage from './IdeaPage'
import { useLayout } from '../lib/layout'

function Card({ idea, overlay, i = 0, selected }) {
  return (
    <div className={`${overlay ? 'rotate-[2deg] scale-[1.03] drop-shadow-xl' : ''} ${selected ? 'rounded-2xl ring-2 ring-wine ring-offset-2 ring-offset-paper' : ''}`}>
      <PaperCard idea={idea} i={overlay ? 3 : i} as="div" />
    </div>
  )
}

// Keep the old card helpers referenced elsewhere happy
void ScoreBadge; void ResearchStatus; void kindName; void personHex

function DraggableCard({ idea, i, onOpen, selected }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: idea.id })
  return (
    <div ref={setNodeRef} {...listeners} {...attributes}
      onClick={() => onOpen(idea.id)}
      onKeyDown={(e) => { listeners?.onKeyDown?.(e); if (e.key === 'Enter' && !isDragging) onOpen(idea.id) }}
      className={`cursor-grab touch-manipulation active:cursor-grabbing ${isDragging ? 'opacity-30' : ''}`}>
      <Card idea={idea} i={i} selected={selected} />
    </div>
  )
}

function Column({ stage, ideas, onAdd, onOpen, openId, tall, flash }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })
  return (
    <section ref={setNodeRef} id={`col-${stage.id}`} aria-label={stage.name}
      className={`flex w-[78vw] max-w-[300px] shrink-0 snap-start flex-col rounded-3xl p-2.5 transition-colors sm:w-auto sm:max-w-none ${isOver ? 'bg-sunk' : 'bg-sunk/50'} ${flash ? 'ring-2 ring-wine/50' : ''} ${tall ? 'min-h-0' : ''}`}>
      <header className="flex h-8 items-center gap-2 px-1.5 pt-1">
        <span className="size-2.5 rounded-full" style={{ background: stage.color }} />
        <h2 className="display text-[16px] font-extrabold tracking-[-0.01em]">{stage.name}</h2>
        <span className="text-xs tabular-nums text-faint">{ideas.length}</span>
        {stage.id === 'dump' && (
          <button onClick={onAdd} aria-label="Add an idea" className="ml-auto grid size-6 place-items-center rounded-md text-muted hover:bg-card hover:text-ink"><Plus size={15} /></button>
        )}
      </header>
      <p className="px-1.5 pb-2 text-xs text-faint">{stage.hint}</p>
      <div className={`flex min-h-24 flex-1 flex-col gap-3 px-0.5 pb-1 pt-1 ${tall ? 'overflow-y-auto scroll-thin' : ''}`}>
        {ideas.map((i, k) => (
          <motion.div key={i.id} layout="position" transition={{ type: 'spring', stiffness: 500, damping: 40 }}>
            <DraggableCard idea={i} i={k} onOpen={onOpen} selected={openId === i.id} />
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
  const { mode } = useLayout()
  const ultra = mode === 'ultra'
  const nav = useNavigate()
  const loc = useLocation()
  const [openId, setOpenId] = useState(null)
  const [flashCol, setFlashCol] = useState(null)
  const onOpen = (id) => (ultra ? setOpenId((cur) => (cur === id ? null : id)) : nav(`/idea/${id}`))
  // /board#validating scrolls to and briefly highlights that column
  useEffect(() => {
    const id = loc.hash.replace('#', '')
    if (!id) return
    document.getElementById(`col-${id}`)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    setFlashCol(id); const t = setTimeout(() => setFlashCol(null), 1200)
    return () => clearTimeout(t)
  }, [loc.hash])
  useEffect(() => { if (openId && !ideas.some((i) => i.id === openId)) setOpenId(null) }, [ideas, openId])

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
          <h1 className="text-[40px] font-extrabold leading-none tracking-[-0.02em]">Board</h1>
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
        <div className={ultra ? 'relative' : ''}>
          <div className={ultra
            ? 'grid h-[calc(100dvh-190px)] grid-cols-5 gap-4'
            : 'scroll-thin -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0'}>
            {STAGES.map((s) => <Column key={s.id} stage={s} ideas={byStage[s.id]} onAdd={() => setAdding(true)} onOpen={onOpen} openId={openId} tall={ultra} flash={flashCol === s.id} />)}
          </div>
          <AnimatePresence>
            {ultra && openId && (
              <motion.aside key="panel" aria-label="Idea details" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ type: 'spring', stiffness: 380, damping: 36 }}
                className="absolute right-0 top-0 z-20 h-[calc(100dvh-190px)] w-[min(680px,60%)] overflow-y-auto rounded-[28px] border border-line bg-card p-7 shadow-[0_30px_80px_-30px_rgb(0_0_0/.45)] scroll-thin">
                <IdeaPage id={openId} panel onClose={() => setOpenId(null)} />
              </motion.aside>
            )}
          </AnimatePresence>
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
