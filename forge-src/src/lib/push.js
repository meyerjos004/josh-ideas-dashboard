// Web push helpers: register the service worker, subscribe this device, save it to Supabase.
import { createClient } from '@supabase/supabase-js'

const VAPID_PUBLIC = 'BEIIqetkSpMuwH8EjzIGC1uBZBLXXP-Umxps4kgsbKYemNewprXTd8LjfjzvDpV6jA2SeSldpDWF81nTNL9u6KY'
const sb = createClient('https://ibutllgwjgmmlydkcrzi.supabase.co', 'sb_publishable_VdkNDTcxwk0lkWpppf9vtQ_jAq4adZn')

export const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent)
export const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true
export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

export function registerSW() {
  if (!('serviceWorker' in navigator)) return
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }).catch(() => {})
}

const toKey = (b64) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

async function reg() {
  registerSW()
  return navigator.serviceWorker.ready
}

// Current device: { endpoint, prefs } if subscribed and saved, else null
export async function currentDevice() {
  if (!pushSupported() || Notification.permission !== 'granted') return null
  const r = await reg()
  const sub = await r.pushManager.getSubscription()
  if (!sub) return null
  const { data } = await sb.from('forge_push').select('endpoint, person, prefs').eq('endpoint', sub.endpoint).maybeSingle()
  return data
}

export async function enablePush(person) {
  if (!pushSupported()) throw new Error(isIOS() && !isStandalone() ? 'ios-browser' : 'unsupported')
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error('denied')
  const r = await reg()
  const sub = (await r.pushManager.getSubscription()) ?? await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(VAPID_PUBLIC) })
  const json = sub.toJSON()
  const { data: existing } = await sb.from('forge_push').select('prefs').eq('endpoint', json.endpoint).maybeSingle()
  const row = { endpoint: json.endpoint, person, subscription: json, user_agent: navigator.userAgent.slice(0, 200), ...(existing ? {} : { prefs: { idea: true, research: true, todo: true } }) }
  const { error } = await sb.from('forge_push').upsert(row)
  if (error) throw error
  return currentDevice()
}

export async function disablePush() {
  const r = await reg()
  const sub = await r.pushManager.getSubscription()
  if (!sub) return
  await sb.from('forge_push').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}

export async function setPref(endpoint, prefs) {
  const { error } = await sb.from('forge_push').update({ prefs }).eq('endpoint', endpoint)
  if (error) throw error
}

// Keep the device's person in sync when someone switches Josh/Jake on this device
export async function syncPerson(person) {
  try {
    if (!pushSupported() || Notification.permission !== 'granted') return
    const r = await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL)
    const sub = await r?.pushManager.getSubscription()
    if (sub) await sb.from('forge_push').update({ person }).eq('endpoint', sub.endpoint)
  } catch { /* best effort */ }
}

export async function sendTest(endpoint) {
  const { data, error } = await sb.functions.invoke('forge-push', { body: { kind: 'test', endpoint } })
  if (error) throw error
  return data
}
