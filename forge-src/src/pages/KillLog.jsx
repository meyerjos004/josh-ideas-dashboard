import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, RotateCcw } from 'lucide-react'
import { useStore } from '../lib/store'
import { KINDS, kindName, personHex } from '../lib/constants'
import { Empty } from '../components/ui'

// Every killed idea, newest first, with the reason — so you don't relitigate old decisions.
export default function KillLog() {
  const { ideas, updateIdea, flash } = useStore()
  const killed = useMemo(() => ideas.filter((i) => i.stage === 'killed')
    .sort((a, b) => (b.killed_at ?? b.updated_at ?? '').localeCompare(a.killed_at ?? a.updated_at ?? '')), [ideas])

  const pattern = useMemo(() => {
    const byKind = KINDS.map((k) => ({ ...k, n: killed.filter((i) => i.kind === k.id).length })).filter((k) => k.n).sort((a, b) => b.n - a.n)
    const tags = {}
    killed.forEach((i) => (i.tags ?? []).forEach((t) => { tags[t] = (tags[t] ?? 0) + 1 }))
    const topTags = Object.entries(tags).filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]).slice(0, 6)
    const noReason = killed.filter((i) => !i.kill_reason?.trim()).length
    return { byKind, topTags, noReason, rate: ideas.length ? Math.round((killed.length / ideas.length) * 100) : 0 }
  }, [killed, ideas])

  const revive = (i) => { updateIdea(i.id, { stage: 'dump', kill_reason: i.kill_reason }); flash(`“${i.title}” is back in the dump.`) }
  const when = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '')

  return (
    <div className="max-w-3xl space-y-8">
      <header>
        <Link to="/board" className="-ml-1 mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft size={15} /> Board</Link>
        <h1 className="text-[40px] font-extrabold leading-none tracking-[-0.02em]">Kill log</h1>
        <p className="mt-1.5 text-muted">Every idea you passed on, and why. Check here before you get excited about something that sounds familiar.</p>
      </header>

      {killed.length === 0 ? (
        <Empty>Nothing killed yet. When you drag an idea to Killed, it lands here with your reason.</Empty>
      ) : (
        <>
          <section className="paper rounded-3xl bg-card p-5">
            <h2 className="text-lg font-bold">What you keep rejecting</h2>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
              <div><dt className="text-xs text-muted">Killed</dt><dd className="display text-2xl font-bold tabular-nums">{killed.length}</dd></div>
              <div><dt className="text-xs text-muted">Of all ideas</dt><dd className="display text-2xl font-bold tabular-nums">{pattern.rate}%</dd></div>
              <div className="col-span-2"><dt className="text-xs text-muted">Most often</dt><dd className="mt-1 text-[15px]">{pattern.byKind.map((k) => `${k.name} (${k.n})`).join(' · ') || '—'}</dd></div>
            </dl>
            {pattern.topTags.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-xs text-muted">Recurring themes</span>
                {pattern.topTags.map(([t, n]) => <span key={t} className="rounded-full bg-sunk px-2.5 py-0.5 text-xs">{t} · {n}</span>)}
              </div>
            )}
            {pattern.noReason > 0 && <p className="mt-4 text-[13px] text-wine">{pattern.noReason} killed idea{pattern.noReason === 1 ? ' has' : 's have'} no reason written. Add one so you remember why.</p>}
          </section>

          <ol className="space-y-3">
            {killed.map((i) => (
              <li key={i.id} className="paper rounded-2xl bg-card p-4">
                <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
                  <Link to={`/idea/${i.id}`} className="display min-w-0 flex-1 text-[18px] font-bold leading-snug hover:underline">{i.title}</Link>
                  <button onClick={() => revive(i)} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-muted hover:bg-sunk hover:text-ink"><RotateCcw size={12} /> Bring back</button>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                  <span>Killed {when(i.killed_at ?? i.updated_at)}</span><span>·</span><span>{kindName(i.kind)}</span><span>·</span>
                  <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full" style={{ background: personHex(i.created_by) }} />{i.created_by}'s idea</span>
                </div>
                {i.kill_reason?.trim()
                  ? <p className="mt-2 border-l-2 border-line pl-3 text-[15px] italic text-ink/85">{i.kill_reason}</p>
                  : <Link to={`/idea/${i.id}`} className="mt-2 inline-block text-[13px] text-wine underline underline-offset-2">Add the reason</Link>}
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  )
}
