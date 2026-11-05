import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useStore } from '../lib/store'
import { PEOPLE, othersOf, namesList } from '../lib/constants'
import { currentDevice, enablePush, isIOS, isStandalone } from '../lib/push'
import { ArrowLeft, ArrowRight, Bell, Bot, Check, Clock, Lightbulb, Map, Smartphone, Sparkles, X } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// First-login help for a new partner:
//   <Welcome>   a 4-slide intro shown once per account
//   <Checklist> five starter steps on Today that tick themselves off
//   <Tip>       a one-line hint the first time each page is opened
// ─────────────────────────────────────────────────────────────────────────────

function Mark({ size = 56 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="9" fill="var(--color-wine)" />
      <path d="M9 23V9h14M9 16h10" stroke="var(--color-card)" strokeWidth="3.2" fill="none" strokeLinecap="round" />
    </svg>
  )
}

// Slide 2 picture: rough words → AI tidies + researches → a card on the board
function FlowArt() {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 text-left">
      <div className="paper tilt-l rounded-xl bg-card p-3 text-[13px] leading-snug text-muted">
        “dog leash that lights up for night walks maybe”
      </div>
      <ArrowRight size={16} className="text-faint" />
      <div className="rounded-xl border border-dashed border-line p-3 text-center text-[12px] text-muted">
        <Sparkles size={16} className="mx-auto mb-1 text-wine" />
        Tidies it up<br />and researches it
      </div>
      <ArrowRight size={16} className="text-faint" />
      <div className="paper tilt-r rounded-xl bg-tint-teal p-3 text-on-teal">
        <div className="display text-[15px] font-bold leading-tight">Glow leash</div>
        <div className="mt-1 text-[11px] opacity-80">Physical · 3 competitors found</div>
      </div>
    </div>
  )
}

function HelperTile({ icon: Icon, title, line, tint }) {
  return (
    <div className={`paper rounded-2xl p-4 text-left ${tint}`}>
      <Icon size={18} />
      <div className="display mt-2 text-[17px] font-bold leading-tight">{title}</div>
      <p className="mt-1 text-[13px] leading-snug opacity-85">{line}</p>
    </div>
  )
}

// A personal first slide (and extra tour slide) per person. Anyone not listed gets the default.
const INTROS = {
  Collin: {
    body: "Josh brought you in. This is where Josh, Jake and now you dump business ideas, figure out which one is actually worth doing, and track the work to start it. Your honest take is the whole point.",
    extra: {
      title: 'How your vote counts',
      body: 'Every idea gets scored 1 to 5 on five things. Scores stay hidden until you rate it yourself, so nobody copies anybody. Once two people score an idea it gets a combined number and shows up in Compare.',
    },
  },
}

export function Welcome({ open, person = 'Jake', partner = 'Josh', notifyOn, onNotify, isIphone, installed, onDone }) {
  const [i, setI] = useState(0)
  useEffect(() => { if (open) setI(0) }, [open])
  const intro = INTROS[person]
  const slides = [
    {
      art: <Mark />,
      title: `Welcome to Forge, ${person}`,
      body: intro?.body ?? `This is where you and ${partner} dump business ideas, work out which one is worth doing, and track the work to actually start it.`,
    },
    {
      art: <FlowArt />,
      title: 'Ideas go in rough',
      body: 'Type 10 to 20 words, or say them out loud. Forge cleans it up, looks into it, and pins it to the board. Then everyone scores it and the good ones move forward.',
    },
    {
      art: (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <HelperTile icon={Bot} title="Coach" line="Knows the whole board. Ask it anything." tint="bg-tint-lilac text-on-lilac" />
          <HelperTile icon={Map} title="Roadmap" line="The steps to start a company, in order." tint="bg-tint-teal text-on-teal" />
          <HelperTile icon={Clock} title="Clock in" line="Tracks the hours each of you puts in." tint="bg-tint-olive text-on-olive" />
        </div>
      ),
      title: 'Help along the way',
      body: 'You never have to guess what to do next.',
    },
    ...(intro?.extra ? [{
      art: (
        <div className="flex items-center gap-2" aria-hidden>
          {[3, 5, 4, 2, 5].map((n, k) => (
            <div key={k} className="flex flex-col items-center gap-1">
              <div className="flex flex-col-reverse gap-0.5">{[1, 2, 3, 4, 5].map((v) => <span key={v} className={`h-2.5 w-7 rounded-sm ${v <= n ? 'bg-wine' : 'bg-sunk'}`} />)}</div>
            </div>
          ))}
        </div>
      ),
      ...intro.extra,
    }] : []),
    {
      art: (
        <div className="mx-auto grid max-w-sm gap-2.5 text-left">
          <button onClick={onNotify} disabled={notifyOn === true || notifyOn === 'busy'}
            className="paper flex items-center gap-3 rounded-2xl bg-card p-4 text-left transition-colors hover:bg-paper disabled:opacity-100">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-wine-soft text-wine">{notifyOn === true ? <Check size={17} /> : <Bell size={17} />}</span>
            <span><span className="block font-semibold">{notifyOn === true ? 'Notifications on' : notifyOn === 'busy' ? 'Turning on…' : 'Turn on notifications'}</span>
              <span className="block text-[13px] text-muted">Hear when {partner} adds an idea or gives you a to-do</span></span>
          </button>
          <div className="paper flex items-center gap-3 rounded-2xl bg-card p-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-tint-teal text-on-teal"><Smartphone size={17} /></span>
            <span><span className="block font-semibold">{installed ? 'Forge is on your home screen' : 'Put Forge on your phone'}</span>
              <span className="block text-[13px] text-muted">{installed ? 'You’re all set.' : isIphone ? 'Tap Share, then “Add to Home Screen”' : 'Open this site in Safari on your iPhone, tap Share, then “Add to Home Screen”'}</span></span>
          </div>
        </div>
      ),
      title: 'Last thing',
      body: 'Two quick setup steps so Forge can reach you.',
    },
  ]
  const s = slides[i], last = i === slides.length - 1

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] grid place-items-center bg-paper/95 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label="Welcome to Forge">
          <div className="relative w-full max-w-[620px]">
            <button onClick={onDone} className="absolute -top-10 right-0 text-sm text-muted hover:text-ink">Skip</button>
            <AnimatePresence mode="wait">
              <motion.div key={i} className="text-center"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }}>
                <div className="mb-7 flex min-h-[120px] items-center justify-center">{s.art}</div>
                <h2 className="display text-[34px] font-extrabold leading-[1.02] tracking-[-0.02em] sm:text-[42px]">{s.title}</h2>
                <p className="mx-auto mt-3 max-w-[46ch] text-[16px] leading-relaxed text-muted">{s.body}</p>
                              </motion.div>
            </AnimatePresence>
            <div className="mt-9 flex items-center justify-between">
              <button onClick={() => setI(i - 1)} disabled={!i} className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm text-muted hover:text-ink disabled:invisible"><ArrowLeft size={15} /> Back</button>
              <div className="flex gap-1.5" aria-label={`Slide ${i + 1} of ${slides.length}`}>
                {slides.map((_, k) => <span key={k} className={`h-1.5 rounded-full transition-all ${k === i ? 'w-6 bg-wine' : 'w-1.5 bg-line'}`} />)}
              </div>
              <button onClick={() => (last ? onDone() : setI(i + 1))} className="inline-flex items-center gap-1 rounded-full bg-wine px-5 py-2 text-sm font-bold text-card hover:opacity-90">
                {last ? 'Start using Forge' : 'Next'} {!last && <ArrowRight size={15} />}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export const STARTER = [
  { id: 'idea', label: 'Pin your first idea', hint: 'Use the box at the top of this page' },
  { id: 'score', label: (p) => `Score an idea from ${p}`, hint: 'Open any idea and rate it' },
  { id: 'clock', label: 'Clock in once', hint: 'Bottom of the sidebar' },
  { id: 'coach', label: 'Ask the Coach a question', hint: 'Try “which idea should we test first?”' },
  { id: 'notify', label: 'Turn on notifications', hint: 'In Settings › Notifications' },
]

export function Checklist({ done = {}, partner = 'Josh', onHide }) {
  const n = STARTER.filter((s) => done[s.id]).length
  return (
    <section className="paper rounded-3xl bg-card p-5" aria-label="Getting started">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-wine">Getting started · {n} of {STARTER.length}</div>
          <h2 className="display mt-1 text-[22px] font-bold leading-tight">Five things to try</h2>
        </div>
        <button onClick={onHide} aria-label="Hide checklist" className="-mr-1 -mt-1 rounded-full p-1.5 text-faint hover:bg-sunk hover:text-ink"><X size={16} /></button>
      </div>
      <div className="mt-3 flex gap-1">
        {STARTER.map((s) => <span key={s.id} className={`h-1.5 flex-1 rounded-full ${done[s.id] ? 'bg-wine' : 'bg-sunk'}`} />)}
      </div>
      <ul className="mt-4 space-y-3">
        {STARTER.map((s) => {
          const ok = done[s.id]
          return (
            <li key={s.id} className="flex items-start gap-3">
              <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border ${ok ? 'border-wine bg-wine text-card' : 'border-line'}`}>{ok && <Check size={12} strokeWidth={3} />}</span>
              <span>
                <span className={`block text-[15px] ${ok ? 'text-faint line-through' : 'font-medium'}`}>{typeof s.label === 'function' ? s.label(partner) : s.label}</span>
                {!ok && <span className="block text-[13px] text-muted">{s.hint}</span>}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export const TIPS = {
  board: 'Drag cards to the right as an idea gets more serious. Ideas that die go to Trash, not gone forever.',
  hours: 'Clock in from the sidebar whenever you work on the business. Pick the idea and you’ll see hours per idea here.',
  coach: 'The Coach can see every idea, score, session and to-do. Ask it to compare ideas or tell you what to do this week.',
  roadmap: 'These are the steps to start a company, in order. Tick one off and the Coach knows you’ve done it.',
}

export function Tip({ children, onClose }) {
  return (
    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
      className="mb-6 flex items-start gap-3 rounded-2xl border border-line bg-tint-olive/70 px-4 py-3 text-on-olive" role="note">
      <Lightbulb size={17} className="mt-0.5 shrink-0" />
      <p className="flex-1 text-[14px] leading-snug">{children}</p>
      <button onClick={onClose} aria-label="Got it" className="shrink-0 rounded-full px-2 py-0.5 text-[13px] font-semibold hover:bg-card/60">Got it</button>
    </motion.div>
  )
}

// ── Wired-up versions used by the app ───────────────────────────────────────
const partnerOf = (p) => namesList(othersOf(p)) || 'your partners'
const notifyMsg = (m) => (m === 'denied' ? 'Notifications were blocked. Allow them in your browser settings, then try again.'
  : m === 'ios-browser' ? 'Add Forge to your Home Screen first, then turn notifications on from Setup.'
  : m === 'unsupported' ? "This browser can't do notifications." : `Couldn't turn on notifications: ${m}`)

export function useNotifyOn() {
  const [on, setOn] = useState(false)
  useEffect(() => { currentDevice().then((d) => setOn(!!d)).catch(() => {}) }, [])
  return [on, setOn]
}

export function AppWelcome() {
  const { person, onboarding, markOnboard, flash } = useStore()
  const [notify, setNotify] = useNotifyOn()
  if (!person) return null
  const turnOn = async () => {
    setNotify('busy')
    try { const d = await enablePush(person); setNotify(!!d); markOnboard({ notify: true }) }
    catch (e) { setNotify(false); flash(notifyMsg(e.message)) }
  }
  return <Welcome open={!onboarding.welcomed} person={person} partner={partnerOf(person)} notifyOn={notify} onNotify={turnOn}
    isIphone={isIOS()} installed={isIOS() && isStandalone()} onDone={() => markOnboard({ welcomed: true })} />
}

// Starter steps still left for this person (empty once all done or hidden)
export function useStarter() {
  const { person, onboarding, markOnboard, ideas, scores, time, chats } = useStore()
  const [notifyOn] = useNotifyOn()
  const partner = partnerOf(person)
  const done = useMemo(() => {
    const others = othersOf(person)
    const partnerIdeas = new Set(ideas.filter((i) => others.includes(i.created_by)).map((i) => i.id))
    return {
      idea: ideas.some((i) => i.created_by === person),
      score: scores.some((s) => s.person === person && partnerIdeas.has(s.idea_id) && Object.keys(s.scores ?? {}).length),
      clock: time.some((t) => t.person === person),
      coach: chats.some((c) => c.role === 'user' && c.person === person),
      notify: !!onboarding.notify || notifyOn,
    }
  }, [ideas, scores, time, chats, person, partner, onboarding.notify, notifyOn])
  const off = !person || onboarding.checklist_hidden || STARTER.every((s) => done[s.id])
  return {
    done, partner,
    left: off ? [] : STARTER.filter((s) => !done[s.id]).map((s) => ({ ...s, label: typeof s.label === 'function' ? s.label(partner) : s.label })),
    count: STARTER.filter((s) => done[s.id]).length,
    hide: () => markOnboard({ checklist_hidden: true }),
  }
}

export function AppChecklist() {
  const st = useStarter()
  if (!st.left.length) return null
  return <Checklist done={st.done} partner={st.partner} onHide={st.hide} />
}

export function PageTip({ id }) {
  const { person, onboarding, markOnboard } = useStore()
  if (!person || !onboarding.welcomed || onboarding[`tip_${id}`] || !TIPS[id]) return null
  return <Tip onClose={() => markOnboard({ [`tip_${id}`]: true })}>{TIPS[id]}</Tip>
}
