export const PEOPLE = [
  { id: 'Josh', color: 'var(--color-josh)', hex: '#B04A64' },
  { id: 'Jake', color: 'var(--color-jake)', hex: '#3A8FA8' },
  { id: 'Collin', color: 'var(--color-collin)', hex: '#6F5BA8' },
]
export const PEOPLE_IDS = PEOPLE.map((p) => p.id)
// Everyone except this person
export const othersOf = (p) => PEOPLE_IDS.filter((x) => x !== p)
// ['Josh'] -> "Josh", ['Josh','Jake'] -> "Josh and Jake", 3+ -> "Josh, Jake and Collin"
export const namesList = (ids) => (ids.length < 2 ? ids[0] ?? '' : `${ids.slice(0, -1).join(', ')} and ${ids[ids.length - 1]}`)
// An idea's combined score is ready once at least 2 people have fully scored it
export const MIN_SCORERS = 2
export function combine(byPerson) {
  const done = PEOPLE.filter((p) => isComplete(byPerson?.[p.id]))
  const ready = done.length >= MIN_SCORERS
  const merged = ready ? Object.fromEntries(CRITERIA.map((c) => [c.id, done.reduce((sum, p) => sum + byPerson[p.id][c.id], 0) / done.length])) : null
  const gap = ready ? Math.max(...CRITERIA.map((c) => { const v = done.map((p) => byPerson[p.id][c.id]); return Math.max(...v) - Math.min(...v) })) : 0
  return { done, ready, merged, total: merged ? avg(merged) : null, gap }
}
// Claude can sit in as a third voice: adds ideas and gives its own score, but never counts toward the founders' averages
export const ADVISOR = { id: 'Claude', color: '#B8743A', hex: '#B8743A' }
// 'Tester' is Claude's hidden test login; it never shows up as a person
export const personHex = (p) => (p === ADVISOR.id ? ADVISOR.hex : PEOPLE.find((x) => x.id === p)?.hex ?? '#5C6A66')

// The funnel. Order matters: an idea moves left to right.
export const STAGES = [
  { id: 'dump', name: 'Dump', hint: 'Raw thoughts. No filter.', color: 'var(--color-rose)', tint: 'var(--color-card)', on: 'var(--color-ink)' },
  { id: 'exploring', name: 'Exploring', hint: 'Worth a closer look.', color: 'var(--color-navy)', tint: 'var(--color-tint-teal)', on: 'var(--color-on-teal)' },
  { id: 'validating', name: 'Validating', hint: 'Testing if people want it.', color: 'var(--color-olive)', tint: 'var(--color-tint-olive)', on: 'var(--color-on-olive)' },
  { id: 'chosen', name: 'Chosen', hint: "We're doing this.", color: 'var(--color-forest)', tint: 'var(--color-tint-rose)', on: 'var(--color-on-rose)' },
  { id: 'killed', name: 'Killed', hint: 'Passed on, with a reason.', color: 'var(--color-stone)', tint: 'var(--color-sunk)', on: 'var(--color-muted)' },
]
export const stageOf = (id) => STAGES.find((s) => s.id === id) ?? STAGES[0]

export const KINDS = [
  { id: 'unsure', name: 'Not sure yet' },
  { id: 'digital', name: 'Digital' },
  { id: 'physical', name: 'Physical' },
  { id: 'service', name: 'Service' },
]
export const kindName = (id) => KINDS.find((k) => k.id === id)?.name ?? 'Not sure yet'

// Each person rates 1–5. Higher is always better.
export const CRITERIA = [
  { id: 'demand', name: 'Demand', ask: 'Do people already want this?' },
  { id: 'margin', name: 'Margin', ask: 'Can we make good money per sale?' },
  { id: 'cheap', name: 'Cheap to start', ask: 'Can we start without much money?' },
  { id: 'fit', name: 'Skill fit', ask: 'Can we actually build it ourselves?' },
  { id: 'hype', name: 'Excitement', ask: 'Would we work on this for years?' },
]

export const avg = (obj) => {
  const v = CRITERIA.map((c) => obj?.[c.id]).filter((n) => typeof n === 'number')
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}
export const isComplete = (obj) => CRITERIA.every((c) => typeof obj?.[c.id] === 'number')

// Keyboard modifier label: ⌘ on Mac, Ctrl everywhere else
export const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
export const MOD = IS_MAC ? '⌘' : 'Ctrl'

export const ACTIVITIES = [
  { id: 'research', name: 'Research' },
  { id: 'building', name: 'Building' },
  { id: 'meeting', name: 'Meeting' },
  { id: 'admin', name: 'Admin' },
  { id: 'other', name: 'Other' },
]
export const activityName = (id) => ACTIVITIES.find((a) => a.id === id)?.name ?? 'Other'

// 3725 seconds -> "1h 2m"; under a minute -> "0m"
export const fmtDuration = (secs, { clock } = {}) => {
  secs = Math.max(0, Math.floor(secs))
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60
  if (clock) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  if (!h && !m) return secs > 0 ? '<1m' : '0m'
  return h ? `${h}h ${m}m` : `${m}m`
}
export const entrySecs = (t, now = Date.now()) => ((t.ended_at ? new Date(t.ended_at).getTime() : now) - new Date(t.started_at).getTime()) / 1000
