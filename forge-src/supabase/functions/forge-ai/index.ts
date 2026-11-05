// Forge AI: turns a rough idea into a researched one, and powers the coach chat.
// Runs on Supabase Edge Functions and calls Claude with live web search.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { ROADMAP } from './roadmap.ts'

const MODEL = 'claude-sonnet-5-5'
const PUBLIC_KEY = 'sb_publishable_VdkNDTcxwk0lkWpppf9vtQ_jAq4adZn'
const HOURLY_LIMIT = 60

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const API_KEY = Deno.env.get('ANTHROPIC_API_KEY')

const FOUNDERS = `You are helping Josh and Jake, two first-time founders in Utah, USA, who want to start a business together. Their friend Collin is on Forge too: he adds ideas and scores them alongside them.
They are self-taught, move fast, have a small budget, and have never started a company. They might sell a digital download (files, PDFs, templates), a paid subscription community, an online course, software, a physical product, or a service.
Talk to them like a sharp, honest friend who has started businesses before: plain words, no jargon (or explain it in a few words), concrete and specific.
Push cheap tests before big spending. Be honest about weak ideas, but always show the way forward.`

// ---------- Claude ----------
type Block = { type: string; text?: string; citations?: { url: string; title: string }[]; content?: unknown }

async function claude(system: string, messages: unknown[], maxSearches: number, maxTokens = 4000) {
  const convo = [...messages] as { role: string; content: unknown }[]
  const blocks: Block[] = []
  const usage = { input: 0, output: 0, searches: 0 }
  for (let turn = 0; turn < 4; turn++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': API_KEY!, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL, max_tokens: maxTokens, system, messages: convo,
        tools: maxSearches > 0 ? [{
          type: 'web_search_20250305', name: 'web_search', max_uses: maxSearches,
          user_location: { type: 'approximate', region: 'Utah', country: 'US', timezone: 'America/Denver' },
        }] : undefined,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error?.message || `Claude API error ${res.status}`)
    usage.input += data.usage?.input_tokens ?? 0
    usage.output += data.usage?.output_tokens ?? 0
    usage.searches += data.usage?.server_tool_use?.web_search_requests ?? 0
    blocks.push(...data.content)
    if (data.stop_reason !== 'pause_turn') break
    convo.push({ role: 'assistant', content: data.content }) // long search turn: hand it back unchanged
  }
  // Only the text after the last search is the final answer
  const lastTool = blocks.map((b) => b.type).lastIndexOf('web_search_tool_result')
  const text = blocks.slice(lastTool + 1).filter((b) => b.type === 'text').map((b) => b.text).join('')
  const sources = new Map<string, string>()
  blocks.forEach((b) => b.citations?.forEach((c) => c.url && sources.set(c.url, c.title)))
  if (sources.size === 0) {
    blocks.filter((b) => b.type === 'web_search_tool_result' && Array.isArray(b.content))
      .forEach((b) => (b.content as { url: string; title: string }[]).slice(0, 3).forEach((r) => r.url && sources.set(r.url, r.title)))
  }
  return { text, sources: [...sources].slice(0, 12).map(([url, title]) => ({ url, title })), usage }
}

async function log(action: string, usage: { input: number; output: number; searches: number }) {
  await db.from('forge_ai_log').insert({ action, input_tokens: usage.input, output_tokens: usage.output, searches: usage.searches })
}

async function underLimit() {
  const since = new Date(Date.now() - 3600_000).toISOString()
  const { count } = await db.from('forge_ai_log').select('id', { count: 'exact', head: true }).gte('created_at', since)
  return (count ?? 0) < HOURLY_LIMIT
}

function pullJson(text: string) {
  const start = text.indexOf('{'), end = text.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('The AI reply had no research data in it.')
  return JSON.parse(text.slice(start, end + 1))
}

// ---------- links ----------
// If the idea includes a link, read the page so the research starts from what's actually there.
async function readLinks(raw: string) {
  const urls = [...new Set(raw.match(/https?:\/\/[^\s<>"')]+/gi) ?? [])].slice(0, 2)
  const out: string[] = []
  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000), redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (compatible; ForgeBot/1.0; idea research)', accept: 'text/html,*/*' } })
      if (!res.ok || !(res.headers.get('content-type') ?? '').includes('html')) { out.push(`${url}: (couldn't read the page, status ${res.status})`); continue }
      const html = (await res.text()).slice(0, 400_000)
      const pick = (re: RegExp) => html.match(re)?.[1]?.replace(/\s+/g, ' ').trim() ?? ''
      const title = pick(/<title[^>]*>([\s\S]*?)<\/title>/i)
      const desc = pick(/<meta[^>]+(?:name|property)=["'](?:og:)?description["'][^>]+content=["']([^"']*)/i)
      const body = html.replace(/<(script|style|noscript|svg|nav|footer)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim().slice(0, 5000)
      out.push(`${url}\nTitle: ${title}\nDescription: ${desc}\nPage text: ${body}`)
    } catch (e) { out.push(`${url}: (couldn't read the page: ${(e as Error).message})`) }
  }
  return out.join('\n\n')
}

// ---------- research ----------
const RESEARCH_PROMPT = (raw: string, existing: string[], pages = '') => `Here's a rough idea one of them typed in a hurry:

"${raw}"
${pages ? `\nThey included a link. Here's what's on that page; treat it as the main source for what the idea is (it may be a product they want to copy, improve on, or sell):\n${pages}\n` : ''}
Their other ideas so far (to avoid duplicates and spot connections): ${existing.length ? existing.join('; ') : 'none yet'}.

Do this:
1. Work out what they most likely mean. Expand it into a clear idea.
2. Search the web (a few searches) for: existing competitors or similar products, what they charge, and signs people want this (reviews, forums, search interest, market size if easy to find).
If it's a download, community or course, include the platforms creators use to sell it (e.g. Gumroad, Lemon Squeezy, Skool, Whop, Teachable, Podia) with their current fees if you find them, and what similar creators charge.
3. Then reply with ONLY a JSON object, no other text, in exactly this shape:
{
  "title": "clear name for the idea, under 8 words",
  "pitch": "2-3 plain sentences: what it is, who buys it, why they'd pay",
  "kind": "download" | "community" | "course" | "digital" | "physical" | "service" | "unsure",  // download = files/PDFs/templates sold once; community = paid monthly membership; course = online course; digital = software/app
  "tags": ["2-4 short lowercase tags"],
  "who_buys": "the specific first customer, in one sentence",
  "competitors": [{"name": "", "url": "", "price": "what they charge, or empty", "note": "one line on them, incl. a weakness if known"}],
  "market": {"price_range": "what customers typically pay", "demand": "one or two sentences on evidence of demand, honest about how strong it is"},
  "risks": ["2-3 biggest risks, one line each"],
  "open_questions": ["3-5 specific things they still need to find out themselves"],
  "next_steps": [{"step": "concrete action", "why": "one line", "cost": "$0, about $X, etc."}],
  "verdict": "2 honest sentences: is this worth testing, and what would make it work"
}
Give 2-4 competitors and exactly 3 next steps, cheapest tests first. Only use real URLs you found.`

async function research(ideaId: string) {
  const { data: idea } = await db.from('forge_ideas').select('*').eq('id', ideaId).single()
  if (!idea) return
  await db.from('forge_ideas').update({ ai_status: 'working', ai_error: '' }).eq('id', ideaId)
  try {
    const { data: others } = await db.from('forge_ideas').select('title').neq('id', ideaId).is('deleted_at', null).limit(40)
    const raw = idea.raw_input || [idea.title, idea.pitch].filter(Boolean).join('. ')
    const pages = /https?:\/\//i.test(raw) ? await readLinks(raw) : ''
    const { text, sources, usage } = await claude(FOUNDERS, [{ role: 'user', content: RESEARCH_PROMPT(raw, (others ?? []).map((o) => o.title), pages) }], 5, 4000)
    await log('research', usage)
    const r = pullJson(text)
    const kinds = ['download', 'community', 'course', 'digital', 'physical', 'service', 'unsure']
    // Re-read in case someone edited the idea while research ran
    const { data: now } = await db.from('forge_ideas').select('title, pitch, kind, raw_input').eq('id', ideaId).single()
    // Only rename on the first research, and only if nobody renamed it meanwhile
    const untouchedTitle = !idea.ai && now?.title === idea.title
    const patch: Record<string, unknown> = {
      ai: { ...r, sources, researched_at: new Date().toISOString() },
      ai_status: 'done', ai_error: '', tags: Array.isArray(r.tags) ? r.tags.slice(0, 5) : [],
      updated_at: new Date().toISOString(),
    }
    if (untouchedTitle && r.title) patch.title = String(r.title).slice(0, 120)
    if (!now?.pitch && r.pitch) patch.pitch = r.pitch
    if ((now?.kind ?? 'unsure') === 'unsure' && kinds.includes(r.kind)) patch.kind = r.kind
    await db.from('forge_ideas').update(patch).eq('id', ideaId)
  } catch (e) {
    console.error(e)
    await db.from('forge_ideas').update({ ai_status: 'error', ai_error: String((e as Error).message ?? e).slice(0, 300) }).eq('id', ideaId)
  }
}

// ---------- coach ----------
async function coachContext(ideaId: string | null) {
  const { data: steps } = await db.from('forge_roadmap').select('step_id, done')
  const done = new Set((steps ?? []).filter((s) => s.done).map((s) => s.step_id))
  const roadmap = ROADMAP.map((p) => `${p.phase}:\n` + p.steps.map((s) => `  [${done.has(s.id) ? 'x' : ' '}] ${s.title}`).join('\n')).join('\n')
  const { data: ideas } = await db.from('forge_ideas').select('id, title, stage, pitch').is('deleted_at', null).limit(60)
  const board = (ideas ?? []).map((i) => `- ${i.title} (${i.stage})`).join('\n') || '(no ideas yet)'
  let focus = ''
  if (ideaId) {
    const { data: idea } = await db.from('forge_ideas').select('*').eq('id', ideaId).single()
    const { data: scores } = await db.from('forge_scores').select('person, scores').eq('idea_id', ideaId)
    const { data: todos } = await db.from('forge_actions').select('text, owner, done').eq('idea_id', ideaId)
    if (idea) {
      const ai = idea.ai ? { ...idea.ai, sources: undefined } : null
      focus = `\n\nTHE IDEA THEY'RE ASKING ABOUT:
Title: ${idea.title}
Stage: ${idea.stage}  Type: ${idea.kind}
What they originally typed: ${idea.raw_input || '(typed directly)'}
Pitch: ${idea.pitch || '(none)'}
Their notes: ${idea.notes?.slice(0, 3000) || '(none)'}
${idea.stage === 'killed' ? `Why they killed it: ${idea.kill_reason}\n` : ''}Scores (1-5: demand, margin, cheap to start, skill fit, excitement): ${JSON.stringify(scores ?? [])}
To-dos: ${JSON.stringify(todos ?? [])}
Earlier AI research: ${ai ? JSON.stringify(ai).slice(0, 4000) : '(none)'}`
    }
  }
  const titleOf = new Map((ideas ?? []).map((i) => [i.id, i.title]))
  const day = (iso: string) => new Date(iso).toLocaleDateString('en-US', { timeZone: 'America/Denver', weekday: 'short', month: 'short', day: 'numeric' })
  const cut = (t: string | null | undefined, n: number) => { const x = (t ?? '').replace(/\s+/g, ' ').trim(); return x.length > n ? x.slice(0, n) + '…' : x }

  // Brainstorm sessions: most recent first
  const { data: sessions } = await db.from('forge_sessions').select('id, title, held_on, notes, decisions').order('held_on', { ascending: false }).order('created_at', { ascending: false }).limit(6)
  const { data: openTodos } = await db.from('forge_actions').select('text, owner, session_id, idea_id').eq('done', false).limit(40)
  const sessionText = (sessions ?? []).map((s) => {
    const todos = (openTodos ?? []).filter((a) => a.session_id === s.id).map((a) => `${a.text} (${a.owner || 'unassigned'})`)
    return `- ${s.held_on}: ${s.title}` +
      (s.decisions ? `\n  Decided: ${cut(s.decisions, 500)}` : '') +
      (s.notes ? `\n  Talked about: ${cut(s.notes, 600)}` : '') +
      (todos.length ? `\n  Open to-dos: ${todos.join('; ')}` : '')
  }).join('\n') || '(no sessions logged yet)'
  const allOpen = (openTodos ?? []).map((a) => `- ${a.text} (${a.owner || 'unassigned'}${a.idea_id && titleOf.get(a.idea_id) ? `, for ${titleOf.get(a.idea_id)}` : ''})`).join('\n') || '(none)'

  // Time spent on the business
  const { data: time } = await db.from('forge_time').select('person, started_at, ended_at, activity, note, idea_id').order('started_at', { ascending: false }).limit(500)
  const weekAgo = Date.now() - 7 * 86400_000
  const hrs = (secs: number) => `${(secs / 3600).toFixed(1)}h`
  const per: Record<string, { week: number; all: number }> = {}
  const acts: Record<string, number> = {}
  const onIdea: Record<string, number> = {}
  let running = ''
  for (const t of time ?? []) {
    const secs = ((t.ended_at ? Date.parse(t.ended_at) : Date.now()) - Date.parse(t.started_at)) / 1000
    per[t.person] ??= { week: 0, all: 0 }
    per[t.person].all += secs
    if (Date.parse(t.started_at) >= weekAgo) per[t.person].week += secs
    acts[t.activity] = (acts[t.activity] ?? 0) + secs
    const k = t.idea_id && titleOf.get(t.idea_id) ? titleOf.get(t.idea_id)! : 'general business'
    onIdea[k] = (onIdea[k] ?? 0) + secs
    if (!t.ended_at) running += `${t.person} is clocked in right now (${t.activity}, on ${k}). `
  }
  const hoursText = Object.keys(per).length
    ? Object.entries(per).map(([p, v]) => `${p}: ${hrs(v.week)} in the last 7 days, ${hrs(v.all)} total`).join('; ') +
      `\nBy activity: ${Object.entries(acts).map(([a, v]) => `${a} ${hrs(v)}`).join(', ')}` +
      `\nBy idea: ${Object.entries(onIdea).sort((a, b) => b[1] - a[1]).map(([a, v]) => `${a} ${hrs(v)}`).join(', ')}` +
      (running ? `\n${running}` : '') +
      `\nRecent work notes: ${(time ?? []).filter((t) => t.note).slice(0, 6).map((t) => `${day(t.started_at)} ${t.person}: ${cut(t.note, 120)}`).join(' | ') || '(none)'}`
    : '(no time logged yet)'

  // What they've discussed with you in other chats
  let otherChats = db.from('forge_chats').select('idea_id, role, person, content, created_at').eq('status', 'done').order('created_at', { ascending: false }).limit(24)
  otherChats = ideaId ? otherChats.or(`idea_id.is.null,idea_id.neq.${ideaId}`) : otherChats.not('idea_id', 'is', null)
  const { data: recent } = await otherChats
  const chatText = (recent ?? []).reverse().map((c) => {
    const where = c.idea_id ? (titleOf.get(c.idea_id) ?? 'an idea') : 'the general coach chat'
    return `- [${day(c.created_at)}, ${where}] ${c.role === 'user' ? (c.person || 'They') : 'You'}: ${cut(c.content, c.role === 'user' ? 200 : 260)}`
  }).join('\n') || '(none yet)'

  return `${FOUNDERS}

You are their business coach inside Forge, the app where they collect and sort ideas. Today is ${day(new Date().toISOString())}.

Their founder roadmap (x = done):
${roadmap}

Their idea board:
${board}

Brainstorm sessions they've logged (newest first):
${sessionText}

All open to-dos:
${allOpen}

Time they've put into the business:
${hoursText}

Recent conversations with you elsewhere in Forge (for continuity; refer back to them when relevant, don't repeat yourself):
${chatText}${focus}

How to answer:
- Short and skimmable: a few sentences or a tight list. No long essays unless they ask.
- Specific to them and this idea, never generic advice.
- Search the web when facts would help (prices, competitors, rules, suppliers), and say what you found.
- For legal or tax questions, give the practical basics, then say when it's worth a quick check with a pro.
- Use what you know about them: past decisions in sessions, open to-dos, time put in, earlier chats. If something they say conflicts with an earlier decision, point it out.
- End with one clear next action, phrased as something they can do this week.`
}

async function coach(chatId: string, ideaId: string | null) {
  try {
    let q = db.from('forge_chats').select('role, person, content, status, id').order('created_at', { ascending: true }).limit(30)
    q = ideaId ? q.eq('idea_id', ideaId) : q.is('idea_id', null)
    const { data: history } = await q
    const msgs = (history ?? []).filter((m) => m.id !== chatId && m.status === 'done' && m.content)
      .slice(-16)
      .map((m) => ({ role: m.role, content: m.role === 'user' ? `${m.person || 'One of them'}: ${m.content}` : m.content }))
    // The API needs alternating turns starting with the user
    const merged: { role: string; content: string }[] = []
    for (const m of msgs) {
      if (merged.length && merged[merged.length - 1].role === m.role) merged[merged.length - 1].content += '\n\n' + m.content
      else merged.push({ ...m })
    }
    while (merged.length && merged[0].role !== 'user') merged.shift()
    if (!merged.length) throw new Error('No question to answer.')
    const { text, sources, usage } = await claude(await coachContext(ideaId), merged, 3, 1800)
    await log('coach', usage)
    await db.from('forge_chats').update({ content: text.trim() || 'I came up empty on that one. Try asking another way?', sources, status: 'done' }).eq('id', chatId)
  } catch (e) {
    console.error(e)
    await db.from('forge_chats').update({ content: `Something went wrong: ${String((e as Error).message ?? e).slice(0, 200)}`, status: 'error' }).eq('id', chatId)
  }
}

// ---------- weekly review (Sunday evening, from pg_cron) ----------
const CRITERIA = ['demand', 'margin', 'cheap', 'fit', 'hype']
const FOUNDER_IDS = ['Josh', 'Jake', 'Collin']

async function weekly() {
  const since = new Date(Date.now() - 7 * 86400_000)
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Denver' })
  const [{ data: ideas }, { data: time }, { data: members }, { data: todos }, { data: steps }, { data: scores }] = await Promise.all([
    db.from('forge_ideas').select('id, title, pitch, stage, kind, created_by, created_at, updated_at, killed_at, ai, ai_status').is('deleted_at', null),
    db.from('forge_time').select('person, started_at, ended_at').gte('started_at', since.toISOString()),
    db.from('forge_members').select('person, settings').in('person', FOUNDER_IDS),
    db.from('forge_actions').select('text, owner, done, created_at'),
    db.from('forge_roadmap').select('step_id, done'),
    db.from('forge_scores').select('idea_id, person'),
  ])
  const hrs: Record<string, number> = Object.fromEntries(FOUNDER_IDS.map((p) => [p, 0]))
  for (const t of time ?? []) if (t.person in hrs) hrs[t.person] += ((t.ended_at ? Date.parse(t.ended_at) : Date.now()) - Date.parse(t.started_at)) / 3600_000
  const goals = Object.fromEntries((members ?? []).map((m) => [m.person, Number(m.settings?.hours_goal ?? 5)]))
  const all = ideas ?? []
  const fresh = all.filter((i) => Date.parse(i.created_at) >= +since)
  const stale = all.filter((i) => ['exploring', 'validating'].includes(i.stage) && Date.parse(i.updated_at ?? i.created_at) < Date.now() - 14 * 86400_000)
  const done = new Set((steps ?? []).filter((s) => s.done).map((s) => s.step_id))
  const next = ROADMAP.flatMap((p) => p.steps).find((s) => !done.has(s.id))
  const stats = {
    hours: FOUNDER_IDS.map((p) => ({ person: p, hours: Math.round(hrs[p] * 10) / 10, goal: goals[p] ?? 5 })),
    new_ideas: fresh.map((i) => ({ id: i.id, title: i.title, by: i.created_by })),
    killed: all.filter((i) => i.killed_at && Date.parse(i.killed_at) >= +since).map((i) => ({ id: i.id, title: i.title })),
    chosen: all.filter((i) => i.stage === 'chosen').map((i) => ({ id: i.id, title: i.title })),
    stale: stale.map((i) => ({ id: i.id, title: i.title, stage: i.stage })),
    open_todos: FOUNDER_IDS.map((p) => ({ person: p, count: (todos ?? []).filter((t) => !t.done && t.owner === p).length })),
    next_step: next ? next.title : null,
    total_ideas: all.length,
  }

  // Claude scores researched ideas it hasn't scored yet (no web search: cheap)
  const scored: { id: string; title: string; scores: Record<string, number>; why: string }[] = []
  const mine = new Set((scores ?? []).filter((s) => s.person === 'Claude').map((s) => s.idea_id))
  const toScore = all.filter((i) => i.stage !== 'killed' && i.ai_status === 'done' && !mine.has(i.id)).slice(0, 6)
  if (toScore.length) {
    try {
      const list = toScore.map((i) => ({ id: i.id, title: i.title, pitch: i.pitch, verdict: i.ai?.verdict, market: i.ai?.market, risks: i.ai?.risks }))
      const { text, usage } = await claude(FOUNDERS, [{ role: 'user', content: `Score each of these ideas 1-5 on: demand (do people already want it), margin (money per sale), cheap (cheap to start), fit (can two self-taught 20-somethings build it), hype (would they stay excited for years). Be honest and spread your scores; 3 is average.\n\n${JSON.stringify(list)}\n\nReply with ONLY JSON: {"<id>": {"demand":n,"margin":n,"cheap":n,"fit":n,"hype":n,"why":"one short line"}}` }], 0, 1500)
      await log('weekly-score', usage)
      const r = pullJson(text)
      for (const i of toScore) {
        const s = r[i.id]; if (!s) continue
        const clean = Object.fromEntries(CRITERIA.map((c) => [c, Math.max(1, Math.min(5, Math.round(Number(s[c]) || 3)))]))
        await db.from('forge_scores').upsert({ idea_id: i.id, person: 'Claude', scores: clean, updated_at: new Date().toISOString() })
        scored.push({ id: i.id, title: i.title, scores: clean, why: String(s.why ?? '').slice(0, 200) })
      }
    } catch (e) { console.error('weekly scoring', e) }
  }

  // The brief itself
  let brief = ''
  try {
    const { text, usage } = await claude(await coachContext(null), [{ role: 'user', content: `It's Sunday evening. Write the weekly review for Josh, Jake and Collin from you, Claude, their third partner on Forge.\nThis week's numbers: ${JSON.stringify(stats)}\n${scored.length ? `You just scored: ${JSON.stringify(scored)}` : ''}\nFormat: 3 to 5 short bullet lines ("- ") on what happened, what's stuck or stale, and anything they're avoiding. Then one line starting "This week:" with the single most useful thing to do next. Under 140 words total. Plain words, no headings, no fluff, be direct.` }], 0, 700)
    await log('weekly', usage)
    brief = text.trim()
  } catch (e) { console.error('weekly brief', e); brief = '' }

  await db.from('forge_weekly').upsert({ week_of: today, stats, brief, scored }, { onConflict: 'week_of' })

  // Push: "Josh 3.5h · Jake 2h · 4 new ideas"
  const line = [...stats.hours.map((h) => `${h.person} ${h.hours}h`), `${fresh.length} new idea${fresh.length === 1 ? '' : 's'}`].join(' · ')
  const { data: cfg } = await db.rpc('forge_push_config')
  const hook = (Array.isArray(cfg) ? cfg[0] : cfg)?.hook
  await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/forge-push`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forge-hook': hook }, body: JSON.stringify({ kind: 'weekly', data: { body: line } }) })
}

// ---------- who is calling ----------
// Logged-in app users send their session token; the iPhone Shortcut sends a personal token.
async function whoIs(req: Request, body: Record<string, unknown>): Promise<string | null> {
  if (typeof body.token === 'string' && body.token.length >= 20) {
    const { data } = await db.from('forge_members').select('person').eq('shortcut_token', body.token).maybeSingle()
    return data?.person ?? null
  }
  const jwt = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!jwt || jwt === PUBLIC_KEY) return null
  const { data: u } = await db.auth.getUser(jwt)
  if (!u?.user) return null
  const { data } = await db.from('forge_members').select('person').eq('user_id', u.user.id).maybeSingle()
  return data?.person ?? null
}

// ---------- entry ----------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405)
  if (req.headers.get('apikey') !== PUBLIC_KEY) return json({ error: 'Not allowed' }, 401)

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return json({ error: 'Send JSON' }, 400) }
  const action = body.action

  if (action === 'status') return json({ ai: !!API_KEY, model: MODEL })

  // First-time account setup: only for an invited email that has no account yet
  if (action === 'register') {
    const email = String(body.email ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')
    if (password.length < 8) return json({ error: 'Use a password with at least 8 characters.' }, 400)
    const { data: m } = await db.from('forge_members').select('person, user_id').eq('email', email).maybeSingle()
    if (!m) return json({ error: "That email isn't invited to Forge." }, 403)
    if (m.user_id) return json({ error: 'That account already exists. Sign in instead.' }, 409)
    const { error } = await db.auth.admin.createUser({ email, password, email_confirm: true })
    if (error) return json({ error: error.message }, 400)
    return json({ ok: true, person: m.person })
  }

  // Weekly review: only the database's scheduled job (it knows the shared hook secret) can start it
  if (action === 'weekly') {
    const { data: cfg } = await db.rpc('forge_push_config')
    const hook = (Array.isArray(cfg) ? cfg[0] : cfg)?.hook
    if (!hook || req.headers.get('x-forge-hook') !== hook) return json({ error: 'Not allowed' }, 401)
    if (!API_KEY) return json({ error: 'no_key' }, 503)
    EdgeRuntime.waitUntil(weekly())
    return json({ ok: true })
  }

  const person = await whoIs(req, body)
  if (!person) return json({ error: 'Sign in to Forge first.' }, 401)

  if (action === 'capture' || action === 'research' || action === 'chat') {
    if (!API_KEY && action !== 'capture') return json({ error: 'no_key' }, 503)
    if (API_KEY && !(await underLimit())) return json({ error: 'Hourly AI limit reached. Try again in a bit.' }, 429)
  }

  if (action === 'capture') {
    // Quick capture: save the raw words now, research in the background
    const text = String(body.text ?? '').trim().slice(0, 2000)
    if (!text) return json({ error: 'Empty idea' }, 400)
    const auto = !!API_KEY && body.research !== false // the person can turn auto-research off in Settings
    const onlyLink = /^https?:\/\/\S+$/i.test(text)
    let host = ''; try { host = new URL(text).hostname.replace(/^www\./, '') } catch { /* not a lone link */ }
    const title = onlyLink && host ? `Link from ${host}` : text.length > 80 ? text.slice(0, 77).replace(/\s+\S*$/, '') + '…' : text
    const { data, error } = await db.from('forge_ideas').insert({
      title, raw_input: text, created_by: person, stage: 'dump', position: Date.now() / 1000,
      ai_status: auto ? 'working' : 'idle',
    }).select().single()
    if (error) return json({ error: error.message }, 500)
    if (auto) EdgeRuntime.waitUntil(research(data.id))
    return json({ ok: true, id: data.id, title: data.title, researching: auto })
  }

  if (action === 'research') {
    const id = String(body.idea_id ?? '')
    if (!id) return json({ error: 'idea_id required' }, 400)
    await db.from('forge_ideas').update({ ai_status: 'working', ai_error: '' }).eq('id', id)
    EdgeRuntime.waitUntil(research(id))
    return json({ ok: true })
  }

  if (action === 'chat') {
    const message = String(body.message ?? '').trim().slice(0, 4000)
    if (!message) return json({ error: 'Empty message' }, 400)
    const ideaId = body.idea_id ? String(body.idea_id) : null
    const { error: e1 } = await db.from('forge_chats').insert({ idea_id: ideaId, role: 'user', person, content: message })
    if (e1) return json({ error: e1.message }, 500)
    const { data: reply, error: e2 } = await db.from('forge_chats').insert({ idea_id: ideaId, role: 'assistant', content: '', status: 'working' }).select().single()
    if (e2) return json({ error: e2.message }, 500)
    EdgeRuntime.waitUntil(coach(reply.id, ideaId))
    return json({ ok: true, reply_id: reply.id })
  }

  return json({ error: 'Unknown action' }, 400)
})
