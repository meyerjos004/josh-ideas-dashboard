import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowUp, ExternalLink } from 'lucide-react'
import { useStore } from '../lib/store'
import { Notes, timeAgo } from '../lib/notes'
import { personHex } from '../lib/constants'

const IDEA_PROMPTS = ['What should we do next?', 'Poke holes in this', 'How do we test this for under $50?', 'How would we make money on this?']
const GENERAL_PROMPTS = ['We have no idea where to start. What first?', 'Which of our ideas looks strongest?', 'How do we split ownership fairly?', 'What do we need to do to start an LLC in Utah?']

function Dots() {
  return (
    <span className="inline-flex gap-1" aria-label="Thinking">
      {[0, 1, 2].map((i) => <motion.span key={i} className="size-1.5 rounded-full bg-faint" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: .9, delay: i * .15 }} />)}
    </span>
  )
}

export default function CoachChat({ ideaId = null, prefill = '', compact }) {
  const { chats, askCoach, aiReady, ideas } = useStore()
  const [text, setText] = useState(prefill)
  const [sending, setSending] = useState(false)
  const end = useRef()
  const box = useRef()
  const list = useMemo(() => chats.filter((c) => (ideaId ? c.idea_id === ideaId : !c.idea_id)).sort((a, b) => a.created_at.localeCompare(b.created_at)), [chats, ideaId])
  const busy = list.some((c) => c.status === 'working')

  useEffect(() => { if (prefill) setText(prefill) }, [prefill])
  useEffect(() => { if (list.length) end.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }) }, [list.length, list.at(-1)?.status])
  useEffect(() => { const el = box.current; if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 160) + 'px' } }, [text])

  const send = async (msg) => {
    const m = (msg ?? text).trim()
    if (!m || sending || busy) return
    setSending(true)
    const ok = await askCoach(m, ideaId)
    setSending(false)
    if (ok) setText('')
  }

  return (
    <div className="flex flex-col">
      <div className={`space-y-4 ${compact ? 'max-h-[520px] overflow-y-auto pr-1 scroll-thin' : ''}`}>
        {list.length === 0 && aiReady !== false && (
          <div className="flex flex-wrap gap-2">
            {(ideaId ? IDEA_PROMPTS : GENERAL_PROMPTS).map((p) => (
              <button key={p} onClick={() => send(p)} className="rounded-full border border-line bg-card px-3 py-1.5 text-sm text-muted hover:border-faint hover:text-ink">{p}</button>
            ))}
          </div>
        )}
        <AnimatePresence initial={false}>
          {list.map((c) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className={c.role === 'user' ? 'flex justify-end' : ''}>
              {c.role === 'user' ? (
                <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-2 text-[15px] text-card" style={{ background: personHex(c.person) }}>
                  {c.content}
                  <div className="mt-0.5 text-right text-[10px] opacity-70">{c.person} · {timeAgo(c.created_at)}</div>
                </div>
              ) : (
                <div className={`max-w-[95%] rounded-2xl rounded-bl-md border px-4 py-3 text-[15px] ${c.status === 'error' ? 'border-wine/30 bg-wine-soft text-wine' : 'border-line bg-card'}`}>
                  {c.status === 'working' ? <div className="flex items-center gap-2 py-1 text-sm text-muted"><Dots /> Thinking it through…</div> : <Notes text={c.content} ideas={ideas} />}
                  {c.sources?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5 border-t border-line pt-2">
                      {c.sources.slice(0, 6).map((s) => {
                        let h = s.url; try { h = new URL(s.url).hostname.replace(/^www\./, '') } catch { /* raw */ }
                        return <a key={s.url} href={s.url} target="_blank" rel="noreferrer" title={s.title} className="inline-flex items-center gap-1 rounded-full bg-sunk px-2 py-0.5 text-[11px] text-muted hover:text-ink"><ExternalLink size={10} />{h}</a>
                      })}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={end} />
      </div>

      {aiReady === false ? (
        <p className="mt-4 rounded-xl border border-dashed border-line p-4 text-sm text-muted">The coach needs the AI connected. <Link to="/setup" className="font-medium text-wine">Set it up</Link>, it takes about 5 minutes.</p>
      ) : (
      <form onSubmit={(e) => { e.preventDefault(); send() }}
        className="mt-4 flex items-end gap-2 rounded-2xl border border-line bg-card p-2 pl-4 focus-within:border-faint">
        <textarea ref={box} rows={1} value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder={ideaId ? 'Ask about this idea…' : 'Ask the coach anything about starting the business…'}
          aria-label="Message the coach" className="flex-1 bg-transparent py-1.5 text-[15px] outline-none focus-visible:outline-none placeholder:text-faint" />
        <button type="submit" disabled={!text.trim() || sending || busy} aria-label="Send"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-wine text-card disabled:opacity-30"><ArrowUp size={17} /></button>
      </form>
      )}
    </div>
  )
}
