export const PEOPLE = [
  { id: 'Josh', color: 'var(--color-josh)', hex: '#5D2535' },
  { id: 'Jake', color: 'var(--color-jake)', hex: '#2B6C82' },
]
export const personHex = (p) => PEOPLE.find((x) => x.id === p)?.hex ?? '#5C6A66'

// The funnel. Order matters: an idea moves left to right.
export const STAGES = [
  { id: 'dump', name: 'Dump', hint: 'Raw thoughts. No filter.', color: 'var(--color-rose)' },
  { id: 'exploring', name: 'Exploring', hint: 'Worth a closer look.', color: 'var(--color-navy)' },
  { id: 'validating', name: 'Validating', hint: 'Testing if people want it.', color: 'var(--color-olive)' },
  { id: 'chosen', name: 'Chosen', hint: "We're doing this.", color: 'var(--color-forest)' },
  { id: 'killed', name: 'Killed', hint: 'Passed on, with a reason.', color: 'var(--color-stone)' },
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
  { id: 'fit', name: 'Skill fit', ask: 'Can the two of us actually build it?' },
  { id: 'hype', name: 'Excitement', ask: 'Would we work on this for years?' },
]

export const avg = (obj) => {
  const v = CRITERIA.map((c) => obj?.[c.id]).filter((n) => typeof n === 'number')
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}
export const isComplete = (obj) => CRITERIA.every((c) => typeof obj?.[c.id] === 'number')
