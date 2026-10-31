import { useEffect, useState } from 'react'

// Reads the window's size and shape, so each page can pick the layout that uses the space best.
//   phone  : narrow screens
//   desk   : laptops and normal monitors
//   wide   : big monitors (lots of width, normal shape)
//   ultra  : ultrawides (21:9 / 32:9) — the command-center layouts
export function layoutFor(w, h) {
  if (w < 768) return 'phone'
  if (w >= 2200 && w / Math.max(h, 1) >= 2) return 'ultra'
  if (w >= 1600) return 'wide'
  return 'desk'
}

export function useLayout() {
  const read = () => ({ w: window.innerWidth, h: window.innerHeight, mode: layoutFor(window.innerWidth, window.innerHeight) })
  const [v, setV] = useState(read)
  useEffect(() => {
    let raf
    const on = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setV(read())) }
    window.addEventListener('resize', on)
    return () => { window.removeEventListener('resize', on); cancelAnimationFrame(raf) }
  }, [])
  return v
}

// Light / dark / follow device
export function getTheme() { try { return localStorage.getItem('forge.theme') || 'system' } catch { return 'system' } }
export function setTheme(t) {
  try { t === 'system' ? localStorage.removeItem('forge.theme') : localStorage.setItem('forge.theme', t) } catch { /* ignore */ }
  if (t === 'system') delete document.documentElement.dataset.theme
  else document.documentElement.dataset.theme = t
}
export function isDark() {
  const t = document.documentElement.dataset.theme
  if (t) return t === 'dark'
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches
}
