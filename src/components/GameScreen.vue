<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Sparkles, Trophy } from 'lucide-vue-next'
import AppFooter from './AppFooter.vue'
import ConfettiCanvas from './ConfettiCanvas.vue'
import ConfirmationDialog from './ConfirmationDialog.vue'
import FinalScores from './FinalScores.vue'
import GameOverModal from './GameOverModal.vue'
import GameWall from './GameWall.vue'
import LiveTally from './LiveTally.vue'
import RevealControls from './RevealControls.vue'
import RoundControls from './RoundControls.vue'
import SettingsMenu from './SettingsMenu.vue'
import ShatusLogo from './ShatusLogo.vue'
import { playSound } from '@/game/audio'
import { useGameStore } from '@/stores/game'

const store = useGameStore()

const confetti = ref<InstanceType<typeof ConfettiCanvas> | null>(null)
const resultsOpen = ref(false)
const homeConfirmOpen = ref(false)
const finishConfirmOpen = ref(false)

let finaleTimer: ReturnType<typeof setTimeout> | undefined

function cubeOrigin(cubeId: number): { x: number; y: number } {
  const el = document.querySelector<HTMLElement>(`[data-cube-id="${cubeId}"]`)
  if (!el) return { x: 0.5, y: 0.5 }
  const rect = el.getBoundingClientRect()
  return {
    x: (rect.left + rect.width / 2) / window.innerWidth,
    y: (rect.top + rect.height / 2) / window.innerHeight,
  }
}

function celebrate(withSound: boolean): void {
  const colors =
    store.winner.kind === 'win'
      ? [store.teams[store.winner.teamId].color, '#ffc62e', '#fff2b8', '#ffffff']
      : ['#ffc62e', '#28e0d8', '#ff3d9e', '#fff2b8']

  confetti.value?.burst({ count: 180, colors, origin: { x: 0.5, y: 0.5 }, power: 18 })
  confetti.value?.shower(colors)
  if (withSound) playSound(store.winner.kind === 'tie' ? 'tie' : 'win')
}

// A small puff of the team's colour as a cube is taken.
watch(
  () => store.lastClaim,
  (claim) => {
    if (!claim) return
    confetti.value?.burst({
      count: 26,
      colors: [store.teamColor(claim.teamId), '#ffc62e', '#fff2b8'],
      origin: cubeOrigin(claim.cubeId),
      power: 8,
    })
  },
)

// A gold shower for the jackpot as its face comes round.
watch(
  () => store.lastReveal,
  (event) => {
    if (!event || !event.claimed || event.score !== 500) return
    confetti.value?.burst({
      count: 70,
      colors: ['#ffc62e', '#fff2b8', '#ffffff', '#ff3d9e'],
      origin: cubeOrigin(event.cubeId),
      power: 13,
    })
  },
)

// Once the last cube has been turned over, total up and crown the winner.
watch(
  () => store.revealFinished,
  (finished) => {
    if (finaleTimer) clearTimeout(finaleTimer)
    if (!finished) {
      resultsOpen.value = false
      return
    }
    finaleTimer = setTimeout(() => {
      resultsOpen.value = true
      celebrate(true)
    }, 250)
  },
)

onMounted(() => {
  // Returning to an already-opened wall: show the result without the fanfare.
  if (store.revealFinished) resultsOpen.value = true
})

onBeforeUnmount(() => {
  if (finaleTimer) clearTimeout(finaleTimer)
})

/** How many cubes the game never reached, for the confirmation copy. */
const untouched = computed(() => store.remaining)

/** The running tally runs alongside the wall until the final result is in. */
const showTally = computed(() => store.isRevealStage && !store.revealFinished)

function askFinish(): void {
  // Nothing is lost when the wall is already full — just open it.
  if (store.wallFull) store.finishGame()
  else finishConfirmOpen.value = true
}

function confirmFinish(): void {
  finishConfirmOpen.value = false
  store.finishGame()
}

function onNewGame(): void {
  resultsOpen.value = false
  store.restartGame()
}

function onChangeTeams(): void {
  resultsOpen.value = false
  store.backToSetup()
}

/** Tapping the logo goes back to setup, with the same confirmation as the menu. */
function goHome(): void {
  homeConfirmOpen.value = false
  resultsOpen.value = false
  store.backToSetup()
}
</script>

<template>
  <div class="screen">
    <header class="screen__bar">
      <ShatusLogo
        class="screen__logo"
        tappable
        tappable-label="חזרה למסך ההגדרות"
        @click="homeConfirmOpen = true"
      />

      <div class="screen__center">
        <FinalScores v-if="store.revealFinished" />
        <RevealControls v-else-if="store.isRevealStage" />
        <RoundControls v-else @finish="askFinish" />
      </div>

      <div class="screen__tools">
        <p v-if="!store.isRevealStage" class="screen__remaining">
          <strong class="num">{{ store.claimedCount }}</strong>
          <span>סיבובים</span>
        </p>

        <!-- the game ends whenever the family decides it has -->
        <button
          v-if="store.canFinish && !store.wallFull"
          type="button"
          class="screen__finish"
          title="סיום משחק ופתיחת הקוביות"
          aria-label="סיום משחק ופתיחת הקוביות"
          @click="askFinish"
        >
          <Sparkles :size="17" />
          <span class="screen__finish-label">סיום ופתיחת הקוביות</span>
        </button>

        <button
          v-if="store.revealFinished && !resultsOpen"
          type="button"
          class="screen__results"
          @click="resultsOpen = true"
        >
          <Trophy :size="18" />
          <span>תוצאות</span>
        </button>
        <SettingsMenu />
      </div>
    </header>

    <main class="screen__main" :class="{ 'screen__main--rail': showTally }">
      <LiveTally v-if="showTally" class="screen__tally" />
      <GameWall />
    </main>

    <AppFooter />

    <GameOverModal
      :open="resultsOpen"
      @new-game="onNewGame"
      @change-teams="onChangeTeams"
      @dismiss="resultsOpen = false"
    />

    <ConfirmationDialog
      :open="finishConfirmOpen"
      title="לסיים את המשחק?"
      :message="`שיחקתם ${store.claimedCount} סיבובים. ${untouched} קוביות לא נבחרו ולא ייספרו, ואי אפשר יהיה להוסיף עוד סיבובים.`"
      confirm-label="כן, לפתוח את הקוביות"
      @confirm="confirmFinish"
      @cancel="finishConfirmOpen = false"
    />

    <ConfirmationDialog
      :open="homeConfirmOpen"
      title="לחזור למסך ההגדרות?"
      message="הניקוד הנוכחי יימחק והקוביות יעורבבו מחדש. אי אפשר לבטל את הפעולה הזו."
      confirm-label="כן, לחזור להגדרות"
      tone="danger"
      @confirm="goHome"
      @cancel="homeConfirmOpen = false"
    />

    <ConfettiCanvas ref="confetti" />
  </div>
</template>

<style scoped>
.screen {
  position: relative;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  gap: clamp(0.5rem, 1.2vw, 1rem);
  padding: clamp(0.5rem, 1.1vw, 0.9rem) clamp(0.6rem, 1.6vw, 1.4rem) clamp(0.7rem, 1.6vw, 1.2rem);
  padding-block-start: max(clamp(0.5rem, 1.1vw, 0.9rem), env(safe-area-inset-top, 0px));
  padding-block-end: max(clamp(0.7rem, 1.6vw, 1.2rem), env(safe-area-inset-bottom, 0px));
  /* past this the logo and the tools are simply flung to opposite corners of
     the room; the wall stays centred either way */
  max-width: 2600px;
  margin-inline: auto;
}

.screen__bar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 1rem;
}

.screen__logo {
  justify-self: start;
  --word-size: clamp(1.4rem, 2.4vw, 2.9rem);
  --sub-size: clamp(0.5rem, 0.8vw, 0.9rem);
  /* big enough that the גן ימית caption on the badge stays readable */
  --badge-size: clamp(60px, 5.4vw, 100px);
}

.screen__center {
  display: flex;
  justify-content: center;
}

.screen__tools {
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

.screen__remaining {
  display: flex;
  align-items: baseline;
  gap: 0.35em;
  margin: 0;
  font-size: clamp(0.65rem, 0.95vw, 1.1rem);
  letter-spacing: 0.05em;
  color: rgba(255, 247, 234, 0.65);
  white-space: nowrap;
}

.screen__remaining strong {
  font-family: var(--font-display);
  font-size: clamp(1.1rem, 1.8vw, 2.3rem);
  color: var(--gold);
  text-shadow: 0 0 14px rgba(255, 198, 46, 0.6);
}

/* Quieter than the gold call-to-action in the middle: it is always there,
   waiting for the family to decide they have played enough. */
.screen__finish {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5em 1em;
  font-family: var(--font-display);
  font-size: clamp(0.75rem, 1.1vw, 1.3rem);
  color: var(--gold-light);
  background: rgba(29, 9, 69, 0.85);
  border: 2px solid rgba(255, 198, 46, 0.45);
  border-radius: 999px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.45);
  white-space: nowrap;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease;
}

.screen__finish:hover {
  color: #2a1150;
  background: linear-gradient(180deg, var(--gold-light), var(--gold));
  border-color: var(--gold);
}

.screen__results {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5em 1em;
  font-family: var(--font-display);
  font-size: clamp(0.85rem, 1vw, 1.2rem);
  color: #2a1150;
  background: linear-gradient(180deg, var(--gold-light), var(--gold));
  border: none;
  border-radius: 999px;
  box-shadow:
    0 4px 0 var(--gold-shadow),
    0 8px 18px rgba(0, 0, 0, 0.45);
  white-space: nowrap;
}

.screen__results:hover {
  filter: brightness(1.07);
}

.screen__main {
  position: relative;
  flex: 1 1 auto;
  display: grid;
  place-items: center;
}

/* Below this the gutter beside the wall is too thin for a rail, so the tally
   rides along in the top bar instead (see RevealControls). */
.screen__tally {
  display: none;
}

@media (min-width: 1001px) {
  .screen__main--rail {
    --rail-w: clamp(140px, 12.5vw, 200px);
    /* keep the wall clear of the rail on both sides, so it stays centred */
    --wall-cap: calc(100% - 2 * (var(--rail-w) + clamp(10px, 2vw, 30px)));
  }

  .screen__main--rail .screen__tally {
    display: flex;
    position: absolute;
    inset-inline-start: clamp(4px, 1.2vw, 26px);
    top: 50%;
    translate: 0 -50%;
    width: var(--rail-w);
    animation: rail-in 0.45s cubic-bezier(0.2, 1.3, 0.4, 1) both;
  }
}

@keyframes rail-in {
  from {
    opacity: 0;
    scale: 0.88;
  }
  to {
    opacity: 1;
    scale: 1;
  }
}

@media (max-width: 1000px) {
  /* the icon alone, with the full wording left to its tooltip/aria-label */
  .screen__finish-label {
    display: none;
  }

  .screen__finish {
    display: grid;
    place-items: center;
    padding: 0;
    min-width: 44px;
  }
}

/* Touch input, whatever the screen width: every control the game is actually
   driven by gets a 44px target, which is what a fingertip needs. */
@media (pointer: coarse) {
  .screen__finish,
  .screen__results {
    min-height: 44px;
  }
}

@media (max-width: 860px) {
  .screen__bar {
    grid-template-columns: auto 1fr;
    row-gap: 0.5rem;
  }

  .screen__center {
    grid-column: 1 / -1;
    grid-row: 2;
  }

  .screen__tools {
    justify-self: end;
  }
}

/* Sideways phone: the two-row bar above costs height the wall needs, and at
   this width there is plenty of room to put it back on a single row. */
@media (max-height: 560px) and (orientation: landscape) {
  .screen {
    gap: 0.3rem;
  }

  .screen__bar {
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    row-gap: 0;
  }

  .screen__center {
    grid-column: auto;
    grid-row: auto;
  }

  .screen__logo {
    --word-size: 1.1rem;
    --badge-size: 44px;
  }
}
</style>
