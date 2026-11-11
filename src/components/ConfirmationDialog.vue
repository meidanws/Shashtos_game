<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    message?: string
    confirmLabel?: string
    cancelLabel?: string
    tone?: 'default' | 'danger'
  }>(),
  {
    message: undefined,
    confirmLabel: 'אישור',
    cancelLabel: 'ביטול',
    tone: 'default',
  },
)

const emit = defineEmits<{ confirm: []; cancel: [] }>()

const confirmButton = ref<HTMLButtonElement | null>(null)

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    await nextTick()
    confirmButton.value?.focus()
  },
)

function onKeydown(event: KeyboardEvent): void {
  if (props.open && event.key === 'Escape') {
    event.stopPropagation()
    emit('cancel')
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div
        v-if="open"
        class="overlay"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
      >
        <div class="overlay__scrim" @click="emit('cancel')"></div>
        <div class="dialog panel">
          <h2 class="dialog__title">{{ title }}</h2>
          <p v-if="message" class="dialog__message">{{ message }}</p>
          <div class="dialog__actions">
            <button
              ref="confirmButton"
              type="button"
              class="pill-button"
              :class="{ 'pill-button--danger': tone === 'danger' }"
              @click="emit('confirm')"
            >
              {{ confirmLabel }}
            </button>
            <button type="button" class="pill-button pill-button--ghost" @click="emit('cancel')">
              {{ cancelLabel }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 1rem;
}

.overlay__scrim {
  position: absolute;
  inset: 0;
  background: rgba(6, 2, 20, 0.72);
  backdrop-filter: blur(4px);
}

.dialog {
  position: relative;
  width: min(92vw, 430px);
  padding: clamp(1.4rem, 3vw, 2rem);
  text-align: center;
}

.dialog__title {
  font-size: clamp(1.3rem, 2.6vw, 1.8rem);
  color: var(--gold);
  text-shadow: 0 2px 0 rgba(0, 0, 0, 0.4);
}

.dialog__message {
  margin: 0.8em 0 0;
  font-size: clamp(0.9rem, 1.4vw, 1.05rem);
  line-height: 1.6;
  color: rgba(255, 247, 234, 0.82);
}

.dialog__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.7rem;
  margin-top: 1.5rem;
}

.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.2s ease;
}

.dialog-enter-active .dialog,
.dialog-leave-active .dialog {
  transition:
    transform 0.26s cubic-bezier(0.2, 1.4, 0.4, 1),
    opacity 0.2s ease;
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

.dialog-enter-from .dialog,
.dialog-leave-to .dialog {
  transform: scale(0.88) translateY(14px);
  opacity: 0;
}
</style>
