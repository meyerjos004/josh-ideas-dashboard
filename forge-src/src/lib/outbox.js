// Ideas typed with no connection wait here (on this device) and send when you're back online.
const KEY = 'forge.outbox'

export function getOutbox() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}
function put(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch { /* storage full or blocked */ }
  window.dispatchEvent(new CustomEvent('forge:outbox', { detail: list.length }))
}
export function queueIdea(text, kind) {
  put([...getOutbox(), { text, kind, at: new Date().toISOString(), id: Math.random().toString(36).slice(2) }])
}

let flushing = false
// Sends everything waiting. `send(text, kind)` must resolve to the saved idea, or null on failure.
export async function flushOutbox(send) {
  if (flushing || !navigator.onLine) return 0
  flushing = true
  let sent = 0
  try {
    for (const item of getOutbox()) {
      const ok = await send(item.text, item.kind).catch(() => null)
      if (!ok) break
      put(getOutbox().filter((x) => x.id !== item.id))
      sent++
    }
  } finally { flushing = false }
  return sent
}

// ── Duplicate check: a free, instant text match against ideas you already have ──
const STOP = new Set('a an the and or but for of to in on at by with from that this it its is are be can could would should will just like maybe kind sort thing things idea ideas some any we our you your i my me selling sell sells product products business app'.split(' '))
const words = (s) => (s ?? '').toLowerCase().replace(/https?:\/\/\S+/g, ' ').match(/[a-z0-9]+/g)?.map((w) => (w.length > 4 && w.endsWith('s') ? w.slice(0, -1) : w)).filter((w) => w.length > 2 && !STOP.has(w)) ?? []
const grams = (s) => { const t = ` ${s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `; const g = new Set(); for (let i = 0; i < t.length - 2; i++) g.add(t.slice(i, i + 3)); return g }

export function findSimilar(text, ideas) {
  const mine = new Set(words(text))
  if (mine.size < 2) return null
  let best = null
  for (const i of ideas) {
    if (i.deleted_at) continue
    const theirs = new Set(words(`${i.title} ${i.raw_input ?? ''} ${i.pitch ?? ''}`))
    const shared = [...mine].filter((w) => theirs.has(w)).length
    const overlap = shared / Math.min(mine.size, Math.max(theirs.size, 1))
    const a = grams(text), b = grams(i.title)
    const dice = (2 * [...a].filter((g) => b.has(g)).length) / (a.size + b.size || 1)
    const score = Math.max(shared >= 2 ? overlap : 0, dice)
    if (score >= 0.5 && (!best || score > best.score)) best = { idea: i, score }
  }
  return best?.idea ?? null
}
