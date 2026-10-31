import { useState } from 'react'
import { Check, Copy, RefreshCw } from 'lucide-react'
import { useStore } from '../lib/store'
import { Button } from '../components/ui'
import NotifySettings from '../components/NotifySettings'

const FN_URL = 'https://ibutllgwjgmmlydkcrzi.supabase.co/functions/v1/forge-ai'
const KEY = 'sb_publishable_VdkNDTcxwk0lkWpppf9vtQ_jAq4adZn'

function CopyField({ label, value }) {
  const [done, setDone] = useState(false)
  const copy = async () => { try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500) } catch { /* ignore */ } }
  return (
    <div className="flex items-center gap-2 rounded-lg border border-line bg-paper px-3 py-2">
      <span className="w-24 shrink-0 text-xs text-muted">{label}</span>
      <code className="min-w-0 flex-1 truncate text-xs">{value}</code>
      <button onClick={copy} aria-label={`Copy ${label}`} className="text-muted hover:text-ink">{done ? <Check size={14} className="text-forest" /> : <Copy size={14} />}</button>
    </div>
  )
}

function Step({ n, title, children }) {
  return (
    <li className="flex gap-4">
      <span className="display grid size-7 shrink-0 place-items-center rounded-full bg-ink text-sm font-bold text-card">{n}</span>
      <div className="min-w-0 flex-1 pb-2"><div className="font-medium">{title}</div><div className="mt-1 space-y-2 text-sm text-muted">{children}</div></div>
    </li>
  )
}

const A = (p) => <a {...p} target="_blank" rel="noreferrer" className="font-medium text-wine underline underline-offset-2" />

export default function Setup() {
  const { aiReady, checkAI, person } = useStore()
  const body = JSON.stringify({ action: 'capture', person, text: '(Provided Input)' })

  return (
    <div className="max-w-2xl space-y-14">
      <header>
        <h1 className="text-4xl font-bold">Setup</h1>
        <p className="mt-1 text-muted">Notifications, the AI connection, and putting Forge on your iPhones.</p>
      </header>

      <section>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-semibold">1. Connect the AI</h2>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${aiReady ? 'bg-forest text-card' : aiReady === false ? 'bg-wine-soft text-wine' : 'bg-sunk text-muted'}`}>
            {aiReady ? 'Connected' : aiReady === false ? 'Not connected' : 'Checking…'}
          </span>
          <Button className="ml-auto" onClick={checkAI}><RefreshCw size={13} /> Check again</Button>
        </div>
        <ol className="space-y-4">
          <Step n="1" title="Create a Claude API account">
            <p>Go to <A href="https://console.anthropic.com">console.anthropic.com</A>, sign up, and add a card under Billing. Load $5–10 to start. A researched idea costs about 15–20¢; a coach reply about 2–10¢.</p>
          </Step>
          <Step n="2" title="Set a monthly spend limit">
            <p>In the console, open Settings › Limits and set something like $10/month so it can never surprise you. Forge also caps itself at 60 AI calls per hour.</p>
          </Step>
          <Step n="3" title="Create an API key">
            <p>Settings › API keys › Create key. Name it “Forge”. Copy it; it starts with <code>sk-ant-</code>. Don't paste it anywhere public.</p>
          </Step>
          <Step n="4" title="Give the key to Forge's server">
            <p>Open <A href="https://supabase.com/dashboard/project/ibutllgwjgmmlydkcrzi/functions/secrets">your Supabase project's Edge Function secrets</A>, click Add new secret, and enter:</p>
            <CopyField label="Name" value="ANTHROPIC_API_KEY" />
            <p>Paste your key as the value and save. Then click Check again above.</p>
          </Step>
        </ol>
      </section>

      <NotifySettings />

      <section>
        <h2 className="mb-4 text-2xl font-semibold">2. Put Forge on your iPhone</h2>
        <ol className="space-y-4">
          <Step n="1" title="Open Forge in Safari">
            <p>It has to be Safari for this step.</p>
            <CopyField label="Link" value="https://meyerjos004.github.io/josh-ideas-dashboard/forge/" />
          </Step>
          <Step n="2" title="Tap Share, then Add to Home Screen">
            <p>Forge opens full-screen like a normal app from then on, and remembers who you are.</p>
          </Step>
        </ol>
      </section>

      <section>
        <h2 className="mb-1 text-2xl font-semibold">3. Send ideas from anywhere (Shortcut)</h2>
        <p className="mb-4 text-sm text-muted">Say “Hey Siri, Forge idea”, or share text from Notes, and it lands in Forge already researched. Each of you builds this once on your own phone.</p>
        <ol className="space-y-4">
          <Step n="1" title="Open the Shortcuts app and tap +">
            <p>Name it <b>Forge idea</b>. Tap the (i) at the bottom and turn on <b>Show in Share Sheet</b> (input: Text).</p>
          </Step>
          <Step n="2" title="Add the action “Ask for Input”">
            <p>Set the prompt to “What's the idea?”. Tip: tap the arrow and set it to accept Shortcut Input when you share text from Notes.</p>
          </Step>
          <Step n="3" title="Add “Get Contents of URL”">
            <p>Paste this URL, then tap Show More: Method <b>POST</b>, and add these headers.</p>
            <CopyField label="URL" value={FN_URL} />
            <CopyField label="Header apikey" value={KEY} />
            <CopyField label="Content-Type" value="application/json" />
            <p>Request Body: <b>JSON</b>, with three Text fields:</p>
            <CopyField label="action" value="capture" />
            <CopyField label="person" value={person} />
            <p><b>text</b> → tap the value and pick the variable <b>Provided Input</b> from step 2.</p>
            <p className="text-xs text-faint">Same thing as raw JSON, for reference: <code>{body}</code></p>
          </Step>
          <Step n="4" title="Add “Show Notification”">
            <p>Text: “Sent to Forge”. Done. Try it: share a line from Notes, or say “Hey Siri, Forge idea”.</p>
          </Step>
        </ol>
      </section>
    </div>
  )
}
