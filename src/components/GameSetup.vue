<script setup lang="ts">
import { computed, ref } from "vue";
import { Disc3, Play, Volume2, VolumeX } from "lucide-vue-next";
import AppFooter from "./AppFooter.vue";
import ShatusLogo from "./ShatusLogo.vue";
import { useGameStore } from "@/stores/game";
import type { TeamId } from "@/game/types";

/** The ready-made colours, each with the team name it suggests. */
const PRESETS = [
  { color: "#2f7ff5", name: "כחולה" },
  { color: "#f0392b", name: "אדומה" },
  { color: "#2bbd62", name: "ירוקה" },
  { color: "#ffc62e", name: "צהובה" },
  { color: "#b14cf0", name: "סגולה" },
  { color: "#ff7a1a", name: "כתומה" },
  { color: "#20cfc6", name: "טורקיז" },
  { color: "#ff3d9e", name: "ורודה" },
];

/** The name a preset colour implies, or null for a custom colour. */
function autoNameFor(color: string): string | null {
  const preset = PRESETS.find((p) => p.color.toLowerCase() === color.toLowerCase());
  return preset ? `קבוצה ${preset.name}` : null;
}

const store = useGameStore();

const draft = ref({
  team1: { name: store.teams.team1.name, color: store.teams.team1.color },
  team2: { name: store.teams.team2.name, color: store.teams.team2.color },
});

/**
 * Whether each name was written by hand. A name that still matches what its
 * colour would have produced counts as untouched, so picking another preset
 * keeps renaming it; once it is edited, the colour stops touching it.
 */
const named = ref<Record<TeamId, boolean>>({
  team1: draft.value.team1.name !== autoNameFor(draft.value.team1.color),
  team2: draft.value.team2.name !== autoNameFor(draft.value.team2.color),
});

function onNameInput(key: TeamId, value: string): void {
  draft.value[key].name = value;
  // Clearing the field hands naming back to the colour swatches.
  named.value[key] = value.trim().length > 0;
}

/** Preset swatch: also renames the team, unless the name was typed by hand. */
function pickPreset(key: TeamId, color: string): void {
  draft.value[key].color = color;
  if (named.value[key]) return;
  draft.value[key].name = autoNameFor(color) ?? draft.value[key].name;
}

/** Custom colour: never renames the team. */
function pickCustomColor(key: TeamId, color: string): void {
  draft.value[key].color = color;
}

const sound = ref(store.soundEnabled);

/**
 * The music toggle takes effect on the spot rather than waiting for the game
 * to start — the whole point is hearing what you just switched on.
 */
const musicLabel = computed(() => {
  if (!store.musicAvailable) return "אין קובץ מוזיקה";
  return store.musicEnabled ? "מוזיקת רקע פועלת" : "מוזיקת רקע כבויה";
});

const sameColor = computed(
  () =>
    draft.value.team1.color.toLowerCase() ===
    draft.value.team2.color.toLowerCase(),
);

function start(): void {
  store.setSound(sound.value);
  store.startGame({
    team1: { ...draft.value.team1 },
    team2: { ...draft.value.team2 },
    soundEnabled: sound.value,
  });
}

const LABELS: Record<TeamId, string> = {
  team1: "קבוצה ראשונה",
  team2: "קבוצה שנייה",
};
const TEAM_KEYS: TeamId[] = ["team1", "team2"];
</script>

<template>
  <div class="setup">
    <ShatusLogo size="lg" class="setup__logo" />

    <p class="setup__tagline">
      בחרו שמות, בחרו צבעים - ובואו נראה מה מסתתר מאחורי הקוביות
    </p>

    <form class="setup__form" @submit.prevent="start">
      <div class="setup__teams">
        <fieldset
          v-for="key in TEAM_KEYS"
          :key="key"
          class="team-setup"
          :style="{ '--team': draft[key].color }"
        >
          <legend class="team-setup__legend">{{ LABELS[key] }}</legend>

          <svg
            class="team-setup__bandana"
            viewBox="0 0 60 48"
            aria-hidden="true"
          >
            <g
              stroke="rgba(20,6,48,0.6)"
              stroke-width="2.4"
              stroke-linejoin="round"
            >
              <path
                d="M3 3 h48 c-3 15 -15 26 -29 31 C10 27 4 15 3 3 Z"
                fill="var(--team)"
              />
              <path
                d="M9 19 c6 10 15 15 13 15 -8 -2 -16 -7 -19 -15 Z"
                fill="color-mix(in srgb, var(--team) 58%, #000)"
                stroke="none"
              />
              <path
                d="M28 36 l26 10"
                stroke="var(--team)"
                stroke-width="7"
                stroke-linecap="round"
              />
              <path
                d="M28 36 l20 -2"
                stroke="var(--team)"
                stroke-width="6"
                stroke-linecap="round"
              />
              <circle
                cx="24"
                cy="33"
                r="9"
                fill="color-mix(in srgb, var(--team) 85%, #fff)"
              />
            </g>
          </svg>

          <label class="field">
            <span class="field__label">שם הקבוצה</span>
            <input
              :value="draft[key].name"
              class="field__input"
              type="text"
              maxlength="24"
              placeholder="שם הקבוצה"
              @input="onNameInput(key, ($event.target as HTMLInputElement).value)"
            />
          </label>

          <div class="field">
            <span class="field__label">צבע הבנדנה</span>
            <div class="colors">
              <button
                v-for="preset in PRESETS"
                :key="preset.color"
                type="button"
                class="colors__swatch"
                :class="{
                  'is-picked': draft[key].color.toLowerCase() === preset.color,
                }"
                :style="{ background: preset.color }"
                :aria-label="`קבוצה ${preset.name}`"
                :title="`קבוצה ${preset.name}`"
                @click="pickPreset(key, preset.color)"
              ></button>
              <input
                :value="draft[key].color"
                class="colors__custom"
                type="color"
                aria-label="צבע מותאם אישית"
                @input="pickCustomColor(key, ($event.target as HTMLInputElement).value)"
              />
            </div>
          </div>
        </fieldset>
      </div>

      <p v-if="sameColor" class="setup__warning">
        שתי הקבוצות בחרו באותו צבע — כדאי לבחור צבעים שונים כדי להבדיל בין
        הבנדנות.
      </p>

      <p class="setup__note">
        משחקים כמה סיבובים שרוצים — בסוף לוחצים על ״סיום ופתיחת הקוביות״ וחושפים מה הסתתר מאחורי
        כל אחת.
      </p>

      <div class="setup__footer">
        <button type="button" class="sound-toggle" @click="sound = !sound">
          <component :is="sound ? Volume2 : VolumeX" :size="19" />
          <span>{{
            sound ? "אפקטים קוליים פועלים" : "אפקטים קוליים כבויים"
          }}</span>
        </button>

        <button
          v-if="store.musicAvailable"
          type="button"
          class="sound-toggle"
          @click="store.toggleMusic()"
        >
          <Disc3 :size="19" :class="{ 'disc--spin': store.musicEnabled }" />
          <span>{{ musicLabel }}</span>
        </button>

        <button type="submit" class="pill-button setup__start">
          <Play :size="22" fill="currentColor" />
          מתחילים!
        </button>
      </div>
    </form>

    <AppFooter />
  </div>
</template>

<style scoped>
.setup {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(0.8rem, 2vw, 1.6rem);
  padding: clamp(1.5rem, 4vw, 3rem) 1rem;
  padding-block-start: max(
    clamp(1.5rem, 4vw, 3rem),
    env(safe-area-inset-top, 0px)
  );
  text-align: center;
}

.setup__logo {
  animation: drop-in 0.7s cubic-bezier(0.2, 1.3, 0.35, 1) both;
}

.setup__tagline {
  max-width: 34ch;
  margin: 0;
  font-size: clamp(0.9rem, 1.7vw, 1.15rem);
  line-height: 1.6;
  color: rgba(255, 247, 234, 0.76);
}

.setup__form {
  width: min(94vw, 880px);
  display: flex;
  flex-direction: column;
  gap: clamp(0.9rem, 2vw, 1.4rem);
}

.setup__teams {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: clamp(0.8rem, 2vw, 1.4rem);
}

.team-setup {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  margin: 0;
  padding: clamp(1.1rem, 2.4vw, 1.6rem);
  border: 2px solid color-mix(in srgb, var(--team) 65%, #1d0945);
  border-radius: var(--radius-lg);
  background: linear-gradient(
    165deg,
    color-mix(in srgb, var(--team) 26%, rgba(29, 9, 69, 0.95)),
    rgba(17, 5, 42, 0.96)
  );
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.16),
    0 16px 36px rgba(0, 0, 0, 0.5),
    0 0 26px color-mix(in srgb, var(--team) 30%, transparent);
  transition: border-color 0.3s ease;
}

.team-setup__legend {
  padding: 0.2em 0.9em;
  font-family: var(--font-display);
  font-size: 0.95rem;
  color: #2a1150;
  background: linear-gradient(180deg, var(--gold-light), var(--gold));
  border-radius: 999px;
  box-shadow: 0 3px 0 var(--gold-shadow);
}

.team-setup__bandana {
  width: clamp(52px, 6vw, 70px);
  height: auto;
  align-self: center;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5));
  animation: sway-soft 3.4s ease-in-out infinite alternate;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  text-align: start;
}

.field__label {
  font-size: 0.8rem;
  letter-spacing: 0.05em;
  color: rgba(255, 247, 234, 0.66);
}

.field__input {
  width: 100%;
  padding: 0.65em 0.85em;
  font-size: 1rem;
  color: var(--cream);
  background: rgba(0, 0, 0, 0.32);
  border: 2px solid color-mix(in srgb, var(--team) 55%, transparent);
  border-radius: 12px;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.field__input::placeholder {
  color: rgba(255, 247, 234, 0.35);
}

.field__input:focus {
  outline: none;
  border-color: var(--team);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--team) 35%, transparent);
}

.colors {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.colors__swatch {
  width: 30px;
  height: 30px;
  padding: 0;
  border: 2px solid rgba(255, 255, 255, 0.25);
  border-radius: 9px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4);
  transition:
    transform 0.15s ease,
    border-color 0.15s ease;
}

.colors__swatch:hover {
  transform: translateY(-2px) scale(1.08);
}

.colors__swatch.is-picked {
  border-color: #fff;
  transform: translateY(-2px) scale(1.12);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.5),
    0 0 0 3px rgba(255, 255, 255, 0.28);
}

.colors__custom {
  width: 30px;
  height: 30px;
  padding: 0;
  border: 2px dashed rgba(255, 255, 255, 0.4);
  border-radius: 9px;
  background: transparent;
  cursor: pointer;
}

.colors__custom::-webkit-color-swatch-wrapper {
  padding: 2px;
}
.colors__custom::-webkit-color-swatch {
  border: none;
  border-radius: 5px;
}
.colors__custom::-moz-color-swatch {
  border: none;
  border-radius: 5px;
}

.setup__warning {
  margin: 0;
  font-size: 0.85rem;
  color: #ffd9a8;
}

.setup__note {
  margin: 0;
  max-width: 52ch;
  margin-inline: auto;
  font-size: clamp(0.8rem, 1.3vw, 0.95rem);
  line-height: 1.6;
  color: rgba(255, 247, 234, 0.6);
}

.setup__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.sound-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6em 1.1em;
  font-size: 0.88rem;
  color: var(--cream);
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
}

.sound-toggle:hover {
  background: rgba(255, 255, 255, 0.14);
}

/* The record turns while the theme is playing. */
.disc--spin {
  animation: disc-spin 3.4s linear infinite;
}

@keyframes disc-spin {
  to {
    rotate: 360deg;
  }
}

@media (prefers-reduced-motion: reduce) {
  .disc--spin {
    animation: none;
  }
}

.setup__start {
  font-size: clamp(1.1rem, 2.2vw, 1.5rem);
  padding: 0.75em 2.2em;
}

@keyframes drop-in {
  0% {
    opacity: 0;
    translate: 0 -40px;
    scale: 0.8;
  }
  100% {
    opacity: 1;
    translate: 0 0;
    scale: 1;
  }
}

@keyframes sway-soft {
  from {
    rotate: -6deg;
  }
  to {
    rotate: 6deg;
  }
}
</style>
