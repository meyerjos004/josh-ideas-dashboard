import { useEffect, useRef } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// The living scene in the side margins (big screens only).
// Left margin: a tree that sways in the wind your mouse makes, with seasonal
// leaves, falling leaves and the odd visiting bird.
// Right margin: the forge — a fire that burns brighter when someone is clocked
// in, smoke that bends in the wind, and tiny Josh and Jake going about their day.
// Sky follows real local time: sunrise, day, sunset, night with stars and the
// moon in its real phase. Everything is drawn from the app's own palette.
// ─────────────────────────────────────────────────────────────────────────────

const TAU = Math.PI * 2
const rand = (a, b) => a + Math.random() * (b - a)
const lerp = (a, b, t) => a + (b - a) * t
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

function seeded(seed) {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}

function hexToRgb(h) {
  h = h.trim()
  if (h.startsWith('rgb')) { const m = h.match(/[\d.]+/g); return [+m[0], +m[1], +m[2]] }
  if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3]
  const n = parseInt(h.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const mix = (a, b, t) => a.map((v, i) => Math.round(lerp(v, b[i], t)))
const css = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`

function readPalette() {
  const cs = getComputedStyle(document.documentElement)
  const g = (n) => hexToRgb(cs.getPropertyValue(n) || '#888888')
  const dark = (document.documentElement.dataset.theme ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark'
  return {
    dark, paper: g('--color-paper'), card: g('--color-card'), ink: g('--color-ink'), line: g('--color-line'), sunk: g('--color-sunk'),
    wine: g('--color-wine'), rose: g('--color-rose'), olive: g('--color-olive'), forest: g('--color-forest'), teal: g('--color-teal'),
    josh: g('--color-josh'), jake: g('--color-jake'),
  }
}

// ---------- time of day & moon ----------
function daylight(now) {
  const h = now.getHours() + now.getMinutes() / 60
  // 0 = deep night, 1 = full day; soft ramps around 6:30 and 18:30
  const rise = clamp((h - 5.8) / 1.6, 0, 1), set = clamp((19.4 - h) / 1.6, 0, 1)
  const day = Math.min(rise, set)
  const golden = Math.max(1 - Math.abs(h - 7) / 1.4, 1 - Math.abs(h - 18.4) / 1.6, 0)
  return { h, day, golden: clamp(golden, 0, 1) }
}
function moonPhase(now) {
  const syn = 29.530588853, ref = Date.UTC(2000, 0, 6, 18, 14)
  return (((now - ref) / 86400000) % syn + syn) % syn / syn // 0 new, .5 full
}
function season(now) {
  const m = now.getMonth()
  return m <= 1 || m === 11 ? 'winter' : m <= 4 ? 'spring' : m <= 7 ? 'summer' : 'autumn'
}

// ---------- the tree ----------
function buildTree(seed) {
  const r = seeded(seed)
  const branches = []
  const grow = (parent, len, ang, depth) => {
    const b = { parent, len, ang, depth, kids: [], phase: r() * TAU, stiff: 1 / (depth + 1.2) }
    branches.push(b)
    if (depth < 7) {
      const n = depth < 2 ? 2 : r() < 0.7 ? 2 : 3
      for (let i = 0; i < n; i++) {
        const spread = (depth < 1 ? 0.5 : depth < 3 ? 0.62 : 0.5) * (i - (n - 1) / 2) + (r() - 0.5) * 0.3
        b.kids.push(grow(b, len * (0.7 + r() * 0.12), spread, depth + 1))
      }
    } else {
      b.leaves = Array.from({ length: 5 + Math.floor(r() * 5) }, () => ({ dx: (r() - 0.5) * 22, dy: (r() - 0.5) * 18, s: 2.6 + r() * 3.2, c: r(), ph: r() * TAU }))
    }
    return b
  }
  const root = grow(null, 1, 0, 0)
  return { root, branches }
}

const SEASON_LEAVES = {
  autumn: (p) => [p.wine, p.rose, p.olive, mix(p.olive, [214, 140, 60], 0.5), mix(p.rose, [220, 120, 70], 0.4)],
  winter: (p) => [p.line, mix(p.line, p.card, 0.5)],
  spring: (p) => [mix(p.forest, p.card, 0.3), mix(p.wine, p.card, 0.6), mix(p.josh, p.card, 0.55), p.forest],
  summer: (p) => [p.forest, mix(p.forest, p.olive, 0.4), mix(p.forest, p.ink, 0.25)],
}

// ---------- people ----------
function makePerson(name, x) {
  return { name, x, vx: 0, target: x, mode: 'idle', modeT: 0, face: 1, step: 0, wave: 0, jump: 0, look: 0, hammer: 0 }
}

export default function Scene({ left, right, top = 0, clocked = {}, mood = {} }) {
  const cv = useRef(null)
  const st = useRef(null)
  const props = useRef({ clocked, mood })
  props.current = { clocked, mood }

  useEffect(() => {
    const canvas = cv.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    let W = 0, H = 0, dpr = 1
    const size = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1)
      W = canvas.clientWidth; H = canvas.clientHeight
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    size()
    const ro = new ResizeObserver(size); ro.observe(canvas)

    const today = new Date()
    const s = st.current = st.current ?? {
      tree: buildTree(today.getFullYear() * 7 + 11),
      wind: 0, windV: 0, gust: 0,
      mouse: { x: -9999, y: -9999, px: -9999, vx: 0, inL: false, inR: false },
      falling: [], ground: [], stars: Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random() * 0.6, s: Math.random() * 1.4 + 0.4, ph: Math.random() * TAU })),
      flies: Array.from({ length: 14 }, () => ({ x: Math.random(), y: 0.6 + Math.random() * 0.3, ph: Math.random() * TAU, sp: rand(0.2, 0.6) })),
      smoke: [], sparks: [],
      bird: { state: 'away', t: rand(20, 60), x: 0, y: 0, tx: 0, ty: 0, perch: null, flap: 0 },
      people: { Josh: makePerson('Josh', 0.35), Jake: makePerson('Jake', 0.62) },
      pal: readPalette(), palT: 0,
    }

    const onMove = (e) => {
      const r = canvas.getBoundingClientRect()
      const m = s.mouse
      m.x = e.clientX - r.left; m.y = e.clientY - r.top
      if (m.px > -9000) m.vx = lerp(m.vx, m.x - m.px, 0.5)
      m.px = m.x
      m.inL = m.x >= 0 && m.x < left; m.inR = m.x > W - right && m.x <= W
    }
    const onLeave = () => { s.mouse.x = s.mouse.y = -9999; s.mouse.inL = s.mouse.inR = false }
    const onClick = (e) => {
      const r = canvas.getBoundingClientRect()
      const x = e.clientX - r.left, y = e.clientY - r.top
      if (x < W - right) return
      for (const p of Object.values(s.people)) {
        if (Math.abs(x - p._sx) < 18 && Math.abs(y - p._sy) < 30) { p.jump = 1; p.wave = 1.6 }
      }
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('mouseleave', onLeave)
    window.addEventListener('click', onClick)

    let raf, last = performance.now(), acc = 0
    const loop = (t) => {
      raf = requestAnimationFrame(loop)
      if (document.hidden) return
      const dt = Math.min(0.05, (t - last) / 1000); last = t
      acc += dt
      if (!reduced && acc < 1 / 40) return // ~40fps is plenty for ambience
      const step = reduced ? 0 : acc; acc = 0
      update(step, t / 1000)
      draw(t / 1000)
    }

    // ---------- simulation ----------
    function update(dt, time) {
      s.palT -= dt
      if (s.palT <= 0) { s.pal = readPalette(); s.palT = 2 }
      const m = s.mouse
      // Wind: a slow breeze, plus gusts from how you move the mouse (strongest near the tree)
      const breeze = Math.sin(time * 0.23) * 0.25 + Math.sin(time * 0.071 + 1) * 0.2
      const near = m.x > -9000 ? clamp(1 - Math.abs(m.x - left / 2) / Math.max(left * 1.6, 400), 0, 1) : 0
      s.gust = lerp(s.gust, clamp(m.vx * 0.06, -3, 3) * (0.35 + near), 0.08)
      m.vx *= 0.9
      const target = breeze + s.gust
      s.windV += (target - s.wind) * 2.2 * dt
      s.windV *= 0.92
      s.wind += s.windV

      // falling leaves
      const sea = season(new Date())
      const dropRate = sea === 'autumn' ? 0.9 : sea === 'winter' ? 0.05 : 0.18
      if (left > 160 && Math.random() < dropRate * dt * (1 + Math.abs(s.gust))) {
        const tips = s.tree.branches.filter((b) => b.leaves && b._x)
        const b = tips[(Math.random() * tips.length) | 0]
        if (b) s.falling.push({ x: b._x, y: b._y, vx: 0, vy: 0, rot: rand(0, TAU), vr: rand(-2, 2), c: Math.random(), life: 0, s: rand(2.5, 4) })
      }
      const groundY = H * 0.86
      for (const f of s.falling) {
        f.vx = lerp(f.vx, s.wind * 22 + Math.sin(f.life * 2.3 + f.rot) * 10, 0.05)
        f.vy = lerp(f.vy, 16 + Math.sin(f.life * 3) * 6, 0.05)
        f.x += f.vx * dt; f.y += f.vy * dt; f.rot += f.vr * dt; f.life += dt
        if (f.y >= groundY + rand(-2, 3)) { f.dead = true; if (s.ground.length < 40 && f.x > 0 && f.x < left) s.ground.push({ x: f.x, c: f.c, rot: f.rot, s: f.s }) }
        if (f.x < -30 || f.x > left + 60) f.dead = true
      }
      s.falling = s.falling.filter((f) => !f.dead)

      // the bird
      const bd = s.bird
      bd.t -= dt; bd.flap += dt * 14
      if (bd.state === 'away' && bd.t <= 0 && left > 220) {
        const tips = s.tree.branches.filter((b) => b.depth >= 4 && b._x)
        bd.perch = tips[(Math.random() * tips.length) | 0]
        if (bd.perch) { bd.state = 'in'; bd.x = -30; bd.y = rand(H * 0.15, H * 0.35) }
      }
      if (bd.state === 'in' && bd.perch) {
        bd.tx = bd.perch._x; bd.ty = bd.perch._y - 6
        bd.x = lerp(bd.x, bd.tx, 1.6 * dt); bd.y = lerp(bd.y, bd.ty, 1.6 * dt)
        if (Math.hypot(bd.x - bd.tx, bd.y - bd.ty) < 2) { bd.state = 'perched'; bd.t = rand(18, 40) }
      }
      if (bd.state === 'perched') {
        bd.x = bd.perch._x; bd.y = bd.perch._y - 6
        const scared = Math.hypot(m.x - bd.x, m.y - bd.y) < 70 || Math.abs(s.gust) > 2
        if (bd.t <= 0 || scared) { bd.state = 'out'; bd.vx = rand(90, 140) * (Math.random() < 0.5 ? -1 : 1); bd.vy = -rand(40, 70) }
      }
      if (bd.state === 'out') {
        bd.x += bd.vx * dt; bd.y += bd.vy * dt; bd.vy -= 8 * dt
        if (bd.y < -40 || bd.x < -60 || bd.x > left + 80) { bd.state = 'away'; bd.t = rand(70, 200) }
      }

      // fire, smoke, sparks
      const working = Object.values(props.current.clocked).filter(Boolean).length
      s.heat = lerp(s.heat ?? 0.15, 0.18 + working * 0.42, 0.02)
      const fx = W - right / 2, fy = groundY
      if (right > 200 && Math.random() < (0.6 + s.heat * 2.2) * dt * 3) s.smoke.push({ x: fx + rand(-4, 4), y: fy - 18 * clamp(right / 380, 1, 1.9), r: rand(2, 3.5), a: 0.1 + s.heat * 0.08, life: 0 })
      for (const p of s.smoke) { p.life += dt; p.y -= (14 + s.heat * 12) * dt; p.x += (s.wind * 16 + Math.sin(p.life * 1.7) * 4) * dt; p.r += 1.6 * dt; p.a -= 0.045 * dt; if (p.a <= 0 || p.y < H * 0.25) p.dead = true }
      s.smoke = s.smoke.filter((p) => !p.dead)
      for (const p of s.sparks) { p.life += dt; p.vy += 160 * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.life > p.max) p.dead = true }
      s.sparks = s.sparks.filter((p) => !p.dead)

      // people
      const night = daylight(new Date()).day < 0.15
      const ppl = Object.values(s.people)
      for (const p of ppl) {
        const isOn = !!props.current.clocked[p.name]
        p.modeT -= dt
        p.wave = Math.max(0, p.wave - dt); p.jump = Math.max(0, p.jump - dt * 2.2)
        if (isOn) {
          // go to your workstation: Josh at the anvil, Jake on the log with a laptop
          p.target = p.name === 'Josh' ? 0.36 : 0.66
          if (Math.abs(p.x - p.target) > 0.01) p.mode = 'walk'
          else p.mode = 'work'
        } else if (p.modeT <= 0) {
          const r = Math.random()
          if (night) { p.mode = 'sleep'; p.target = p.name === 'Josh' ? 0.44 : 0.58; p.modeT = rand(20, 60) }
          else if (r < 0.45) { p.mode = 'walk'; p.target = rand(0.12, 0.88); p.modeT = rand(6, 14) }
          else if (r < 0.65) { p.mode = 'sit'; p.target = p.name === 'Josh' ? 0.43 : 0.59; p.modeT = rand(10, 25) }
          else if (r < 0.8) { p.mode = 'stretch'; p.modeT = rand(2.5, 4) }
          else { p.mode = 'idle'; p.modeT = rand(3, 8) }
        }
        const goal = p.target
        if ((p.mode === 'walk' || p.mode === 'sit' || p.mode === 'sleep' || isOn) && Math.abs(p.x - goal) > 0.004) {
          const dir = Math.sign(goal - p.x)
          p.x += dir * 0.05 * dt; p.face = dir; p.step += dt * 9; p.moving = true
        } else { p.moving = false; if (p.mode === 'walk') p.mode = 'idle' }
        // look toward the cursor when it's in the right margin
        p.look = lerp(p.look, m.inR ? clamp((m.x - p._sx) / 120, -1, 1) : 0, 0.1)
        if (isOn && p.name === 'Josh' && !p.moving) {
          const prev = p.hammer
          p.hammer = (p.hammer + dt * 1.6) % 1
          if (prev < 0.55 && p.hammer >= 0.55) for (let i = 0; i < 7; i++) s.sparks.push({ x: p._sx + (14 * p.face + 6) * kScale(), y: H * 0.86 - 20 * kScale(), vx: rand(-70, 70), vy: rand(-110, -40), life: 0, max: rand(0.3, 0.7) })
        }
      }
    }

    // ---------- drawing ----------
    function drawSky(time) {
      const p = s.pal
      const { day, golden } = daylight(new Date())
      const dayTop = mix(p.paper, [170, 200, 214], p.dark ? 0.12 : 0.28)
      const nightTop = p.dark ? mix(p.paper, [10, 18, 32], 0.55) : mix(p.paper, [40, 60, 84], 0.5)
      const dusk = mix(p.paper, mix(p.josh, [236, 150, 110], 0.5), p.dark ? 0.3 : 0.38)
      let skyTop = mix(nightTop, dayTop, day)
      skyTop = mix(skyTop, dusk, golden * 0.55)
      const bottom = mix(p.paper, dusk, golden * 0.35)
      for (const [x0, w] of [[0, left], [W - right, right]]) {
        if (w < 40) continue
        const g = ctx.createLinearGradient(0, 0, 0, H)
        g.addColorStop(0, css(skyTop)); g.addColorStop(0.75, css(bottom)); g.addColorStop(1, css(p.paper))
        ctx.fillStyle = g; ctx.fillRect(x0, 0, w, H)
      }
      // stars + moon at night
      const nightAmt = 1 - day
      if (nightAmt > 0.05) {
        for (const st of s.stars) {
          const sx = st.x < 0.5 ? st.x * 2 * left : W - right + (st.x - 0.5) * 2 * right
          const tw = 0.5 + 0.5 * Math.sin(time * 1.3 + st.ph)
          ctx.fillStyle = css(p.dark ? [235, 240, 236] : [250, 252, 248], nightAmt * (0.25 + tw * 0.55))
          ctx.beginPath(); ctx.arc(sx, st.y * H * 0.7, st.s, 0, TAU); ctx.fill()
        }
        if (right > 180) {
          const mx = W - right * 0.28, my = H * 0.14, r = 13
          const ph = moonPhase(new Date())
          ctx.save()
          ctx.globalAlpha = nightAmt
          ctx.fillStyle = css(mix([246, 242, 226], p.paper, 0.1))
          ctx.beginPath(); ctx.arc(mx, my, r, 0, TAU); ctx.fill()
          // shadow: clip to the moon, slide a sky-colored disk across it by phase
          ctx.save(); ctx.beginPath(); ctx.arc(mx, my, r, 0, TAU); ctx.clip()
          const dx = ph < 0.5 ? -2 * r * (ph / 0.5) : 2 * r * ((1 - ph) / 0.5)
          ctx.fillStyle = css(mix(skyTop, nightTop, 0.5)); ctx.globalAlpha = 0.92
          ctx.beginPath(); ctx.arc(mx + dx, my, r + 0.5, 0, TAU); ctx.fill(); ctx.restore()
          ctx.restore()
        }
      } else if (right > 180) {
        // soft sun
        const { h } = daylight(new Date())
        const arc = clamp((h - 6) / 13, 0, 1)
        const sx = W - right + right * (0.15 + arc * 0.7), sy = H * (0.32 - Math.sin(arc * Math.PI) * 0.22)
        ctx.fillStyle = css(mix([255, 236, 190], p.paper, p.dark ? 0.55 : 0.2), 0.75 * day)
        ctx.beginPath(); ctx.arc(sx, sy, 16, 0, TAU); ctx.fill()
      }
    }

    function drawGround() {
      const p = s.pal, gy = H * 0.86
      for (const [x0, w] of [[0, left], [W - right, right]]) {
        if (w < 40) continue
        ctx.fillStyle = css(mix(p.sunk, p.paper, 0.2))
        ctx.beginPath(); ctx.moveTo(x0, gy)
        for (let x = 0; x <= w; x += 20) ctx.lineTo(x0 + x, gy + Math.sin((x0 + x) * 0.013) * 3)
        ctx.lineTo(x0 + w, H); ctx.lineTo(x0, H); ctx.fill()
        ctx.strokeStyle = css(p.line); ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(x0, gy); for (let x = 0; x <= w; x += 20) ctx.lineTo(x0 + x, gy + Math.sin((x0 + x) * 0.013) * 3); ctx.stroke()
        // grass tufts that lean with the wind
        ctx.strokeStyle = css(mix(p.forest, p.paper, 0.45)); ctx.lineWidth = 1.2
        for (let x = 8; x < w; x += 23) {
          const bx = x0 + x, by = gy + Math.sin(bx * 0.013) * 3
          for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(bx + k * 2, by); ctx.quadraticCurveTo(bx + k * 3 + s.wind * 3, by - 5, bx + k * 4 + s.wind * 6, by - 8 - Math.abs(k)); ctx.stroke() }
        }
      }
    }

    function drawTree(time) {
      if (left < 160) return
      const p = s.pal
      const baseX = left * 0.5, baseY = H * 0.86
      const scale = Math.min(H * 0.15, left * 0.2)
      const leafCols = SEASON_LEAVES[season(new Date())](p)
      const bark = p.dark ? mix(p.rose, [52, 40, 36], 0.55) : mix(p.rose, p.ink, 0.45)
      const walk = (b, x, y, ang, w) => {
        const sway = (Math.sin(time * 0.9 + b.phase) * 0.03 + s.wind * 0.07) * (1 - b.stiff * 0.9) * (b.depth + 1) * 0.5
        const a = ang + b.ang + sway
        const L = b.len * (b.depth === 0 ? scale * 0.62 : scale * 0.9)
        const x2 = x + Math.sin(a) * L, y2 = y - Math.cos(a) * L
        ctx.strokeStyle = css(bark); ctx.lineWidth = w; ctx.lineCap = 'round'
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke()
        b._x = x2; b._y = y2
        for (const k of b.kids) walk(k, x2, y2, a, Math.max(1, w * 0.68))
        if (b.leaves) {
          for (const l of b.leaves) {
            const flick = Math.sin(time * 2.2 + l.ph) * 1.5 + s.wind * 3
            ctx.fillStyle = css(leafCols[Math.floor(l.c * leafCols.length) % leafCols.length], 0.9)
            ctx.beginPath(); ctx.ellipse(x2 + l.dx + flick, y2 + l.dy, l.s, l.s * 0.7, l.ph + s.wind * 0.3, 0, TAU); ctx.fill()
          }
        }
      }
      walk(s.tree.root, baseX, baseY, 0, Math.max(5, scale * 0.12))
      // falling + fallen leaves
      for (const l of [...s.ground, ...s.falling]) {
        ctx.save(); ctx.translate(l.x, l.y ?? baseY + 2); ctx.rotate(l.rot)
        ctx.fillStyle = css(leafCols[Math.floor(l.c * leafCols.length) % leafCols.length], 0.85)
        ctx.beginPath(); ctx.ellipse(0, 0, l.s, l.s * 0.6, 0, 0, TAU); ctx.fill(); ctx.restore()
      }
      // the bird
      const bd = s.bird
      if (bd.state !== 'away') {
        ctx.save(); ctx.translate(bd.x, bd.y)
        ctx.fillStyle = css(mix(p.ink, p.paper, 0.15))
        ctx.beginPath(); ctx.ellipse(0, 0, 5, 3.6, 0, 0, TAU); ctx.fill()
        ctx.beginPath(); ctx.arc(4, -2.6, 2.4, 0, TAU); ctx.fill()
        ctx.fillStyle = css([226, 160, 70]); ctx.beginPath(); ctx.moveTo(6.2, -2.8); ctx.lineTo(9, -2.2); ctx.lineTo(6.2, -1.6); ctx.fill()
        const flying = bd.state !== 'perched'
        const wing = flying ? Math.sin(bd.flap) * 6 : -1
        ctx.strokeStyle = css(mix(p.ink, p.paper, 0.15)); ctx.lineWidth = 2
        ctx.beginPath(); ctx.moveTo(-1, -1); ctx.lineTo(-6, -1 - wing); ctx.stroke()
        ctx.restore()
      }
    }

    const kScale = () => clamp(right / 380, 1, 1.9)
    function drawForge(time) {
      if (right < 180) return
      const p = s.pal, gy = H * 0.86, cx = W - right / 2
      const k = kScale()
      const span = Math.min(right * 0.9, 420 * k)
      ctx.save(); ctx.translate(cx, gy); ctx.scale(k, k); ctx.translate(-cx, -gy)
      // log seat and anvil
      ctx.fillStyle = css(mix(p.rose, p.ink, 0.35)); ctx.beginPath(); ctx.roundRect(cx + 0.16 * span / k - 22, gy - 9, 44, 10, 5); ctx.fill()
      ctx.fillStyle = css(mix(p.ink, p.paper, 0.25))
      const ax = cx - 0.14 * span / k + 16
      ctx.beginPath(); ctx.moveTo(ax - 18, gy - 20); ctx.lineTo(ax + 22, gy - 20); ctx.lineTo(ax + 14, gy - 13); ctx.lineTo(ax + 6, gy - 13); ctx.lineTo(ax + 8, gy); ctx.lineTo(ax - 8, gy); ctx.lineTo(ax - 6, gy - 13); ctx.lineTo(ax - 12, gy - 13); ctx.closePath(); ctx.fill()
      // stones
      ctx.fillStyle = css(mix(p.line, p.ink, 0.25))
      for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.ellipse(cx + i * 7, gy - 1, 5, 3.5, 0, 0, TAU); ctx.fill() }
      // fire: layered flickering tongues
      const heat = s.heat ?? 0.2
      const cols = [[255, 214, 120], [242, 140, 70], mix(p.josh, [220, 80, 60], 0.4)]
      for (let layer = 2; layer >= 0; layer--) {
        ctx.fillStyle = css(cols[layer], 0.85)
        for (let i = -2; i <= 2; i++) {
          const fl = Math.sin(time * (7 + i) + i * 1.7 + layer) * 0.5 + 0.5
          const h = (6 + heat * 26) * (1 - layer * 0.25) * (0.6 + fl * 0.5) * (1 - Math.abs(i) * 0.18)
          const bx = cx + i * 4.5 + s.wind * 2
          ctx.beginPath(); ctx.moveTo(bx - 4, gy - 3); ctx.quadraticCurveTo(bx - 3 + s.wind * 3, gy - 3 - h * 0.6, bx + s.wind * 5, gy - 3 - h); ctx.quadraticCurveTo(bx + 3 + s.wind * 3, gy - 3 - h * 0.6, bx + 4, gy - 3); ctx.fill()
        }
      }
      // warm glow on the ground
      const glow = ctx.createRadialGradient(cx, gy - 6, 2, cx, gy - 6, 60 + heat * 60)
      glow.addColorStop(0, css([255, 180, 90], 0.18 + heat * 0.18)); glow.addColorStop(1, css([255, 180, 90], 0))
      ctx.fillStyle = glow; ctx.fillRect(cx - 140, gy - 140, 280, 160)
      ctx.restore()
      for (const sm of s.smoke) { ctx.fillStyle = css(mix(p.ink, p.paper, 0.55), sm.a); ctx.beginPath(); ctx.arc(sm.x, sm.y, sm.r * k, 0, TAU); ctx.fill() }
      for (const sp of s.sparks) { ctx.fillStyle = css([255, 200, 110], 1 - sp.life / sp.max); ctx.fillRect(sp.x, sp.y, 2.5, 2.5) }
    }

    function drawPerson(pp, time) {
      const p = s.pal, gy = H * 0.86
      const k = kScale()
      const x = W - right / 2 + (pp.x - 0.5) * Math.min(right * 0.9, 420 * k), color = pp.name === 'Josh' ? p.josh : p.jake
      const isOn = !!props.current.clocked[pp.name]
      const sitting = !pp.moving && (pp.mode === 'sit' || pp.mode === 'sleep' || (isOn && pp.name === 'Jake'))
      const lying = !pp.moving && pp.mode === 'sleep'
      const breathe = Math.sin(time * 2 + (pp.name === 'Josh' ? 0 : 1.3)) * 0.6
      const hop = Math.sin(pp.jump * Math.PI) * 14
      const by = gy - (sitting ? 9 : 0) - hop
      pp._sx = x; pp._sy = gy - (gy - by + 14) * k
      const ink = mix(p.ink, p.paper, 0.1)
      ctx.save(); ctx.translate(x, gy); ctx.scale(k, k); ctx.translate(0, by - gy)
      if (lying) { ctx.rotate(-Math.PI / 2 * pp.face); ctx.translate(-4, -10) }
      // legs
      ctx.strokeStyle = css(ink); ctx.lineWidth = 2.2; ctx.lineCap = 'round'
      const sw = pp.moving ? Math.sin(pp.step) * 4 : 0
      if (sitting && !lying) { ctx.beginPath(); ctx.moveTo(-2, -2); ctx.lineTo(4 * pp.face, -2); ctx.lineTo(5 * pp.face, 7); ctx.moveTo(2, -2); ctx.lineTo(7 * pp.face, -2); ctx.lineTo(8 * pp.face, 7); ctx.stroke() }
      else { ctx.beginPath(); ctx.moveTo(-2, -9); ctx.lineTo(-2 + sw, 0); ctx.moveTo(2, -9); ctx.lineTo(2 - sw, 0); ctx.stroke() }
      // body
      ctx.fillStyle = css(color); ctx.beginPath(); ctx.roundRect(-5, -21 + breathe, 10, 13, 4); ctx.fill()
      // arms
      ctx.strokeStyle = css(color); ctx.lineWidth = 2.4
      ctx.beginPath()
      if (pp.mode === 'stretch' && !pp.moving) { ctx.moveTo(-4, -18); ctx.lineTo(-7, -30); ctx.moveTo(4, -18); ctx.lineTo(7, -30) }
      else if (pp.wave > 0) { const w = Math.sin(time * 14) * 3; ctx.moveTo(4, -18); ctx.lineTo(9, -27 + w); ctx.moveTo(-4, -18); ctx.lineTo(-5, -10) }
      else if (isOn && pp.name === 'Josh' && !pp.moving) { const a = pp.hammer < 0.55 ? -1.2 + pp.hammer * 1.6 : 0.2; ctx.moveTo(4 * pp.face, -18); ctx.lineTo(4 * pp.face + Math.cos(a) * 9 * pp.face, -18 + Math.sin(a) * 9) }
      else if (isOn && pp.name === 'Jake' && !pp.moving) { ctx.moveTo(4 * pp.face, -16); ctx.lineTo(10 * pp.face, -12) }
      else { const a = pp.moving ? Math.sin(pp.step) * 3 : 0; ctx.moveTo(-4, -18); ctx.lineTo(-5 - a, -10); ctx.moveTo(4, -18); ctx.lineTo(5 + a, -10) }
      ctx.stroke()
      // hammer / laptop
      if (isOn && pp.name === 'Josh' && !pp.moving) {
        const a = pp.hammer < 0.55 ? -1.2 + pp.hammer * 1.6 : 0.2
        const hx = 4 * pp.face + Math.cos(a) * 9 * pp.face, hy = -18 + Math.sin(a) * 9
        ctx.fillStyle = css(mix(p.ink, p.paper, 0.3)); ctx.fillRect(hx - 3, hy - 2, 6, 4)
      }
      if (isOn && pp.name === 'Jake' && !pp.moving) {
        ctx.fillStyle = css(mix(p.ink, p.paper, 0.35)); ctx.fillRect(7 * pp.face - 5, -14, 10, 2)
        ctx.fillStyle = css([170, 220, 235], 0.8); ctx.beginPath(); ctx.moveTo(7 * pp.face + 4 * pp.face, -14); ctx.lineTo(7 * pp.face + 6 * pp.face, -22); ctx.lineTo(7 * pp.face - 2 * pp.face, -22); ctx.lineTo(7 * pp.face - 3 * pp.face, -14); ctx.fill()
      }
      // head, looking toward the cursor
      ctx.fillStyle = css(mix([236, 200, 170], p.paper, 0.1))
      ctx.beginPath(); ctx.arc(pp.look * 1.5, -27 + breathe, 5.2, 0, TAU); ctx.fill()
      ctx.fillStyle = css(ink); ctx.fillRect(pp.look * 1.5 + 1.5 * (pp.look >= 0 ? 1 : -1) * (lying ? 0 : 1), -28 + breathe, 1.4, lying ? 0.6 : 1.6)
      ctx.restore()
      // zZz while sleeping
      if (lying) {
        ctx.fillStyle = css(p.ink, 0.45); ctx.font = '600 10px Inter, sans-serif'
        const zz = (time * 0.6) % 1
        ctx.fillText('z', x + 8, gy - 22 - zz * 14); ctx.globalAlpha = 1
      }
      // name tag when the cursor is close
      if (s.mouse.inR && Math.hypot(s.mouse.x - x, s.mouse.y - (by - 14)) < 60) {
        ctx.font = '600 11px Inter, sans-serif'; ctx.textAlign = 'center'
        const label = `${pp.name}${isOn ? ' · working' : pp.mode === 'sleep' ? ' · asleep' : ''}`
        const w = ctx.measureText(label).width + 12
        ctx.fillStyle = css(p.card, 0.95); ctx.beginPath(); ctx.roundRect(x - w / 2, by - 52, w, 18, 9); ctx.fill()
        ctx.fillStyle = css(p.ink); ctx.fillText(label, x, by - 39.5); ctx.textAlign = 'start'
      }
    }

    function drawFireflies(time) {
      const { day } = daylight(new Date())
      if (day > 0.4) return
      const a = 1 - day / 0.4, p = s.pal
      for (const f of s.flies) {
        const side = f.x < 0.5 ? 0 : 1
        const w = side ? right : left, x0 = side ? W - right : 0
        if (w < 160) continue
        const fx = x0 + ((f.x * 2) % 1) * w + Math.sin(time * f.sp + f.ph) * 20 + s.wind * 10
        const fy = H * f.y + Math.cos(time * f.sp * 1.3 + f.ph) * 12
        const tw = 0.5 + 0.5 * Math.sin(time * 3 + f.ph * 3)
        ctx.fillStyle = css(mix([230, 240, 140], p.paper, 0.1), a * tw * 0.9)
        ctx.beginPath(); ctx.arc(fx, fy, 1.6, 0, TAU); ctx.fill()
        ctx.fillStyle = css([230, 240, 140], a * tw * 0.15)
        ctx.beginPath(); ctx.arc(fx, fy, 6, 0, TAU); ctx.fill()
      }
    }

    function draw(time) {
      ctx.clearRect(0, 0, W, H)
      drawSky(time)
      drawGround()
      drawTree(time)
      drawForge(time)
      const ppl = Object.values(s.people).sort((a, b) => a.x - b.x)
      if (right >= 180) for (const pp of ppl) drawPerson(pp, time)
      drawFireflies(time)
    }

    raf = requestAnimationFrame(loop)
    let slow
    if (reduced) { cancelAnimationFrame(raf); update(0, 0); draw(0); slow = setInterval(() => { update(0, 0); draw(0) }, 60000) }
    return () => {
      cancelAnimationFrame(raf); clearInterval(slow); ro.disconnect()
      window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseleave', onLeave); window.removeEventListener('click', onClick)
    }
  }, [left, right])

  return <canvas ref={cv} aria-hidden="true" className="pointer-events-none fixed bottom-0 right-0 z-0" style={{ left: 'var(--rail, 0px)', top, width: 'calc(100% - var(--rail, 0px))', height: `calc(100dvh - ${top}px)` }} />
}
