import { Link } from 'react-router-dom'
import { Fragment } from 'react'

// Finds [[Idea title]] references in a block of notes
export const linkedTitles = (text = '') =>
  [...text.matchAll(/\[\[([^\]\n]+)\]\]/g)].map((m) => m[1].trim().toLowerCase())

const INLINE = /(\[\[[^\]\n]+\]\]|https?:\/\/[^\s)]+|\*\*[^*\n]+\*\*)/g

function Inline({ text, ideas }) {
  const parts = text.split(INLINE)
  return parts.map((part, i) => {
    if (!part) return null
    if (part.startsWith('[[') && part.endsWith(']]')) {
      const title = part.slice(2, -2).trim()
      const hit = ideas.find((x) => x.title.trim().toLowerCase() === title.toLowerCase())
      return hit
        ? <Link key={i} to={`/idea/${hit.id}`} className="rounded bg-wine-soft px-1 py-px font-medium text-wine no-underline">{title}</Link>
        : <span key={i} className="rounded border border-dashed border-faint px-1 text-muted" title="No idea with this name yet">{title}</span>
    }
    if (/^https?:\/\//.test(part)) {
      let label = part
      try { const u = new URL(part); label = u.hostname.replace(/^www\./, '') + (u.pathname.length > 1 ? u.pathname : '') } catch { /* keep raw */ }
      return <a key={i} href={part} target="_blank" rel="noreferrer" className="text-navy">{label.length > 48 ? label.slice(0, 46) + '…' : label}</a>
    }
    if (part.startsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>
    return <Fragment key={i}>{part}</Fragment>
  })
}

// Tiny renderer: "# heading", "- bullet", blank-line paragraphs, [[links]], URLs, **bold**
export function Notes({ text, ideas }) {
  const blocks = []
  let list = null
  text.split('\n').forEach((line) => {
    const t = line.trimEnd()
    if (/^\s*[-*]\s+/.test(t)) {
      if (!list) { list = []; blocks.push({ type: 'ul', items: list }) }
      list.push(t.replace(/^\s*[-*]\s+/, ''))
      return
    }
    list = null
    if (/^#{1,3}\s+/.test(t)) blocks.push({ type: 'h', text: t.replace(/^#{1,3}\s+/, '') })
    else if (t.trim() === '') blocks.push({ type: 'gap' })
    else {
      const last = blocks[blocks.length - 1]
      if (last?.type === 'p') last.lines.push(t)
      else blocks.push({ type: 'p', lines: [t] })
    }
  })
  return (
    <div className="prose-notes">
      {blocks.map((b, i) => {
        if (b.type === 'ul') return <ul key={i}>{b.items.map((it, j) => <li key={j}><Inline text={it} ideas={ideas} /></li>)}</ul>
        if (b.type === 'h') return <h4 key={i}><Inline text={b.text} ideas={ideas} /></h4>
        if (b.type === 'p') return <p key={i}>{b.lines.map((l, j) => <Fragment key={j}>{j > 0 && <br />}<Inline text={l} ideas={ideas} /></Fragment>)}</p>
        return null
      })}
    </div>
  )
}

export const timeAgo = (iso) => {
  if (!iso) return ''
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
