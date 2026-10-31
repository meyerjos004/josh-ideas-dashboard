// Forge push: sends phone/desktop notifications when the other person does something.
// Called by database triggers (forge_push_event) and by the app for a test ping.
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const VAPID_PUBLIC = 'BEIIqetkSpMuwH8EjzIGC1uBZBLXXP-Umxps4kgsbKYemNewprXTd8LjfjzvDpV6jA2SeSldpDWF81nTNL9u6KY'
const PUBLIC_KEY = 'sb_publishable_VdkNDTcxwk0lkWpppf9vtQ_jAq4adZn'
const APP = 'https://meyerjos004.github.io/josh-ideas-dashboard/forge/'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

let config: { vapid_private: string; hook: string } | null = null
async function getConfig() {
  if (!config) {
    const { data, error } = await db.rpc('forge_push_config')
    if (error) throw error
    config = Array.isArray(data) ? data[0] : data
    webpush.setVapidDetails('mailto:meyerjos004@gmail.com', VAPID_PUBLIC, config!.vapid_private)
  }
  return config!
}

type Sub = { endpoint: string; person: string; subscription: webpush.PushSubscription; prefs: Record<string, boolean> }

async function send(subs: Sub[], msg: { title: string; body: string; url: string; tag?: string }) {
  let sent = 0
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification(s.subscription, JSON.stringify(msg), { TTL: 60 * 60 * 24, urgency: 'normal' })
      sent++
      await db.from('forge_push').update({ last_ok: new Date().toISOString() }).eq('endpoint', s.endpoint)
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode
      console.error('push failed', code, (e as Error).message)
      if (code === 404 || code === 410) await db.from('forge_push').delete().eq('endpoint', s.endpoint) // device unsubscribed
    }
  }))
  return sent
}

const short = (t: string, n = 90) => (t.length > n ? t.slice(0, n - 1) + '…' : t)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405)
  let body: { kind?: string; data?: Record<string, string>; endpoint?: string }
  try { body = await req.json() } catch { return json({ error: 'Send JSON' }, 400) }

  try {
    const cfg = await getConfig()
    const apikey = req.headers.get('apikey') ?? req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')

    // Test ping from the app to one device
    if (body.kind === 'test') {
      if (apikey !== PUBLIC_KEY) return json({ error: 'Not allowed' }, 401)
      const { data: subs } = await db.from('forge_push').select('*').eq('endpoint', String(body.endpoint ?? ''))
      if (!subs?.length) return json({ error: 'This device is not registered' }, 404)
      const sent = await send(subs as Sub[], { title: 'Forge notifications are on', body: "You'll hear about the other person's ideas, research and to-dos.", url: APP, tag: 'test' })
      return json({ ok: true, sent })
    }

    // Everything else must come from the database trigger
    if (req.headers.get('x-forge-hook') !== cfg.hook) return json({ error: 'Not allowed' }, 401)
    const d = body.data ?? {}
    const { data: all } = await db.from('forge_push').select('*')
    const subs = (all ?? []) as Sub[]
    let targets: Sub[] = []
    let msg: { title: string; body: string; url: string; tag?: string } | null = null

    if (body.kind === 'idea') {
      targets = subs.filter((s) => s.person !== d.by && s.prefs?.idea !== false)
      msg = { title: `${d.by} added an idea`, body: short(d.title ?? ''), url: `${APP}#/idea/${d.id}`, tag: `idea-${d.id}` }
    } else if (body.kind === 'research') {
      targets = subs.filter((s) => s.person === d.owner && s.prefs?.research !== false)
      msg = { title: 'Research is ready', body: short(d.title ?? ''), url: `${APP}#/idea/${d.id}`, tag: `research-${d.id}` }
    } else if (body.kind === 'todo') {
      targets = subs.filter((s) => s.person === d.owner && s.person !== d.by && s.prefs?.todo !== false)
      const url = d.idea_id ? `${APP}#/idea/${d.idea_id}` : d.session_id ? `${APP}#/sessions/${d.session_id}` : APP
      msg = { title: `${d.by} gave you a to-do`, body: short(d.text ?? ''), url, tag: `todo-${d.id}` }
    } else return json({ error: 'Unknown kind' }, 400)

    const sent = targets.length && msg ? await send(targets, msg) : 0
    return json({ ok: true, sent })
  } catch (e) {
    console.error(e)
    return json({ error: String((e as Error).message ?? e) }, 500)
  }
})
