import { useEffect, useState } from 'react'

// Settings that belong to this device (a phone and a PC can differ).
// Theme lives in its own key ('forge.theme') so the page can paint the right colors before React loads.
export const DEFAULTS = { palette: 'sage', textSize: 'standard', width: 'centered', start: '/' }
const KEY = 'forge.prefs'

// Full-app color palettes. Each has a light and a dark version (see index.css).
export const PALETTES = [
  { id: 'sage', name: 'Sage', light: ['#E4EBE5', '#F7F9F6', '#5D2535', '#1F2A26'], dark: ['#19201D', '#222A27', '#E58FA4', '#E6ECE8'] },
  { id: 'sand', name: 'Sand', light: ['#EFE8DC', '#FBF8F2', '#9A4A2A', '#2A241C'], dark: ['#1E1A15', '#28231D', '#E9A07F', '#EFE7DA'] },
  { id: 'slate', name: 'Slate', light: ['#E3E8EE', '#F7F9FB', '#2D5B8A', '#1D2733'], dark: ['#161B22', '#1F252E', '#8DB8E8', '#E4EAF1'] },
  { id: 'blush', name: 'Blush', light: ['#F1E6E6', '#FCF7F7', '#7A3B5C', '#2C2124'], dark: ['#1F181A', '#2A2124', '#E4A1C2', '#F1E6E8'] },
]

export function getPrefs() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') } } catch { return { ...DEFAULTS } }
}

export function applyPrefs(p = getPrefs()) {
  const root = document.documentElement
  root.style.fontSize = p.textSize === 'large' ? '17.5px' : ''
  if (p.palette && p.palette !== 'sage') root.dataset.palette = p.palette
  else delete root.dataset.palette
}

export function setPref(key, value) {
  const next = { ...getPrefs(), [key]: value }
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* private mode: still applies for this visit */ }
  applyPrefs(next)
  window.dispatchEvent(new CustomEvent('forge:prefs', { detail: next }))
  return next
}

export function usePrefs() {
  const [p, setP] = useState(getPrefs)
  useEffect(() => {
    const on = (e) => setP(e.detail ?? getPrefs())
    window.addEventListener('forge:prefs', on)
    return () => window.removeEventListener('forge:prefs', on)
  }, [])
  return p
}
