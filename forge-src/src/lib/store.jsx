import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { sb } from './sb'
import { syncPerson } from './push'
import { celebrate } from './fun'

const Ctx = createContext(null)
export const useStore = () => useContext(Ctx)

const ls = {
  get: (k) => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v) } catch { /* ignore */ } },
}

const upsertBy = (list, row, key = 'id') => {
  const i = list.findIndex((x) => x[key] === row[key])
  if (i < 0) return [...list, row]
  const next = list.slice(); next[i] = { ...list[i], ...row }; return next
}
const scoreKey = (s) => `${s.idea_id}:${s.person}`

export function StoreProvider({ children }) {
  // Login: session -> member row -> person ('Josh' | 'Jake')
  const [auth, setAuth] = useState({ checked: false, userId: null })
  const [member, setMember] = useState(null)
  const person = member?.person ?? null
  const [ideas, setIdeas] = useState([])
  const [scores, setScores] = useState([])
  const [sessions, setSessions] = useState([])
  const [actions, setActions] = useState([])
  const [time, setTime] = useState([])
  const [chats, setChats] = useState([])
  const [roadmap, setRoadmap] = useState([])
  const [aiReady, setAiReady] = useState(null) // null = checking
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [toast, setToast] = useState(null)
  const toastTimer = useRef()
  const scoresRef = useRef([])
  useEffect(() => { scoresRef.current = scores }, [scores])

  const flash = useCallback((text) => {
    setToast({ text, id: Date.now() })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2600)
  }, [])

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setAuth({ checked: true, userId: data.session?.user?.id ?? null }))
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
      setAuth((a) => (a.userId === (session?.user?.id ?? null) && a.checked ? a : { checked: true, userId: session?.user?.id ?? null }))
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!auth.userId) { setMember(null); return }
    let alive = true
    sb.from('forge_members').select('person, email, shortcut_token, onboarding, settings').eq('user_id', auth.userId).maybeSingle()
      .then(({ data }) => { if (alive) { setMember(data ?? { person: null }); if (data?.person) syncPerson(data.person) } })
    return () => { alive = false }
  }, [auth.userId])

  const signIn = useCallback(async (email, password) => {
    const { error } = await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    if (error) return error.message === 'Invalid login credentials' ? 'Wrong email or password.' : error.message
    return null
  }, [])
  const register = useCallback(async (email, password) => {
    const { data, error } = await sb.functions.invoke('forge-ai', { body: { action: 'register', email: email.trim().toLowerCase(), password } })
    if (error) {
      let msg = error.message
      try { const j = await error.context?.json?.(); if (j?.error) msg = j.error } catch { /* keep */ }
      return msg
    }
    if (!data?.ok) return 'Could not create the account.'
    return signIn(email, password)
  }, [signIn])
  // First-login progress (welcome seen, checklist hidden, page tips seen), saved per account
  const onboarding = member?.onboarding ?? {}
  const markOnboard = useCallback(async (patch) => {
    setMember((m) => (m ? { ...m, onboarding: { ...(m.onboarding ?? {}), ...patch } } : m))
    await sb.rpc('forge_onboarding_set', { patch })
  }, [])
  // Account-level settings (follow you to every device)
  const settings = member?.settings ?? {}
  const [goals, setGoals] = useState({}) // weekly hours goal per founder
  const loadGoals = useCallback(async () => {
    const { data } = await sb.rpc('forge_goals')
    if (data) setGoals(Object.fromEntries(data.map((g) => [g.person, Number(g.goal)])))
  }, [])
  const saveSettings = useCallback(async (patch) => {
    setMember((m) => (m ? { ...m, settings: { ...(m.settings ?? {}), ...patch } } : m))
    await sb.rpc('forge_settings_set', { patch })
    if ('hours_goal' in patch) loadGoals()
  }, [loadGoals])
  const signOut = useCallback(async () => { await sb.auth.signOut(); setMember(null) }, [])

  useEffect(() => {
    if (!person) return
    let alive = true
    ;(async () => {
      const [a, b, c, d, e, f, g] = await Promise.all([
        sb.from('forge_ideas').select('*'),
        sb.from('forge_scores').select('*'),
        sb.from('forge_sessions').select('*'),
        sb.from('forge_actions').select('*'),
        sb.from('forge_time').select('*').order('started_at', { ascending: false }).limit(2000),
        sb.from('forge_chats').select('*').order('created_at', { ascending: true }).limit(2000),
        sb.from('forge_roadmap').select('*'),
      ])
      if (!alive) return
      const err = a.error || b.error || c.error || d.error || e.error || f.error || g.error
      if (err) { setStatus('error'); return }
      setIdeas(a.data); setScores(b.data); setSessions(c.data); setActions(d.data); setTime(e.data); setChats(f.data); setRoadmap(g.data)
      setStatus('ready')
      loadGoals()
    })()

    const handle = (setter, key) => (p) => {
      if (p.eventType === 'DELETE') {
        const old = p.old
        setter((l) => l.filter((x) => (key ? key(x) !== key(old) : x.id !== old.id)))
      } else {
        setter((l) => {
          if (!key) return upsertBy(l, p.new)
          const i = l.findIndex((x) => key(x) === key(p.new))
          if (i < 0) return [...l, p.new]
          const n = l.slice(); n[i] = p.new; return n
        })
      }
    }
    const ch = sb.channel('forge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'forge_ideas' }, handle(setIdeas))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'forge_scores' }, handle(setScores, scoreKey))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'forge_sessions' }, handle(setSessions))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'forge_actions' }, handle(setActions))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'forge_time' }, handle(setTime))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'forge_chats' }, handle(setChats))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'forge_roadmap' }, handle(setRoadmap, (x) => x.step_id))
      .subscribe()
    sb.functions.invoke('forge-ai', { body: { action: 'status' } })
      .then(({ data }) => alive && setAiReady(!!data?.ai)).catch(() => alive && setAiReady(false))
    return () => { alive = false; sb.removeChannel(ch) }
  }, [person])

  const fail = useCallback((error, what) => {
    if (error) { console.error(error); flash(`Couldn't ${what}. Check your connection and try again.`) }
    return !error
  }, [flash])

  // ---------- ideas ----------
  const addIdea = useCallback(async (fields) => {
    const row = { title: fields.title.trim(), pitch: fields.pitch ?? '', kind: fields.kind ?? 'unsure', stage: fields.stage ?? 'dump', created_by: person ?? '', position: Date.now() / 1000 }
    const { data, error } = await sb.from('forge_ideas').insert(row).select().single()
    if (!fail(error, 'save that idea')) return null
    setIdeas((l) => upsertBy(l, data))
    return data
  }, [person, fail])

  const ideasRef = useRef([])
  useEffect(() => { ideasRef.current = ideas }, [ideas])
  const updateIdea = useCallback(async (id, patch) => {
    if (patch.stage === 'chosen' && ideasRef.current.find((x) => x.id === id)?.stage !== 'chosen') celebrate()
    const full = { ...patch, updated_at: new Date().toISOString() }
    setIdeas((l) => l.map((x) => (x.id === id ? { ...x, ...full } : x)))
    const { error } = await sb.from('forge_ideas').update(full).eq('id', id)
    return fail(error, 'save changes')
  }, [fail])

  const trashIdea = useCallback((id) => updateIdea(id, { deleted_at: new Date().toISOString() }), [updateIdea])
  const restoreIdea = useCallback((id) => updateIdea(id, { deleted_at: null }), [updateIdea])

  // ---------- scores ----------
  const setScore = useCallback(async (ideaId, criterion, value) => {
    if (!person) return
    // Read the freshest copy so fast taps don't overwrite each other
    const cur = scoresRef.current.find((s) => s.idea_id === ideaId && s.person === person)
    const next = { idea_id: ideaId, person, scores: { ...(cur?.scores ?? {}), [criterion]: value }, updated_at: new Date().toISOString() }
    const list = scoresRef.current
    const i = list.findIndex((s) => scoreKey(s) === scoreKey(next))
    const updated = i < 0 ? [...list, next] : list.map((s, k) => (k === i ? next : s))
    scoresRef.current = updated
    setScores(updated)
    const { error } = await sb.from('forge_scores').upsert(next)
    fail(error, 'save your score')
  }, [person, fail])

  // ---------- sessions & actions ----------
  const addSession = useCallback(async (title) => {
    const { data, error } = await sb.from('forge_sessions').insert({ title, created_by: person ?? '', held_on: new Date().toLocaleDateString('en-CA') }).select().single()
    if (!fail(error, 'start the session')) return null
    setSessions((l) => upsertBy(l, data))
    return data
  }, [person, fail])

  const updateSession = useCallback(async (id, patch) => {
    setSessions((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)))
    const { error } = await sb.from('forge_sessions').update(patch).eq('id', id)
    return fail(error, 'save the session')
  }, [fail])

  const deleteSession = useCallback(async (id) => {
    setSessions((l) => l.filter((x) => x.id !== id))
    setActions((l) => l.filter((x) => x.session_id !== id))
    const { error } = await sb.from('forge_sessions').delete().eq('id', id)
    return fail(error, 'delete the session')
  }, [fail])

  const addAction = useCallback(async (fields) => {
    const { data, error } = await sb.from('forge_actions').insert({ owner: person ?? '', assigned_by: person ?? '', ...fields }).select().single()
    if (!fail(error, 'add that to-do')) return null
    setActions((l) => upsertBy(l, data))
    return data
  }, [person, fail])

  const updateAction = useCallback(async (id, patch) => {
    setActions((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)))
    const { error } = await sb.from('forge_actions').update(patch).eq('id', id)
    return fail(error, 'update that to-do')
  }, [fail])

  const deleteAction = useCallback(async (id) => {
    setActions((l) => l.filter((x) => x.id !== id))
    const { error } = await sb.from('forge_actions').delete().eq('id', id)
    return fail(error, 'delete that to-do')
  }, [fail])

  // ---------- AI ----------
  const callAI = useCallback(async (body) => {
    const { data, error } = await sb.functions.invoke('forge-ai', { body })
    if (error) {
      let msg = error.message
      try { const j = await error.context?.json?.(); if (j?.error) msg = j.error } catch { /* keep */ }
      if (msg === 'no_key') { setAiReady(false); return { error: 'no_key' } }
      flash(msg.startsWith('Hourly') ? msg : `The AI couldn't run: ${msg}`)
      return { error: msg }
    }
    return data
  }, [flash])

  const checkAI = useCallback(async () => {
    setAiReady(null)
    const { data } = await sb.functions.invoke('forge-ai', { body: { action: 'status' } })
    setAiReady(!!data?.ai)
    return !!data?.ai
  }, [])

  // Quick capture: server saves the idea and researches it in the background
  const forgeIdea = useCallback(async (text, kind = 'unsure') => {
    const res = await callAI({ action: 'capture', text, research: member?.settings?.auto_research !== false })
    if (res?.error || !res?.id) {
      if (res?.error === 'no_key' || !res) return addIdea({ title: text.slice(0, 120), kind }) // fall back to plain save
      return null
    }
    if (kind !== 'unsure') await sb.from('forge_ideas').update({ kind }).eq('id', res.id)
    const { data } = await sb.from('forge_ideas').select('*').eq('id', res.id).single()
    if (data) setIdeas((l) => upsertBy(l, data))
    return data ?? { id: res.id, title: res.title }
  }, [callAI, person, addIdea, member])

  const researchIdea = useCallback(async (id) => {
    setIdeas((l) => l.map((x) => (x.id === id ? { ...x, ai_status: 'working', ai_error: '' } : x)))
    const res = await callAI({ action: 'research', idea_id: id })
    if (res?.error) setIdeas((l) => l.map((x) => (x.id === id ? { ...x, ai_status: 'idle' } : x)))
  }, [callAI])

  const askCoach = useCallback(async (message, ideaId = null) => {
    const res = await callAI({ action: 'chat', message, idea_id: ideaId })
    return !res?.error
  }, [callAI, person])

  const toggleStep = useCallback(async (stepId, done) => {
    const row = { step_id: stepId, done, done_by: done ? person : '', done_at: done ? new Date().toISOString() : null }
    setRoadmap((l) => [...l.filter((x) => x.step_id !== stepId), row])
    const { error } = await sb.from('forge_roadmap').upsert(row)
    fail(error, 'update the roadmap')
  }, [person, fail])

  // ---------- clock in / out ----------
  const clockIn = useCallback(async (activity = 'research', note = '', ideaId = null) => {
    if (!person) return null
    const running = time.find((t) => t.person === person && !t.ended_at)
    if (running) {
      if (!ideaId || running.idea_id === ideaId) return null
      // Switching ideas: close the current entry, start a fresh one
      const end = new Date().toISOString()
      setTime((l) => l.map((x) => (x.id === running.id ? { ...x, ended_at: end } : x)))
      await sb.from('forge_time').update({ ended_at: end }).eq('id', running.id)
      activity = running.activity
    }
    const { data, error } = await sb.from('forge_time').insert({ person, activity, note, idea_id: ideaId, started_at: new Date().toISOString() }).select().single()
    if (!fail(error, 'clock you in')) return null
    setTime((l) => upsertBy(l, data))
    return data
  }, [person, time, fail])

  const updateTime = useCallback(async (id, patch) => {
    setTime((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)))
    const { error } = await sb.from('forge_time').update(patch).eq('id', id)
    return fail(error, 'save that time entry')
  }, [fail])

  const clockOut = useCallback((id, patch = {}) => updateTime(id, { ...patch, ended_at: new Date().toISOString() }), [updateTime])

  const addTime = useCallback(async (row) => {
    const { data, error } = await sb.from('forge_time').insert(row).select().single()
    if (!fail(error, 'add that time')) return null
    setTime((l) => upsertBy(l, data))
    return data
  }, [fail])

  const deleteTime = useCallback(async (id) => {
    setTime((l) => l.filter((x) => x.id !== id))
    const { error } = await sb.from('forge_time').delete().eq('id', id)
    return fail(error, 'delete that time entry')
  }, [fail])

  const live = useMemo(() => ideas.filter((i) => !i.deleted_at), [ideas])
  const trash = useMemo(() => ideas.filter((i) => i.deleted_at), [ideas])

  const value = {
    person, member, onboarding, markOnboard, settings, saveSettings, goals, authChecked: auth.checked, signedIn: !!auth.userId, signIn, register, signOut, status, toast, flash,
    ideas: live, allIdeas: ideas, trash, scores, sessions, actions,
    addIdea, updateIdea, trashIdea, restoreIdea, setScore,
    chats, roadmap, aiReady, checkAI, forgeIdea, researchIdea, askCoach, toggleStep,
    time, clockIn, clockOut, updateTime, addTime, deleteTime,
    addSession, updateSession, deleteSession, addAction, updateAction, deleteAction,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// Scores for one idea, split by person
export function useIdeaScores(ideaId) {
  const { scores } = useStore()
  return useMemo(() => {
    const out = {}
    scores.filter((s) => s.idea_id === ideaId).forEach((s) => { out[s.person] = s.scores })
    return out
  }, [scores, ideaId])
}
