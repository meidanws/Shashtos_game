<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import GameCube from './GameCube.vue'
import { useGameStore } from '@/stores/game'

/** How long a freshly taken cube keeps its one-off effects. */
const FRESH_MS = 1400

const store = useGameStore()

const freshCubeId = ref<number | null>(null)
let freshTimer: ReturnType<typeof setTimeout> | undefined

watch(
  () => store.lastClaim,
  (claim) => {
    if (freshTimer) clearTimeout(freshTimer)
    if (!claim) {
      freshCubeId.value = null
      return
    }
    freshCubeId.value = claim.cubeId
    freshTimer = setTimeout(() => {
      if (freshCubeId.value === claim.cubeId) freshCubeId.value = null
    }, FRESH_MS)
  },
)

onBeforeUnmount(() => {
  if (freshTimer) clearTimeout(freshTimer)
})
</script>

<template>
  <section class="wall" aria-label="קיר הגורלות">
    <span class="bulbs bulbs--h bulbs--top" aria-hidden="true"></span>
    <span class="bulbs bulbs--h bulbs--bottom" aria-hidden="true"></span>
    <span class="bulbs bulbs--v bulbs--left" aria-hidden="true"></span>
    <span class="bulbs bulbs--v bulbs--right" aria-hidden="true"></span>

    <div class="wall__panel">
      <div class="wall__grid">
        <GameCube
          v-for="(cube, index) in store.cubes"
          :key="cube.id"
          :cube="cube"
          :index="index"
          :selectable="store.isCubeSelectable(cube.id)"
          :revealable="store.isCubeRevealable(cube.id)"
          :out-of-play="store.isCubeDiscarded(cube.id)"
          :flipped="cube.revealed"
          :team-color="cube.claimedBy ? store.teamColor(cube.claimedBy) : null"
          :team-name="cube.claimedBy ? store.teams[cube.claimedBy].name : null"
          :highlight="store.pendingTeam?.color ?? null"
          :just-claimed="freshCubeId === cube.id"
          :blocked="store.needsWinner && cube.claimedBy === null"
          @pick="store.claim"
          @reveal="store.revealOne"
          @blocked="store.nudgeWinnerPicker"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.wall {
  position: relative;
  /* The wall is the show: it takes as much of the screen as it can get.
     --chrome is the vertical budget spent on the top bar, footer and page
     padding; --ratio is the wall's own width/height including frame padding
     and grid gaps. On any landscape screen height is the binding constraint,
     so the upper bound exists only to stop the wall outgrowing a very tall
     display — 1500px used to leave a 4K projector two-thirds empty. */
  --chrome: clamp(190px, calc(5.4vw + 112px), 270px);
  --ratio: 1.28;
  --bulb: clamp(11px, 0.75vw, 20px);
  width: clamp(420px, min(96vw, calc((100dvh - var(--chrome)) * var(--ratio))), 2400px);
  /* GameScreen narrows this while the running tally sits beside the wall. */
  max-width: var(--wall-cap, 100%);
  margin-inline: auto;
  transition: max-width 0.4s ease;
  padding: clamp(14px, 1.8vw, 28px);
  border-radius: var(--radius-xl);
  background: linear-gradient(168deg, #ffe89a, var(--gold) 26%, #b5760c 72%, #6d4104);
  box-shadow:
    inset 0 3px 0 rgba(255, 255, 255, 0.7),
    inset 0 -4px 0 rgba(0, 0, 0, 0.3),
    0 0 0 4px #432602,
    0 30px 70px rgba(0, 0, 0, 0.7),
    0 0 90px rgba(255, 198, 46, 0.22);
}

.wall__panel {
  position: relative;
  padding: clamp(16px, 1.5vw, 24px);
  border-radius: var(--radius-lg);
  background: radial-gradient(130% 110% at 50% -10%, #4a1aa0 0%, #280d63 55%, #150636 100%);
  box-shadow:
    inset 0 0 0 3px rgba(0, 0, 0, 0.45),
    inset 0 14px 36px rgba(0, 0, 0, 0.75);
}

.wall__grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: clamp(8px, 1.1vw, 18px);
}

/* ---- chasing marquee bulbs around the gold frame ---- */

.bulbs {
  position: absolute;
  pointer-events: none;
  filter: drop-shadow(0 0 7px rgba(255, 226, 140, 0.9));
  animation: blink 1.15s steps(1, end) infinite;
}

.bulbs::after {
  content: '';
  position: absolute;
  inset: 0;
  background: inherit;
  animation: blink 1.15s steps(1, end) infinite reverse;
}

.bulbs--h {
  left: clamp(16px, 2.4vw, 34px);
  right: clamp(16px, 2.4vw, 34px);
  height: var(--bulb);
  background-image: radial-gradient(
    circle calc(var(--bulb) * 0.36) at calc(var(--bulb) * 1.21) calc(var(--bulb) * 0.5),
    #fff6cf 0 68%,
    rgba(255, 214, 120, 0.15) 100%
  );
  background-size: calc(var(--bulb) * 2.43) var(--bulb);
  background-repeat: repeat-x;
}

.bulbs--h::after {
  background-position: calc(var(--bulb) * 1.21) 0;
}

.bulbs--v {
  top: clamp(16px, 2.4vw, 34px);
  bottom: clamp(16px, 2.4vw, 34px);
  width: var(--bulb);
  background-image: radial-gradient(
    circle calc(var(--bulb) * 0.36) at calc(var(--bulb) * 0.5) calc(var(--bulb) * 1.21),
    #fff6cf 0 68%,
    rgba(255, 214, 120, 0.15) 100%
  );
  background-size: var(--bulb) calc(var(--bulb) * 2.43);
  background-repeat: repeat-y;
}

.bulbs--v::after {
  background-position: 0 calc(var(--bulb) * 1.21);
}

.bulbs--top {
  top: 4px;
}
.bulbs--bottom {
  bottom: 4px;
}
.bulbs--left {
  left: 4px;
}
.bulbs--right {
  right: 4px;
}

@keyframes blink {
  0%,
  49% {
    opacity: 1;
  }
  50%,
  100% {
    opacity: 0.2;
  }
}

/* ---- responsive: hold the 4 x 3 wall for as long as it stays legible ---- */

@media (max-width: 1000px) {
  .wall {
    /* keep the height term: without it a short landscape tablet gets a wall
       taller than its own viewport and has to scroll to see the bottom row */
    width: min(96vw, calc((100dvh - var(--chrome)) * var(--ratio)), 820px);
  }
}

@media (max-width: 620px) {
  .wall {
    /* 3 columns x 4 rows is a taller box than 4 x 3, so the ratio that turns
       available height into width has to change with it */
    --ratio: 0.82;
    --chrome: 205px;
    /* 100% of the padded container, not vw, so the frame never clips */
    width: min(100%, 480px);
    padding: 12px;
  }
  .wall__panel {
    padding: 14px;
  }
  .wall__grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  .bulbs--h {
    left: 12px;
    right: 12px;
  }
  .bulbs--v {
    top: 12px;
    bottom: 12px;
  }
}

@media (max-width: 359px) {
  .wall__grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* A phone held sideways has width to spare and almost none of the height the
   wall actually needs. Keep the full 4 x 3 grid — dropping to 3 columns only
   makes the wall taller, which is the wrong direction here — and let the
   short side set the size so the bottom row stays on screen. Last in the file
   so it wins over the width-based rules above. */
@media (max-height: 560px) and (orientation: landscape) {
  .wall {
    --chrome: 128px;
    --ratio: 1.28;
    width: min(96vw, calc((100dvh - var(--chrome)) * var(--ratio)));
    padding: 10px;
  }

  .wall__panel {
    padding: 10px;
  }

  .wall__grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
  }

  /* the marquee is the first thing to go when every pixel of height counts */
  .bulbs {
    display: none;
  }
}
</style>
