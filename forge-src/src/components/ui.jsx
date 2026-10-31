import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { STAGES, personHex } from '../lib/constants'

export function StageDot({ stage, size = 8 }) {
  const s = STAGES.find((x) => x.id === stage) ?? STAGES[0]
  return <span aria-hidden className="inline-block shrink-0 rounded-full" style={{ width: size, height: size, background: s.color }} />
}

export function PersonChip({ person, small }) {
  if (!person) return null
  return (
    <span className={`inline-flex items-center gap-1.5 ${small ? 'text-xs' : 'text-sm'} text-muted`}>
      <span aria-hidden className="inline-block rounded-full" style={{ width: small ? 7 : 9, height: small ? 7 : 9, background: personHex(person) }} />
      {person}
    </span>
  )
}

export function Button({ variant = 'quiet', className = '', ...p }) {
  const v = {
    primary: 'bg-wine text-card hover:bg-[#4a1d2a] shadow-[0_1px_0_#3b1622]',
    quiet: 'bg-card text-ink border border-line hover:border-faint',
    ghost: 'text-muted hover:text-ink hover:bg-sunk',
    danger: 'text-wine hover:bg-wine-soft',
  }[variant]
  return <button {...p} className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40 ${v} ${className}`} />
}

// Text that saves itself a moment after you stop typing
export function AutoText({ value, onSave, multiline, className = '', placeholder, rows = 3, autoFocus, onBlur }) {
  const [v, setV] = useState(value ?? '')
  const timer = useRef()
  const dirty = useRef(false)
  const ref = useRef()
  useEffect(() => { if (!dirty.current) setV(value ?? '') }, [value])
  useEffect(() => () => clearTimeout(timer.current), [])
  useEffect(() => {
    if (multiline && ref.current) { ref.current.style.height = 'auto'; ref.current.style.height = ref.current.scrollHeight + 'px' }
  }, [v, multiline])
  const change = (e) => {
    const nv = e.target.value
    setV(nv); dirty.current = true
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => { await onSave(nv); dirty.current = false }, 600)
  }
  const blur = () => {
    if (dirty.current) { clearTimeout(timer.current); onSave(v); dirty.current = false }
    onBlur?.()
  }
  const common = { value: v, onChange: change, onBlur: blur, placeholder, autoFocus, ref, className: `w-full bg-transparent outline-none placeholder:text-faint ${className}` }
  return multiline ? <textarea rows={rows} {...common} /> : <input {...common} />
}

export function Modal({ open, onClose, children, label }) {
  useEffect(() => {
    if (!open) return
    const k = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/25 p-4 pt-[12vh] backdrop-blur-[2px]"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.div role="dialog" aria-label={label} onMouseDown={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl border border-line bg-card shadow-[0_24px_60px_-20px_rgba(22,33,31,.35)]"
            initial={{ y: 12, scale: .98 }} animate={{ y: 0, scale: 1 }} exit={{ y: 8, opacity: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 32 }}>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Empty({ children, action }) {
  return (
    <div className="rounded-xl border border-dashed border-line px-5 py-8 text-center text-sm text-muted">
      <p className="mx-auto max-w-sm">{children}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
