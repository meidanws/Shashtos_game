<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { RotateCcw, Settings, Undo2, Users, Volume2, VolumeX, X } from 'lucide-vue-next'
import ConfirmationDialog from './ConfirmationDialog.vue'
import { useGameStore } from '@/stores/game'
import { TEAM_IDS, type TeamId } from '@/game/types'

const store = useGameStore()

const open = ref(false)
const pendingAction = ref<'restart' | 'setup' | null>(null)
const root = ref<HTMLElement | null>(null)

function toggle(): void {
  open.value = !open.value
}

function close(): void {
  open.value = false
}

function onDocumentPointerDown(event: PointerEvent): void {
  if (!open.value) return
  if (root.value && !root.value.contains(event.target as Node)) close()
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && open.value && pendingAction.value === null) close()
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown)
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  window.removeEventListener('keydown', onKeydown)
})

function onName(id: TeamId, event: Event): void {
  store.updateTeam(id, { name: (event.target as HTMLInputElement).value })
}

function onColor(id: TeamId, event: Event): void {
  store.updateTeam(id, { color: (event.target as HTMLInputElement).value })
}

function undo(): void {
  store.undo()
}

function confirmPending(): void {
  if (pendingAction.value === 'restart') store.restartGame()
  if (pendingAction.value === 'setup') store.backToSetup()
  pendingAction.value = null
  close()
}
</script>

<template>
  <div ref="root" class="settings">
    <button
      type="button"
      class="settings__trigger"
      :class="{ 'is-open': open }"
      :aria-expanded="open"
      aria-haspopup="dialog"
      aria-label="הגדרות משחק"
      @click="toggle"
    >
      <component :is="open ? X : Settings" :size="22" :stroke-width="2.4" />
    </button>

    <Transition name="pop">
      <div v-if="open" class="settings__panel panel" role="dialog" aria-label="הגדרות משחק">
        <h2 class="settings__title">הגדרות</h2>

        <div class="settings__group">
          <div v-for="id in TEAM_IDS" :key="id" class="team-row" :style="{ '--team': store.teams[id].color }">
            <input
              class="team-row__color"
              type="color"
              :value="store.teams[id].color"
              :aria-label="`צבע ${store.teams[id].name}`"
              @input="onColor(id, $event)"
            />
            <input
              class="team-row__name"
              type="text"
              maxlength="24"
              :value="store.teams[id].name"
              :aria-label="`שם ${id === 'team1' ? 'קבוצה 1' : 'קבוצה 2'}`"
              @input="onName(id, $event)"
            />
          </div>
        </div>

        <button type="button" class="row-button" @click="store.toggleSound()">
          <component :is="store.soundEnabled ? Volume2 : VolumeX" :size="19" />
          <span>{{ store.soundEnabled ? 'אפקטים קוליים פועלים' : 'אפקטים קוליים כבויים' }}</span>
          <span class="switch" :class="{ 'switch--on': store.soundEnabled }" aria-hidden="true"></span>
        </button>

        <button type="button" class="row-button" :disabled="!store.canUndo" @click="undo">
          <Undo2 :size="19" />
          <span>בטל בחירה אחרונה</span>
        </button>

        <button type="button" class="row-button" @click="pendingAction = 'restart'">
          <RotateCcw :size="19" />
          <span>משחק חדש (אותן קבוצות)</span>
        </button>

        <button type="button" class="row-button" @click="pendingAction = 'setup'">
          <Users :size="19" />
          <span>הגדרת קבוצות מחדש</span>
        </button>
      </div>
    </Transition>

    <ConfirmationDialog
      :open="pendingAction !== null"
      :title="pendingAction === 'setup' ? 'לחזור למסך ההגדרות?' : 'להתחיל משחק חדש?'"
      message="הניקוד הנוכחי יימחק והקוביות יעורבבו מחדש. אי אפשר לבטל את הפעולה הזו."
      confirm-label="כן, להתחיל מחדש"
      tone="danger"
      @confirm="confirmPending"
      @cancel="pendingAction = null"
    />
  </div>
</template>

<style scoped>
.settings {
  position: relative;
}

.settings__trigger {
  display: grid;
  place-items: center;
  width: clamp(40px, 3.4vw, 50px);
  aspect-ratio: 1;
  border: 2px solid rgba(255, 198, 46, 0.5);
  border-radius: 50%;
  color: var(--gold);
  background: rgba(29, 9, 69, 0.85);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    0 6px 16px rgba(0, 0, 0, 0.5);
  transition:
    rotate 0.3s ease,
    background 0.2s ease,
    color 0.2s ease;
}

.settings__trigger:hover,
.settings__trigger.is-open {
  rotate: 45deg;
  background: var(--gold);
  color: #2a1150;
}

.settings__trigger.is-open {
  rotate: 0deg;
}

.settings__panel {
  position: absolute;
  top: calc(100% + 0.7rem);
  inset-inline-end: 0;
  z-index: 50;
  width: min(86vw, 310px);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.settings__title {
  font-size: 1.1rem;
  color: var(--gold);
  margin-bottom: 0.2rem;
}

.settings__group {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.team-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.team-row__color {
  flex: none;
  width: 38px;
  height: 38px;
  padding: 0;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 10px;
  background: transparent;
  cursor: pointer;
}

.team-row__color::-webkit-color-swatch-wrapper {
  padding: 2px;
}
.team-row__color::-webkit-color-swatch {
  border: none;
  border-radius: 6px;
}
.team-row__color::-moz-color-swatch {
  border: none;
  border-radius: 6px;
}

.team-row__name {
  flex: 1 1 auto;
  min-width: 0;
  padding: 0.5em 0.7em;
  font-size: 0.95rem;
  color: var(--cream);
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid color-mix(in srgb, var(--team) 60%, transparent);
  border-radius: 10px;
}

.team-row__name:focus {
  outline: none;
  border-color: var(--team);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--team) 35%, transparent);
}

.row-button {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.6em 0.75em;
  font-size: 0.9rem;
  text-align: start;
  color: var(--cream);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  transition: background 0.15s ease;
}

.row-button span:first-of-type {
  flex: 1 1 auto;
}

.row-button:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.14);
}

.row-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.switch {
  flex: none;
  width: 34px;
  height: 19px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
  position: relative;
  transition: background 0.2s ease;
}

.switch::after {
  content: '';
  position: absolute;
  top: 2px;
  inset-inline-start: 2px;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background: #fff;
  transition: translate 0.2s ease;
}

.switch--on {
  background: var(--cyan);
}

.switch--on::after {
  translate: 15px 0;
}

:global([dir='rtl']) .switch--on::after {
  translate: -15px 0;
}

.pop-enter-active,
.pop-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
  transform-origin: top left;
}

:global([dir='rtl']) .pop-enter-active,
:global([dir='rtl']) .pop-leave-active {
  transform-origin: top right;
}

.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(-8px);
}
</style>
