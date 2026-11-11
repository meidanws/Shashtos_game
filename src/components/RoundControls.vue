<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Sparkles, X } from 'lucide-vue-next'
import { useGameStore } from '@/stores/game'
import { TEAM_IDS, type TeamId } from '@/game/types'

const store = useGameStore()

const emit = defineEmits<{ finish: [] }>()

/** Flashes the picker when someone taps the wall before naming a winner. */
const nudging = ref(false)
let nudgeTimer: ReturnType<typeof setTimeout> | undefined

watch(
  () => store.winnerHintNonce,
  () => {
    if (nudgeTimer) clearTimeout(nudgeTimer)
    nudging.value = false
    // restart the animation even if it is already running
    requestAnimationFrame(() => {
      nudging.value = true
      nudgeTimer = setTimeout(() => {
        nudging.value = false
      }, 900)
    })
  },
)

onBeforeUnmount(() => {
  if (nudgeTimer) clearTimeout(nudgeTimer)
})

/** With every cube handed out there is nothing left to play for. */
const stage = computed<'choose' | 'pick' | 'full'>(() => {
  if (store.wallFull) return 'full'
  return store.pendingTeamId ? 'pick' : 'choose'
})

function choose(id: TeamId): void {
  store.chooseWinner(store.pendingTeamId === id ? null : id)
}
</script>

<template>
  <div class="controls" :class="{ 'controls--nudge': nudging }">
    <!-- all twelve taken: there is nothing left but to open the wall -->
    <template v-if="stage === 'full'">
      <p class="controls__prompt">כל הקוביות חולקו!</p>
      <button type="button" class="pill-button reveal" @click="emit('finish')">
        <Sparkles :size="22" />
        סיום ופתיחת הקוביות
      </button>
    </template>

    <template v-else>
      <p class="controls__prompt" aria-live="polite">
        <template v-if="stage === 'choose'">מי ניצחה בסיבוב?</template>
        <template v-else>
          עכשיו בחרו קוביה עבור
          <strong :style="{ color: store.pendingTeam?.color }">{{ store.pendingTeam?.name }}</strong>
        </template>
      </p>

      <div class="controls__teams">
        <button
          v-for="id in TEAM_IDS"
          :key="id"
          type="button"
          class="team-pick"
          :class="{ 'is-armed': store.pendingTeamId === id, 'is-dimmed': stage === 'pick' && store.pendingTeamId !== id }"
          :style="{ '--team': store.teams[id].color }"
          :aria-pressed="store.pendingTeamId === id"
          @click="choose(id)"
        >
          <svg class="team-pick__bandana" viewBox="0 0 40 40" aria-hidden="true">
            <g stroke="rgba(20,6,48,0.6)" stroke-width="2" stroke-linejoin="round">
              <path d="M2 2 h34 c-2 12 -12 22 -22 26 C6 22 2 12 2 2 Z" fill="var(--team)" />
              <path
                d="M6 14 c5 8 12 13 8 14 -6 -2 -10 -8 -12 -14 Z"
                fill="color-mix(in srgb, var(--team) 60%, #000)"
                stroke="none"
              />
              <circle cx="16" cy="28" r="7" fill="color-mix(in srgb, var(--team) 85%, #fff)" />
              <path d="M22 30 l14 8" stroke="var(--team)" stroke-width="5" stroke-linecap="round" />
            </g>
          </svg>
          <span class="team-pick__name">{{ store.teams[id].name }}</span>
          <span class="team-pick__count">{{ store.claimCounts[id] }}</span>
          <X v-if="store.pendingTeamId === id" class="team-pick__clear" :size="16" />
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
}

.controls--nudge .controls__teams {
  animation: nudge 0.5s ease-in-out 1;
}

.controls--nudge .controls__prompt {
  animation: nudge-glow 0.9s ease-out 1;
}

.controls__prompt {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(0.85rem, 1.5vw, 1.2rem);
  color: var(--gold-light);
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
}

.controls__prompt strong {
  font-weight: inherit;
  text-shadow: 0 0 16px currentColor;
}

.controls__teams {
  display: flex;
  gap: 0.6rem;
}

.team-pick {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4em 0.9em;
  border-radius: 999px;
  color: var(--cream);
  background: linear-gradient(
    165deg,
    color-mix(in srgb, var(--team) 34%, #1d0945),
    rgba(17, 5, 42, 0.95)
  );
  border: 2px solid color-mix(in srgb, var(--team) 60%, #1d0945);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    0 6px 16px rgba(0, 0, 0, 0.5);
  transition:
    transform 0.16s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    opacity 0.2s ease;
}

.team-pick:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--team) 85%, #fff);
}

.team-pick.is-armed {
  border-color: #fff;
  transform: translateY(-3px) scale(1.04);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.3),
    0 0 0 3px color-mix(in srgb, var(--team) 50%, transparent),
    0 0 34px color-mix(in srgb, var(--team) 75%, transparent),
    0 8px 20px rgba(0, 0, 0, 0.55);
  animation: armed-pulse 1.7s ease-in-out infinite;
}

.team-pick.is-dimmed {
  opacity: 0.4;
}

.team-pick.is-dimmed:hover {
  opacity: 0.8;
}

.team-pick__bandana {
  flex: none;
  width: clamp(22px, 1.9vw, 30px);
  height: clamp(22px, 1.9vw, 30px);
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.5));
}

.team-pick__name {
  font-family: var(--font-display);
  font-size: clamp(0.9rem, 1.5vw, 1.25rem);
  max-width: 14ch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.team-pick__count {
  display: grid;
  place-items: center;
  min-width: 1.7em;
  height: 1.7em;
  padding: 0 0.35em;
  font-family: var(--font-display);
  font-size: 0.8rem;
  color: #2a1150;
  background: color-mix(in srgb, var(--team) 40%, #fff);
  border-radius: 999px;
}

.team-pick__clear {
  opacity: 0.75;
}

/* Pulses with light rather than size, so the button never moves under the
   pointer (and stays clickable for anything driving the page). */
.reveal {
  font-size: clamp(1rem, 2vw, 1.4rem);
  padding: 0.5em 1.4em;
  animation: reveal-call 1.6s ease-in-out infinite;
}

@keyframes nudge {
  0%,
  100% {
    translate: 0 0;
  }
  20% {
    translate: -8px 0;
  }
  45% {
    translate: 8px 0;
  }
  70% {
    translate: -4px 0;
  }
}

@keyframes nudge-glow {
  0%,
  100% {
    scale: 1;
    color: var(--gold-light);
    text-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
  }
  30% {
    scale: 1.12;
    color: #fff;
    text-shadow:
      0 0 18px rgba(255, 198, 46, 0.95),
      0 2px 6px rgba(0, 0, 0, 0.6);
  }
}

@keyframes armed-pulse {
  0%,
  100% {
    filter: brightness(1);
  }
  50% {
    filter: brightness(1.22);
  }
}

@keyframes reveal-call {
  0%,
  100% {
    filter: brightness(1);
    box-shadow:
      inset 0 2px 0 rgba(255, 255, 255, 0.75),
      0 7px 0 var(--gold-shadow),
      0 14px 26px rgba(0, 0, 0, 0.45),
      0 0 0 0 rgba(255, 198, 46, 0.5);
  }
  50% {
    filter: brightness(1.14);
    box-shadow:
      inset 0 2px 0 rgba(255, 255, 255, 0.75),
      0 7px 0 var(--gold-shadow),
      0 14px 26px rgba(0, 0, 0, 0.45),
      0 0 34px 10px rgba(255, 198, 46, 0.55);
  }
}

@media (max-width: 560px) {
  .controls__teams {
    gap: 0.4rem;
  }
  .team-pick {
    padding: 0.35em 0.6em;
    gap: 0.35rem;
  }
}
</style>
