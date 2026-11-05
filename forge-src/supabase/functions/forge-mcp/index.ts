// Forge connector for Claude (an MCP server). Josh adds it once in Claude under
// Customize > Connectors with his private link: .../functions/v1/forge-mcp?key=<his key>
// Speaks MCP "streamable HTTP" with plain JSON replies; stateless, so it fits Edge Functions.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { ROADMAP } from './roadmap.ts'

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const FN = `${Deno.env.get('SUPABASE_URL')}/functions/v1`
const PUBLIC_KEY = 'sb_publishable_VdkNDTcxwk0lkWpppf9vtQ_jAq4adZn'
const STAGES = ['dump', 'exploring', 'validating', 'chosen', 'killed']
const KINDS = ['digital', 'physical', 'service', 'unsure']
const CRITERIA = ['demand', 'margin', 'cheap', 'fit', 'hype']
const APP = 'https://meyerjos004.github.io/josh-ideas-dashboard/forge/'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, mcp-session-id, mcp-protocol-version, accept',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
}
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } })

// ---------- tools ----------
type Args = Record<string, unknown>
const str = (v: unknown) => (v == null ? '' : String(v))
const avg = (s?: Record<string, number>) => { const v = CRITERIA.map((c) => s?.[c]).filter((x) => typeof x === 'number') as number[]; return v.length === 5 ? Math.round((v.reduce((a, b) => a + b, 0) / 5) * 10) / 10 : null }

async function findIdea(ref: string) {
  if (/^[0-9a-f-]{36}$/i.test(ref)) {
    const { data } = await db.from('forge_ideas').select('*').eq('id', ref).is('deleted_at', null).maybeSingle()
    if (data) return data
  }
  const { data } = await db.from('forge_ideas').select('*').is('deleted_at', null).ilike('title', `%${ref}%`).limit(2)
  if (!data?.length) throw new Error(`No idea matches "${ref}". Use list_ideas to see titles and ids.`)
  if (data.length > 1) throw new Error(`More than one idea matches "${ref}": ${data.map((d) => `${d.title} (${d.id})`).join('; ')}. Pass the id.`)
  return data[0]
}

const TOOLS = [
  { name: 'board_summary', description: "Overview of Forge: idea counts per stage, this week's hours vs goals, the next roadmap step, open to-dos, and the latest weekly review from Claude. Call this first when asked how things are going.", inputSchema: { type: 'object', properties: {} } },
  { name: 'list_ideas', description: 'List ideas on the board, newest first, with stage, type, who added it and average scores.', inputSchema: { type: 'object', properties: { stage: { type: 'string', enum: STAGES }, search: { type: 'string', description: 'Words to match in the title, pitch or notes' }, added_by: { type: 'string', enum: ['Josh', 'Jake', 'Claude'] }, limit: { type: 'number', default: 30 } } } },
  { name: 'get_idea', description: 'Everything about one idea: pitch, notes, AI research (competitors, market, risks, next steps), scores from each person, to-dos and links.', inputSchema: { type: 'object', properties: { idea: { type: 'string', description: 'Idea id or part of its title' } }, required: ['idea'] } },
  { name: 'add_idea', description: "Pin a new idea to the Dump as Josh. Write it rough like he would (10-20 words, links welcome); Forge expands and researches it automatically unless research is false (each research costs about 10 cents).", inputSchema: { type: 'object', properties: { text: { type: 'string' }, kind: { type: 'string', enum: KINDS }, research: { type: 'boolean', default: true } }, required: ['text'] } },
  { name: 'update_idea', description: "Change an idea: rename it, rewrite the pitch, move its stage (killing needs a kill_reason), change its type, or append to its notes.", inputSchema: { type: 'object', properties: { idea: { type: 'string' }, title: { type: 'string' }, pitch: { type: 'string' }, stage: { type: 'string', enum: STAGES }, kill_reason: { type: 'string' }, kind: { type: 'string', enum: KINDS }, append_notes: { type: 'string', description: 'Text added to the end of the notes' } }, required: ['idea'] } },
  { name: 'score_idea', description: "Score an idea 1-5 on demand, margin, cheap (cheap to start), fit (skill fit), hype (excitement). By default the score is Claude's own (shown separately, never counted in Josh and Jake's averages). Use as: 'Josh' only when Josh tells you his own scores.", inputSchema: { type: 'object', properties: { idea: { type: 'string' }, demand: { type: 'number' }, margin: { type: 'number' }, cheap: { type: 'number' }, fit: { type: 'number' }, hype: { type: 'number' }, as: { type: 'string', enum: ['Claude', 'Josh'], default: 'Claude' } }, required: ['idea', 'demand', 'margin', 'cheap', 'fit', 'hype'] } },
  { name: 'research_idea', description: 'Run (or re-run) the AI research on an idea. Takes 30-90 seconds in the background; costs about 10 cents.', inputSchema: { type: 'object', properties: { idea: { type: 'string' } }, required: ['idea'] } },
  { name: 'list_todos', description: 'Open to-dos, optionally for one person.', inputSchema: { type: 'object', properties: { owner: { type: 'string', enum: ['Josh', 'Jake', 'Collin'] }, include_done: { type: 'boolean', default: false } } } },
  { name: 'add_todo', description: 'Add a to-do for Josh, Jake or Collin, optionally tied to an idea. The owner gets a notification unless it is Josh.', inputSchema: { type: 'object', properties: { text: { type: 'string' }, owner: { type: 'string', enum: ['Josh', 'Jake', 'Collin'] }, idea: { type: 'string', description: 'Optional idea id or title' } }, required: ['text', 'owner'] } },
  { name: 'complete_todo', description: 'Mark a to-do done, matched by id or by its text.', inputSchema: { type: 'object', properties: { todo: { type: 'string' } }, required: ['todo'] } },
  { name: 'log_session', description: 'Save a brainstorm session: what was discussed and what was decided. Dated today.', inputSchema: { type: 'object', properties: { title: { type: 'string' }, notes: { type: 'string' }, decisions: { type: 'string' } }, required: ['title'] } },
  { name: 'hours', description: 'Time Josh, Jake and Collin logged, by person, activity and idea, for the last N days.', inputSchema: { type: 'object', properties: { days: { type: 'number', default: 7 } } } },
]

async function run(name: string, a: Args, me: string) {
  switch (name) {
    case 'board_summary': {
      // Start of this week (Monday 00:00) in Utah time, not the server's UTC
      const local = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Denver' }))
      const intoWeek = (((local.getDay() + 6) % 7) * 86400 + local.getHours() * 3600 + local.getMinutes() * 60 + local.getSeconds()) * 1000
      const since = new Date(Date.now() - intoWeek)
      const [{ data: ideas }, { data: time }, { data: goals }, { data: steps }, { data: todos }, { data: week }] = await Promise.all([
        db.from('forge_ideas').select('stage').is('deleted_at', null),
        db.from('forge_time').select('person, started_at, ended_at').gte('started_at', since.toISOString()),
        db.from('forge_members').select('person, settings').in('person', ['Josh', 'Jake', 'Collin']),
        db.from('forge_roadmap').select('step_id, done'),
        db.from('forge_actions').select('owner, done').eq('done', false),
        db.from('forge_weekly').select('week_of, brief').order('week_of', { ascending: false }).limit(1),
      ])
      const counts = Object.fromEntries(STAGES.map((s) => [s, (ideas ?? []).filter((i) => i.stage === s).length]))
      const hrs: Record<string, number> = { Josh: 0, Jake: 0, Collin: 0 }
      for (const t of time ?? []) if (t.person in hrs) hrs[t.person] += ((t.ended_at ? Date.parse(t.ended_at) : Date.now()) - Date.parse(t.started_at)) / 3600_000
      const done = new Set((steps ?? []).filter((s) => s.done).map((s) => s.step_id))
      const all = ROADMAP.flatMap((p) => p.steps)
      const next = all.find((s) => !done.has(s.id))
      return {
        ideas_by_stage: counts,
        hours_this_week: Object.fromEntries(Object.entries(hrs).map(([p, h]) => [p, { hours: Math.round(h * 10) / 10, goal: Number((goals ?? []).find((g) => g.person === p)?.settings?.hours_goal ?? 5) }])),
        roadmap: { done: done.size, total: all.length, next_step: next ? { title: next.title, how: next.how } : null },
        open_todos: Object.fromEntries(['Josh', 'Jake', 'Collin'].map((p) => [p, (todos ?? []).filter((t) => t.owner === p).length])),
        latest_weekly_review: week?.[0] ?? null,
        app: APP,
      }
    }
    case 'list_ideas': {
      let q = db.from('forge_ideas').select('id, title, stage, kind, created_by, created_at, pitch, ai_status').is('deleted_at', null).order('created_at', { ascending: false }).limit(Math.min(Number(a.limit ?? 30), 100))
      if (a.stage) q = q.eq('stage', str(a.stage))
      if (a.added_by) q = q.eq('created_by', str(a.added_by))
      if (a.search) { const s = str(a.search).replace(/[,()]/g, ' '); q = q.or(`title.ilike.%${s}%,pitch.ilike.%${s}%,notes.ilike.%${s}%`) }
      const { data: ideas, error } = await q
      if (error) throw error
      const { data: scores } = await db.from('forge_scores').select('idea_id, person, scores').in('idea_id', (ideas ?? []).map((i) => i.id))
      return (ideas ?? []).map((i) => ({ ...i, created_at: i.created_at.slice(0, 10), scores: Object.fromEntries((scores ?? []).filter((s) => s.idea_id === i.id).map((s) => [s.person, avg(s.scores)])), link: `${APP}#/idea/${i.id}` }))
    }
    case 'get_idea': {
      const i = await findIdea(str(a.idea))
      const [{ data: scores }, { data: todos }] = await Promise.all([
        db.from('forge_scores').select('person, scores').eq('idea_id', i.id),
        db.from('forge_actions').select('id, text, owner, done').eq('idea_id', i.id),
      ])
      return { id: i.id, title: i.title, stage: i.stage, kind: i.kind, added_by: i.created_by, added: i.created_at, original_words: i.raw_input, pitch: i.pitch, notes: i.notes, kill_reason: i.kill_reason || undefined, tags: i.tags, links: i.links, research: i.ai, research_status: i.ai_status, scores: scores ?? [], todos: todos ?? [], link: `${APP}#/idea/${i.id}` }
    }
    case 'add_idea': {
      const { data: m } = await db.from('forge_members').select('shortcut_token').eq('person', me).single()
      const res = await fetch(`${FN}/forge-ai`, { method: 'POST', headers: { 'content-type': 'application/json', apikey: PUBLIC_KEY }, body: JSON.stringify({ action: 'capture', token: m?.shortcut_token, text: str(a.text), research: a.research !== false }) })
      const out = await res.json()
      if (!res.ok || !out.ok) throw new Error(out.error ?? `Capture failed (${res.status})`)
      if (a.kind && KINDS.includes(str(a.kind))) await db.from('forge_ideas').update({ kind: str(a.kind) }).eq('id', out.id)
      return { id: out.id, title: out.title, researching: out.researching, link: `${APP}#/idea/${out.id}`, note: out.researching ? 'Research runs in the background (30-90s). Call get_idea later to read it.' : 'Saved without research.' }
    }
    case 'update_idea': {
      const i = await findIdea(str(a.idea))
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (a.title) patch.title = str(a.title).slice(0, 120)
      if (a.pitch != null) patch.pitch = str(a.pitch)
      if (a.kind && KINDS.includes(str(a.kind))) patch.kind = str(a.kind)
      if (a.stage) {
        if (!STAGES.includes(str(a.stage))) throw new Error('Unknown stage')
        if (a.stage === 'killed' && !a.kill_reason && !i.kill_reason) throw new Error('Killing an idea needs a kill_reason, so they remember why.')
        patch.stage = str(a.stage); patch.position = Date.now() / 1000
      }
      if (a.kill_reason) patch.kill_reason = str(a.kill_reason)
      if (a.append_notes) patch.notes = `${i.notes ? i.notes.trimEnd() + '\n\n' : ''}${str(a.append_notes)}`
      const { error } = await db.from('forge_ideas').update(patch).eq('id', i.id)
      if (error) throw error
      return { ok: true, id: i.id, changed: Object.keys(patch).filter((k) => !['updated_at', 'position'].includes(k)) }
    }
    case 'score_idea': {
      const i = await findIdea(str(a.idea))
      const who = a.as === 'Josh' ? me : 'Claude'
      const scores = Object.fromEntries(CRITERIA.map((c) => [c, Math.max(1, Math.min(5, Math.round(Number(a[c]))))]))
      if (CRITERIA.some((c) => !Number.isFinite(scores[c]))) throw new Error('Give all five scores, 1 to 5.')
      const { error } = await db.from('forge_scores').upsert({ idea_id: i.id, person: who, scores, updated_at: new Date().toISOString() })
      if (error) throw error
      return { ok: true, idea: i.title, as: who, scores, average: avg(scores) }
    }
    case 'research_idea': {
      const i = await findIdea(str(a.idea))
      const { data: m } = await db.from('forge_members').select('shortcut_token').eq('person', me).single()
      const res = await fetch(`${FN}/forge-ai`, { method: 'POST', headers: { 'content-type': 'application/json', apikey: PUBLIC_KEY }, body: JSON.stringify({ action: 'research', token: m?.shortcut_token, idea_id: i.id }) })
      const out = await res.json()
      if (!res.ok) throw new Error(out.error ?? 'Research failed to start')
      return { ok: true, idea: i.title, note: 'Researching in the background (30-90s). Call get_idea later.' }
    }
    case 'list_todos': {
      let q = db.from('forge_actions').select('id, text, owner, done, idea_id, created_at').order('created_at', { ascending: false }).limit(60)
      if (!a.include_done) q = q.eq('done', false)
      if (a.owner) q = q.eq('owner', str(a.owner))
      const { data, error } = await q
      if (error) throw error
      const ids = [...new Set((data ?? []).map((t) => t.idea_id).filter(Boolean))]
      const { data: ideas } = ids.length ? await db.from('forge_ideas').select('id, title').in('id', ids) : { data: [] }
      const title = Object.fromEntries((ideas ?? []).map((i) => [i.id, i.title]))
      return (data ?? []).map((t) => ({ id: t.id, text: t.text, owner: t.owner, done: t.done, idea: t.idea_id ? title[t.idea_id] : undefined }))
    }
    case 'add_todo': {
      const idea = a.idea ? await findIdea(str(a.idea)) : null
      const { data, error } = await db.from('forge_actions').insert({ text: str(a.text), owner: str(a.owner), assigned_by: me, idea_id: idea?.id ?? null }).select('id').single()
      if (error) throw error
      return { ok: true, id: data.id }
    }
    case 'complete_todo': {
      const t = str(a.todo)
      let q = db.from('forge_actions').select('id, text').eq('done', false)
      q = /^[0-9a-f-]{36}$/i.test(t) ? q.eq('id', t) : q.ilike('text', `%${t}%`)
      const { data } = await q.limit(2)
      if (!data?.length) throw new Error('No open to-do matches that.')
      if (data.length > 1) throw new Error(`Several to-dos match: ${data.map((d) => `${d.text} (${d.id})`).join('; ')}. Pass the id.`)
      await db.from('forge_actions').update({ done: true }).eq('id', data[0].id)
      return { ok: true, done: data[0].text }
    }
    case 'log_session': {
      const { data, error } = await db.from('forge_sessions').insert({ title: str(a.title), notes: str(a.notes), decisions: str(a.decisions), created_by: me, held_on: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Denver' }) }).select('id').single()
      if (error) throw error
      return { ok: true, id: data.id, link: `${APP}#/sessions/${data.id}` }
    }
    case 'hours': {
      const days = Math.min(Number(a.days ?? 7), 365)
      const { data } = await db.from('forge_time').select('person, started_at, ended_at, activity, idea_id, note').gte('started_at', new Date(Date.now() - days * 86400_000).toISOString())
      const out: Record<string, { total: number; by_activity: Record<string, number> }> = {}
      for (const t of data ?? []) {
        const h = ((t.ended_at ? Date.parse(t.ended_at) : Date.now()) - Date.parse(t.started_at)) / 3600_000
        out[t.person] ??= { total: 0, by_activity: {} }
        out[t.person].total += h
        out[t.person].by_activity[t.activity] = (out[t.person].by_activity[t.activity] ?? 0) + h
      }
      for (const p of Object.values(out)) { p.total = Math.round(p.total * 10) / 10; for (const k in p.by_activity) p.by_activity[k] = Math.round(p.by_activity[k] * 10) / 10 }
      return { days, hours: out, notes: (data ?? []).filter((t) => t.note).slice(0, 10).map((t) => ({ person: t.person, day: t.started_at.slice(0, 10), note: t.note })) }
    }
  }
  throw new Error(`Unknown tool ${name}`)
}

// ---------- MCP plumbing ----------
async function handle(msg: { jsonrpc: string; id?: number | string; method: string; params?: Record<string, unknown> }, me: string) {
  const ok = (result: unknown) => ({ jsonrpc: '2.0', id: msg.id, result })
  const fail = (code: number, message: string) => ({ jsonrpc: '2.0', id: msg.id, error: { code, message } })
  switch (msg.method) {
    case 'initialize':
      return ok({
        protocolVersion: String(msg.params?.protocolVersion ?? '2025-06-18'),
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'forge', title: 'Forge', version: '1.0.0' },
        instructions: "Forge is Josh and Jake's business-idea board (their friend Collin is on it too) (Utah, first-time founders). Use board_summary for an overview, list_ideas/get_idea to read, add_idea to pin ideas as Josh. Your own scores go in as 'Claude' and never count toward their averages.",
      })
    case 'ping': return ok({})
    case 'tools/list': return ok({ tools: TOOLS })
    case 'tools/call': {
      const name = String(msg.params?.name ?? '')
      try {
        const data = await run(name, (msg.params?.arguments ?? {}) as Args, me)
        return ok({ content: [{ type: 'text', text: JSON.stringify(data, null, 1) }] })
      } catch (e) {
        return ok({ content: [{ type: 'text', text: `Error: ${(e as Error).message ?? e}` }], isError: true })
      }
    }
    case 'resources/list': return ok({ resources: [] })
    case 'prompts/list': return ok({ prompts: [] })
    default: return msg.id == null ? null : fail(-32601, `Method not found: ${msg.method}`)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const url = new URL(req.url)
  const key = url.searchParams.get('key') ?? req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  if (key.length < 32) return reply({ error: 'Missing key' }, 401)
  const { data: m } = await db.from('forge_members').select('person').eq('mcp_token', key).maybeSingle()
  if (!m?.person) return reply({ error: 'Invalid key' }, 401)

  if (req.method === 'GET') return new Response('Forge MCP server. Add this URL in Claude under Customize > Connectors.', { status: 405, headers: { ...cors, allow: 'POST' } })
  if (req.method === 'DELETE') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') return reply({ error: 'Use POST' }, 405)

  let body: unknown
  try { body = await req.json() } catch { return reply({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, 400) }
  const batch = Array.isArray(body) ? body : [body]
  const out = (await Promise.all(batch.map((b) => handle(b, m.person)))).filter(Boolean)
  if (!out.length) return new Response(null, { status: 202, headers: cors }) // notifications only
  return reply(Array.isArray(body) ? out : out[0])
})
