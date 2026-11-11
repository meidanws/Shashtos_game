<script setup lang="ts">
import { Heart } from "lucide-vue-next";
</script>

<template>
  <footer class="credit">
    <span>Made with</span>
    <Heart
      class="credit__heart"
      :size="13"
      fill="currentColor"
      aria-label="love"
    />
    <span>by Weiss family</span>
  </footer>
</template>

<style scoped>
.credit {
  display: flex;
  align-items: center;
  justify-content: center;
  /* English line inside an RTL page: without this the words lay out
     right-to-left and read as "by Weiss family ... Made with". */
  direction: ltr;
  gap: 0.35em;
  padding-block: 0.4rem;
  font-size: clamp(0.62rem, 0.9vw, 0.78rem);
  letter-spacing: 0.06em;
  color: rgba(255, 247, 234, 0.45);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
  user-select: none;
}

.credit__heart {
  color: var(--magenta);
  filter: drop-shadow(0 0 6px rgba(255, 61, 158, 0.7));
  animation: beat 1.8s ease-in-out infinite;
}

@keyframes beat {
  0%,
  100% {
    scale: 1;
  }
  15% {
    scale: 1.25;
  }
  30% {
    scale: 1;
  }
  45% {
    scale: 1.18;
  }
  60% {
    scale: 1;
  }
}
</style>
