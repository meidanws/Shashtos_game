<script setup lang="ts">
import { computed } from 'vue'
import { useAnimatedNumber } from '@/composables/useAnimatedNumber'
import { useGameStore } from '@/stores/game'

const store = useGameStore()

const team1 = useAnimatedNumber(() => store.scores.team1, 900)
const team2 = useAnimatedNumber(() => store.scores.team2, 900)

const shown = computed(() => [
  { team: store.teams.team1, score: team1.value, won: store.winner.kind === 'win' && store.winner.teamId === 'team1' },
  { team: store.teams.team2, score: team2.value, won: store.winner.kind === 'win' && store.winner.teamId === 'team2' },
])
</script>

<template>
  <div class="finals" aria-label="הניקוד הסופי">
    <div
      v-for="entry in shown"
      :key="entry.team.id"
      class="finals__team"
      :class="{ 'finals__team--won': entry.won }"
      :style="{ '--team': entry.team.color }"
    >
      <span class="finals__dot"></span>
      <span class="finals__name">{{ entry.team.name }}</span>
      <span class="finals__score num">{{ entry.score.toLocaleString('he-IL') }}</span>
    </div>
  </div>
</template>

<style scoped>
.finals {
  display: flex;
  gap: 0.6rem;
}

.finals__team {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.35em 0.95em;
  border-radius: 999px;
  background: linear-gradient(
    165deg,
    color-mix(in srgb, var(--team) 32%, #1d0945),
    rgba(17, 5, 42, 0.95)
  );
  border: 2px solid color-mix(in srgb, var(--team) 60%, #1d0945);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.5);
}

.finals__team--won {
  border-color: #fff;
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--team) 45%, transparent),
    0 0 30px color-mix(in srgb, var(--team) 65%, transparent),
    0 6px 16px rgba(0, 0, 0, 0.5);
}

.finals__dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--team);
  box-shadow: 0 0 10px var(--team);
}

.finals__name {
  font-family: var(--font-display);
  font-size: clamp(0.85rem, 1.4vw, 1.1rem);
  max-width: 12ch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.finals__score {
  font-family: var(--font-display);
  font-size: clamp(1.2rem, 2.2vw, 1.8rem);
  color: #fff;
}
</style>
