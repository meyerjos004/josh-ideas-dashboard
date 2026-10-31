import { Link } from 'react-router-dom'
import { stageOf, kindName, personHex } from '../lib/constants'
import { ScoreBadge } from './IdeaRow'
import { ResearchStatus } from './Research'

// A tinted paper card for one idea. Tint follows the stage, so the wall reads at a glance.
export default function PaperCard({ idea, i = 0, note, as = 'link', onClick, dense }) {
  const st = stageOf(idea.stage)
  const tilt = i % 3 === 0 ? 'tilt-l' : i % 3 === 1 ? 'tilt-r' : ''
  const body = (
    <>
      <div className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: st.on, opacity: 0.85 }}>
        <span className="size-1.5 rounded-full" style={{ background: st.color }} />
        {st.name}
        <span className="ml-auto flex items-center gap-1.5 font-normal"><ResearchStatus idea={idea} /><ScoreBadge ideaId={idea.id} /></span>
      </div>
      <div className={`display mt-1.5 font-bold leading-[1.15] ${dense ? 'text-[15px]' : 'text-[17px]'}`}>{idea.title}</div>
      {!dense && idea.pitch && <p className="mt-1 line-clamp-2 text-[13px] opacity-80">{idea.pitch}</p>}
      {idea.stage === 'killed' && idea.kill_reason && <p className="mt-1 line-clamp-2 text-[12px] italic opacity-70">{idea.kill_reason}</p>}
      <div className="mt-2 flex items-center gap-2 text-[11px] opacity-70">
        {note ?? kindName(idea.kind)}
        <span className="ml-auto size-1.5 rounded-full" style={{ background: personHex(idea.created_by) }} title={`Added by ${idea.created_by}`} />
      </div>
    </>
  )
  const cls = `paper ${tilt} block rounded-2xl p-3.5 transition-transform hover:-translate-y-0.5 hover:rotate-0`
  const style = { background: st.tint, color: st.on }
  if (as === 'div') return <div className={cls} style={style} onClick={onClick}>{body}</div>
  return <Link to={`/idea/${idea.id}`} className={cls} style={style}>{body}</Link>
}
