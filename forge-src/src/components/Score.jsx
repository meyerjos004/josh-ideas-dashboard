import { motion, AnimatePresence } from 'motion/react'
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from 'recharts'
import { Lock } from 'lucide-react'
import { ADVISOR, CRITERIA, PEOPLE, avg, isComplete, personHex } from '../lib/constants'
import { useStore, useIdeaScores } from '../lib/store'

export function ScoreRadar({ series, height = 260 }) {
  // series: [{ key, color, scores }]
  const data = CRITERIA.map((c) => {
    const row = { name: c.name }
    series.forEach((s) => { row[s.key] = s.scores?.[c.id] ?? 0 })
    return row
  })
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer>
        <RadarChart data={data} outerRadius="64%" margin={{ top: 8, right: 28, bottom: 8, left: 28 }}>
          <PolarGrid stroke="var(--color-line)" />
          <PolarAngleAxis dataKey="name" tick={{ fill: 'var(--color-muted)', fontSize: 11 }} />
          <PolarRadiusAxis domain={[0, 5]} tickCount={6} tick={false} axisLine={false} />
          {series.map((s) => (
            <Radar key={s.key} dataKey={s.key} stroke={s.color} fill={s.color} fillOpacity={0.14} strokeWidth={2}
              isAnimationActive animationDuration={700} dot={{ r: 2.5, fill: s.color }} />
          ))}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

function Pips({ value, onPick, color }) {
  return (
    <div className="flex gap-1" role="radiogroup">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} role="radio" aria-checked={value === n} aria-label={`${n} of 5`} onClick={() => onPick(n)}
          className="grid size-8 place-items-center rounded-md text-sm font-medium transition-colors"
          style={value >= n ? { background: color, color: '#F9FBF8' } : { background: 'var(--color-sunk)', color: 'var(--color-faint)' }}>
          {n}
        </button>
      ))}
    </div>
  )
}

export default function ScorePanel({ ideaId }) {
  const { person, setScore } = useStore()
  const byPerson = useIdeaScores(ideaId)
  const mine = byPerson[person] ?? {}
  const other = PEOPLE.find((p) => p.id !== person)?.id
  const theirs = byPerson[other]
  const iDone = isComplete(mine)
  const theyDone = isComplete(theirs)
  const revealed = iDone && theyDone
  const myColor = personHex(person)
  const advisor = person !== ADVISOR.id && isComplete(byPerson[ADVISOR.id]) ? byPerson[ADVISOR.id] : null

  return (
    <section aria-labelledby="score-h">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id="score-h" className="text-xl font-semibold">Score it</h2>
        <p className="text-xs text-muted">Scores stay hidden until you've both rated.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_minmax(0,300px)]">
        <ul className="space-y-3">
          {CRITERIA.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
              <div className="min-w-0">
                <div className="text-sm font-medium">{c.name}</div>
                <div className="text-xs text-muted">{c.ask}</div>
              </div>
              <Pips value={mine[c.id]} color={myColor} onPick={(n) => setScore(ideaId, c.id, n)} />
            </li>
          ))}
        </ul>

        <div className="relative rounded-xl bg-sunk/60 p-3">
          <AnimatePresence mode="wait">
            {revealed ? (
              <motion.div key="rev" initial={{ opacity: 0, scale: .94 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 22 }}>
                <ScoreRadar height={230} series={[...PEOPLE.map((p) => ({ key: p.id, color: p.hex, scores: byPerson[p.id] })), ...(advisor ? [{ key: ADVISOR.id, color: ADVISOR.hex, scores: advisor }] : [])]} />
                <div className="flex items-center justify-center gap-4 text-sm">
                  {PEOPLE.map((p) => (
                    <span key={p.id} className="inline-flex items-center gap-1.5">
                      <span className="size-2.5 rounded-full" style={{ background: p.hex }} />{p.id}
                      <b className="tabular-nums">{avg(byPerson[p.id]).toFixed(1)}</b>
                    </span>
                  ))}
                  {advisor && (
                    <span className="inline-flex items-center gap-1.5 text-muted" title="Claude's take. Not counted in your averages.">
                      <span className="size-2.5 rounded-full" style={{ background: ADVISOR.hex }} />Claude
                      <b className="tabular-nums">{avg(advisor).toFixed(1)}</b>
                    </span>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div key="wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ScoreRadar height={230} series={[{ key: person ?? 'me', color: myColor, scores: mine }]} />
                <p className="flex items-center justify-center gap-1.5 pb-1 text-center text-xs text-muted">
                  <Lock size={12} />
                  {!iDone
                    ? (theyDone ? `${other} has scored. Finish yours to see both.` : 'Rate all five to lock in your score.')
                    : `Waiting on ${other}.`}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
