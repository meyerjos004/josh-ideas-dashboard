import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Home, Columns3, Radar, NotebookPen, Search, Trash2, Timer, MessageCircle, Map, Settings2, Ellipsis, LogOut, Gamepad2, Wrench, CalendarCheck } from 'lucide-react'
import { ArcadeTile, ArcadeWindow } from './Arcade'
import { AppWelcome } from './Onboarding'
import { flushOutbox } from '../lib/outbox'
import { useLayout } from '../lib/layout'
import { usePrefs } from '../lib/prefs'
import { ClockPanel, ClockPill } from './Clock'
import { useStore } from '../lib/store'
import { personHex, MOD, STAGES } from '../lib/constants'
import { Modal, StageDot } from './ui'

const NAV = [
  { to: '/', label: 'Today', icon: Home, end: true },
  { to: '/board', label: 'Board', icon: Columns3 },
  { to: '/coach', label: 'Coach', icon: MessageCircle },
  { to: '/roadmap', label: 'Roadmap', icon: Map },
  { to: '/compare', label: 'Compare', icon: Radar },
  { to: '/sessions', label: 'Sessions', icon: NotebookPen },
  { to: '/hours', label: 'Hours', icon: Timer },
  { to: '/week', label: 'Your week', icon: CalendarCheck },
]
const MOBILE_TABS = NAV.slice(0, 4)
const MOBILE_MORE = [...NAV.slice(4), { to: '/trash', label: 'Trash', icon: Trash2 }, { to: '/setup', label: 'Setup', icon: Wrench }, { to: '/settings', label: 'Settings', icon: Settings2 }]

function Mark({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="9" fill="var(--color-wine)" />
      <path d="M9 23V9h14M9 16h10" stroke="var(--color-card)" strokeWidth="3.2" fill="none" strokeLinecap="round" />
    </svg>
  )
}

function Wordmark({ small }) {
  return <span className={`display font-extrabold tracking-[-0.02em] ${small ? 'text-lg' : 'text-[22px]'}`}>forge<span className="text-wine">.</span></span>
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

export function LoginGate() {
  const { signIn, register, authChecked, signedIn, member, signOut } = useStore()
  const [mode, setMode] = useState('in') // in | new
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  if (!authChecked || (signedIn && !member)) return <div className="grid min-h-dvh place-items-center text-sm text-muted">Loading…</div>

  if (signedIn && member && !member.person) {
    return (
      <div className="grid min-h-dvh place-items-center px-5 text-center">
        <div className="max-w-sm">
          <h1 className="text-3xl font-bold">This account isn't part of Forge</h1>
          <p className="mt-2 text-muted">Ask Josh to add your email, then sign in again.</p>
          <button onClick={signOut} className="mt-5 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-card">Sign out</button>
        </div>
      </div>
    )
  }

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr('')
    const m = mode === 'in' ? await signIn(email, pw) : await register(email, pw)
    setBusy(false)
    if (m) setErr(m)
  }
  const field = 'mt-1 w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-[15px] outline-none focus:border-faint'
  return (
    <div className="grid min-h-dvh place-items-center px-5 py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="flex items-center gap-2.5"><Mark size={30} /><Wordmark /></div>
        <h1 className="mt-8 text-[44px] font-extrabold leading-[0.95] tracking-[-0.02em]">What are we building?</h1>
        <p className="mt-3 text-muted">The idea board for Josh, Jake and Collin. {mode === 'in' ? 'Sign in to continue.' : 'Set a password for your invited email.'}</p>
        <form onSubmit={submit} className="paper tilt-l mt-8 rounded-2xl bg-card p-5">
          <label className="block text-sm font-semibold">Email
            <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
          </label>
          <label className="mt-3 block text-sm font-semibold">{mode === 'in' ? 'Password' : 'Choose a password'}
            <input type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} className={field} />
          </label>
          {err && <p role="alert" className="mt-3 text-sm font-medium text-wine">{err}</p>}
          <button type="submit" disabled={busy} className="mt-4 w-full rounded-full bg-wine py-2.5 font-bold text-card disabled:opacity-50">
            {busy ? 'One sec…' : mode === 'in' ? 'Sign in' : 'Create my account'}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-muted">
          {mode === 'in' ? 'First time here? ' : 'Already set up? '}
          <button onClick={() => { setMode(mode === 'in' ? 'new' : 'in'); setErr('') }} className="font-semibold text-wine underline underline-offset-2">
            {mode === 'in' ? 'Set up your account' : 'Sign in'}
          </button>
        </p>
      </motion.div>
    </div>
  )
}

function StageCounts() {
  const { ideas } = useStore()
  return (
    <div className="space-y-0.5">
      {STAGES.map((st) => {
        const n = ideas.filter((i) => i.stage === st.id).length
        return (
          <NavLink key={st.id} to={st.id === 'killed' ? '/kill-log' : `/board#${st.id}`} className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] text-muted hover:bg-card/60 hover:text-ink">
            <span className="size-2 rounded-[3px]" style={{ background: st.color }} />
            {st.name}
            <span className="ml-auto tabular-nums text-faint">{n}</span>
          </NavLink>
        )
      })}
    </div>
  )
}

function AccountRow() {
  const { person, member, signOut } = useStore()
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm hover:bg-card/60">
        <span className="size-6 rounded-full ring-2 ring-card" style={{ background: personHex(person) }} />
        <span className="font-semibold">{person}</span>
        <span className="ml-auto text-xs text-faint">Account</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
            className="absolute bottom-full left-0 right-0 z-40 mb-2 space-y-2 rounded-2xl border border-line bg-card p-3 shadow-xl">
            <div className="truncate px-1 text-xs text-muted">{member?.email}</div>
            <NavLink to="/settings" onClick={() => setOpen(false)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted hover:bg-sunk hover:text-ink"><Settings2 size={14} /> Settings</NavLink>
            <button onClick={signOut} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted hover:bg-sunk hover:text-ink"><LogOut size={14} /> Sign out</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Shell() {
  const { person, toast, status, trash, aiReady, signOut, time, forgeIdea, flash } = useStore()
  // Send any ideas that were saved with no signal
  useEffect(() => {
    if (!person) return
    const go = async () => { const n = await flushOutbox((t, k) => forgeIdea(t, k)); if (n) flash(`Sent ${n} idea${n === 1 ? '' : 's'} saved while offline.`) }
    go()
    window.addEventListener('online', go)
    return () => window.removeEventListener('online', go)
  }, [person, forgeIdea, flash])
  const [searching, setSearching] = useState(false)
  const [more, setMore] = useState(false)
  const [arcade, setArcade] = useState(false)
  const loc = useLocation()
  const { mode, h, w } = useLayout()

  useEffect(() => {
    const k = (e) => {
      const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) { e.preventDefault(); setSearching(true) }
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])
  useEffect(() => { window.scrollTo(0, 0) }, [loc.pathname])

  const rail = mode === 'phone' ? 0 : mode === 'ultra' ? 248 : 228
  // Layout B: a centered stage; on big screens the margins become a living scene
  const avail = w - rail
  const prefs = usePrefs()
  const stageW = prefs.width === 'full' ? avail : avail >= 2200 ? 1600 : avail >= 1700 ? 1440 : avail
  const margin = Math.max(0, (avail - stageW) / 2)
  const framed = margin >= 170
  const clocked = useMemo(() => {
    const out = {}
    for (const t of time) if (!t.ended_at) out[t.person] = true
    return out
  }, [time])
  const mainW = framed ? 'px-10 2xl:px-12' : mode === 'wide' ? 'max-w-[1480px] px-6 lg:px-10' : 'max-w-[1180px] px-4 sm:px-6'

  return (
    <div className={`min-h-dvh overflow-x-clip ${framed ? 'bg-sunk/60' : ''}`} style={{ paddingLeft: rail, '--rail': `${rail}px` }}>
      <AppWelcome />
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden flex-col overflow-y-auto border-r border-line bg-paper px-3 py-5 scroll-thin md:flex" style={{ width: rail }}>
        <NavLink to="/" className="mb-5 flex items-center gap-2 px-2"><Mark /><Wordmark small /></NavLink>
        <button onClick={() => setSearching(true)} className="mb-4 flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-1.5 text-sm text-faint hover:text-muted">
          <Search size={15} /> Search <kbd className="ml-auto rounded border border-line px-1 font-sans text-[10px]">{MOD}+K</kbd>
        </button>
        <nav className="space-y-0.5" aria-label="Main">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => `flex items-center gap-2.5 rounded-xl px-2.5 py-[7px] text-[14px] transition-colors ${isActive ? 'bg-card font-semibold text-ink shadow-[0_1px_0_var(--color-line)]' : 'text-muted hover:text-ink'}`}>
              <Icon size={17} strokeWidth={1.9} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="mb-1.5 mt-6 px-2.5 text-xs font-semibold text-faint">Stages</div>
        <StageCounts />

        <div className="mt-auto space-y-1 pt-6">
          {h >= 960 && <ArcadeTile onOpen={() => setArcade(true)} className="mb-3 w-full" />}
          <div className="mb-3"><ClockPanel /></div>
          <NavLink to="/setup" className={({ isActive }) => `flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] ${isActive ? 'bg-card text-ink' : 'text-faint hover:text-muted'}`}>
            <Wrench size={15} strokeWidth={1.8} /> Setup {aiReady === false && <span className="ml-auto size-2 rounded-full bg-wine" title="AI not connected" />}
          </NavLink>
          <NavLink to="/trash" className={({ isActive }) => `flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] ${isActive ? 'bg-card text-ink' : 'text-faint hover:text-muted'}`}>
            <Trash2 size={15} strokeWidth={1.8} /> Trash {trash.length > 0 && <span className="ml-auto text-xs tabular-nums">{trash.length}</span>}
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] ${isActive ? 'bg-card text-ink' : 'text-faint hover:text-muted'}`}>
            <Settings2 size={15} strokeWidth={1.8} /> Settings
          </NavLink>
          {h < 960 && (
            <button onClick={() => setArcade(true)} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] text-faint hover:text-muted"><Gamepad2 size={15} strokeWidth={1.8} /> Arcade</button>
          )}
          <AccountRow />
        </div>
      </aside>

      {/* phone top bar */}
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-paper/90 px-4 py-2.5 backdrop-blur md:hidden">
        <NavLink to="/" className="flex items-center gap-2"><Mark /><Wordmark small /></NavLink>
        <div className="ml-auto"><ClockPill /></div>
        <button onClick={() => setSearching(true)} aria-label="Search" className="grid size-9 place-items-center rounded-lg text-muted"><Search size={19} /></button>
        <button onClick={() => setMore(true)} aria-label="Account and more" className="grid size-9 place-items-center">
          <span className="size-6 rounded-full ring-2 ring-card" style={{ background: personHex(person) }} />
        </button>
      </header>

      <main className={`relative z-10 mx-auto w-full pb-28 pt-6 md:pb-16 md:pt-9 ${mainW} ${framed ? 'min-h-dvh border-x border-line bg-paper shadow-[0_0_60px_-30px_rgb(0_0_0/.18)]' : ''}`}
        style={framed ? { maxWidth: stageW } : undefined}>
        {status === 'error'
          ? <p className="rounded-xl border border-wine/30 bg-wine-soft px-4 py-3 text-sm text-wine">Couldn't reach the database. Check your connection and reload.</p>
          : <Outlet />}
      </main>

      {/* phone tabs */}
      <nav aria-label="Main" className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+10px)] z-30 grid grid-cols-5 rounded-full border border-line bg-card/95 shadow-lg backdrop-blur md:hidden">
        {MOBILE_TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 text-[11px] ${isActive ? 'font-bold text-wine' : 'text-faint'}`}>
            <Icon size={20} strokeWidth={1.9} /> {label}
          </NavLink>
        ))}
        <button onClick={() => setMore(true)} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${MOBILE_MORE.some((m) => loc.pathname.startsWith(m.to)) ? 'font-bold text-wine' : 'text-faint'}`}>
          <Ellipsis size={20} strokeWidth={1.9} /> More
        </button>
      </nav>

      <AnimatePresence>
        {more && (
          <motion.div className="fixed inset-0 z-40 bg-ink/25 md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMore(false)}>
            <motion.div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-card px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 420, damping: 38 }} onClick={(e) => e.stopPropagation()}>
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
              <div className="grid grid-cols-3 gap-2">
                {MOBILE_MORE.map(({ to, label, icon: Icon }) => (
                  <NavLink key={to} to={to} onClick={() => setMore(false)}
                    className={({ isActive }) => `flex flex-col items-center gap-1.5 rounded-2xl py-4 text-sm ${isActive ? 'bg-wine-soft text-wine' : 'bg-sunk text-ink'}`}>
                    <Icon size={22} strokeWidth={1.8} /> {label}
                  </NavLink>
                ))}
                <button onClick={() => { setMore(false); setArcade(true) }} className="flex flex-col items-center gap-1.5 rounded-2xl bg-sunk py-4 text-sm text-ink"><Gamepad2 size={22} strokeWidth={1.8} /> Arcade</button>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <span className="size-7 rounded-full" style={{ background: personHex(person) }} />
                <span className="font-semibold">{person}</span>
                <button onClick={signOut} aria-label="Sign out" className="ml-auto grid size-9 place-items-center rounded-full bg-sunk text-muted"><LogOut size={16} /></button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <SearchBox open={searching} onClose={() => setSearching(false)} />
      <ArcadeWindow open={arcade} onClose={() => setArcade(false)} />

      <AnimatePresence>
        {toast && (
          <motion.div key={toast.id} role="status" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            className="fixed bottom-24 left-1/2 z-50 max-w-[90vw] -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm text-card shadow-lg md:bottom-6">
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
