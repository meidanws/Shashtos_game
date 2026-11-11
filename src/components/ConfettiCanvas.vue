<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  rotation: number
  spin: number
  life: number
  decay: number
  shape: 'rect' | 'circle' | 'ribbon'
}

export interface BurstOptions {
  count?: number
  colors?: string[]
  /** 0..1 of the viewport */
  origin?: { x: number; y: number }
  spread?: number
  power?: number
}

const GOLD = ['#ffc62e', '#fff2b8', '#ff3d9e', '#28e0d8', '#b8f23c', '#ff8a2b']
const GRAVITY = 0.22
const DRAG = 0.992
const MAX_PARTICLES = 900

const canvas = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let particles: Particle[] = []
let frame: number | undefined
let dpr = 1

const reduced = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

function resize(): void {
  const el = canvas.value
  if (!el) return
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  el.width = Math.floor(window.innerWidth * dpr)
  el.height = Math.floor(window.innerHeight * dpr)
  el.style.width = `${window.innerWidth}px`
  el.style.height = `${window.innerHeight}px`
  ctx = el.getContext('2d')
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function tick(): void {
  frame = undefined
  if (!ctx || !canvas.value) return

  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)

  const height = window.innerHeight
  particles = particles.filter((p) => p.life > 0 && p.y < height + 60)

  for (const p of particles) {
    p.vy += GRAVITY
    p.vx *= DRAG
    p.vy *= DRAG
    p.x += p.vx
    p.y += p.vy
    p.rotation += p.spin
    p.life -= p.decay

    ctx.save()
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life))
    ctx.translate(p.x, p.y)
    ctx.rotate(p.rotation)
    ctx.fillStyle = p.color

    if (p.shape === 'circle') {
      ctx.beginPath()
      ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
      ctx.fill()
    } else if (p.shape === 'ribbon') {
      ctx.fillRect(-p.size / 2, -p.size / 6, p.size, p.size / 3)
    } else {
      // a flat rectangle squashed by its spin reads as a tumbling paper flake
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * Math.abs(Math.cos(p.rotation)))
    }
    ctx.restore()
  }

  if (particles.length > 0) frame = requestAnimationFrame(tick)
  else ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
}

function burst(options: BurstOptions = {}): void {
  if (reduced()) return
  if (!ctx) resize()
  if (!ctx) return

  const {
    count = 120,
    colors = GOLD,
    origin = { x: 0.5, y: 0.45 },
    spread = Math.PI * 2,
    power = 13,
  } = options

  const cx = origin.x * window.innerWidth
  const cy = origin.y * window.innerHeight
  const shapes: Particle['shape'][] = ['rect', 'circle', 'ribbon']

  for (let i = 0; i < count; i += 1) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * spread
    const speed = power * (0.45 + Math.random() * 0.85)
    particles.push({
      x: cx + (Math.random() - 0.5) * 40,
      y: cy + (Math.random() - 0.5) * 24,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 6 + Math.random() * 10,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.3,
      life: 1,
      decay: 0.004 + Math.random() * 0.006,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
    })
  }

  if (particles.length > MAX_PARTICLES) {
    particles = particles.slice(particles.length - MAX_PARTICLES)
  }
  if (frame === undefined) frame = requestAnimationFrame(tick)
}

/** A sustained shower from the top of the screen, for the end of the game. */
function shower(colors: string[], waves = 6, gap = 420): void {
  if (reduced()) return
  for (let i = 0; i < waves; i += 1) {
    window.setTimeout(() => {
      burst({
        count: 60,
        colors,
        origin: { x: 0.12 + Math.random() * 0.76, y: -0.05 },
        spread: Math.PI,
        power: 6,
      })
    }, i * gap)
  }
}

onMounted(() => {
  resize()
  window.addEventListener('resize', resize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
  if (frame !== undefined) cancelAnimationFrame(frame)
  particles = []
})

defineExpose({ burst, shower })
</script>

<template>
  <canvas ref="canvas" class="confetti" aria-hidden="true"></canvas>
</template>

<style scoped>
.confetti {
  position: fixed;
  inset: 0;
  z-index: 80;
  pointer-events: none;
}
</style>
