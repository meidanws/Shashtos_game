<script setup lang="ts">
import { computed } from "vue";
import yamitFull from "@/assets/brand/yamit-logo.png";
import yamitFace from "@/assets/brand/yamit-mark.png";

/**
 * `mark` picks which version of the גן ימית logo to show:
 * "full"  – the round badge including the גן ימית caption (needs room to read)
 * "face"  – the character on her own, for small spots where the caption
 *           would be illegible anyway
 */
const props = withDefaults(
  defineProps<{
    size?: "sm" | "lg";
    mark?: "full" | "face";
    /** Render as a real button. The heading becomes a span so the markup stays valid. */
    tappable?: boolean;
    tappableLabel?: string;
  }>(),
  { size: "sm", mark: "full", tappable: false, tappableLabel: undefined },
);

const badge = computed(() => (props.mark === "face" ? yamitFace : yamitFull));
const root = computed(() => (props.tappable ? "button" : "div"));
const wordTag = computed(() => (props.tappable ? "span" : "h1"));
</script>

<template>
  <component
    :is="root"
    class="logo"
    :class="[
      `logo--${size}`,
      `logo--mark-${mark}`,
      { 'logo--tappable': tappable },
    ]"
    :type="tappable ? 'button' : undefined"
    :aria-label="tappable ? tappableLabel : undefined"
  >
    <img class="logo__badge" :src="badge" alt="גן ימית" />

    <div class="logo__words">
      <svg
        class="logo__star logo__star--a"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          d="M12 0 l3 8 8 4 -8 4 -3 8 -3 -8 -8 -4 8 -4 Z"
          fill="currentColor"
        />
      </svg>
      <component :is="wordTag" class="logo__word">ששטוס</component>
      <p class="logo__sub">קיר הגורלות</p>
    </div>
  </component>
</template>

<style scoped>
.logo--tappable {
  padding: 0.25rem 0.4rem;
  border: none;
  background: none;
  border-radius: 14px;
  cursor: pointer;
  transition:
    scale 0.16s ease,
    background 0.2s ease;
}

.logo--tappable:hover {
  scale: 1.04;
  background: rgba(255, 255, 255, 0.07);
}

.logo--tappable:active {
  scale: 0.98;
}

.logo {
  display: flex;
  align-items: center;
  gap: clamp(0.5rem, 1vw, 0.9rem);
  text-align: center;
}

/* The character on her own: no ring, and free to keep her portrait
   proportions rather than being boxed into a square. */
.logo--mark-face .logo__badge {
  width: auto;
  height: calc(var(--badge-size, clamp(38px, 3.4vw, 54px)) * 1.5);
  background: none;
  border-radius: 0;
  object-fit: contain;
  box-shadow: none;
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.55));
}

/* the גן ימית badge, sitting beside the wordmark */
.logo__badge {
  flex: none;
  width: var(--badge-size, clamp(38px, 3.4vw, 54px));
  height: var(--badge-size, clamp(38px, 3.4vw, 54px));
  border-radius: 50%;
  object-fit: cover;
  background: #fff;
  box-shadow:
    0 0 0 2px var(--gold),
    0 0 0 4px rgba(26, 8, 54, 0.6),
    0 6px 16px rgba(0, 0, 0, 0.5);
}

.logo__words {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15em;
}

.logo__word {
  font-family: var(--font-display);
  font-size: var(--word-size, clamp(1.9rem, 4vw, 3.4rem));
  line-height: 0.95;
  letter-spacing: 0.02em;
  background: linear-gradient(
    180deg,
    #fff6cf 8%,
    var(--gold) 42%,
    #d78a06 72%,
    #fff0b8 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 2px 0 #6d4104) drop-shadow(0 5px 0 rgba(0, 0, 0, 0.35))
    drop-shadow(0 10px 20px rgba(0, 0, 0, 0.55));
  rotate: -1.5deg;
}

.logo__sub {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--sub-size, clamp(0.7rem, 1.2vw, 1rem));
  letter-spacing: 0.3em;
  padding-inline-start: 0.3em;
  color: var(--cyan);
  text-shadow:
    0 0 12px rgba(40, 224, 216, 0.7),
    0 2px 0 rgba(0, 0, 0, 0.4);
}

.logo--lg {
  --word-size: clamp(3rem, 9vw, 6.5rem);
  --sub-size: clamp(0.9rem, 2vw, 1.5rem);
  --badge-size: clamp(76px, 11vw, 140px);
  gap: clamp(0.8rem, 2vw, 1.6rem);
}

.logo__star {
  position: absolute;
  width: 1.1em;
  height: 1.1em;
  color: var(--magenta);
  font-size: var(--word-size, 2rem);
  filter: drop-shadow(0 0 10px rgba(255, 61, 158, 0.8));
  animation: sparkle 2.4s ease-in-out infinite;
}

.logo__star--a {
  inset-inline-end: -0.6em;
  top: -0.25em;
}

@keyframes sparkle {
  0%,
  100% {
    scale: 0.75;
    opacity: 0.6;
    rotate: 0deg;
  }
  50% {
    scale: 1.15;
    opacity: 1;
    rotate: 35deg;
  }
}
</style>
