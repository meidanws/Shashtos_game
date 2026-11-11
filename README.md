# ששטוס · קיר הגורלות

A digital recreation of the Wall of Fate (קיר הגורלות) from the Israeli
children's show *Shatus*, built for playing along at home. The challenges
themselves happen offline — this app runs the wall.

## How a game goes

1. **Setup** — name both teams, pick a bandana colour for each, and choose
   **how many rounds** you are playing (1–12, default 12).
2. **Each round** — you play a challenge in the room. In the app you tap
   **who won**, then that team picks a cube from the wall. The cube is tied
   with that team's bandana. **No points are shown or awarded yet** — the team
   has won a cube, not a score.
3. **When the rounds run out** — the **חשיפה!** (Reveal) button appears.
   Press it and the whole wall flips open, one cube after another, showing the
   hidden score behind each. Only then are the totals added up and the winner
   announced.

The wall always holds 12 cubes. If you play fewer than 12 rounds, the cubes
nobody claimed are flipped over marked **לא רלוונטי** — they score nothing and
count for nobody.

Scores are shuffled once, when the game is created, and never change. The
twelve cubes hold exactly: 4 × +100, 3 × +200, 2 × +300, 1 × +500 and 2 × −100.
Which of them are actually in play depends on how many rounds you set and which
cubes get picked.

## Running it

```bash
npm install
npm run dev      # dev server
npm run build    # type-check + production build
npm test         # game-logic test suite
```

## Character artwork

Real images go in [`src/assets/characters/`](src/assets/characters/) — one per
character, named after its id (`spongebob.jpg`, `kofiko.png`, …). See the
README in that folder for the full list and sizing guidance. Any character
without an image falls back to a placeholder vector drawing.

## Layout of the code

| Path                        | What's in it                                                  |
| --------------------------- | ------------------------------------------------------------- |
| `src/game/logic.ts`         | All the rules, as pure functions. No Vue, no DOM.              |
| `src/game/logic.test.ts`    | Tests for those rules.                                         |
| `src/game/storage.ts`       | localStorage persistence, with validation on the way back in.  |
| `src/game/audio.ts`         | Synthesised sound effects (Web Audio, no asset files).         |
| `src/stores/game.ts`        | Pinia store: reactive state, timing and sound cues.            |
| `src/components/`           | Presentation only.                                             |

The game state is saved to localStorage on every change and restored on load,
so refreshing mid-game changes nothing. A saved game that fails validation is
discarded rather than half-loaded.
