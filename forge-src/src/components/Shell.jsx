import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Home, Columns3, Radar, NotebookPen, Search, Trash2, ArrowLeftRight } from 'lucide-react'
import { useStore } from '../lib/store'
import { PEOPLE, personHex } from '../lib/constants'
import { Modal, StageDot } from './ui'

const NAV = [
  { to: '/', label: 'Today', icon: Home, end: true },
  { to: '/board', label: 'Board', icon: Columns3 },
  { to: '/compare', label: 'Compare', icon: Radar },
  { to: '/sessions', label: 'Sessions', icon: NotebookPen },
]

function Mark() {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="8" fill="var(--color-wine)" />
      <path d="M9 23V9h14M9 16h10" stroke="#F9FBF8" strokeWidth="3.2" fill="none" strokeLinecap="round" />
    </svg>
  )
}

function SearchBox({ open, onClose }) {
  const { ideas, sessions } = useStore()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [i, setI] = useState(0)
  useEffect(() => { if (open) { setQ(''); setI(0) } }, [open])
  const hits = useMemo(() => {
    const t = q.trim().toLowerCase()
    const all = [
      ...ideas.map((x) => ({ id: x.id, kind: 'idea', title: x.title, sub: x.pitch || x.notes, stage: x.stage, to: `/idea/${x.id}`, hay: `${x.title} ${x.pitch} ${x.notes}` })),
      ...sessions.map((s) => ({ id: s.id, kind: 'session', title: s.title, sub: s.notes, to: `/sessions/${s.id}`, hay: `${s.title} ${s.notes} ${s.decisions}` })),
    ]
    if (!t) return all.slice(0, 8)
    return all.filter((x) => x.hay.toLowerCase().includes(t)).slice(0, 12)
  }, [q, ideas, sessions])
  const go = (h) => { if (h) { nav(h.to); onClose() } }
  return (
    <Modal open={open} onClose={onClose} label="Search">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <Search size={18} className="text-faint" />
        <input autoFocus value={q} onChange={(e) => { setQ(e.target.value); setI(0) }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setI((v) => Math.min(v + 1, hits.length - 1)) }
            if (e.key === 'ArrowUp') { e.preventDefault(); setI((v) => Math.max(v - 1, 0)) }
            if (e.key === 'Enter') go(hits[i])
          }}
          placeholder="Search ideas, notes and sessions" className="flex-1 bg-transparent text-base outline-none placeholder:text-faint" />
      </div>
      <ul className="max-h-[50vh] overflow-y-auto p-2">
        {hits.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">Nothing matches “{q}”. Try another word.</li>}
        {hits.map((h, k) => (
          <li key={h.kind + h.id}>
            <button onMouseEnter={() => setI(k)} onClick={() => go(h)}
              className={`flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left ${k === i ? 'bg-sunk' : ''}`}>
              <span className="mt-1.5">{h.kind === 'idea' ? <StageDot stage={h.stage} /> : <NotebookPen size={12} className="text-faint" />}</span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{h.title}</span>
                {h.sub && <span className="block truncate text-xs text-muted">{h.sub}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  )
}

export function PersonGate() {
  const { setPerson } = useStore()
  return (
    <div className="grid min-h-dvh place-items-center px-5">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Mark />
        <h1 className="mt-6 text-5xl font-bold sm:text-6xl">Forge</h1>
        <p className="mt-3 max-w-sm text-lg text-muted">Where we dump ideas, argue about them, and pick the one we're building.</p>
        <p className="mt-10 mb-3 text-sm font-medium">Who's here?</p>
        <div className="grid grid-cols-2 gap-3">
          {PEOPLE.map((p) => (
            <button key={p.id} onClick={() => setPerson(p.id)}
              className="group rounded-2xl border border-line bg-card p-5 text-left transition-colors hover:border-faint">
              <span className="block size-8 rounded-full transition-transform group-hover:scale-110" style={{ background: p.hex }} />
              <span className="display mt-4 block text-2xl font-semibold">{p.id}</span>
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs text-faint">Saved on this device. Switch anytime from the menu.</p>
      </motion.div>
    </div>
  )
}

export default function Shell() {
  const { person, setPerson, toast, status, trash } = useStore()
  const [searching, setSearching] = useState(false)
  const loc = useLocation()
  const main = useRef()

  useEffect(() => {
    const k = (e) => {
      const typing = /INPUT|TEXTAREA/.test(document.activeElement?.tagName)
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) { e.preventDefault(); setSearching(true) }
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])
  useEffect(() => { window.scrollTo(0, 0) }, [loc.pathname])

  const other = PEOPLE.find((p) => p.id !== person)?.id

  return (
    <div className="min-h-dvh overflow-x-clip md:pl-[220px]">
      {/* desktop rail */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[220px] flex-col border-r border-line bg-paper px-3 py-5 md:flex">
        <NavLink to="/" className="mb-6 flex items-center gap-2.5 px-2">
          <Mark /><span className="display text-xl font-bold">Forge</span>
        </NavLink>
        <button onClick={() => setSearching(true)} className="mb-4 flex items-center gap-2 rounded-lg border border-line bg-card px-2.5 py-1.5 text-sm text-faint hover:text-muted">
          <Search size={15} /> Search <kbd className="ml-auto rounded border border-line px-1 text-[10px]">⌘K</kbd>
        </button>
        <nav className="space-y-0.5">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${isActive ? 'bg-card font-medium text-ink shadow-[0_1px_0_var(--color-line)]' : 'text-muted hover:text-ink'}`}>
              <Icon size={17} strokeWidth={1.8} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-1">
          <NavLink to="/trash" className={({ isActive }) => `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm ${isActive ? 'bg-card text-ink' : 'text-faint hover:text-muted'}`}>
            <Trash2 size={16} strokeWidth={1.8} /> Trash {trash.length > 0 && <span className="ml-auto text-xs tabular-nums">{trash.length}</span>}
          </NavLink>
          <button onClick={() => setPerson(other)} title={`Switch to ${other}`}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm hover:bg-sunk">
            <span className="size-5 rounded-full" style={{ background: personHex(person) }} />
            <span className="font-medium">{person}</span>
            <ArrowLeftRight size={14} className="ml-auto text-faint" />
          </button>
        </div>
      </aside>

      {/* mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-paper/90 px-4 py-2.5 backdrop-blur md:hidden">
        <NavLink to="/" className="flex items-center gap-2"><Mark /><span className="display text-lg font-bold">Forge</span></NavLink>
        <button onClick={() => setSearching(true)} aria-label="Search" className="ml-auto grid size-9 place-items-center rounded-lg text-muted"><Search size={19} /></button>
        <button onClick={() => setPerson(other)} aria-label={`Switch to ${other}`} className="grid size-9 place-items-center">
          <span className="size-6 rounded-full ring-2 ring-card" style={{ background: personHex(person) }} />
        </button>
      </header>

      <main ref={main} className="mx-auto w-full max-w-[1180px] px-4 pb-28 pt-6 sm:px-6 md:pb-16 md:pt-10">
        {status === 'error'
          ? <p className="rounded-xl border border-wine/30 bg-wine-soft px-4 py-3 text-sm text-wine">Couldn't reach the database. Check your connection and reload.</p>
          : <Outlet />}
      </main>

      {/* mobile tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 text-[11px] ${isActive ? 'text-wine' : 'text-faint'}`}>
            <Icon size={20} strokeWidth={1.8} /> {label}
          </NavLink>
        ))}
      </nav>

      <SearchBox open={searching} onClose={() => setSearching(false)} />

      <AnimatePresence>
        {toast && (
          <motion.div key={toast.id} role="status" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            className="fixed bottom-20 left-1/2 z-50 max-w-[90vw] -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm text-card shadow-lg md:bottom-6">
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
