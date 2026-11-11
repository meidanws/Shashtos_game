import { describe, expect, it } from 'vitest'
import { findLoopPoints, type SampledAudio } from './music'

const RATE = 44100

/**
 * A stand-in for a decoded AudioBuffer: a tone with `head` seconds of digital
 * silence in front of it and `tail` seconds behind — exactly the padding an
 * MP3 or AAC encoder leaves on a track.
 */
function track(seconds: number, head: number, tail: number): SampledAudio {
  const length = Math.round(seconds * RATE)
  const from = Math.round(head * RATE)
  const to = length - Math.round(tail * RATE)
  const data = new Float32Array(length)
  for (let i = from; i < to; i += 1) data[i] = Math.sin((i / RATE) * 440 * 2 * Math.PI) * 0.6

  return {
    length,
    sampleRate: RATE,
    numberOfChannels: 1,
    getChannelData: () => data,
  }
}

describe('finding the loop points', () => {
  it('loops between the first and last audible samples, not the file ends', () => {
    const { start, end } = findLoopPoints(track(4, 0.08, 0.12))
    expect(start).toBeCloseTo(0.08, 2)
    expect(end).toBeCloseTo(3.88, 2)
  })

  it('leaves a track that is already tight alone', () => {
    // Not exactly zero: a sine starts at the zero crossing, so the first
    // sample or two legitimately count as silence.
    const { start, end } = findLoopPoints(track(3, 0, 0))
    expect(start).toBeLessThan(0.001)
    expect(end).toBeCloseTo(3, 3)
  })

  it('never trims more than a second — a quiet intro is not padding', () => {
    // Two seconds of near-silence at the front is a deliberate fade-in, so the
    // loop keeps it rather than skipping into the middle of the music.
    const { start } = findLoopPoints(track(8, 2, 0))
    expect(start).toBeLessThanOrEqual(1)
  })

  it('reads every channel, not just the first', () => {
    const left = new Float32Array(RATE)
    const right = new Float32Array(RATE)
    // Nothing on the left at all; the right comes in a quarter of the way.
    for (let i = RATE / 4; i < RATE; i += 1) right[i] = 0.5

    const stereo: SampledAudio = {
      length: RATE,
      sampleRate: RATE,
      numberOfChannels: 2,
      getChannelData: (channel) => (channel === 0 ? left : right),
    }
    expect(findLoopPoints(stereo).start).toBeCloseTo(0.25, 2)
  })

  it('ignores dither and encoder noise below the silence floor', () => {
    const length = RATE * 2
    const data = new Float32Array(length)
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * 0.0005
    for (let i = RATE / 2; i < RATE; i += 1) data[i] = 0.4

    const noisy: SampledAudio = {
      length,
      sampleRate: RATE,
      numberOfChannels: 1,
      getChannelData: () => data,
    }
    const { start, end } = findLoopPoints(noisy)
    expect(start).toBeCloseTo(0.5, 2)
    expect(end).toBeCloseTo(1, 2)
  })
})
