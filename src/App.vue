<script setup lang="ts">
import GameScreen from './components/GameScreen.vue'
import GameSetup from './components/GameSetup.vue'
import StageBackdrop from './components/StageBackdrop.vue'
import { useGameStore } from './stores/game'

const store = useGameStore()
</script>

<template>
  <StageBackdrop />
  <Transition name="stage" mode="out-in">
    <GameSetup v-if="store.phase === 'setup'" key="setup" />
    <GameScreen v-else key="game" />
  </Transition>
</template>

<style scoped>
.stage-enter-active,
.stage-leave-active {
  transition:
    opacity 0.35s ease,
    transform 0.35s ease;
}

.stage-enter-from {
  opacity: 0;
  transform: scale(0.97);
}

.stage-leave-to {
  opacity: 0;
  transform: scale(1.03);
}
</style>
