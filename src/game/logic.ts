import { CHARACTER_IDS, CHARACTERS } from './characters'
import type { Cube, GameConfig, GameState, Move, Scores, TeamId, Teams } from './types'

export const STATE_VERSION = 6
export const CUBE_COUNT = 12

/** The exact score distribution every game must use. */
export const SCORE_DISTRIBUTION: readonly { value: number; count: number }[] = [
  { value: 100, count: 4 },
  { value: 200, count: 3 },
  { value: 300, count: 2 },
  { value: 500, count: 1 },
  { value: -100, count: 2 },
] as const

export const DEFAULT_TEAMS: Teams = {
  team1: { id: 'team1', name: 'קבוצה כחולה', color: '#2f7ff5' },
  team2: { id: 'team2', name: 'קבוצה אדומה', color: '#f0392b' },
}

/** Flat pool of the 12 score values, unshuffled. */
export function buildScorePool(): number[] {
  const pool: number[] = []
  for (const { value, count } of SCORE_DISTRIBUTION) {
    for (let i = 0; i < count; i += 1) pool.push(value)
  }
  return pool
}

/** Fisher–Yates shuffle. Returns a new array, leaves the input untouched. */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * The 12 scores in random order. Called exactly once per game, when it is
 * created — never when a cube is claimed or revealed.
 */
export function generateRandomScores(random: () => number = Math.random): number[] {
  return shuffle(buildScorePool(), random)
}

function sanitiseName(name: string, fallback: string): string {
  const trimmed = name.trim()
  return trimmed.length > 0 ? trimmed.slice(0, 24) : fallback
}

/** Build a brand new game: fresh cubes, freshly shuffled scores, nothing claimed. */
export function createNewGame(config: GameConfig, random: () => number = Math.random): GameState {
  const scores = generateRandomScores(random)
  const characterOrder = shuffle(CHARACTER_IDS, random)

  const cubes: Cube[] = characterOrder.map((characterId, index) => ({
    id: index,
    characterId,
    score: scores[index],
    claimedBy: null,
    pickOrder: null,
    revealed: false,
  }))

  return {
    version: STATE_VERSION,
    phase: 'claiming',
    teams: {
      team1: {
        id: 'team1',
        name: sanitiseName(config.team1.name, DEFAULT_TEAMS.team1.name),
        color: config.team1.color || DEFAULT_TEAMS.team1.color,
      },
      team2: {
        id: 'team2',
        name: sanitiseName(config.team2.name, DEFAULT_TEAMS.team2.name),
        color: config.team2.color || DEFAULT_TEAMS.team2.color,
      },
    },
    cubes,
    pendingTeam: null,
    moves: [],
    soundEnabled: config.soundEnabled ?? true,
    musicEnabled: config.musicEnabled ?? true,
    createdAt: Date.now(),
  }
}

/**
 * A plain, detached copy of the two teams.
 *
 * Deliberately not `structuredClone`: this is called with the store's reactive
 * state, and structuredClone throws DataCloneError on a Proxy. A shallow spread
 * of each team is enough — every field is a string.
 */
export function cloneTeams(teams: Teams): Teams {
  return {
    team1: { ...teams.team1 },
    team2: { ...teams.team2 },
  }
}

/** The blank state shown before the first game is configured. */
export function createSetupState(): GameState {
  return {
    version: STATE_VERSION,
    phase: 'setup',
    teams: cloneTeams(DEFAULT_TEAMS),
    cubes: [],
    pendingTeam: null,
    moves: [],
    soundEnabled: true,
    musicEnabled: true,
    createdAt: Date.now(),
  }
}

// --- queries ---------------------------------------------------------------

/** Totals. Meaningful to show only once the wall has been revealed. */
export function calculateTeamScores(cubes: readonly Cube[]): Scores {
  const scores: Scores = { team1: 0, team2: 0 }
  for (const cube of cubes) {
    if (cube.claimedBy) scores[cube.claimedBy] += cube.score
  }
  return scores
}

/**
 * The totals so far: only cubes that have actually been turned over count.
 * This is what the live tally shows while the wall is being opened — it walks
 * up to `calculateTeamScores` as the last cube lands.
 */
export function calculateRevealedScores(cubes: readonly Cube[]): Scores {
  const scores: Scores = { team1: 0, team2: 0 }
  for (const cube of cubes) {
    if (cube.claimedBy && cube.revealed) scores[cube.claimedBy] += cube.score
  }
  return scores
}

/** How many rounds each team has won so far. */
export function countClaimed(cubes: readonly Cube[]): Record<TeamId, number> {
  const counts: Record<TeamId, number> = { team1: 0, team2: 0 }
  for (const cube of cubes) {
    if (cube.claimedBy) counts[cube.claimedBy] += 1
  }
  return counts
}

/** How many of each team's cubes have been turned over. */
export function countRevealedClaimed(cubes: readonly Cube[]): Record<TeamId, number> {
  const counts: Record<TeamId, number> = { team1: 0, team2: 0 }
  for (const cube of cubes) {
    if (cube.claimedBy && cube.revealed) counts[cube.claimedBy] += 1
  }
  return counts
}

export function remainingCubes(cubes: readonly Cube[]): number {
  return cubes.filter((cube) => cube.claimedBy === null).length
}

/** Rounds played so far — one per cube handed out. */
export function roundsPlayed(state: GameState): number {
  return state.moves.length
}

/** No cube is left to win, so the game cannot go on. */
export function wallIsFull(state: GameState): boolean {
  return state.cubes.length > 0 && remainingCubes(state.cubes) === 0
}

/**
 * The game can be wrapped up as soon as at least one round has been played.
 * There is no fixed number of rounds — the family decides when to stop.
 */
export function canFinishGame(state: GameState): boolean {
  return state.phase === 'claiming' && state.moves.length > 0
}

/**
 * The cubes the reveal is about: only the ones a team actually won.
 *
 * A cube nobody picked has nothing to say — it was never played for and
 * counts for nothing — so the wall does not make anyone sit through it.
 */
export function openableCubes(state: GameState): Cube[] {
  return state.cubes.filter((cube) => cube.claimedBy !== null)
}

/** Won cubes still face down, in wall order. */
export function hiddenCubes(state: GameState): Cube[] {
  return state.cubes.filter((cube) => cube.claimedBy !== null && !cube.revealed)
}

export function revealedCount(state: GameState): number {
  return state.cubes.filter((cube) => cube.claimedBy !== null && cube.revealed).length
}

/** Every cube that was won has been turned over — time for the final tally. */
export function revealComplete(state: GameState): boolean {
  return state.phase === 'revealing' && hiddenCubes(state).length === 0
}

/**
 * A cube nobody claimed by the end of the game. It is out of play: no score,
 * no effect on any total.
 */
export function isCubeOutOfPlay(state: GameState, cube: Cube): boolean {
  return state.phase === 'revealing' && cube.claimedBy === null
}

export type ClaimRefusal =
  | 'not-claiming'
  | 'unknown-cube'
  | 'already-claimed'
  | 'no-team-selected'
  | 'wrong-team'

export type ClaimCheck = { ok: true } | { ok: false; reason: ClaimRefusal }

/** Validates claiming a cube without mutating anything. */
export function canClaimCube(state: GameState, cubeId: number, teamId?: TeamId): ClaimCheck {
  if (state.phase !== 'claiming') return { ok: false, reason: 'not-claiming' }
  if (state.pendingTeam === null) return { ok: false, reason: 'no-team-selected' }
  if (teamId !== undefined && teamId !== state.pendingTeam) {
    return { ok: false, reason: 'wrong-team' }
  }
  const cube = state.cubes.find((c) => c.id === cubeId)
  if (!cube) return { ok: false, reason: 'unknown-cube' }
  if (cube.claimedBy !== null) return { ok: false, reason: 'already-claimed' }
  return { ok: true }
}

// --- transitions -----------------------------------------------------------

/**
 * Mark which team won the round that was just played offline.
 * With no cube left to take there is nothing to win, so only clearing the
 * selection is allowed.
 */
export function selectWinner(state: GameState, teamId: TeamId | null): GameState {
  if (state.phase !== 'claiming') return state
  if (teamId !== null && wallIsFull(state)) return state
  if (state.pendingTeam === teamId) return state
  return { ...state, pendingTeam: teamId }
}

export interface ClaimResult {
  state: GameState
  /** null when the claim was refused; the state is then returned unchanged. */
  claimed: { cubeId: number; teamId: TeamId } | null
  refusedBecause?: ClaimRefusal
}

/**
 * Hand a cube to the team that won the round. The score stays hidden —
 * nothing is added to any total until the wall is revealed.
 */
export function claimCube(state: GameState, cubeId: number, teamId?: TeamId): ClaimResult {
  const check = canClaimCube(state, cubeId, teamId)
  if (!check.ok) return { state, claimed: null, refusedBecause: check.reason }

  const actingTeam = state.pendingTeam as TeamId
  const pickOrder = state.moves.length + 1
  const cubes = state.cubes.map((cube) =>
    cube.id === cubeId ? { ...cube, claimedBy: actingTeam, pickOrder } : cube,
  )

  const next: GameState = {
    ...state,
    cubes,
    moves: [...state.moves, { cubeId, teamId: actingTeam }],
    // Each round starts again with an explicit "who won?"
    pendingTeam: null,
  }

  return { state: next, claimed: { cubeId, teamId: actingTeam } }
}

/**
 * Call the game: no more rounds. Every cube stays face down — the wall is
 * opened afterwards, one cube at a time.
 */
export function finishGame(state: GameState): GameState {
  if (!canFinishGame(state)) return state
  return {
    ...state,
    phase: 'revealing',
    pendingTeam: null,
    cubes: state.cubes.map((cube) => (cube.revealed ? { ...cube, revealed: false } : cube)),
  }
}

/** A won cube that is still face down on an opened wall can be turned over. */
export function canRevealCube(state: GameState, cubeId: number): boolean {
  if (state.phase !== 'revealing') return false
  const cube = state.cubes.find((c) => c.id === cubeId)
  return cube !== undefined && cube.claimedBy !== null && !cube.revealed
}

export interface RevealResult {
  state: GameState
  /** null when the cube could not be turned over; the state is then unchanged. */
  revealed: Cube | null
}

/** Turn one cube over, showing what was hidden behind it. */
export function revealCube(state: GameState, cubeId: number): RevealResult {
  if (!canRevealCube(state, cubeId)) return { state, revealed: null }

  const cubes = state.cubes.map((cube) =>
    cube.id === cubeId ? { ...cube, revealed: true } : cube,
  )
  return {
    state: { ...state, cubes },
    revealed: cubes.find((cube) => cube.id === cubeId) ?? null,
  }
}

/** Turn over every won cube still waiting, for anyone who would rather skip ahead. */
export function revealRemainingCubes(state: GameState): GameState {
  if (state.phase !== 'revealing') return state
  const waiting = new Set(hiddenCubes(state).map((cube) => cube.id))
  if (waiting.size === 0) return state
  return {
    ...state,
    cubes: state.cubes.map((cube) => (waiting.has(cube.id) ? { ...cube, revealed: true } : cube)),
  }
}

export interface UndoResult {
  state: GameState
  undone: { cubeId: number; teamId: TeamId } | null
}

/**
 * Reverse the most recent claim completely: the cube goes back to unclaimed and
 * the team that won that round is re-armed, ready to pick a different cube.
 * Not available once the wall has been revealed.
 */
export function undoLastClaim(state: GameState): UndoResult {
  if (state.phase !== 'claiming') return { state, undone: null }

  const lastMove = state.moves[state.moves.length - 1]
  if (!lastMove) return { state, undone: null }

  const cubes = state.cubes.map((cube) =>
    cube.id === lastMove.cubeId ? { ...cube, claimedBy: null, pickOrder: null } : cube,
  )

  const next: GameState = {
    ...state,
    cubes,
    moves: state.moves.slice(0, -1),
    pendingTeam: lastMove.teamId,
  }

  return { state: next, undone: { ...lastMove } }
}

export type Winner = { kind: 'win'; teamId: TeamId } | { kind: 'tie' }

export function getWinner(scores: Scores): Winner {
  if (scores.team1 === scores.team2) return { kind: 'tie' }
  return { kind: 'win', teamId: scores.team1 > scores.team2 ? 'team1' : 'team2' }
}

// --- persistence guard -----------------------------------------------------

const HEX_COLOR = /^#[0-9a-f]{6}$/i

function isTeam(value: unknown, id: TeamId): boolean {
  if (typeof value !== 'object' || value === null) return false
  const team = value as Record<string, unknown>
  return (
    team.id === id &&
    typeof team.name === 'string' &&
    typeof team.color === 'string' &&
    HEX_COLOR.test(team.color)
  )
}

function hasExactScoreDistribution(cubes: readonly Cube[]): boolean {
  for (const { value, count } of SCORE_DISTRIBUTION) {
    if (cubes.filter((cube) => cube.score === value).length !== count) return false
  }
  return true
}

/**
 * Guards against corrupted or outdated persisted state. Anything that fails
 * here is discarded rather than loaded, so a bad localStorage entry cannot
 * break a game.
 */
export function validateGameState(value: unknown): value is GameState {
  if (typeof value !== 'object' || value === null) return false
  const state = value as Record<string, unknown>

  if (state.version !== STATE_VERSION) return false
  if (state.phase !== 'setup' && state.phase !== 'claiming' && state.phase !== 'revealing') {
    return false
  }
  if (
    state.pendingTeam !== null &&
    state.pendingTeam !== 'team1' &&
    state.pendingTeam !== 'team2'
  ) {
    return false
  }
  if (typeof state.soundEnabled !== 'boolean') return false
  if (typeof state.musicEnabled !== 'boolean') return false

  const teams = state.teams as Record<string, unknown> | undefined
  if (!teams || !isTeam(teams.team1, 'team1') || !isTeam(teams.team2, 'team2')) return false

  if (!Array.isArray(state.cubes)) return false
  if (state.phase === 'setup') return state.cubes.length === 0 && Array.isArray(state.moves)

  const cubes = state.cubes as Cube[]
  if (cubes.length !== CUBE_COUNT) return false

  const seenIds = new Set<number>()
  const seenCharacters = new Set<string>()
  for (const cube of cubes) {
    if (typeof cube !== 'object' || cube === null) return false
    if (typeof cube.id !== 'number' || cube.id < 0 || cube.id >= CUBE_COUNT) return false
    if (seenIds.has(cube.id)) return false
    seenIds.add(cube.id)

    if (!CHARACTER_IDS.includes(cube.characterId)) return false
    if (seenCharacters.has(cube.characterId)) return false
    seenCharacters.add(cube.characterId)

    if (typeof cube.score !== 'number') return false
    if (typeof cube.revealed !== 'boolean') return false
    // Nothing is turned over while the game is still being played.
    if (state.phase === 'claiming' && cube.revealed) return false
    if (cube.claimedBy !== null && cube.claimedBy !== 'team1' && cube.claimedBy !== 'team2') {
      return false
    }
    // Only a cube a team won is ever turned over.
    if (cube.revealed && cube.claimedBy === null) return false
  }
  if (seenCharacters.size !== CHARACTERS.length) return false
  if (!hasExactScoreDistribution(cubes)) return false

  if (!Array.isArray(state.moves)) return false
  const moves = state.moves as Move[]
  const claimedCount = cubes.filter((c) => c.claimedBy !== null).length
  if (moves.length !== claimedCount) return false
  for (const move of moves) {
    const cube = cubes.find((c) => c.id === move.cubeId)
    if (!cube || cube.claimedBy !== move.teamId) return false
  }

  // A game is only ever called after at least one round has been played.
  if (state.phase === 'revealing' && claimedCount === 0) return false

  return true
}
