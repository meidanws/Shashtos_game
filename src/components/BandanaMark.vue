<script setup lang="ts">
/**
 * A fabric bandana tied over the corner of a cube, in the team's colour.
 * Drawn as real cloth — folded triangle, a shaded under-fold, a tied knot
 * and two trailing tails — not a recoloured border.
 */
withDefaults(
  defineProps<{
    color: string
    label?: string
    /** Skip the tie-on animation (used when restoring a saved game). */
    animate?: boolean
  }>(),
  { label: undefined, animate: true },
)
</script>

<template>
  <div class="bandana" :class="{ 'bandana--static': !animate }" :style="{ '--team': color }">
    <svg viewBox="0 0 120 120" class="bandana__svg" role="img" :aria-label="label">
      <defs>
        <linearGradient :id="`sheen-${color.slice(1)}`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#fff" stop-opacity="0.45" />
          <stop offset="45%" stop-color="#fff" stop-opacity="0.05" />
          <stop offset="100%" stop-color="#000" stop-opacity="0.2" />
        </linearGradient>
      </defs>

      <g stroke="rgba(20,6,48,0.55)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round">
        <!-- trailing tails, behind the knot -->
        <path
          class="bandana__tail bandana__tail--long"
          d="M62 58 C 80 66 92 84 86 106 C 78 100 72 96 64 94 C 70 82 68 70 62 62 Z"
          fill="var(--team)"
        />
        <path
          class="bandana__tail"
          d="M58 60 C 48 76 36 84 18 86 C 24 76 26 68 26 60 C 38 64 50 64 58 60 Z"
          fill="var(--team)"
        />

        <!-- main folded triangle draped over the corner -->
        <path
          d="M-6 -6 L 96 -6 C 92 18 72 44 42 56 C 16 48 0 28 -6 -6 Z"
          fill="var(--team)"
        />
        <!-- under-fold, darker -->
        <path
          d="M8 30 C 20 46 32 54 42 56 C 30 60 16 56 4 46 Z"
          fill="color-mix(in srgb, var(--team) 62%, #000)"
          stroke="none"
        />
        <!-- cloth sheen -->
        <path
          d="M-6 -6 L 96 -6 C 92 18 72 44 42 56 C 16 48 0 28 -6 -6 Z"
          :fill="`url(#sheen-${color.slice(1)})`"
          stroke="none"
        />
        <!-- fabric folds -->
        <path d="M20 4 C 26 24 34 38 44 48" fill="none" stroke="rgba(0,0,0,0.18)" stroke-width="3" />
        <path d="M54 2 C 54 20 50 36 42 50" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="3" />

        <!-- the knot -->
        <path
          d="M40 44 C 56 40 66 48 64 60 C 62 72 48 74 40 66 C 34 60 34 48 40 44 Z"
          fill="color-mix(in srgb, var(--team) 88%, #fff)"
        />
        <path d="M44 52 C 52 50 58 54 58 60" fill="none" stroke="rgba(0,0,0,0.25)" stroke-width="2.5" />
      </g>
    </svg>
  </div>
</template>

<style scoped>
/* Always the physical top-left corner, so the drape reads the same way in
   every cube and in both writing directions. */
.bandana {
  position: absolute;
  left: -6%;
  top: -6%;
  width: 50%;
  aspect-ratio: 1;
  pointer-events: none;
  z-index: 6;
  filter: drop-shadow(0 6px 8px rgba(0, 0, 0, 0.45));
  transform-origin: 20% 20%;
  animation: tie-on 0.55s cubic-bezier(0.18, 1.5, 0.4, 1) both;
}

.bandana.bandana--static {
  animation: none;
}

.bandana__svg {
  width: 100%;
  height: 100%;
  display: block;
  overflow: visible;
}

.bandana__tail {
  animation: flutter 3.2s ease-in-out infinite alternate;
  transform-origin: 60% 55%;
}

.bandana__tail--long {
  animation-duration: 2.6s;
  animation-delay: -0.6s;
}

@keyframes tie-on {
  0% {
    opacity: 0;
    scale: 0.3;
    rotate: -35deg;
  }
  60% {
    opacity: 1;
  }
  100% {
    opacity: 1;
    scale: 1;
    rotate: 0deg;
  }
}

@keyframes flutter {
  from {
    rotate: -3deg;
  }
  to {
    rotate: 3deg;
  }
}
</style>
