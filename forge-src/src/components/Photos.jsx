import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, LoaderCircle, X } from 'lucide-react'
import { sb } from '../lib/sb'
import { useStore } from '../lib/store'
import { Modal } from './ui'

// Photos and screenshots on an idea. Stored privately in Supabase Storage under <idea id>/.
// Big photos are shrunk on the device first (max 1600px, JPEG) so uploads are quick on cell data.
const BUCKET = 'forge-photos'

async function shrink(file) {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height))
    if (scale === 1 && file.size < 900_000) return file
    const c = Object.assign(document.createElement('canvas'), { width: Math.round(bmp.width * scale), height: Math.round(bmp.height * scale) })
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height)
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.85))
    return blob ? new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file
  } catch { return file } // e.g. HEIC on a PC browser: upload as-is
}

export default function Photos({ ideaId }) {
  const { flash, person } = useStore()
  const [items, setItems] = useState(null)
  const [busy, setBusy] = useState(0)
  const [open, setOpen] = useState(null)
  const input = useRef()

  const load = useCallback(async () => {
    const { data, error } = await sb.storage.from(BUCKET).list(ideaId, { sortBy: { column: 'created_at', order: 'desc' } })
    if (error) { setItems([]); return }
    const files = (data ?? []).filter((f) => f.name && !f.name.startsWith('.'))
    if (!files.length) { setItems([]); return }
    const { data: urls } = await sb.storage.from(BUCKET).createSignedUrls(files.map((f) => `${ideaId}/${f.name}`), 3600)
    setItems(files.map((f, i) => ({ name: f.name, path: `${ideaId}/${f.name}`, url: urls?.[i]?.signedUrl })))
  }, [ideaId])
  useEffect(() => { load() }, [load])

  const add = async (e) => {
    const files = [...(e.target.files ?? [])]
    e.target.value = ''
    if (!files.length) return
    setBusy(files.length)
    for (const f of files) {
      const small = await shrink(f)
      const ext = (small.name.match(/\.(\w+)$/)?.[1] ?? 'jpg').toLowerCase()
      const path = `${ideaId}/${Date.now()}-${person ?? 'x'}-${Math.random().toString(36).slice(2, 7)}.${ext}`
      const { error } = await sb.storage.from(BUCKET).upload(path, small, { contentType: small.type || 'image/jpeg' })
      if (error) flash(`Couldn't upload ${f.name}: ${error.message}`)
      setBusy((n) => n - 1)
    }
    load()
  }
  const remove = async (p) => {
    setOpen(null)
    setItems((l) => l.filter((x) => x.path !== p.path))
    const { error } = await sb.storage.from(BUCKET).remove([p.path])
    if (error) { flash(`Couldn't delete it: ${error.message}`); load() }
  }

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold">Photos</h2>
        <button onClick={() => input.current?.click()} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-muted hover:bg-sunk hover:text-ink">
          {busy ? <LoaderCircle size={13} className="animate-spin" /> : <Camera size={13} />} {busy ? `Uploading ${busy}…` : 'Add'}
        </button>
        <input ref={input} type="file" accept="image/*" multiple hidden onChange={add} />
      </div>
      {items == null ? <p className="text-sm text-faint">Loading…</p> : items.length === 0 ? (
        <button onClick={() => input.current?.click()} className="w-full rounded-xl border border-dashed border-line px-3 py-4 text-sm text-faint hover:border-faint hover:text-muted">
          Snap a product, a shelf, a competitor's page…
        </button>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {items.map((p) => (
            <button key={p.path} onClick={() => setOpen(p)} className="aspect-square overflow-hidden rounded-lg bg-sunk">
              {p.url && <img src={p.url} alt="" loading="lazy" className="size-full object-cover transition-transform hover:scale-105" />}
            </button>
          ))}
        </div>
      )}
      <Modal open={!!open} onClose={() => setOpen(null)} label="Photo">
        {open && (
          <div className="p-2">
            <img src={open.url} alt="" className="max-h-[70vh] w-full rounded-xl object-contain" />
            <div className="flex justify-between px-1 pt-2">
              <a href={open.url} target="_blank" rel="noreferrer" className="rounded-full px-3 py-1.5 text-sm text-muted hover:text-ink">Open full size</a>
              <button onClick={() => remove(open)} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-wine hover:bg-wine-soft"><X size={14} /> Delete photo</button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  )
}
