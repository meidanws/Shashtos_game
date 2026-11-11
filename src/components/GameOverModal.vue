<script setup lang="ts">
import { computed } from 'vue'
import { Eye, RotateCcw, Trophy, Users } from 'lucide-vue-next'
import ShatusLogo from './ShatusLogo.vue'
import { useGameStore } from '@/stores/game'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ newGame: []; changeTeams: []; dismiss: [] }>()

const store = useGameStore()

const winnerTeam = computed(() =>
  store.winner.kind === 'win' ? store.teams[store.winner.teamId] : null,
)

const headline = computed(() => (winnerTeam.value ? 'ויש לנו מנצחת!' : 'תיקו מושלם!'))

const accent = computed(() => winnerTeam.value?.color ?? '#ffc62e')

const ranked = computed(() => {
  const list = [
    { team: store.teams.team1, score: store.scores.team1, rounds: store.claimCounts.team1 },
    { team: store.teams.team2, score: store.scores.team2, rounds: store.claimCounts.team2 },
  ]
  return list.sort((a, b) => b.score - a.score)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="curtain">
      <div
        v-if="open"
        class="over"
        role="dialog"
        aria-modal="true"
        aria-label="סיום המשחק"
        :style="{ '--accent': accent }"
      >
        <div class="over__scrim"></div>

        <div class="over__card">
          <div class="over__rays" aria-hidden="true"></div>

          <ShatusLogo size="sm" mark="face" class="over__logo" />

          <Trophy class="over__trophy" :size="72" :stroke-width="1.6" aria-hidden="true" />

          <h2 class="over__headline">{{ headline }}</h2>

          <p v-if="winnerTeam" class="over__winner">{{ winnerTeam.name }}</p>
          <p v-else class="over__winner over__winner--tie">שתי הקבוצות סיימו באותו ניקוד</p>

          <ul class="over__scores">
            <li
              v-for="entry in ranked"
              :key="entry.team.id"
              class="over__row"
              :class="{ 'over__row--top': winnerTeam?.id === entry.team.id }"
              :style="{ '--team': entry.team.color }"
            >
              <span class="over__dot"></span>
              <span class="over__name">{{ entry.team.name }}</span>
              <span class="over__rounds">{{ entry.rounds }} קוביות</span>
              <span class="over__score num">{{ entry.score.toLocaleString('he-IL') }}</span>
            </li>
          </ul>

          <div class="over__actions">
            <button type="button" class="pill-button" @click="emit('newGame')">
              <RotateCcw :size="20" />
              משחק חדש
            </button>
            <button type="button" class="pill-button pill-button--ghost" @click="emit('changeTeams')">
              <Users :size="18" />
              קבוצות חדשות
            </button>
            <button type="button" class="pill-button pill-button--ghost" @click="emit('dismiss')">
              <Eye :size="18" />
              להציץ בקיר
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.over {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: grid;
  place-items: center;
  padding: 1rem;
  padding-block: max(1rem, env(safe-area-inset-top, 0px)) max(1rem, env(safe-area-inset-bottom, 0px));
  overflow-y: auto;
}

.over__scrim {
  position: fixed;
  inset: 0;
  background: radial-gradient(100% 80% at 50% 40%, rgba(40, 10, 90, 0.86), rgba(5, 1, 18, 0.95));
  backdrop-filter: blur(6px);
}

.over__card {
  position: relative;
  width: min(94vw, 560px);
  padding: clamp(1.4rem, 3.5vw, 2.6rem) clamp(1.2rem, 3vw, 2.4rem) clamp(1.4rem, 3vw, 2.2rem);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  text-align: center;
  overflow: hidden;
  border-radius: var(--radius-xl);
  background: linear-gradient(170deg, rgba(74, 26, 160, 0.96), rgba(21, 6, 54, 0.98));
  border: 3px solid var(--gold);
  box-shadow:
    0 0 0 6px rgba(255, 198, 46, 0.14),
    0 40px 90px rgba(0, 0, 0, 0.75),
    inset 0 2px 0 rgba(255, 255, 255, 0.2);
}

.over__rays {
  position: absolute;
  inset: -60% -30%;
  background: repeating-conic-gradient(
    from 0deg,
    color-mix(in srgb, var(--accent) 22%, transparent) 0deg 8deg,
    transparent 8deg 18deg
  );
  mask-image: radial-gradient(closest-side, #000 10%, transparent 70%);
  animation: spin 26s linear infinite;
  pointer-events: none;
}

.over__logo,
.over__trophy,
.over__headline,
.over__winner,
.over__scores,
.over__actions {
  position: relative;
}

.over__trophy {
  color: var(--gold);
  filter: drop-shadow(0 0 24px rgba(255, 198, 46, 0.75));
  animation: trophy-in 0.7s cubic-bezier(0.2, 1.5, 0.35, 1) both;
}

.over__headline {
  font-size: clamp(1.5rem, 4vw, 2.5rem);
  color: var(--gold-light);
  text-shadow: 0 3px 0 rgba(0, 0, 0, 0.4);
}

.over__winner {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(1.8rem, 5.5vw, 3.2rem);
  line-height: 1.1;
  color: var(--accent);
  text-shadow:
    0 0 26px color-mix(in srgb, var(--accent) 70%, transparent),
    0 3px 0 rgba(0, 0, 0, 0.45);
  animation: winner-in 0.6s 0.15s cubic-bezier(0.2, 1.4, 0.4, 1) both;
}

.over__winner--tie {
  font-size: clamp(1.1rem, 2.6vw, 1.5rem);
  color: var(--cream);
}

.over__scores {
  width: 100%;
  margin: 0.8rem 0 0.4rem;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.over__row {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.55em 0.9em;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.32);
  border: 2px solid color-mix(in srgb, var(--team) 55%, transparent);
}

.over__row--top {
  background: color-mix(in srgb, var(--team) 24%, rgba(0, 0, 0, 0.3));
  border-color: var(--team);
  box-shadow: 0 0 24px color-mix(in srgb, var(--team) 45%, transparent);
}

.over__dot {
  flex: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--team);
  box-shadow: 0 0 10px var(--team);
}

.over__name {
  flex: 1 1 auto;
  min-width: 0;
  text-align: start;
  font-family: var(--font-display);
  font-size: clamp(0.95rem, 2vw, 1.25rem);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.over__rounds {
  flex: none;
  font-size: clamp(0.7rem, 1.4vw, 0.85rem);
  color: rgba(255, 247, 234, 0.6);
  white-space: nowrap;
}

.over__score {
  font-family: var(--font-display);
  font-size: clamp(1.2rem, 3vw, 1.9rem);
  font-variant-numeric: tabular-nums;
  color: #fff;
}

.over__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.6rem;
  margin-top: 0.8rem;
}

@keyframes spin {
  to {
    rotate: 360deg;
  }
}

@keyframes trophy-in {
  0% {
    opacity: 0;
    scale: 0.2;
    rotate: -25deg;
  }
  100% {
    opacity: 1;
    scale: 1;
    rotate: 0deg;
  }
}

@keyframes winner-in {
  0% {
    opacity: 0;
    scale: 0.6;
  }
  100% {
    opacity: 1;
    scale: 1;
  }
}

.curtain-enter-active,
.curtain-leave-active {
  transition: opacity 0.3s ease;
}

.curtain-enter-active .over__card,
.curtain-leave-active .over__card {
  transition: transform 0.45s cubic-bezier(0.2, 1.3, 0.35, 1);
}

.curtain-enter-from,
.curtain-leave-to {
  opacity: 0;
}

.curtain-enter-from .over__card,
.curtain-leave-to .over__card {
  transform: scale(0.8) translateY(30px);
}
</style>
