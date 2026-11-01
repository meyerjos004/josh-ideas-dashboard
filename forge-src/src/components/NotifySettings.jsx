import { useEffect, useState } from 'react'
import { Bell, BellOff, Send } from 'lucide-react'
import { useStore } from '../lib/store'
import { PEOPLE } from '../lib/constants'
import { Button } from './ui'
import { currentDevice, disablePush, enablePush, isIOS, isStandalone, pushSupported, sendTest, setPref } from '../lib/push'

const TYPES = [
  { id: 'idea', label: 'Partner added an idea', hint: 'When the other person dumps something new' },
  { id: 'research', label: 'Research finished', hint: 'When AI research is done on an idea you added' },
  { id: 'todo', label: 'To-do assigned to you', hint: 'When the other person gives you a task' },
]

function Toggle({ on, onChange, label }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${on ? 'bg-forest' : 'bg-line'}`}>
      <span className={`absolute top-0.5 size-5 rounded-full bg-card shadow transition-transform ${on ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
    </button>
  )
}

export default function NotifySettings() {
  const { person, flash, markOnboard } = useStore()
  const [device, setDevice] = useState(undefined) // undefined = loading, null = off
  const [busy, setBusy] = useState(false)
  const other = PEOPLE.find((p) => p.id !== person)?.id

  useEffect(() => { currentDevice().then(setDevice).catch(() => setDevice(null)) }, [person])

  const iosNeedsInstall = isIOS() && !isStandalone()
  const blocked = pushSupported() && Notification.permission === 'denied'

  const turnOn = async () => {
    setBusy(true)
    try {
      const d = await enablePush(person)
      setDevice(d)
      markOnboard({ notify: true })
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
  const toggle = async (id, on) => {
    const prefs = { ...device.prefs, [id]: on }
    setDevice({ ...device, prefs })
    try { await setPref(device.endpoint, prefs) } catch { flash("Couldn't save that setting.") }
  }
  const test = async () => {
    try { const r = await sendTest(device.endpoint); flash(r?.sent ? 'Test sent. Check your notifications.' : "Test didn't go through. Try turning notifications off and on.") }
    catch { flash("Test didn't go through. Try turning notifications off and on.") }
  }

  return (
    <section>
      <div className="mb-1 flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-semibold">Notifications</h2>
        {device && <span className="rounded-full bg-forest px-2.5 py-0.5 text-xs font-medium text-card">On for this device</span>}
      </div>
      <p className="mb-4 text-sm text-muted">Get a ping when {other} does something. Never for your own actions. Each device (phone, PC) is turned on separately.</p>

      {iosNeedsInstall ? (
        <p className="rounded-xl border border-line bg-card p-4 text-sm">On iPhone, notifications only work from the Home Screen app. Do the <b>Put Forge on your iPhone</b> steps below, open Forge from the new icon, then come back here.</p>
      ) : !pushSupported() ? (
        <p className="rounded-xl border border-line bg-card p-4 text-sm text-muted">This browser can't show notifications. Try Chrome or Edge on your PC, or the Home Screen app on iPhone.</p>
      ) : blocked ? (
        <p className="rounded-xl border border-line bg-card p-4 text-sm">Notifications are blocked for Forge. Click the icon at the left of the address bar (or on iPhone: Settings › Notifications › Forge) and allow them, then reload.</p>
      ) : device === undefined ? (
        <p className="text-sm text-faint">Checking…</p>
      ) : !device ? (
        <Button variant="primary" onClick={turnOn} disabled={busy}><Bell size={15} /> Turn on notifications</Button>
      ) : (
        <div className="rounded-2xl border border-line bg-card">
          <ul className="divide-y divide-line">
            {TYPES.map((t) => (
              <li key={t.id} className="flex items-center gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{t.label}</div>
                  <div className="text-xs text-muted">{t.hint}</div>
                </div>
                <Toggle on={device.prefs?.[t.id] !== false} onChange={(v) => toggle(t.id, v)} label={t.label} />
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2 border-t border-line px-4 py-3">
            <Button onClick={test}><Send size={13} /> Send a test</Button>
            <Button variant="ghost" onClick={turnOff} disabled={busy}><BellOff size={13} /> Turn off on this device</Button>
          </div>
        </div>
      )}
    </section>
  )
}
