<script setup lang="ts">
import { computed } from 'vue'
import BandanaMark from './BandanaMark.vue'
import { getCharacter } from '@/game/characters'
import { getCharacterImage } from '@/game/characterImages'
import type { Cube } from '@/game/types'

const props = defineProps<{
  cube: Cube
  index: number
  /** Can this cube be taken right now? */
  selectable: boolean
  /** The game is over and this cube is still face down — tap to turn it over. */
  revealable: boolean
  /** The game is over and nobody ever picked this one: it stays shut. */
  outOfPlay: boolean
  /** Turned over: showing the score, or that it was never played for. */
  flipped: boolean
  teamColor: string | null
  teamName: string | null
  /** Colour of the team waiting to pick, for the hover glow. */
  highlight: string | null
  /** True for the short window right after this cube was taken. */
  justClaimed: boolean
  /** Still up for grabs, but no round winner has been named yet. */
  blocked: boolean
}>()

const emit = defineEmits<{ pick: [cubeId: number]; reveal: [cubeId: number]; blocked: [] }>()

const BLOCKED_HINT = 'בחרו קודם את הקבוצה שניצחה בסיבוב'

function onClick(): void {
  if (props.selectable) emit('pick', props.cube.id)
  else if (props.revealable) emit('reveal', props.cube.id)
  else if (props.blocked) emit('blocked')
}

const character = computed(() => getCharacter(props.cube.characterId))
const photo = computed(() => getCharacterImage(props.cube.characterId))
const isClaimed = computed(() => props.cube.claimedBy !== null)

const tier = computed(() => {
  // A cube nobody played for never shows a score — it is simply out of play.
  if (!props.cube.claimedBy) return 'skipped'
  if (props.cube.score === 500) return 'jackpot'
  return props.cube.score < 0 ? 'negative' : 'positive'
})

const scoreLabel = computed(() =>
  props.cube.score > 0 ? `+${props.cube.score}` : `${props.cube.score}`,
)

const tagline = computed(() => {
  if (tier.value === 'jackpot') return "ג'קפוט!"
  if (tier.value === 'negative') return 'אוי לא...'
  return 'נקודות'
})

const ariaLabel = computed(() => {
  if (props.blocked) return `${character.value.name} — ${BLOCKED_HINT}`
  const who = isClaimed.value ? `שייכת ל${props.teamName}` : 'לא נבחרה'
  if (props.revealable) return `${character.value.name}, ${who} — לחצו כדי לגלות`
  if (props.outOfPlay) return `${character.value.name} — לא נבחרה במהלך המשחק`
  const score = props.flipped ? `, ${scoreLabel.value} נקודות` : ''
  return `${character.value.name} — ${isClaimed.value ? who : 'עדיין פנויה'}${score}`
})

const style = computed(() => ({
  '--tile-from': character.value.tileFrom,
  '--tile-to': character.value.tileTo,
  '--i': String(props.index),
  '--highlight': props.highlight ?? 'transparent',
}))
</script>

<template>
  <button
    type="button"
    class="cube"
    :class="[
      `cube--${tier}`,
      {
        'is-flipped': flipped,
        'is-claimed': isClaimed,
        'is-fresh': justClaimed,
        'is-open': selectable,
        'is-revealable': revealable,
        'is-out-of-play': outOfPlay,
        'is-blocked': blocked,
      },
    ]"
    :style="style"
    :data-cube-id="cube.id"
    :disabled="!selectable && !revealable && !blocked"
    :aria-label="ariaLabel"
    @click="onClick"
  >
    <span class="cube__lift">
      <span class="cube__inner">
        <!-- front: the character -->
        <span class="cube__face cube__face--front">
          <img v-if="photo" class="cube__photo" :src="photo" :alt="character.name" />
          <span v-else class="cube__noart">{{ character.name }}</span>
          <span class="cube__shade"></span>
          <span class="cube__gloss"></span>
        </span>

        <!-- back: the hidden score. Only a cube a team won is ever turned over. -->
        <span class="cube__face cube__face--back">
          <span class="cube__burst"></span>
          <span class="cube__score num">{{ scoreLabel }}</span>
          <span class="cube__tag">{{ tagline }}</span>
        </span>
      </span>
    </span>

    <!-- "tap me" badge while the wall is being opened -->
    <span v-if="revealable" class="cube__tap" aria-hidden="true">?</span>

    <span v-if="blocked" class="cube__tip" role="tooltip">{{ BLOCKED_HINT }}</span>

    <BandanaMark
      v-if="isClaimed && teamColor"
      :color="teamColor"
      :animate="justClaimed"
      :label="`הבנדנה של ${teamName}`"
    />
  </button>
</template>

<style scoped>
.cube {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  padding: 0;
  border: 0;
  background: none;
  perspective: 1400px;
  /* Everything inside a cube is sized from the cube's own width (cqw) rather
     than the viewport. The wall is height-driven, so on a wide screen — a
     projector worst of all — viewport units drift away from the real cube
     size and the artwork ends up shouting while the score whispers.
     Caveat: cqw written *here* would resolve against an ancestor container,
     never the cube itself, so --face-radius lives on .cube__lift below. */
  container-type: inline-size;
  --edge: color-mix(in srgb, var(--tile-to) 55%, #000);
}

.cube:disabled {
  cursor: default;
}

/* Up for grabs, but no round winner has been named yet. */
.cube.is-blocked {
  cursor: not-allowed;
}

/* `perspective` makes every cube its own stacking context, so a tooltip can
   never paint above a neighbouring cube from inside one. Lift the whole cube
   instead while it is showing its tooltip. */
.cube.is-blocked:hover,
.cube.is-blocked:focus-visible {
  z-index: 30;
}

.cube__tip {
  position: absolute;
  bottom: calc(100% + 10px);
  left: 50%;
  translate: -50% 4px;
  z-index: 20;
  padding: 0.45em 0.85em;
  font-size: clamp(0.7rem, 5cqw, 1.05rem);
  line-height: 1.3;
  white-space: nowrap;
  color: var(--ink);
  background: linear-gradient(180deg, var(--gold-light), var(--gold));
  border-radius: 10px;
  box-shadow:
    0 4px 0 var(--gold-shadow),
    0 10px 22px rgba(0, 0, 0, 0.55);
  opacity: 0;
  pointer-events: none;
  transition:
    opacity 0.16s ease,
    translate 0.16s ease;
}

.cube__tip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  translate: -50% -2px;
  border: 6px solid transparent;
  border-top-color: var(--gold);
}

.cube.is-blocked:hover .cube__tip,
.cube.is-blocked:focus-visible .cube__tip {
  opacity: 1;
  translate: -50% 0;
}

/* the top row has no space above it — flip the tooltip underneath */
.cube.is-blocked:nth-child(-n + 4) .cube__tip {
  bottom: auto;
  top: calc(100% + 10px);
}

.cube.is-blocked:nth-child(-n + 4) .cube__tip::after {
  top: auto;
  bottom: 100%;
  translate: -50% 2px;
  border-top-color: transparent;
  border-bottom-color: var(--gold);
}

.cube__lift {
  position: absolute;
  inset: 0;
  /* on .cube__lift, not .cube, so cqw measures the cube (see above) */
  --face-radius: clamp(8px, 7cqw, 30px);
  transform-style: preserve-3d;
  /* scale stays quick: it is also the press-and-hover feedback */
  transition:
    scale 0.16s ease,
    opacity 0.4s ease,
    filter 0.4s ease;
}

/* A slow idle bob while the cube is still up for grabs — and again while it is
   waiting to be turned over.
   `translate` is used here and `scale` for hover, so the two never fight. */
.cube.is-open .cube__lift,
.cube.is-revealable .cube__lift {
  animation: bob 5.5s ease-in-out infinite alternate;
  animation-delay: calc(var(--i) * -0.42s);
}

.cube.is-open:hover .cube__lift,
.cube.is-open:focus-visible .cube__lift,
.cube.is-revealable:hover .cube__lift,
.cube.is-revealable:focus-visible .cube__lift {
  scale: 1.06;
}

.cube.is-open:active .cube__lift,
.cube.is-revealable:active .cube__lift {
  scale: 0.97;
}

/* Once the game is called, every cube that was won invites a tap. */
.cube.is-revealable {
  --highlight: var(--gold);
}

/* Nobody picked this one before the game was called. There is nothing behind
   it worth waiting for, so it stays shut and settles back into the wall
   instead of asking to be opened. */
.cube.is-out-of-play .cube__lift {
  scale: 0.94;
  opacity: 0.45;
  filter: grayscale(0.8) brightness(0.6);
}

.cube__tap {
  position: absolute;
  right: -4%;
  bottom: -4%;
  z-index: 7;
  display: grid;
  place-items: center;
  width: 30%;
  max-width: 4.4rem;
  aspect-ratio: 1;
  font-family: var(--font-display);
  font-size: clamp(0.8rem, 14cqw, 2.1rem);
  color: #2a1150;
  background: radial-gradient(circle at 35% 30%, var(--gold-light), var(--gold) 65%, #c47f06);
  border-radius: 50%;
  box-shadow:
    0 0 0 3px rgba(26, 8, 54, 0.75),
    0 4px 10px rgba(0, 0, 0, 0.5);
  pointer-events: none;
  animation: tap-me 1.8s ease-in-out infinite;
}

.cube__inner {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transition: transform 0.75s cubic-bezier(0.34, 0.9, 0.32, 1.02);
}

.cube.is-flipped .cube__inner {
  transform: rotateY(180deg);
}

.cube__face {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: var(--face-radius);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

/* ---- front ---- */

.cube__face--front {
  background: linear-gradient(168deg, var(--tile-from), var(--tile-to));
  box-shadow:
    inset 0 0 0 3px rgba(20, 6, 48, 0.45),
    inset 0 4px 0 rgba(255, 255, 255, 0.5),
    inset 0 -10px 0 rgba(0, 0, 0, 0.22),
    0 10px 0 var(--edge),
    0 18px 30px rgba(0, 0, 0, 0.5);
}

/* Artwork fills the whole cube, edge to edge. A source that isn't square is
   centre-cropped to fit, so keep the character near the middle of the image. */
.cube__photo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  border-radius: var(--face-radius);
}

/* Shown only if a character has no image file — see
   src/assets/characters/README.md. Keeps the cube legible rather than blank. */
.cube__noart {
  position: absolute;
  inset: 12%;
  display: grid;
  place-items: center;
  font-family: var(--font-display);
  font-size: clamp(0.65rem, 7.5cqw, 1.9rem);
  text-align: center;
  color: #fff;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.55);
}

/* a light veil on a cube that has already been won — the bandana does the
   real work of marking it, so this stays subtle */
.cube__shade {
  position: absolute;
  inset: 0;
  background: rgba(10, 2, 28, 0.16);
  opacity: 0;
  transition: opacity 0.4s ease;
}

.cube.is-claimed .cube__shade {
  opacity: 1;
}

.cube__gloss {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    118deg,
    transparent 38%,
    rgba(255, 255, 255, 0.42) 48%,
    transparent 58%
  );
  translate: -130% 0;
  transition: translate 0.7s ease;
}

.cube.is-open:hover .cube__gloss,
.cube.is-revealable:hover .cube__gloss {
  translate: 130% 0;
}

/* glow in the waiting team's colour — gold while the wall is being opened */
.cube.is-open:hover .cube__face--front,
.cube.is-open:focus-visible .cube__face--front,
.cube.is-revealable:hover .cube__face--front,
.cube.is-revealable:focus-visible .cube__face--front {
  box-shadow:
    inset 0 0 0 3px var(--highlight),
    inset 0 4px 0 rgba(255, 255, 255, 0.5),
    0 10px 0 var(--edge),
    0 18px 30px rgba(0, 0, 0, 0.5),
    0 0 36px color-mix(in srgb, var(--highlight) 85%, transparent);
}

/* ---- back ---- */

.cube__face--back {
  gap: 0.15em;
  transform: rotateY(180deg);
  color: #fff;
  box-shadow:
    inset 0 0 0 3px rgba(20, 6, 48, 0.45),
    inset 0 4px 0 rgba(255, 255, 255, 0.3),
    inset 0 -10px 0 rgba(0, 0, 0, 0.3),
    0 10px 0 rgba(0, 0, 0, 0.45),
    0 18px 30px rgba(0, 0, 0, 0.5);
}

.cube--positive .cube__face--back {
  background: linear-gradient(168deg, #4be0a0, #0f8a62 65%, #0a5c43);
}

.cube--jackpot .cube__face--back {
  background: linear-gradient(168deg, #fff3b0, var(--gold) 45%, #c47f06);
  color: #3a1d00;
}

.cube--negative .cube__face--back {
  background: linear-gradient(168deg, #ff7a6b, #d02a1d 60%, #7d1309);
}

/* a cube the game never reached: no score, no effect on anything */
.cube--skipped .cube__face--back {
  background:
    repeating-linear-gradient(
      -45deg,
      rgba(255, 255, 255, 0.05) 0 10px,
      transparent 10px 20px
    ),
    linear-gradient(168deg, #5b5370, #37324a 60%, #241f33);
  color: rgba(255, 247, 234, 0.72);
}

.cube__burst {
  position: absolute;
  inset: -20%;
  background: repeating-conic-gradient(
    from 0deg,
    rgba(255, 255, 255, 0.22) 0deg 9deg,
    transparent 9deg 20deg
  );
  mask-image: radial-gradient(closest-side, #000 20%, transparent 72%);
  animation: spin-slow 22s linear infinite;
}

.cube__score {
  position: relative;
  font-family: var(--font-display);
  font-size: clamp(1.1rem, 20cqw, 5.2rem);
  line-height: 1;
  letter-spacing: -0.02em;
  text-shadow:
    0 2px 0 rgba(0, 0, 0, 0.3),
    0 5px 12px rgba(0, 0, 0, 0.4);
}

.cube__tag {
  position: relative;
  font-family: var(--font-display);
  font-size: clamp(0.5rem, 6cqw, 1.5rem);
  opacity: 0.85;
  letter-spacing: 0.04em;
}

/* the score pops as its face comes round */
.cube.is-flipped .cube__score {
  animation: score-pop 0.45s cubic-bezier(0.2, 1.6, 0.4, 1) 360ms both;
}

.cube.is-flipped .cube__tag {
  animation: score-pop 0.4s ease-out 480ms both;
}

.cube--jackpot.is-flipped .cube__face--back {
  animation: jackpot-glow 0.7s ease-in-out 400ms 3;
}

.cube--negative.is-flipped .cube__lift {
  animation: shake 0.42s ease-in-out 520ms 2;
}

/* the bandana lands just after the cube is taken */
.cube :deep(.bandana) {
  animation-delay: 0.1s;
}

/* ---- keyframes ---- */

@keyframes bob {
  from {
    translate: 0 2px;
  }
  to {
    translate: 0 -6px;
  }
}

@keyframes spin-slow {
  to {
    rotate: 360deg;
  }
}

@keyframes tap-me {
  0%,
  100% {
    scale: 1;
    box-shadow:
      0 0 0 3px rgba(26, 8, 54, 0.75),
      0 4px 10px rgba(0, 0, 0, 0.5);
  }
  50% {
    scale: 1.12;
    box-shadow:
      0 0 0 3px rgba(26, 8, 54, 0.75),
      0 0 22px 4px rgba(255, 198, 46, 0.75),
      0 4px 10px rgba(0, 0, 0, 0.5);
  }
}

@keyframes score-pop {
  0% {
    opacity: 0;
    scale: 0.4;
  }
  100% {
    opacity: 1;
    scale: 1;
  }
}

@keyframes jackpot-glow {
  0%,
  100% {
    box-shadow:
      inset 0 0 0 3px rgba(20, 6, 48, 0.45),
      0 10px 0 rgba(0, 0, 0, 0.45),
      0 0 0 rgba(255, 198, 46, 0);
  }
  50% {
    box-shadow:
      inset 0 0 0 3px rgba(255, 255, 255, 0.8),
      0 10px 0 rgba(0, 0, 0, 0.45),
      0 0 48px 12px rgba(255, 198, 46, 0.9);
  }
}

@keyframes shake {
  0%,
  100% {
    translate: 0 0;
    rotate: 0deg;
  }
  25% {
    translate: -6px 0;
    rotate: -2.5deg;
  }
  75% {
    translate: 6px 0;
    rotate: 2.5deg;
  }
}
</style>
