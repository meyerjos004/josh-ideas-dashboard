import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mic, CornerDownLeft, Square, LoaderCircle } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useStore } from '../lib/store'
import { KINDS, MOD } from '../lib/constants'
import { loadTranscriber, micError, startRecording, transcribe } from '../lib/voice'

export default function Capture({ big }) {
  const { forgeIdea, flash, aiReady } = useStore()
  const nav = useNavigate()
  const [text, setText] = useState('')
  const [kind, setKind] = useState('unsure')
  const [mic, setMic] = useState('idle') // idle | recording | working
  const [secs, setSecs] = useState(0)
  const [level, setLevel] = useState(0)
  const [progress, setProgress] = useState(null)
  const [saving, setSaving] = useState(false)
  const rec = useRef(null)
  const input = useRef()

  useEffect(() => () => rec.current?.cancel(), [])

  // Seconds counter + input level while recording
  useEffect(() => {
    if (mic !== 'recording') return
    const t0 = Date.now()
    let raf
    const tick = () => { setSecs(Math.floor((Date.now() - t0) / 1000)); setLevel(rec.current?.level() ?? 0); raf = requestAnimationFrame(tick) }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [mic])

  const toggleMic = async () => {
    if (mic === 'working') return
    if (mic === 'recording') {
      setMic('working')
      const r = rec.current; rec.current = null
      const samples = await r.stop()
      if (!samples || samples.length < 16000 * 0.4) { setMic('idle'); flash("Didn't catch anything. Hold the button a bit longer and speak up."); return }
      try {
        const said = await transcribe(samples, setProgress)
        if (said) setText((t) => (t.trim() ? t.trimEnd() + ' ' : '') + said)
        else flash("Didn't catch any words. Try again a little closer to the mic.")
      } catch (e) {
        console.error(e); flash('Voice-to-text failed to load. Check your connection and try again.')
      }
      setProgress(null); setMic('idle'); input.current?.focus()
      return
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { flash("This browser can't record audio."); return }
    try {
      rec.current = await startRecording()
      setMic('recording')
      loadTranscriber(setProgress).catch(() => {}) // warm the model while you talk
    } catch (e) {
      console.error(e); flash(micError(e))
    }
  }

  const listening = mic === 'recording'
  const mm = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`

  const save = async (open) => {
    const raw = text.trim()
    if (!raw || saving) return
    setSaving(true)
    const idea = await forgeIdea(raw, kind)
    setSaving(false)
    if (!idea) return
    setText(''); setKind('unsure')
    if (open) nav(`/idea/${idea.id}`)
    else flash(aiReady ? 'Saved. Researching it now…' : `Saved to Dump: ${idea.title}`)
  }

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save(e.metaKey || e.ctrlKey) }
  }

  return (
    <div className={`rounded-2xl border border-line bg-card ${big ? 'p-4 sm:p-5' : 'p-3'} shadow-[0_1px_0_var(--color-line)] focus-within:border-faint`}>
      <div className="flex items-start gap-2">
        <textarea
          ref={input} rows={big ? 2 : 1} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey}
          placeholder={listening ? `Listening ${mm}… click the square when you're done` : mic === 'working' ? (progress != null && progress < 100 ? `Setting up voice-to-text (one time) ${progress}%` : 'Turning speech into text…') : (aiReady ? 'Type the idea rough, 10–20 words. Forge cleans it up and researches it.' : 'What could we sell? Type it rough, sort it later.')}
          aria-label="New idea"
          className={`min-h-0 flex-1 bg-transparent outline-none focus-visible:outline-none placeholder:text-faint ${big ? 'display text-xl sm:text-2xl leading-snug' : 'text-[15px]'}`}
        />
        <button type="button" onClick={toggleMic} disabled={mic === 'working'} aria-label={listening ? 'Stop recording' : mic === 'working' ? 'Transcribing' : 'Talk instead of typing'}
          title={listening ? 'Stop and turn into text' : 'Talk instead of typing'}
          className={`relative grid size-10 shrink-0 place-items-center rounded-full transition-colors ${listening ? 'bg-wine text-card' : 'bg-sunk text-muted hover:text-ink'}`}>
          {listening && <span aria-hidden className="absolute inset-0 rounded-full bg-wine/30 transition-transform duration-75" style={{ transform: `scale(${1 + level * 0.7})` }} />}
          <span className="relative">{listening ? <Square size={14} fill="currentColor" /> : mic === 'working' ? <LoaderCircle size={18} className="animate-spin" /> : <Mic size={18} />}</span>
        </button>
      </div>
      <AnimatePresence initial={false}>
        {(text || big) && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Type of product">
                {KINDS.map((k) => (
                  <button key={k.id} role="radio" aria-checked={kind === k.id} onClick={() => setKind(k.id)}
                    className={`rounded-full px-2.5 py-1 text-xs transition-colors ${kind === k.id ? 'bg-ink text-card' : 'text-muted hover:bg-sunk'}`}>{k.name}</button>
                ))}
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="hidden text-xs text-faint sm:inline">Enter saves · {MOD}+Enter saves and opens</span>
                <button onClick={() => save(false)} disabled={!text.trim() || saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-wine px-3 py-1.5 text-sm font-medium text-card disabled:opacity-35">
                  Save idea <CornerDownLeft size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
