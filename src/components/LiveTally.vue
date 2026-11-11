<script setup lang="ts">
/**
 * The running score while the wall is being opened. It deliberately lags the
 * state by the length of the flip, so the number never gives away a cube
 * before its face has come round.
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useAnimatedNumber } from '@/composables/useAnimatedNumber'
import { useGameStore } from '@/stores/game'
import { TEAM_IDS, type Scores, type TeamId } from '@/game/types'

withDefaults(defineProps<{ variant?: 'rail' | 'strip' }>(), { variant: 'rail' })

/** Roughly where the cube's back face becomes readable. */
const CATCH_UP_MS = 420
const FLASH_MS = 1500

const store = useGameStore()

const shown = ref<Scores>({ ...store.liveScores })
const shownCounts = ref<Record<TeamId, number>>({ ...store.revealedClaimCounts })
const flash = ref<Record<TeamId, { label: string; down: boolean; key: number } | null>>({
  team1: null,
  team2: null,
})

const timers = new Set<ReturnType<typeof setTimeout>>()

function later(fn: () => void, ms: number): void {
  const id = setTimeout(() => {
    timers.delete(id)
    fn()
  }, ms)
  timers.add(id)
}

watch(
  () => store.liveScores,
  (next) => {
    later(() => {
      shown.value = { ...next }
      shownCounts.value = { ...store.revealedClaimCounts }
    }, CATCH_UP_MS)
  },
  { deep: true },
)

// The cube that just opened pops its value onto its team's row.
watch(
  () => store.lastReveal,
  (event) => {
    if (!event?.claimed || !event.teamId) return
    const id = event.teamId
    later(() => {
      flash.value[id] = {
        label: event.score > 0 ? `+${event.score}` : `${event.score}`,
        down: event.score < 0,
        key: event.nonce,
      }
      later(() => {
        if (flash.value[id]?.key === event.nonce) flash.value[id] = null
      }, FLASH_MS)
    }, CATCH_UP_MS)
  },
)

onBeforeUnmount(() => {
  for (const id of timers) clearTimeout(id)
  timers.clear()
})

const team1 = useAnimatedNumber(() => shown.value.team1, 520)
const team2 = useAnimatedNumber(() => shown.value.team2, 520)
const animated: Record<TeamId, typeof team1> = { team1, team2 }

/** Who is ahead on what has been opened so far — nothing while level. */
const leader = computed<TeamId | null>(() => {
  if (shown.value.team1 === shown.value.team2) return null
  return shown.value.team1 > shown.value.team2 ? 'team1' : 'team2'
})
</script>

<template>
  <section class="tally" :class="`tally--${variant}`" aria-label="הניקוד עד כה">
    <h2 class="tally__title">הניקוד עד כה</h2>

    <div class="tally__teams">
      <div
        v-for="id in TEAM_IDS"
        :key="id"
        class="tally__team"
        :class="{ 'is-leading': leader === id }"
        :style="{ '--team': store.teams[id].color }"
      >
        <span class="tally__dot" aria-hidden="true"></span>
        <span class="tally__name">{{ store.teams[id].name }}</span>

        <span class="tally__score num" aria-live="polite">
          {{ animated[id].value.toLocaleString('he-IL') }}
        </span>

        <span class="tally__meta">
          <span class="num">{{ shownCounts[id] }}/{{ store.claimCounts[id] }}</span>
          קוביות
        </span>

        <Transition name="pop">
          <span
            v-if="flash[id]"
            :key="flash[id]!.key"
            class="tally__flash num"
            :class="{ 'tally__flash--down': flash[id]!.down }"
          >
            {{ flash[id]!.label }}
          </span>
        </Transition>
      </div>
    </div>
  </section>
</template>

<style scoped>
.tally {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tally__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(0.7rem, 1vw, 0.9rem);
  letter-spacing: 0.04em;
  color: var(--gold);
  text-align: center;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
}

.tally__teams {
  display: flex;
  gap: 0.5rem;
}

.tally__team {
  position: relative;
  display: grid;
  align-items: center;
  padding: 0.55rem 0.7rem;
  border-radius: var(--radius-lg);
  background: linear-gradient(
    165deg,
    color-mix(in srgb, var(--team) 32%, #1d0945),
    rgba(17, 5, 42, 0.95)
  );
  border: 2px solid color-mix(in srgb, var(--team) 55%, #1d0945);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.16),
    0 8px 20px rgba(0, 0, 0, 0.5);
  transition:
    border-color 0.3s ease,
    box-shadow 0.3s ease;
}

.tally__team.is-leading {
  border-color: #fff;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.25),
    0 0 0 3px color-mix(in srgb, var(--team) 40%, transparent),
    0 0 26px color-mix(in srgb, var(--team) 55%, transparent),
    0 8px 20px rgba(0, 0, 0, 0.5);
}

.tally__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--team);
  box-shadow: 0 0 10px var(--team);
}

.tally__name {
  font-family: var(--font-display);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tally__score {
  font-family: var(--font-display);
  line-height: 1;
  color: #fff;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
}

.tally__meta {
  font-size: 0.7rem;
  color: rgba(255, 247, 234, 0.55);
}

/* The value of the cube that just opened, floating up off the row.
   Physical `left` on purpose: the chip is bidi-isolated (`.num`), which throws
   off how the logical inset resolves. The score sits on the right, so the left
   is the free corner either way. */
.tally__flash {
  position: absolute;
  left: 0.6rem;
  top: 0.2rem;
  font-family: var(--font-display);
  font-size: clamp(0.85rem, 1.3vw, 1.15rem);
  color: #6cf0b0;
  text-shadow: 0 0 14px rgba(108, 240, 176, 0.8);
  pointer-events: none;
}

.tally__flash--down {
  color: #ff8d7f;
  text-shadow: 0 0 14px rgba(255, 141, 127, 0.8);
}

.pop-enter-active {
  animation: float-up 1.5s ease-out both;
}

.pop-leave-active {
  transition: opacity 0.2s ease;
}

.pop-leave-to {
  opacity: 0;
}

@keyframes float-up {
  0% {
    opacity: 0;
    translate: 0 10px;
    scale: 0.6;
  }
  22% {
    opacity: 1;
    translate: 0 -2px;
    scale: 1.1;
  }
  40% {
    scale: 1;
  }
  100% {
    opacity: 0;
    translate: 0 -26px;
    scale: 1;
  }
}

/* ---- the side rail: one team above the other ---- */

.tally--rail .tally__teams {
  flex-direction: column;
}

.tally--rail .tally__team {
  grid-template-columns: auto 1fr;
  grid-template-areas:
    'dot name'
    'score score'
    'meta meta';
  gap: 0.1rem 0.45rem;
  text-align: start;
}

.tally--rail .tally__dot {
  grid-area: dot;
}

.tally--rail .tally__name {
  grid-area: name;
  font-size: clamp(0.75rem, 1vw, 0.95rem);
}

/* `justify-self` rather than `text-align`: the number is bidi-isolated, so
   inside it "start" means the left, not the start of the Hebrew line. */
.tally--rail .tally__score {
  grid-area: score;
  justify-self: start;
  font-size: clamp(1.5rem, 2.4vw, 2.3rem);
  margin-block-start: 0.15rem;
}

.tally--rail .tally__meta {
  grid-area: meta;
  justify-self: start;
}

.tally--rail .tally__flash {
  top: auto;
  bottom: 0.7rem;
  left: 0.7rem;
}

/* ---- the compact strip, for screens with no room at the side ---- */

.tally--strip {
  gap: 0.3rem;
}

.tally--strip .tally__title {
  display: none;
}

.tally--strip .tally__teams {
  flex-wrap: wrap;
  justify-content: center;
}

.tally--strip .tally__team {
  grid-template-columns: auto minmax(0, auto) auto;
  gap: 0.45rem;
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
}

.tally--strip .tally__name {
  max-width: 12ch;
  font-size: 0.8rem;
}

.tally--strip .tally__score {
  font-size: 1.1rem;
}

.tally--strip .tally__meta {
  display: none;
}

.tally--strip .tally__flash {
  top: -0.9rem;
}
</style>
