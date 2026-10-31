import { useEffect, useRef } from 'react'
import lottie from 'lottie-web/build/player/lottie_svg'

// Quiet art for the ultrawide margins: a leaf tree on the left that bends in the
// wind your mouse makes, and a line skyline on the right. Both are drawn in the
// ink colour at low strength and re-tint when the theme changes.

const STRENGTH = 0.2
const base = import.meta.env.BASE_URL

const rgb = (hex) => {
  hex = hex.trim()
  if (hex.startsWith('rgb')) return hex.match(/[\d.]+/g).slice(0, 3).map((v) => +v / 255)
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
}
// Recolour every fill and stroke to one tone
function mono(o, c) {
  if (Array.isArray(o)) { o.forEach((v) => mono(v, c)); return o }
  if (o && typeof o === 'object') {
    if ((o.ty === 'fl' || o.ty === 'st') && o.c && typeof o.c === 'object') {
      const k = o.c.k
      if (Array.isArray(k) && typeof k[0] === 'number') o.c.k = [...c, 1]
      else if (Array.isArray(k)) k.forEach((kf) => { if (kf?.s) kf.s = [...c, 1]; if (kf?.e) kf.e = [...c, 1] })
    }
    for (const v of Object.values(o)) mono(v, c)
  }
  return o
}

const cache = {}
const load = (name) => (cache[name] ??= fetch(`${base}art/${name}.json`).then((r) => r.text()))

function Lottie({ name, speed = 0.6, className, style, boxRef }) {
  const ref = useRef()
  useEffect(() => {
    let anim, dead = false
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const mount = async () => {
      const txt = await load(name)
      if (dead) return
      anim?.destroy()
      const ink = getComputedStyle(document.documentElement).getPropertyValue('--color-ink')
      anim = lottie.loadAnimation({
        container: ref.current, renderer: 'svg', loop: !reduce, autoplay: !reduce,
        animationData: mono(JSON.parse(txt), rgb(ink)),
        rendererSettings: { preserveAspectRatio: 'xMidYMax meet' },
      })
      anim.setSpeed(speed)
      if (reduce) anim.addEventListener('DOMLoaded', () => anim.goToAndStop(anim.totalFrames - 1, true))
    }
    mount()
    const mq = matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', mount)
    const mo = new MutationObserver(mount)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] })
    return () => { dead = true; mq.removeEventListener('change', mount); mo.disconnect(); anim?.destroy() }
  }, [name, speed])
  return <div ref={(el) => { ref.current = el; if (boxRef) boxRef.current = el }} className={className} style={style} aria-hidden="true" />
}

export default function MarginArt({ left, right }) {
  const tree = useRef()
  // Mouse wind: fast sideways movement bends the tree from its base, then it settles
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let lastX = null, wind = 0, bend = 0, vel = 0, raf
    const move = (e) => { if (lastX != null) wind += (e.clientX - lastX) * 0.05; lastX = e.clientX }
    const tick = () => {
      wind *= 0.9
      vel += (Math.max(-6, Math.min(6, wind)) - bend) * 0.05; vel *= 0.86; bend += vel
      if (tree.current) tree.current.style.transform = `skewX(${(-bend * 0.9).toFixed(2)}deg) rotate(${(bend * 0.22).toFixed(2)}deg)`
      raf = requestAnimationFrame(tick)
    }
    addEventListener('pointermove', move, { passive: true })
    raf = requestAnimationFrame(tick)
    return () => { removeEventListener('pointermove', move); cancelAnimationFrame(raf) }
  }, [])

  const ground = 'absolute inset-x-6 bottom-14 h-px bg-ink'
  return (
    <div className="pointer-events-none fixed inset-y-0 z-0 hidden md:block" style={{ left: 'var(--rail)', right: 0, opacity: STRENGTH }} aria-hidden="true">
      <div className="absolute inset-y-0 left-0" style={{ width: left }}>
        <div className={ground} />
        <Lottie name="tree" boxRef={tree} className="absolute bottom-14 left-1/2 -translate-x-1/2"
          style={{ width: Math.min(left - 40, 380), aspectRatio: '1835 / 1520', transformOrigin: '50% 100%', willChange: 'transform' }} />
      </div>
      <div className="absolute inset-y-0 right-0" style={{ width: right }}>
        <div className={ground} />
        <Lottie name="skyline" speed={0.5} className="absolute inset-x-6 bottom-14" style={{ aspectRatio: '375 / 110' }} />
      </div>
    </div>
  )
}
