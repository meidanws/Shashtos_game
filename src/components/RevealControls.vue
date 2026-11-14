<script setup lang="ts">
import { computed } from 'vue'
import { FastForward } from 'lucide-vue-next'
import LiveTally from './LiveTally.vue'
import { useGameStore } from '@/stores/game'

const store = useGameStore()

/** Only the cubes that were won are opened, so they are the whole of the bar. */
const progress = computed(() =>
  store.openableCount === 0 ? 0 : (store.revealedCount / store.openableCount) * 100,
)
</script>

<template>
  <div class="opening">
    <p class="opening__prompt" aria-live="polite">
      <template v-if="store.hiddenCount > 0">
        לחצו על קוביה שנבחרה כדי לגלות מה מסתתר מאחוריה
      </template>
      <template v-else>סופרים את הנקודות...</template>
    </p>

    <div class="opening__row">
      <span class="opening__count">
        <strong class="num">{{ store.revealedCount }}/{{ store.openableCount }}</strong>
        <span>נחשפו</span>
      </span>

      <span class="opening__bar" aria-hidden="true">
        <span class="opening__fill" :style="{ width: `${progress}%` }"></span>
      </span>

      <button
        v-if="store.hiddenCount > 0"
        type="button"
        class="opening__skip"
        :disabled="store.isRevealing"
        @click="store.revealRest()"
      >
        <FastForward :size="15" />
        <span>לפתוח את כולן</span>
      </button>
    </div>

    <!-- no room for the side rail on a narrow screen: the tally comes here -->
    <LiveTally variant="strip" class="opening__tally" />
  </div>
</template>

<style scoped>
.opening {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
}

.opening__prompt {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(0.85rem, 1.5vw, 1.7rem);
  color: var(--gold-light);
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
}

.opening__row {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

.opening__count {
  display: flex;
  align-items: baseline;
  gap: 0.35em;
  font-size: clamp(0.65rem, 0.95vw, 1.05rem);
  color: rgba(255, 247, 234, 0.65);
  white-space: nowrap;
}

.opening__count strong {
  font-family: var(--font-display);
  font-size: clamp(0.95rem, 1.5vw, 1.8rem);
  color: var(--gold);
}

.opening__bar {
  width: clamp(80px, 14vw, 300px);
  height: 8px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.45);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.6);
  overflow: hidden;
}

.opening__fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--gold), var(--gold-light));
  box-shadow: 0 0 12px rgba(255, 198, 46, 0.7);
  transition: width 0.4s ease;
}

/* Deliberately quiet: opening the cubes one by one is the fun part, and
   skipping to the end is the player's call. */
.opening__skip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4em 0.85em;
  font-size: clamp(0.7rem, 1.1vw, 1.2rem);
  color: var(--cream);
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 999px;
  white-space: nowrap;
  transition:
    background 0.15s ease,
    border-color 0.15s ease;
}

.opening__skip:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.16);
  border-color: rgba(255, 198, 46, 0.6);
}

.opening__skip:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* The side rail takes over from 1001px up — see GameScreen. */
.opening__tally {
  margin-top: 0.15rem;
}

@media (min-width: 1001px) {
  .opening__tally {
    display: none;
  }
}

@media (max-width: 560px) {
  .opening__bar {
    display: none;
  }
}
</style>
