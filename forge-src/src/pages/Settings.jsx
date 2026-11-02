import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Bell, BellOff, Check, Download, FileSpreadsheet, ChevronLeft, ChevronRight, KeyRound, LogOut, Monitor, Moon, Palette, Send, SlidersHorizontal, Sun, UserRound, Wrench } from 'lucide-react'
import { useStore } from '../lib/store'
import { useLayout, getTheme, setTheme, isDark } from '../lib/layout'
import { PALETTES, setPref, usePrefs } from '../lib/prefs'
import { PEOPLE, personHex } from '../lib/constants'
import { sb } from '../lib/sb'
import { downloadBackup, exportSpreadsheet, listBackups } from '../lib/exporter'
import { currentDevice, disablePush, enablePush, isIOS, isStandalone, pushSupported, sendTest, setPref as setPushPref } from '../lib/push'

// ─────────────────────────────────────────────────────────────────────────────
// Settings, laid out like iPhone Settings: a menu of sections, each opening
// its own page. Device settings save to this browser; account settings follow
// you everywhere.
// ─────────────────────────────────────────────────────────────────────────────

// ── Building blocks ─────────────────────────────────────────────────────────
function Group({ title, note, children }) {
  return (
    <section>
      {(title || note) && (
        <div className="mb-2 flex items-baseline justify-between gap-3 px-4">
          {title && <div role="heading" aria-level={2} className="text-[12px] font-semibold uppercase tracking-[0.06em] text-faint">{title}</div>}
          {note && <span className="text-xs text-faint">{note}</span>}
        </div>
      )}
      <div className="paper divide-y divide-line overflow-hidden rounded-3xl bg-card">{children}</div>
    </section>
  )
}

function Row({ label, hint, children, stack, nowrap }) {
  return (
    <div className={`flex gap-x-6 gap-y-3 px-5 py-4 ${stack ? 'flex-col' : nowrap ? 'items-center justify-between' : 'flex-wrap items-center justify-between'}`}>
      <div className="min-w-0 max-w-md">
        <div className="text-[15px] font-medium">{label}</div>
        {hint && <div className="mt-0.5 text-[13px] leading-snug text-muted">{hint}</div>}
      </div>
      {children}
    </div>
  )
}

function Segmented({ value, options, onChange, label }) {
  return (
    <div className="flex gap-0.5 rounded-full bg-sunk p-0.5" role="radiogroup" aria-label={label}>
      {options.map(([id, text]) => (
        <button key={id} role="radio" aria-checked={value === id} onClick={() => onChange(id)}
          className={`rounded-full px-3.5 py-1.5 text-[13px] transition-colors ${value === id ? 'bg-card font-semibold text-ink shadow-sm' : 'text-muted hover:text-ink'}`}>
          {text}
        </button>
      ))}
    </div>
  )
}

function Toggle({ on, onChange, label, disabled }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-40 ${on ? 'bg-wine' : 'bg-line'}`}>
      <span className={`absolute top-0.5 size-6 rounded-full bg-card shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

const Icon = ({ icon: I, bg }) => <span className="grid size-8 shrink-0 place-items-center rounded-[9px] text-white" style={{ background: bg }}><I size={17} strokeWidth={2.1} /></span>

function MenuRow({ to, icon, bg, label, value }) {
  return (
    <Link to={to} className="flex items-center gap-3.5 px-4 py-3 transition-colors hover:bg-sunk/50">
      <Icon icon={icon} bg={bg} />
      <span className="flex-1 text-[15px] font-medium">{label}</span>
      {value && <span className="truncate text-[14px] text-muted">{value}</span>}
      <ChevronRight size={17} className="shrink-0 text-faint" />
    </Link>
  )
}

function SubPage({ title, lede, children }) {
  return (
    <div className="max-w-2xl space-y-8">
      <header>
        <Link to="/settings" className="-ml-1 mb-3 inline-flex items-center gap-0.5 text-[15px] font-medium text-wine hover:opacity-80"><ChevronLeft size={19} /> Settings</Link>
        <h1 className="text-[40px] font-extrabold leading-none tracking-[-0.02em]">{title}</h1>
        {lede && <p className="mt-1.5 text-muted">{lede}</p>}
      </header>
      {children}
    </div>
  )
}

// ── Appearance ──────────────────────────────────────────────────────────────
const Mini = ({ c: [paper, card, accent, ink] }) => (
  <div className="flex h-full gap-1.5 p-2" style={{ background: paper }}>
    <div className="w-1/4 space-y-1">{[0, 1, 2].map((i) => <div key={i} className="h-1.5 rounded-full" style={{ background: ink, opacity: i ? 0.25 : 0.5 }} />)}</div>
    <div className="flex-1 space-y-1.5">
      <div className="h-2 w-3/4 rounded-full" style={{ background: ink, opacity: 0.8 }} />
      <div className="h-6 rounded-md" style={{ background: card }} />
      <div className="h-1.5 w-8 rounded-full" style={{ background: accent }} />
    </div>
  </div>
)

function Pick({ active, onPick, label, icon: I, children }) {
  return (
    <button role="radio" aria-checked={active} onClick={onPick}
      className={`flex flex-col gap-2 rounded-2xl border-2 p-1.5 text-left transition-colors ${active ? 'border-wine' : 'border-transparent hover:border-line'}`}>
      <div className="h-[68px] overflow-hidden rounded-xl border border-line">{children}</div>
      <span className="flex items-center gap-1.5 px-1 pb-0.5 text-[13px] font-medium">{I && <I size={14} />} {label}{active && <Check size={14} className="ml-auto text-wine" />}</span>
    </button>
  )
}

function useDarkNow() {
  const [d, setD] = useState(isDark)
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const on = () => setD(isDark())
    mq.addEventListener('change', on)
    const mo = new MutationObserver(on); mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => { mq.removeEventListener('change', on); mo.disconnect() }
  }, [])
  return d
}

function Appearance() {
  const p = usePrefs()
  const { mode } = useLayout()
  const [theme, setT] = useState(getTheme)
  const dark = useDarkNow()
  const pal = PALETTES.find((x) => x.id === p.palette) ?? PALETTES[0]
  const pickTheme = (t) => { setTheme(t); setT(t) }
  return (
    <SubPage title="Appearance" lede="Saved on this device, so your phone and PC can look different.">
      <Group title="Mode">
        <Row label="Light or dark" hint="Match device follows your phone or PC's own setting." stack>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Light or dark">
            <Pick active={theme === 'light'} onPick={() => pickTheme('light')} label="Light" icon={Sun}><Mini c={pal.light} /></Pick>
            <Pick active={theme === 'system'} onPick={() => pickTheme('system')} label={<><span className="sm:hidden">Auto</span><span className="hidden sm:inline">Match device</span></>} icon={Monitor}>
              <div className="grid h-full grid-cols-2"><div className="overflow-hidden"><Mini c={pal.light} /></div><div className="overflow-hidden"><Mini c={pal.dark} /></div></div>
            </Pick>
            <Pick active={theme === 'dark'} onPick={() => pickTheme('dark')} label="Dark" icon={Moon}><Mini c={pal.dark} /></Pick>
          </div>
        </Row>
      </Group>
      <Group title="Color palette">
        <Row label="Palette" hint="Changes the whole app: background, cards and the highlight color. Each one has a light and dark version." stack>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Color palette">
            {PALETTES.map((x) => (
              <Pick key={x.id} active={p.palette === x.id} onPick={() => setPref('palette', x.id)} label={x.name}><Mini c={dark ? x.dark : x.light} /></Pick>
            ))}
          </div>
        </Row>
      </Group>
      <Group title="Size & layout">
        <Row label="Text size" hint="Makes everything a little bigger.">
          <Segmented label="Text size" value={p.textSize} onChange={(v) => setPref('textSize', v)} options={[['standard', 'Standard'], ['large', 'Large']]} />
        </Row>
        {mode !== 'phone' && (
          <Row label="Big screens" hint="On wide monitors, keep pages in a centered column or stretch them edge to edge.">
            <Segmented label="Big screen layout" value={p.width} onChange={(v) => setPref('width', v)} options={[['centered', 'Centered'], ['full', 'Full width']]} />
          </Row>
        )}
      </Group>
    </SubPage>
  )
}

// ── Notifications ───────────────────────────────────────────────────────────
const ALERTS = [
  { id: 'idea', label: (o) => `${o} added an idea`, hint: 'Anything new pinned to the board' },
  { id: 'research', label: () => 'Research finished', hint: 'When the AI is done looking into an idea you added' },
  { id: 'todo', label: (o) => `${o} gave you a to-do`, hint: 'From a session or an idea page' },
  { id: 'joined', label: () => 'Someone joined Forge', hint: 'When a new partner creates their account' },
  { id: 'weekly', label: () => 'Weekly review is ready', hint: "Sunday evening: the week's hours, new ideas and Claude's brief" },
]

function Notifications() {
  const { person, flash, markOnboard } = useStore()
  const other = PEOPLE.find((p) => p.id !== person)?.id ?? 'Your partner'
  const [device, setDevice] = useState(undefined) // undefined = checking, null = off
  const [busy, setBusy] = useState(false)
  useEffect(() => { currentDevice().then(setDevice).catch(() => setDevice(null)) }, [person])

  const iosNeedsInstall = isIOS() && !isStandalone()
  const blocked = pushSupported() && Notification.permission === 'denied'
  const on = !!device

  const turnOn = async () => {
    setBusy(true)
    try {
      const d = await enablePush(person)
      setDevice(d); markOnboard({ notify: true })
      if (d) await sendTest(d.endpoint)
      flash('Notifications on. A test one is on its way.')
    } catch (e) {
      const m = e.message
      flash(m === 'denied' ? 'Notifications were blocked. Allow them in your browser settings, then try again.'
        : m === 'ios-browser' ? 'Add Forge to your Home Screen first, then turn this on from the app.'
        : m === 'unsupported' ? "This browser can't do notifications." : `Couldn't turn on notifications: ${m}`)
    }
    setBusy(false)
  }
  const turnOff = async () => { setBusy(true); await disablePush().catch(() => {}); setDevice(null); setBusy(false); flash('Notifications off on this device.') }
  const save = async (id, v) => {
    const prefs = { ...device.prefs, [id]: v }
    setDevice({ ...device, prefs })
    try { await setPushPref(device.endpoint, prefs) } catch { flash("Couldn't save that setting.") }
  }
  const test = async () => {
    try { const r = await sendTest(device.endpoint); flash(r?.sent ? 'Test sent. Check your notifications.' : "Test didn't go through. Try turning notifications off and on.") }
    catch { flash("Test didn't go through. Try turning notifications off and on.") }
  }

  const problem = iosNeedsInstall
    ? <>On iPhone, notifications only work from the Home Screen app. Follow <Link to="/setup" className="font-medium text-wine underline underline-offset-2">Put Forge on your iPhone</Link>, open Forge from the new icon, then come back here.</>
    : !pushSupported() ? "This browser can't show notifications. Try Chrome or Edge on your PC, or the Home Screen app on iPhone."
    : blocked ? 'Notifications are blocked for Forge. Click the icon left of the address bar (on iPhone: Settings › Notifications › Forge), allow them, then reload.'
    : null

  return (
    <SubPage title="Notifications" lede={`Get a ping when ${other} does something. Never for your own actions. Each device is set up on its own.`}>
      <Group title="This device">
        {problem ? <div className="px-5 py-4 text-[14px] leading-snug text-muted">{problem}</div> : (
          <Row nowrap label="Allow notifications" hint={device === undefined ? 'Checking…' : on ? 'On for this device.' : 'Off for this device.'}>
            <Toggle label="Allow notifications" on={on} disabled={busy || device === undefined} onChange={(v) => (v ? turnOn() : turnOff())} />
          </Row>
        )}
      </Group>

      <Group title="Alert me when" note={on ? null : 'Turn on notifications first'}>
        {ALERTS.map((a) => (
          <Row nowrap key={a.id} label={a.label(other)} hint={a.hint}>
            <Toggle label={a.label(other)} on={on && device.prefs?.[a.id] !== false} disabled={!on} onChange={(v) => save(a.id, v)} />
          </Row>
        ))}
      </Group>

      <Group title="Quiet hours">
        <Row nowrap label="Silence overnight" hint="No pings between 10 pm and 7 am. Anything that happens shows up in Forge when you open it.">
          <Toggle label="Silence overnight" on={on && !!device.prefs?.quiet} disabled={!on} onChange={(v) => save('quiet', v)} />
        </Row>
      </Group>

      {on && (
        <div className="flex flex-wrap gap-2 px-1">
          <button onClick={test} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3.5 py-1.5 text-[13px] hover:border-faint"><Send size={13} /> Send a test</button>
          <button onClick={turnOff} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] text-muted hover:text-ink"><BellOff size={13} /> Turn off on this device</button>
        </div>
      )}
    </SubPage>
  )
}

// ── Behavior ────────────────────────────────────────────────────────────────
function Behavior() {
  const p = usePrefs()
  const { settings, saveSettings, goals, person } = useStore()
  const [spend, setSpend] = useState(null)
  useEffect(() => { sb.rpc('forge_ai_spend').then(({ data }) => setSpend(data?.[0] ?? null)) }, [])
  const goal = goals[person] ?? settings.hours_goal ?? 5
  const setGoal = (g) => saveSettings({ hours_goal: Math.max(1, Math.min(80, g)) })
  const usd = (n) => `$${Number(n ?? 0).toFixed(2)}`
  return (
    <SubPage title="Behavior" lede="How Forge acts when you use it.">
      <Group title="Opening the app" note="This device">
        <Row label="Open Forge to" hint="The page you land on when you open the app.">
          <Segmented label="Start page" value={p.start} onChange={(v) => setPref('start', v)} options={[['/', 'Today'], ['/board', 'Board'], ['/coach', 'Coach']]} />
        </Row>
      </Group>
      <Group title="Hours" note="Your account">
        <Row nowrap label="Weekly hours goal" hint="Shown as a progress bar on Today. Weeks start Monday.">
          <div className="flex shrink-0 items-center gap-1 rounded-full bg-sunk p-0.5">
            <button onClick={() => setGoal(goal - 1)} aria-label="One hour less" className="grid size-8 place-items-center rounded-full text-lg text-muted hover:bg-card hover:text-ink">−</button>
            <span className="w-14 text-center text-[15px] font-semibold tabular-nums">{goal} h</span>
            <button onClick={() => setGoal(goal + 1)} aria-label="One hour more" className="grid size-8 place-items-center rounded-full text-lg text-muted hover:bg-card hover:text-ink">+</button>
          </div>
        </Row>
      </Group>
      <Group title="AI" note="Your account, every device">
        <Row nowrap label="AI spend this month" hint={spend ? `${spend.month_calls} AI call${spend.month_calls === 1 ? '' : 's'} this month · ${usd(spend.all_usd)} since you started. Estimated from Claude's published prices; your Anthropic billing page is the exact number.` : 'Checking…'}>
          <span className="display shrink-0 text-2xl font-bold tabular-nums">{spend ? usd(spend.month_usd) : '—'}</span>
        </Row>
        <Row nowrap label="Research new ideas automatically" hint="On: every idea you pin gets looked into right away (about 15–20¢ each). Off: it's saved as-is, and you hit Research on the ideas you care about.">
          <Toggle label="Research new ideas automatically" on={settings.auto_research !== false} onChange={(v) => saveSettings({ auto_research: v })} />
        </Row>
      </Group>
    </SubPage>
  )
}

// ── Account ─────────────────────────────────────────────────────────────────
function PasswordRow() {
  const { flash } = useStore()
  const [open, setOpen] = useState(false)
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const short = pw.length > 0 && pw.length < 8
  const mismatch = pw2.length > 0 && pw !== pw2
  const close = () => { setOpen(false); setPw(''); setPw2('') }
  const save = async (e) => {
    e.preventDefault()
    if (pw.length < 8 || pw !== pw2) return
    setBusy(true)
    const { error } = await sb.auth.updateUser({ password: pw })
    setBusy(false)
    if (error) return flash(`Couldn't change it: ${error.message}`)
    close(); flash('Password changed.')
  }
  const field = 'rounded-xl border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-faint'
  return (
    <Row label="Password" hint="The one you sign in with on every device." stack={open}>
      {!open ? (
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-[13px] hover:border-faint"><KeyRound size={14} /> Change password</button>
      ) : (
        <form onSubmit={save} className="grid w-full max-w-sm gap-2">
          <input type="password" autoComplete="new-password" placeholder="New password (8+ characters)" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus className={field} />
          <input type="password" autoComplete="new-password" placeholder="Type it again" value={pw2} onChange={(e) => setPw2(e.target.value)} className={field} />
          {(short || mismatch) && <p className="text-xs text-wine">{short ? 'Use at least 8 characters.' : "Those don't match."}</p>}
          <div className="flex gap-2">
            <button disabled={busy || pw.length < 8 || pw !== pw2} className="rounded-full bg-wine px-4 py-1.5 text-sm font-bold text-card disabled:opacity-40">{busy ? 'Saving…' : 'Save password'}</button>
            <button type="button" onClick={close} className="rounded-full px-3 py-1.5 text-sm text-muted hover:text-ink">Cancel</button>
          </div>
        </form>
      )}
    </Row>
  )
}

function Account() {
  const { person, member, signOut } = useStore()
  return (
    <SubPage title="Account">
      <Group>
        <div className="flex items-center gap-4 px-5 py-5">
          <span className="grid size-14 place-items-center rounded-full text-xl font-bold text-white" style={{ background: personHex(person) }}>{person?.[0]}</span>
          <div><div className="display text-xl font-bold">{person}</div><div className="text-sm text-muted">{member?.email}</div></div>
        </div>
      </Group>
      <Group title="Security">
        <PasswordRow />
      </Group>
      <YourData />
      <Group>
        <Row nowrap label="Sign out" hint="You'll need your email and password to get back in on this device.">
          <button onClick={signOut} className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] text-wine hover:bg-wine-soft"><LogOut size={14} /> Sign out</button>
        </Row>
      </Group>
    </SubPage>
  )
}

function YourData() {
  const store = useStore()
  const [busy, setBusy] = useState(false)
  const [backups, setBackups] = useState(null)
  useEffect(() => { listBackups().then(setBackups).catch(() => setBackups([])) }, [])
  const exp = async () => {
    setBusy(true)
    try { await exportSpreadsheet(store); store.flash('Spreadsheet downloaded.') } catch (e) { store.flash(`Export failed: ${e.message}`) }
    setBusy(false)
  }
  const day = (iso) => new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  return (
    <Group title="Your data">
      <Row nowrap label="Export everything" hint="One spreadsheet with a tab each for ideas, scores, sessions, to-dos, hours and the roadmap.">
        <button onClick={exp} disabled={busy} className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-line px-3.5 py-1.5 text-[13px] hover:border-faint disabled:opacity-50"><FileSpreadsheet size={14} /> {busy ? 'Building…' : 'Export'}</button>
      </Row>
      <Row label="Weekly backups" hint="Forge saves a full copy of everything every Sunday night. Download one if you ever need to restore." stack={backups?.length > 0}>
        {backups == null ? <span className="text-sm text-faint">Checking…</span> : !backups.length ? <span className="text-sm text-faint">First one this Sunday</span> : (
          <div className="flex flex-wrap gap-2">
            {backups.map((b) => (
              <button key={b.id} onClick={() => downloadBackup(b.id).catch((e) => store.flash(`Download failed: ${e.message}`))}
                className="inline-flex items-center gap-1.5 rounded-full bg-sunk px-3 py-1.5 text-[13px] text-muted hover:text-ink"><Download size={13} /> {day(b.made_at)}</button>
            ))}
          </div>
        )}
      </Row>
    </Group>
  )
}

// ── Menu ────────────────────────────────────────────────────────────────────
function Menu() {
  const { person, member, settings } = useStore()
  const p = usePrefs()
  const [notify, setNotify] = useState(null)
  useEffect(() => { currentDevice().then((d) => setNotify(!!d)).catch(() => setNotify(false)) }, [])
  const theme = { light: 'Light', dark: 'Dark', system: 'Auto' }[getTheme()]
  const pal = PALETTES.find((x) => x.id === p.palette)?.name ?? 'Sage'
  return (
    <div className="max-w-2xl space-y-7">
      <h1 className="text-[40px] font-extrabold leading-none tracking-[-0.02em]">Settings</h1>

      <Group>
        <Link to="/settings/account" className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-sunk/50">
          <span className="grid size-14 shrink-0 place-items-center rounded-full text-xl font-bold text-white" style={{ background: personHex(person) }}>{person?.[0]}</span>
          <div className="min-w-0 flex-1"><div className="display text-xl font-bold leading-tight">{person}</div><div className="truncate text-sm text-muted">{member?.email} · Password, sign out</div></div>
          <ChevronRight size={17} className="shrink-0 text-faint" />
        </Link>
      </Group>

      <Group>
        <MenuRow to="/settings/appearance" icon={Palette} bg="#7A5AA6" label="Appearance" value={`${pal} · ${theme}`} />
        <MenuRow to="/settings/notifications" icon={Bell} bg="#C2453B" label="Notifications" value={notify == null ? '' : notify ? 'On' : 'Off'} />
        <MenuRow to="/settings/behavior" icon={SlidersHorizontal} bg="#5F6B73" label="Behavior" value={settings.auto_research === false ? 'Research by hand' : 'Auto research'} />
        <MenuRow to="/settings/account" icon={UserRound} bg="#2F7FC1" label="Account" />
      </Group>

      <Group>
        <MenuRow to="/setup" icon={Wrench} bg="#3D8B5A" label="Setup" value="AI, iPhone, Shortcut" />
      </Group>
    </div>
  )
}

export default function Settings() {
  const { section } = useParams()
  const Page = { appearance: Appearance, notifications: Notifications, behavior: Behavior, account: Account }[section] ?? Menu
  return <Page />
}
