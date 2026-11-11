<script setup lang="ts">
/** The studio behind everything: spotlights, rotating rays, glitter and a stage floor. */
</script>

<template>
  <div class="backdrop" aria-hidden="true">
    <div class="backdrop__rays"></div>
    <div class="backdrop__glow"></div>
    <div class="backdrop__spot backdrop__spot--right"></div>
    <div class="backdrop__spot backdrop__spot--left"></div>
    <div class="backdrop__glitter"></div>
    <div class="backdrop__floor"></div>
    <div class="backdrop__vignette"></div>
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  background:
    radial-gradient(120% 90% at 50% 8%, #4a1aa8 0%, #2a0c63 38%, #150634 68%, #0c0320 100%);
}

.backdrop__rays {
  position: absolute;
  top: -45vmax;
  left: 50%;
  width: 170vmax;
  height: 170vmax;
  translate: -50% 0;
  background: repeating-conic-gradient(
    from 0deg,
    rgba(255, 255, 255, 0.07) 0deg 7deg,
    rgba(255, 255, 255, 0) 7deg 16deg
  );
  mask-image: radial-gradient(closest-side, #000 25%, transparent 78%);
  animation: spin 90s linear infinite;
}

.backdrop__glow {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(60% 42% at 50% 30%, rgba(255, 61, 158, 0.3), transparent 70%),
    radial-gradient(50% 36% at 12% 74%, rgba(40, 224, 216, 0.22), transparent 72%),
    radial-gradient(46% 34% at 88% 70%, rgba(255, 198, 46, 0.18), transparent 72%);
  animation: breathe 11s ease-in-out infinite alternate;
}

.backdrop__spot {
  position: absolute;
  top: -18vh;
  width: 46vw;
  height: 135vh;
  background: linear-gradient(
    to bottom,
    rgba(255, 244, 214, 0.26),
    rgba(255, 221, 150, 0.1) 42%,
    transparent 78%
  );
  filter: blur(14px);
  mix-blend-mode: screen;
}

.backdrop__spot--right {
  right: 2vw;
  clip-path: polygon(44% 0, 56% 0, 100% 100%, 0 100%);
  transform-origin: 50% 0;
  animation: sway 13s ease-in-out infinite alternate;
}

.backdrop__spot--left {
  left: 2vw;
  clip-path: polygon(44% 0, 56% 0, 100% 100%, 0 100%);
  transform-origin: 50% 0;
  animation: sway 13s ease-in-out infinite alternate-reverse;
}

.backdrop__glitter {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle, rgba(255, 255, 255, 0.85) 0 1.4px, transparent 2px),
    radial-gradient(circle, rgba(255, 220, 140, 0.7) 0 1.2px, transparent 2px);
  background-size:
    220px 190px,
    310px 260px;
  background-position:
    18px 32px,
    140px 96px;
  opacity: 0.5;
  animation: twinkle 4.5s ease-in-out infinite alternate;
}

.backdrop__floor {
  position: absolute;
  inset: auto 0 0 0;
  height: 26vh;
  background:
    linear-gradient(to bottom, transparent, rgba(255, 198, 46, 0.1) 40%, rgba(255, 198, 46, 0.2)),
    repeating-linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.07) 0 2px,
      transparent 2px 64px
    );
  mask-image: linear-gradient(to bottom, transparent, #000 60%);
  border-top: 1px solid rgba(255, 220, 150, 0.18);
}

.backdrop__vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(130% 100% at 50% 40%, transparent 48%, rgba(5, 1, 15, 0.78) 100%);
}

@keyframes spin {
  to {
    rotate: 360deg;
  }
}

@keyframes breathe {
  from {
    opacity: 0.75;
  }
  to {
    opacity: 1;
  }
}

@keyframes sway {
  from {
    transform: rotate(-7deg);
    opacity: 0.75;
  }
  to {
    transform: rotate(7deg);
    opacity: 1;
  }
}

@keyframes twinkle {
  from {
    opacity: 0.28;
  }
  to {
    opacity: 0.62;
  }
}
</style>
