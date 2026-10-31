import { useEffect, useRef, useState } from 'react'
import { useStore } from '../lib/store'
import { Notes } from '../lib/notes'

// Notes with autosave, a read view, and [[ autocomplete for linking ideas
export default function NotesEditor({ value, onSave, placeholder, minRows = 6, excludeId }) {
  const { ideas } = useStore()
  const [editing, setEditing] = useState(!value)
  const [v, setV] = useState(value ?? '')
  const [suggest, setSuggest] = useState(null) // { q, start, i }
  const ta = useRef()
  const timer = useRef()
  const dirty = useRef(false)

  useEffect(() => { if (!dirty.current) setV(value ?? '') }, [value])
  useEffect(() => () => clearTimeout(timer.current), [])
  useEffect(() => {
    const el = ta.current
    if (el) { el.style.height = 'auto'; el.style.height = Math.max(el.scrollHeight, minRows * 24) + 'px' }
  }, [v, editing, minRows])

  const commit = (nv) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => { await onSave(nv); dirty.current = false }, 700)
  }

  const options = suggest
    ? ideas.filter((i) => i.id !== excludeId && i.title.toLowerCase().includes(suggest.q.toLowerCase())).slice(0, 6)
    : []

  const onChange = (e) => {
    const nv = e.target.value
    setV(nv); dirty.current = true; commit(nv)
    const before = nv.slice(0, e.target.selectionStart)
    const m = before.match(/\[\[([^\]\n]{0,40})$/)
    setSuggest(m ? { q: m[1], start: before.length - m[1].length, i: 0 } : null)
  }

  const pick = (idea) => {
    const el = ta.current
    const end = el.selectionStart
    const nv = v.slice(0, suggest.start) + idea.title + ']]' + v.slice(end).replace(/^\]\]/, '')
    setV(nv); dirty.current = true; commit(nv); setSuggest(null)
    requestAnimationFrame(() => { const pos = suggest.start + idea.title.length + 2; el.focus(); el.setSelectionRange(pos, pos) })
  }

  const onKey = (e) => {
    if (suggest && options.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSuggest({ ...suggest, i: (suggest.i + 1) % options.length }); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSuggest({ ...suggest, i: (suggest.i - 1 + options.length) % options.length }); return }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(options[suggest.i]); return }
    }
    if (e.key === 'Escape') { setSuggest(null); if (!suggest) ta.current.blur() }
  }

  const finish = () => {
    if (dirty.current) { clearTimeout(timer.current); onSave(v); dirty.current = false }
    setTimeout(() => setSuggest(null), 150)
    if (v.trim()) setEditing(false)
  }

  if (!editing) {
    return (
      <div role="button" tabIndex={0} onClick={(e) => { if (!e.target.closest('a')) setEditing(true) }}
        onKeyDown={(e) => e.key === 'Enter' && setEditing(true)}
        className="cursor-text rounded-xl px-1 py-1 hover:bg-card/70" title="Click to edit">
        <Notes text={v} ideas={ideas} />
      </div>
    )
  }

  return (
    <div className="relative">
      <textarea ref={ta} autoFocus={!!value} value={v} onChange={onChange} onKeyDown={onKey} onBlur={finish} placeholder={placeholder}
        className="w-full rounded-xl border border-line bg-card p-3 text-[15px] leading-relaxed outline-none placeholder:text-faint focus:border-faint" />
      <p className="mt-1 text-xs text-faint">Saves as you type. <b className="font-medium">[[</b> links an idea, <b className="font-medium">-</b> makes a bullet, <b className="font-medium">#</b> makes a heading.</p>
      {suggest && options.length > 0 && (
        <ul className="absolute left-3 z-20 mt-1 w-72 overflow-hidden rounded-xl border border-line bg-card py-1 shadow-xl">
          {options.map((o, k) => (
            <li key={o.id}>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); pick(o) }}
                className={`block w-full truncate px-3 py-1.5 text-left text-sm ${k === suggest.i ? 'bg-sunk' : ''}`}>{o.title}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
