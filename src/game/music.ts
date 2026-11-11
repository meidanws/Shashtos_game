/**
 * The background theme: one short track on a seamless loop, switched on and
 * off independently of the sound effects.
 *
 * The audio file lives in `public/audio/` and is NOT bundled — see the README
 * there for the accepted names. Nothing breaks when it is missing: the track
 * simply never plays and the toggle reports itself unavailable.
 */
import { getAudioContext, peekAudioContext } from './audio'

/** Tried in this order; the first one that loads wins. */
const CANDIDATES = [
  'theme.mp3',
  'theme.m4a',
  'theme.ogg',
  'theme.opus',
  'theme.webm',
  'theme.wav',
] as const

/** Quiet enough to talk over — it sits under the sound effects, not next to them. */
const VOLUME = 0.3
const FADE_IN_S = 1.4
const FADE_OUT_S = 0.7
const DUCK_S = 0.35

/** Below this a sample counts as silence when hunting for the loop points. */
const SILENCE = 0.0015
/** Never trim more than this off either end — a quiet intro is not padding. */
const MAX_TRIM_S = 1

/**
 * `ready` only means a file was found and fetched — not that it is playing.
 * The UI uses it to tell "music is off" apart from "there is no music".
 */
export type MusicStatus = 'idle' | 'loading' | 'ready' | 'missing'

let status: MusicStatus = 'idle'
let encoded: ArrayBuffer | null = null
let buffer: AudioBuffer | null = null
let loopPoints: { start: number; end: number } | null = null
let source: AudioBufferSourceNode | null = null
let gain: GainNode | null = null
/** The user's preference, which may be ahead of what is actually playing. */
let wanted = false
let armed = false
let fetching: Promise<void> | null = null

const watchers = new Set<(value: MusicStatus) => void>()

function setStatus(value: MusicStatus): void {
  if (status === value) return
  status = value
  for (const watcher of watchers) watcher(value)
}

/** Subscribe to load status. Fires immediately with the current value. */
export function onMusicStatus(watcher: (value: MusicStatus) => void): () => void {
  watchers.add(watcher)
  watcher(status)
  return () => watchers.delete(watcher)
}

export function musicStatus(): MusicStatus {
  return status
}

// --- loading ---------------------------------------------------------------

/**
 * Fetch the raw bytes, trying each accepted file name in turn. Deliberately
 * kept apart from decoding: this runs at start-up, while decoding needs an
 * AudioContext, and one of those may not exist until the page is touched.
 */
async function fetchTrack(): Promise<void> {
  if (encoded || status === 'missing') return
  setStatus('loading')

  for (const name of CANDIDATES) {
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}audio/${name}`)
      if (!response.ok) continue
      // A missing file under the dev server (and on GitHub Pages) comes back as
      // an HTML page rather than a 404, so the body has to be sniffed too.
      if ((response.headers.get('content-type') ?? '').startsWith('text/')) continue

      const bytes = await response.arrayBuffer()
      if (bytes.byteLength < 2048) continue

      encoded = bytes
      setStatus('ready')
      return
    } catch {
      /* try the next name */
    }
  }

  setStatus('missing')
}

/** One download, however many callers ask for it. */
function ensureTrack(): Promise<void> {
  fetching ??= fetchTrack()
  return fetching
}

async function decodeTrack(): Promise<void> {
  if (buffer || !encoded) return
  const ctx = getAudioContext()
  if (!ctx) return
  try {
    // decodeAudioData detaches the ArrayBuffer, so hand it a copy and keep the
    // original — otherwise a second attempt would have nothing left to decode.
    buffer = await ctx.decodeAudioData(encoded.slice(0))
  } catch {
    // A real file that no browser here can read is as good as no file at all.
    encoded = null
    setStatus('missing')
  }
}

/** The slice of an AudioBuffer the loop finder needs — so it can be tested. */
export interface SampledAudio {
  readonly length: number
  readonly sampleRate: number
  readonly numberOfChannels: number
  getChannelData(channel: number): Float32Array
}

/**
 * Where the music actually starts and ends inside the file.
 *
 * Encoders (MP3 and AAC especially) pad both ends with a sliver of silence,
 * which a plain `loop = true` would play every time round as an audible hiccup.
 * Looping between the first and last audible samples removes it, whatever the
 * format turns out to be.
 */
export function findLoopPoints(buf: SampledAudio): { start: number; end: number } {
  const channels: Float32Array[] = []
  for (let c = 0; c < buf.numberOfChannels; c += 1) channels.push(buf.getChannelData(c))

  const loud = (i: number): boolean => channels.some((data) => Math.abs(data[i]) > SILENCE)
  const maxTrim = Math.min(Math.floor(MAX_TRIM_S * buf.sampleRate), Math.floor(buf.length / 2))

  let start = 0
  while (start < maxTrim && !loud(start)) start += 1

  let end = buf.length - 1
  const floor = buf.length - 1 - maxTrim
  while (end > floor && !loud(end)) end -= 1

  return { start: start / buf.sampleRate, end: (end + 1) / buf.sampleRate }
}

// --- playback --------------------------------------------------------------

function outputFor(ctx: AudioContext): GainNode {
  if (!gain) {
    gain = ctx.createGain()
    gain.gain.value = 0.0001
    // Straight to the speakers, not through the sound-effect bus: turning the
    // effects off must leave the music exactly where it was.
    gain.connect(ctx.destination)
  }
  return gain
}

/** Ramp the music gain. Exponential ramps cannot reach 0, hence the epsilon. */
function rampTo(target: number, seconds: number): void {
  const ctx = getAudioContext()
  if (!ctx || !gain) return
  const now = ctx.currentTime
  const from = Math.max(gain.gain.value, 0.0001)
  gain.gain.cancelScheduledValues(now)
  gain.gain.setValueAtTime(from, now)
  gain.gain.exponentialRampToValueAtTime(Math.max(target, 0.0001), now + seconds)
}

function startTrack(): void {
  const ctx = getAudioContext()
  if (!ctx || !buffer || source) return

  loopPoints ??= findLoopPoints(buffer)
  const node = ctx.createBufferSource()
  node.buffer = buffer
  node.loop = true
  node.loopStart = loopPoints.start
  node.loopEnd = loopPoints.end
  node.connect(outputFor(ctx))

  gain!.gain.cancelScheduledValues(ctx.currentTime)
  gain!.gain.setValueAtTime(0.0001, ctx.currentTime)
  // Start past the leading padding as well, so the very first pass matches
  // every later one.
  node.start(ctx.currentTime, loopPoints.start)
  source = node
  rampTo(VOLUME, FADE_IN_S)
}

function stopTrack(): void {
  const ctx = getAudioContext()
  const node = source
  source = null
  if (!ctx || !node) return

  try {
    // A suspended context has a frozen clock, so a scheduled stop would never
    // arrive: silence that one outright rather than fading it.
    if (ctx.state !== 'running') {
      node.stop()
      return
    }
    rampTo(0, FADE_OUT_S)
    node.stop(ctx.currentTime + FADE_OUT_S + 0.1)
  } catch {
    /* already stopped */
  }
}

async function play(): Promise<void> {
  if (!wanted || status === 'missing') return

  if (!encoded) await ensureTrack()
  if (!wanted || !encoded) return

  const ctx = getAudioContext()
  if (!ctx) return
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume()
    } catch {
      /* still waiting for a gesture — the next one will get there */
    }
  }

  await decodeTrack()
  if (!wanted || !buffer) return
  startTrack()
}

// --- the outside world -----------------------------------------------------

/** Turn the theme on or off. Safe to call before the track has loaded. */
export function setMusicEnabled(value: boolean): void {
  if (wanted === value) return
  wanted = value
  if (value) void play()
  else stopTrack()
}

export function isMusicEnabled(): boolean {
  return wanted
}

/**
 * Hidden tab: fade out but keep the loop running, so coming back lands where
 * the track would have been rather than restarting it.
 */
function onVisibilityChange(): void {
  if (!source || !gain) return
  if (document.hidden) {
    rampTo(0, DUCK_S)
    return
  }
  const ctx = getAudioContext()
  if (ctx?.state === 'suspended') void ctx.resume()
  rampTo(VOLUME, DUCK_S)
}

/**
 * Called once at start-up. Browsers refuse to play anything until the page has
 * been interacted with, so the theme waits for the first click, tap or key
 * press — by which time the file is already in memory.
 */
export function initMusic(enabled: boolean): void {
  wanted = enabled
  if (armed || typeof document === 'undefined') return
  armed = true

  // Fetch it either way, so the toggle can tell "switched off" apart from
  // "there is no music file" even when nobody asked for it yet.
  void ensureTrack()

  // Start straight away where the browser already trusts this site — a kiosk,
  // or a device the family opens every week. A context that comes up suspended
  // has not earned that yet, and prodding it only draws a console warning.
  if (enabled && peekAudioContext()?.state === 'running') void play()

  // Everywhere else autoplay is refused until the page has been touched, and
  // the attempt above leaves the track cued up behind a suspended context —
  // the first click, tap or key press releases it.
  const unlock = (): void => {
    document.removeEventListener('pointerdown', unlock)
    document.removeEventListener('keydown', unlock)
    void play()
  }
  document.addEventListener('pointerdown', unlock, { passive: true })
  document.addEventListener('keydown', unlock)
  document.addEventListener('visibilitychange', onVisibilityChange)
}
