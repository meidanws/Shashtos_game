import { onBeforeUnmount, ref, watch, type Ref } from 'vue'

/**
 * Tweens a number towards its target so the scoreboard rolls up (or down)
 * instead of snapping. Honours prefers-reduced-motion.
 */
export function useAnimatedNumber(source: () => number, duration = 650): Ref<number> {
  const display = ref(source())
  let frame: number | undefined

  const reduced =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  function stop(): void {
    if (frame !== undefined) cancelAnimationFrame(frame)
    frame = undefined
  }

  watch(source, (target) => {
    stop()
    if (reduced || typeof requestAnimationFrame === 'undefined') {
      display.value = target
      return
    }

    const from = display.value
    const delta = target - from
    if (delta === 0) return
    const startedAt = performance.now()

    const step = (now: number): void => {
      const t = Math.min((now - startedAt) / duration, 1)
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3)
      display.value = Math.round(from + delta * eased)
      if (t < 1) frame = requestAnimationFrame(step)
      else frame = undefined
    }

    frame = requestAnimationFrame(step)
  })

  onBeforeUnmount(stop)

  return display
}
