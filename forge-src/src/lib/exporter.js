// Export everything in Forge to one spreadsheet (one tab per kind of thing),
// and download the automatic weekly backups as JSON.
import { CRITERIA, avg, kindName, stageOf } from './constants'
import { ROADMAP } from './roadmap'
import { sb } from './sb'

const H = (v) => ({ value: v, fontWeight: 'bold', backgroundColor: '#E4EBE5' })
const T = (v) => ({ type: String, value: v == null ? '' : String(v), wrap: false })
const N = (v) => (typeof v === 'number' && isFinite(v) ? { type: Number, value: Math.round(v * 100) / 100 } : null)
const D = (v) => (v ? { type: Date, value: new Date(v), format: 'yyyy-mm-dd hh:mm' } : null)
const hours = (t) => ((t.ended_at ? new Date(t.ended_at) : new Date()) - new Date(t.started_at)) / 3600000

export async function exportSpreadsheet({ ideas, trash, scores, sessions, actions, time, roadmap }) {
  const { default: writeXlsxFile } = await import('write-excel-file')
  const title = Object.fromEntries([...ideas, ...trash].map((i) => [i.id, i.title]))
  const people = [...new Set(scores.map((s) => s.person))].sort()

  const ideaRows = [
    [H('Title'), H('Stage'), H('Type'), H('Added by'), H('Added'), H('Pitch'), H('Tags'), ...people.map((p) => H(`${p} score`)), H('Kill reason'), H('Notes')],
    ...[...ideas].sort((a, b) => b.created_at.localeCompare(a.created_at)).map((i) => [
      T(i.title), T(stageOf(i.stage).name), T(kindName(i.kind)), T(i.created_by), D(i.created_at), T(i.pitch), T((i.tags ?? []).join(', ')),
      ...people.map((p) => N(avg(scores.find((s) => s.idea_id === i.id && s.person === p)?.scores))),
      T(i.kill_reason), T(i.notes),
    ]),
  ]
  const scoreRows = [
    [H('Idea'), H('Person'), ...CRITERIA.map((c) => H(c.name)), H('Average')],
    ...scores.map((s) => [T(title[s.idea_id]), T(s.person), ...CRITERIA.map((c) => N(s.scores?.[c.id])), N(avg(s.scores))]),
  ]
  const sessionRows = [
    [H('Date'), H('Title'), H('Decisions'), H('Notes')],
    ...[...sessions].sort((a, b) => b.held_on.localeCompare(a.held_on)).map((s) => [T(s.held_on), T(s.title), T(s.decisions), T(s.notes)]),
  ]
  const todoRows = [
    [H('To-do'), H('Owner'), H('Done'), H('Idea'), H('Added')],
    ...actions.map((a) => [T(a.text), T(a.owner), T(a.done ? 'Yes' : 'No'), T(title[a.idea_id]), D(a.created_at)]),
  ]
  const hourRows = [
    [H('Person'), H('Started'), H('Ended'), H('Hours'), H('Activity'), H('Idea'), H('Note')],
    ...time.map((t) => [T(t.person), D(t.started_at), D(t.ended_at), N(hours(t)), T(t.activity), T(title[t.idea_id]), T(t.note)]),
  ]
  const doneMap = Object.fromEntries(roadmap.map((r) => [r.step_id, r]))
  const roadRows = [
    [H('Phase'), H('Step'), H('Done'), H('By'), H('When')],
    ...ROADMAP.flatMap((p) => p.steps.map((s) => [T(p.phase), T(s.title), T(doneMap[s.id]?.done ? 'Yes' : 'No'), T(doneMap[s.id]?.done_by), D(doneMap[s.id]?.done_at)])),
  ]
  const day = new Date().toLocaleDateString('en-CA')
  await writeXlsxFile([ideaRows, scoreRows, sessionRows, todoRows, hourRows, roadRows], {
    sheets: ['Ideas', 'Scores', 'Sessions', 'To-dos', 'Hours', 'Roadmap'],
    columns: [
      [{ width: 34 }, { width: 12 }, { width: 12 }, { width: 10 }, { width: 16 }, { width: 60 }, { width: 24 }, ...people.map(() => ({ width: 11 })), { width: 40 }, { width: 60 }],
      [{ width: 34 }, { width: 10 }, ...CRITERIA.map(() => ({ width: 14 })), { width: 10 }],
      [{ width: 12 }, { width: 34 }, { width: 60 }, { width: 60 }],
      [{ width: 50 }, { width: 10 }, { width: 8 }, { width: 30 }, { width: 16 }],
      [{ width: 10 }, { width: 16 }, { width: 16 }, { width: 8 }, { width: 14 }, { width: 30 }, { width: 50 }],
      [{ width: 22 }, { width: 50 }, { width: 8 }, { width: 10 }, { width: 16 }],
    ],
    fileName: `Forge export ${day}.xlsx`,
  })
}

export async function listBackups() {
  const { data } = await sb.from('forge_backups').select('id, made_at').order('made_at', { ascending: false }).limit(8)
  return data ?? []
}

export async function downloadBackup(id) {
  const { data, error } = await sb.from('forge_backups').select('made_at, data').eq('id', id).single()
  if (error) throw error
  const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' })
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `Forge backup ${new Date(data.made_at).toLocaleDateString('en-CA')}.json` })
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}
