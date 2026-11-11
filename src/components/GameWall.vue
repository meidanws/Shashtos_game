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
     170px covers the slim top bar and the page padding; 1.28 is the wall's
     own width/height ratio including frame padding and grid gaps. */
  width: clamp(420px, min(96vw, calc((100dvh - 195px) * 1.28)), 1500px);
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
  height: 14px;
  background-image: radial-gradient(
    circle 5px at 17px 7px,
    #fff6cf 0 68%,
    rgba(255, 214, 120, 0.15) 100%
  );
  background-size: 34px 14px;
  background-repeat: repeat-x;
}

.bulbs--h::after {
  background-position: 17px 0;
}

.bulbs--v {
  top: clamp(16px, 2.4vw, 34px);
  bottom: clamp(16px, 2.4vw, 34px);
  width: 14px;
  background-image: radial-gradient(
    circle 5px at 7px 17px,
    #fff6cf 0 68%,
    rgba(255, 214, 120, 0.15) 100%
  );
  background-size: 14px 34px;
  background-repeat: repeat-y;
}

.bulbs--v::after {
  background-position: 0 17px;
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
    width: min(96vw, 820px);
  }
}

@media (max-width: 620px) {
  .wall {
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
</style>
