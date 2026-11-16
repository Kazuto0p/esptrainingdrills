/**
 * Tiny Web Audio helpers. No sample files, so the PWA stays light and offline.
 * Browsers block sound until a gesture; call `warmAudio()` from Start / taps.
 */

let context: AudioContext | null = null
let enabled = true

export function setSoundEnabled(value: boolean): void {
  enabled = value
}

export function warmAudio(): void {
  const ctx = getContext()
  if (ctx.state === 'suspended') void ctx.resume()
}

function getContext(): AudioContext {
  if (!context) context = new AudioContext()
  return context
}

export function playTone(frequency: number, duration = 0.07, type: OscillatorType = 'sine'): void {
  if (!enabled) return
  const ctx = getContext()
  if (ctx.state === 'suspended') return
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.value = frequency
  gain.gain.setValueAtTime(0.045, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration)
  osc.connect(gain).connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + duration)
}

/** Short noise burst panned -1 (left) … 1 (right). Used by Sound Ping. */
export function playPannedNoise(pan: number): void {
  if (!enabled) return
  const ctx = getContext()
  if (ctx.state === 'suspended') void ctx.resume()
  const length = Math.floor(ctx.sampleRate * 0.16)
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i += 1) {
    const envelope = 1 - i / length
    data[i] = (Math.random() * 2 - 1) * envelope
  }
  const source = ctx.createBufferSource()
  source.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 1700
  filter.Q.value = 0.7
  const panner = ctx.createStereoPanner()
  panner.pan.value = Math.max(-1, Math.min(1, pan))
  const gain = ctx.createGain()
  gain.gain.value = 0.55
  source.connect(filter).connect(panner).connect(gain).connect(ctx.destination)
  source.start()
}

export function playResultChime(valid: boolean): void {
  if (valid) {
    playTone(523, 0.08)
    window.setTimeout(() => playTone(784, 0.1), 90)
  } else {
    playTone(196, 0.12, 'triangle')
  }
}
