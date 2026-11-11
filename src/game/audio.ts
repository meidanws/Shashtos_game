/**
 * Tiny synthesised sound kit — no audio files, no dependencies.
 * Everything is generated with the Web Audio API on first use (which is always
 * after a click, so autoplay policies are satisfied).
 */

export type SoundName =
  | 'click'
  | 'select'
  | 'claim'
  | 'flip'
  | 'reveal'
  | 'jackpot'
  | 'negative'
  | 'undo'
  | 'win'
  | 'tie'
  | 'drumroll'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let enabled = true

type AudioContextCtor = typeof AudioContext

/** The shared context, created on demand but never started. */
function createContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctor: AudioContextCtor | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext
    if (!Ctor) return null
    try {
      ctx = new Ctor()
      master = ctx.createGain()
      master.gain.value = 0.5
      master.connect(ctx.destination)
    } catch {
      return null
    }
  }
  return ctx
}

function getContext(): AudioContext | null {
  const audio = createContext()
  if (!audio) return null
  if (audio.state === 'suspended') void audio.resume()
  return audio
}

/**
 * The shared AudioContext, started if it was idle, so the background music
 * rides on the same one as the sound kit. Null where Web Audio is unavailable.
 */
export function getAudioContext(): AudioContext | null {
  return getContext()
}

/**
 * The shared context exactly as it stands, without trying to start it.
 *
 * Resuming a context the page has not earned yet gets the browser telling us
 * off in the console, so this is how to ask whether sound is allowed at all
 * yet: a context that comes up `running` means this browser trusts the site.
 */
export function peekAudioContext(): AudioContext | null {
  return createContext()
}

export function setSoundEnabled(value: boolean): void {
  enabled = value
}

export function isSoundEnabled(): boolean {
  return enabled
}

interface ToneOptions {
  at?: number
  duration?: number
  type?: OscillatorType
  gain?: number
  slideTo?: number
}

function tone(freq: number, options: ToneOptions = {}): void {
  const audio = getContext()
  if (!audio || !master) return
  const { at = 0, duration = 0.18, type = 'triangle', gain = 0.3, slideTo } = options
  const start = audio.currentTime + at

  const osc = audio.createOscillator()
  const env = audio.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  if (slideTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(slideTo, 1), start + duration)
  }

  env.gain.setValueAtTime(0.0001, start)
  env.gain.exponentialRampToValueAtTime(gain, start + 0.012)
  env.gain.exponentialRampToValueAtTime(0.0001, start + duration)

  osc.connect(env)
  env.connect(master)
  osc.start(start)
  osc.stop(start + duration + 0.05)
}

function noiseSweep(at: number, duration: number, from: number, to: number, gain = 0.22): void {
  const audio = getContext()
  if (!audio || !master) return
  const start = audio.currentTime + at
  const frames = Math.floor(audio.sampleRate * duration)
  const buffer = audio.createBuffer(1, Math.max(frames, 1), audio.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < frames; i += 1) data[i] = Math.random() * 2 - 1

  const source = audio.createBufferSource()
  source.buffer = buffer

  const filter = audio.createBiquadFilter()
  filter.type = 'bandpass'
  filter.Q.value = 1.2
  filter.frequency.setValueAtTime(from, start)
  filter.frequency.exponentialRampToValueAtTime(Math.max(to, 1), start + duration)

  const env = audio.createGain()
  env.gain.setValueAtTime(0.0001, start)
  env.gain.exponentialRampToValueAtTime(gain, start + duration * 0.25)
  env.gain.exponentialRampToValueAtTime(0.0001, start + duration)

  source.connect(filter)
  filter.connect(env)
  env.connect(master)
  source.start(start)
  source.stop(start + duration + 0.05)
}

const NOTE = { c5: 523.25, d5: 587.33, e5: 659.25, g5: 783.99, a5: 880, c6: 1046.5, e6: 1318.5, g6: 1568 }

const KIT: Record<SoundName, () => void> = {
  click() {
    tone(660, { duration: 0.07, type: 'square', gain: 0.14 })
  },
  select() {
    tone(520, { at: 0, duration: 0.09, type: 'triangle', gain: 0.2 })
    tone(780, { at: 0.07, duration: 0.12, type: 'triangle', gain: 0.18 })
  },
  /** A cube is taken: a soft cloth thump plus a little sparkle. */
  claim() {
    noiseSweep(0, 0.22, 1800, 420, 0.14)
    tone(300, { duration: 0.16, type: 'sine', gain: 0.22, slideTo: 170 })
    tone(NOTE.a5, { at: 0.12, duration: 0.18, gain: 0.2 })
    tone(NOTE.c6, { at: 0.2, duration: 0.22, gain: 0.18 })
  },
  /** Tension before the wall opens. */
  drumroll() {
    for (let i = 0; i < 34; i += 1) {
      noiseSweep(i * 0.045, 0.05, 220, 150, 0.09 + i * 0.002)
    }
    tone(110, { at: 1.5, duration: 0.5, type: 'sine', gain: 0.26, slideTo: 70 })
  },
  flip() {
    noiseSweep(0, 0.34, 700, 2600, 0.16)
    tone(220, { duration: 0.22, type: 'sine', gain: 0.12, slideTo: 520 })
  },
  reveal() {
    tone(NOTE.c5, { at: 0, duration: 0.14, gain: 0.26 })
    tone(NOTE.e5, { at: 0.09, duration: 0.14, gain: 0.26 })
    tone(NOTE.g5, { at: 0.18, duration: 0.26, gain: 0.28 })
  },
  jackpot() {
    const line = [NOTE.c5, NOTE.e5, NOTE.g5, NOTE.c6, NOTE.e6, NOTE.g6]
    line.forEach((freq, i) => tone(freq, { at: i * 0.075, duration: 0.2, gain: 0.26, type: 'triangle' }))
    tone(NOTE.c6, { at: 0.5, duration: 0.6, gain: 0.3, type: 'sawtooth' })
    tone(NOTE.g6, { at: 0.5, duration: 0.6, gain: 0.16, type: 'triangle' })
    for (let i = 0; i < 7; i += 1) {
      tone(1600 + Math.random() * 1600, { at: 0.55 + i * 0.06, duration: 0.1, gain: 0.08, type: 'sine' })
    }
  },
  negative() {
    tone(330, { duration: 0.45, type: 'sawtooth', gain: 0.22, slideTo: 90 })
    tone(166, { at: 0.05, duration: 0.4, type: 'square', gain: 0.14, slideTo: 70 })
  },
  undo() {
    tone(620, { duration: 0.12, type: 'triangle', gain: 0.16, slideTo: 300 })
  },
  win() {
    const line: [number, number][] = [
      [NOTE.c5, 0],
      [NOTE.c5, 0.12],
      [NOTE.c5, 0.24],
      [NOTE.c5, 0.36],
      [NOTE.a5, 0.52],
      [NOTE.g5, 0.68],
      [NOTE.c6, 0.84],
    ]
    for (const [freq, at] of line) tone(freq, { at, duration: at > 0.8 ? 0.8 : 0.16, gain: 0.3 })
    tone(NOTE.e5, { at: 0.84, duration: 0.8, gain: 0.18 })
    tone(NOTE.g5, { at: 0.84, duration: 0.8, gain: 0.18 })
    for (let i = 0; i < 12; i += 1) {
      tone(1400 + Math.random() * 2000, { at: 0.9 + i * 0.07, duration: 0.12, gain: 0.07, type: 'sine' })
    }
  },
  tie() {
    tone(NOTE.e5, { at: 0, duration: 0.3, gain: 0.26 })
    tone(NOTE.d5, { at: 0.22, duration: 0.3, gain: 0.26 })
    tone(NOTE.c5, { at: 0.44, duration: 0.6, gain: 0.26 })
  },
}

/** Play a sound, unless the user turned sound off. */
export function playSound(name: SoundName): void {
  if (!enabled) return
  try {
    KIT[name]()
  } catch {
    /* audio is a nicety — never let it break the game */
  }
}
