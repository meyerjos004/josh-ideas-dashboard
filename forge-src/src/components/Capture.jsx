import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mic, CornerDownLeft, Square } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useStore } from '../lib/store'
import { KINDS } from '../lib/constants'

const Speech = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)

export default function Capture({ big }) {
  const { addIdea, flash } = useStore()
  const nav = useNavigate()
  const [text, setText] = useState('')
  const [kind, setKind] = useState('unsure')
  const [listening, setListening] = useState(false)
  const [saving, setSaving] = useState(false)
  const rec = useRef(null)
  const base = useRef('')
  const input = useRef()

  useEffect(() => () => rec.current?.stop(), [])

  const toggleMic = () => {
    if (!Speech) { flash('Voice input works in Chrome, Edge and Safari.'); return }
    if (listening) { rec.current?.stop(); return }
    const r = new Speech()
    r.lang = 'en-US'; r.interimResults = true; r.continuous = true
    base.current = text ? text.trimEnd() + ' ' : ''
    r.onresult = (e) => {
      let said = ''
      for (let i = 0; i < e.results.length; i++) said += e.results[i][0].transcript
      setText(base.current + said.trim())
    }
    r.onend = () => { setListening(false); input.current?.focus() }
    r.onerror = (e) => { if (e.error === 'not-allowed') flash('Allow microphone access to talk ideas in.') }
    rec.current = r
    r.start(); setListening(true)
  }

  const save = async (open) => {
    const raw = text.trim()
    if (!raw || saving) return
    rec.current?.stop()
    setSaving(true)
    // First line (or first sentence) becomes the title, the rest becomes the pitch
    const [first, ...rest] = raw.split('\n')
    let title = first, pitch = rest.join('\n').trim()
    if (!pitch && title.length > 90) {
      const cut = title.search(/[.!?](\s|$)/)
      if (cut > 10 && cut < 90) { pitch = title.slice(cut + 1).trim(); title = title.slice(0, cut + 1) }
    }
    const idea = await addIdea({ title, pitch, kind })
    setSaving(false)
    if (!idea) return
    setText(''); setKind('unsure')
    if (open) nav(`/idea/${idea.id}`)
    else flash(`Saved to Dump: ${idea.title}`)
  }

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save(e.metaKey || e.ctrlKey) }
  }

  return (
    <div className={`rounded-2xl border border-line bg-card ${big ? 'p-4 sm:p-5' : 'p-3'} shadow-[0_1px_0_var(--color-line)] focus-within:border-faint`}>
      <div className="flex items-start gap-2">
        <textarea
          ref={input} rows={big ? 2 : 1} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey}
          placeholder={listening ? 'Listening… say the idea out loud' : 'What could we sell? Type it rough, sort it later.'}
          aria-label="New idea"
          className={`min-h-0 flex-1 bg-transparent outline-none focus-visible:outline-none placeholder:text-faint ${big ? 'display text-xl sm:text-2xl leading-snug' : 'text-[15px]'}`}
        />
        <button type="button" onClick={toggleMic} aria-label={listening ? 'Stop listening' : 'Talk instead of typing'}
          className={`relative grid size-10 shrink-0 place-items-center rounded-full transition-colors ${listening ? 'bg-wine text-card' : 'bg-sunk text-muted hover:text-ink'}`}>
          {listening && <motion.span className="absolute inset-0 rounded-full bg-wine" animate={{ scale: [1, 1.45], opacity: [.35, 0] }} transition={{ repeat: Infinity, duration: 1.2 }} />}
          {listening ? <Square size={14} fill="currentColor" /> : <Mic size={18} />}
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
                <span className="hidden text-xs text-faint sm:inline">Enter saves · ⌘Enter saves and opens</span>
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
