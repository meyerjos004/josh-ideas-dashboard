import { Link } from 'react-router-dom'
import { StageDot } from './ui'
import { kindName, personHex, avg, isComplete, PEOPLE } from '../lib/constants'
import { useIdeaScores } from '../lib/store'
import { timeAgo } from '../lib/notes'
import { ResearchStatus } from './Research'

export function ScoreBadge({ ideaId }) {
  const s = useIdeaScores(ideaId)
  const both = PEOPLE.every((p) => isComplete(s[p.id]))
  if (!both) {
    const who = PEOPLE.filter((p) => isComplete(s[p.id]))
    if (!who.length) return null
    return <span className="flex gap-0.5" title={`${who.map((w) => w.id).join(', ')} scored`}>{who.map((w) => <span key={w.id} className="size-1.5 rounded-full" style={{ background: w.hex }} />)}</span>
  }
  const v = (avg(s.Josh) + avg(s.Jake)) / 2
  return <span className="rounded bg-sunk px-1.5 py-px text-xs font-semibold tabular-nums text-ink" title="Combined score">{v.toFixed(1)}</span>
}

export default function IdeaRow({ idea, showStage = true }) {
  return (
    <Link to={`/idea/${idea.id}`} className="group flex items-start gap-3 rounded-lg px-2 py-2.5 -mx-2 hover:bg-card">
      {showStage && <span className="mt-[7px]"><StageDot stage={idea.stage} /></span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium group-hover:text-wine">{idea.title}</span>
        {idea.pitch && <span className="block truncate text-sm text-muted">{idea.pitch}</span>}
      </span>
      <span className="flex shrink-0 items-center gap-2 pt-0.5 text-xs text-faint">
        <ResearchStatus idea={idea} />
        <ScoreBadge ideaId={idea.id} />
        <span className="hidden sm:inline">{kindName(idea.kind)}</span>
        <span className="size-1.5 rounded-full" style={{ background: personHex(idea.created_by) }} title={`Added by ${idea.created_by}`} />
        <span className="w-14 text-right">{timeAgo(idea.created_at)}</span>
      </span>
    </Link>
  )
}
