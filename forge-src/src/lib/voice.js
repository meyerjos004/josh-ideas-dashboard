// Voice-to-text that runs entirely in the browser (free, private, works in
// Chrome, Edge, Brave, Firefox). Whisper is downloaded once, then cached.

const MODEL = 'Xenova/whisper-base.en'
let transcriberPromise = null

export function loadTranscriber(onProgress) {
  if (!transcriberPromise) {
    transcriberPromise = (async () => {
      const { pipeline } = await import('@huggingface/transformers')
      const files = {}
      return pipeline('automatic-speech-recognition', MODEL, {
        dtype: 'q8',
        progress_callback: (p) => {
          if (p.status === 'progress' && p.total) {
            files[p.file] = { loaded: p.loaded, total: p.total }
            const all = Object.values(files)
            const pct = all.reduce((a, f) => a + f.loaded, 0) / all.reduce((a, f) => a + f.total, 0)
            onProgress?.(Math.round(pct * 100))
          }
        },
      })
    })().catch((e) => { transcriberPromise = null; throw e })
  }
  return transcriberPromise
}

export function micError(e) {
  const n = e?.name
  if (n === 'NotAllowedError' || n === 'SecurityError') return 'Microphone is blocked. Click the icon at the left of the address bar, allow the microphone, then try again.'
  if (n === 'NotFoundError' || n === 'OverconstrainedError') return 'No microphone found. Plug one in, or check Windows Settings › Privacy › Microphone.'
  if (n === 'NotReadableError') return 'Another app is using the microphone. Close it and try again.'
  return `Voice input failed: ${e?.message || n || 'unknown error'}`
}

export async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } })
  const chunks = []
  const rec = new MediaRecorder(stream)
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
  rec.start()

  // Live input level, so the button can show you're being heard
  const ctx = new AudioContext()
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 512
  ctx.createMediaStreamSource(stream).connect(analyser)
  const buf = new Uint8Array(analyser.fftSize)
  const level = () => {
    analyser.getByteTimeDomainData(buf)
    let peak = 0
    for (const v of buf) peak = Math.max(peak, Math.abs(v - 128))
    return Math.min(1, peak / 64)
  }

  const stop = () => new Promise((resolve) => {
    rec.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop())
      ctx.close()
      const blob = new Blob(chunks, { type: rec.mimeType })
      const decoder = new AudioContext({ sampleRate: 16000 })
      try {
        const audio = await decoder.decodeAudioData(await blob.arrayBuffer())
        resolve(audio.getChannelData(0))
      } catch { resolve(null) }
      decoder.close()
    }
    rec.stop()
  })
  const cancel = () => { try { rec.stop() } catch { /* already stopped */ } stream.getTracks().forEach((t) => t.stop()); ctx.close() }
  return { stop, cancel, level }
}

export async function transcribe(samples, onProgress) {
  const t = await loadTranscriber(onProgress)
  const out = await t(samples, { chunk_length_s: 30, stride_length_s: 5 })
  return (out?.text ?? '').replace(/\s+/g, ' ').replace(/^\s*\[.*?\]\s*$/, '').trim()
}
