import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { playSound, setSoundEnabled } from '@/game/audio'
import {
  CUBE_COUNT,
  allCubesRevealed as allCubesRevealedPure,
  calculateRevealedScores,
  calculateTeamScores,
  canClaimCube,
  canFinishGame as canFinishGamePure,
  canRevealCube as canRevealCubePure,
  claimCube as claimCubePure,
  cloneTeams,
  countClaimed,
  countRevealedClaimed,
  createNewGame,
  createSetupState,
  finishGame as finishGamePure,
  getWinner,
  hiddenCubes,
  isCubeOutOfPlay,
  remainingCubes,
  revealAllCubes as revealAllPure,
  revealCube as revealCubePure,
  revealedCount as revealedCountPure,
  selectWinner as selectWinnerPure,
  undoLastClaim as undoPure,
  wallIsFull,
} from '@/game/logic'
import { restoreGameState, saveGameState } from '@/game/storage'
import type { Cube, GameConfig, GameState, TeamId, TeamSetup } from '@/game/types'

/** Must match the cube's flip transition in GameCube.vue. */
export const FLIP_DURATION_MS = 750
/** Gap between cubes when someone skips ahead and opens the rest at once. */
export const REVEAL_STAGGER_MS = 150
/** Beat after the last cube lands before the final tally is announced. */
export const TALLY_DELAY_MS = 450

export interface ClaimEvent {
  cubeId: number
  teamId: TeamId
  /** Changes on every claim so watchers fire even for a repeat. */
  nonce: number
}

export interface RevealEvent {
  cubeId: number
  score: number
  claimed: boolean
  /** Whose cube it was, or null if nobody ever picked it. */
  teamId: TeamId | null
  nonce: number
}

export const useGameStore = defineStore('game', () => {
  const state = ref<GameState>(restoreGameState() ?? createSetupState())

  /** The most recent claim, for one-off animations. Never persisted. */
  const lastClaim = ref<ClaimEvent | null>(null)
  /** The cube just turned over by hand, for one-off effects. Never persisted. */
  const lastReveal = ref<RevealEvent | null>(null)
  /** True while a skip-ahead reveal is still rolling through the wall. */
  const isRevealing = ref(false)

  let claimNonce = 0
  let revealNonce = 0
  const timers = new Set<ReturnType<typeof setTimeout>>()

  setSoundEnabled(state.value.soundEnabled)

  function later(fn: () => void, ms: number): void {
    const id = setTimeout(() => {
      timers.delete(id)
      fn()
    }, ms)
    timers.add(id)
  }

  function clearTimers(): void {
    for (const id of timers) clearTimeout(id)
    timers.clear()
    isRevealing.value = false
  }

  // --- derived -------------------------------------------------------------

  const phase = computed(() => state.value.phase)
  const teams = computed(() => state.value.teams)
  const cubes = computed(() => state.value.cubes)
  const pendingTeamId = computed(() => state.value.pendingTeam)
  const pendingTeam = computed(() =>
    state.value.pendingTeam ? state.value.teams[state.value.pendingTeam] : null,
  )
  const claimCounts = computed(() => countClaimed(state.value.cubes))
  /** How many of each team's cubes are already face up. */
  const revealedClaimCounts = computed(() => countRevealedClaimed(state.value.cubes))
  const remaining = computed(() => remainingCubes(state.value.cubes))
  const claimedCount = computed(() => state.value.moves.length)
  /** Cubes nobody claimed — shown as out of play once the wall is open. */
  const outOfPlayCount = computed(
    () => state.value.cubes.filter((cube) => isCubeOutOfPlay(state.value, cube)).length,
  )
  const scores = computed(() => calculateTeamScores(state.value.cubes))
  /** The running total while the wall is opening: only what is face up counts. */
  const liveScores = computed(() => calculateRevealedScores(state.value.cubes))
  const soundEnabled = computed(() => state.value.soundEnabled)
  const canUndo = computed(() => state.value.phase === 'claiming' && state.value.moves.length > 0)
  /** The game is still on, but no cube is left to win. */
  const wallFull = computed(() => state.value.phase === 'claiming' && wallIsFull(state.value))
  const canFinish = computed(() => canFinishGamePure(state.value))
  /** A round is still winnable, but nobody has been named this round's winner. */
  const needsWinner = computed(
    () =>
      state.value.phase === 'claiming' &&
      state.value.pendingTeam === null &&
      remaining.value > 0,
  )
  /** Bumped when someone tries the wall without naming a winner first. */
  const winnerHintNonce = ref(0)

  /** The game has been called and the wall is being opened. */
  const isRevealStage = computed(() => state.value.phase === 'revealing')
  const revealedCount = computed(() => revealedCountPure(state.value))
  const hiddenCount = computed(() => CUBE_COUNT - revealedCount.value)
  const allRevealed = computed(() => allCubesRevealedPure(state.value))
  /** True once the final cube has finished turning over. */
  const revealFinished = ref(allRevealed.value)

  const winner = computed(() => getWinner(scores.value))

  function teamColor(id: TeamId): string {
    return state.value.teams[id].color
  }

  function isCubeSelectable(cubeId: number): boolean {
    return canClaimCube(state.value, cubeId).ok
  }

  function isCubeRevealable(cubeId: number): boolean {
    return canRevealCubePure(state.value, cubeId)
  }

  // --- actions -------------------------------------------------------------

  function startGame(config: GameConfig): void {
    clearTimers()
    lastClaim.value = null
    lastReveal.value = null
    revealFinished.value = false
    state.value = createNewGame({
      ...config,
      soundEnabled: config.soundEnabled ?? state.value.soundEnabled,
    })
    playSound('click')
  }

  /** New board, same teams and settings. */
  function restartGame(): void {
    const { teams: current, soundEnabled: sound } = state.value
    startGame({
      team1: { name: current.team1.name, color: current.team1.color },
      team2: { name: current.team2.name, color: current.team2.color },
      soundEnabled: sound,
    })
  }

  /** Back to the configuration screen, keeping team details and sound preference. */
  function backToSetup(): void {
    clearTimers()
    lastClaim.value = null
    lastReveal.value = null
    revealFinished.value = false
    state.value = {
      ...createSetupState(),
      teams: cloneTeams(state.value.teams),
      soundEnabled: state.value.soundEnabled,
    }
  }

  /** Record which team won the round that was just played offline. */
  function chooseWinner(teamId: TeamId | null): void {
    const next = selectWinnerPure(state.value, teamId)
    if (next === state.value) return
    state.value = next
    if (teamId) playSound('select')
  }

  function claim(cubeId: number): boolean {
    const result = claimCubePure(state.value, cubeId)
    if (!result.claimed) return false

    state.value = result.state
    claimNonce += 1
    lastClaim.value = { ...result.claimed, nonce: claimNonce }
    playSound('claim')
    return true
  }

  /** Call the game: no more rounds, the wall is ready to be opened. */
  function finishGame(): boolean {
    const next = finishGamePure(state.value)
    if (next === state.value) return false

    clearTimers()
    lastClaim.value = null
    lastReveal.value = null
    revealFinished.value = false
    state.value = next
    playSound('reveal')
    return true
  }

  /** The little flourish each cube gets as its face comes round. */
  function cubeFanfare(cube: Cube): void {
    playSound('flip')
    if (cube.claimedBy === null) return
    const sound = cube.score === 500 ? 'jackpot' : cube.score < 0 ? 'negative' : 'reveal'
    later(() => playSound(sound), 380)
  }

  /**
   * Turn one cube over and announce it. Every route into the reveal goes
   * through here, so the running tally reacts the same way either way.
   */
  function applyReveal(cubeId: number): Cube | null {
    const result = revealCubePure(state.value, cubeId)
    if (!result.revealed) return null

    state.value = result.state
    revealNonce += 1
    lastReveal.value = {
      cubeId,
      score: result.revealed.score,
      claimed: result.revealed.claimedBy !== null,
      teamId: result.revealed.claimedBy,
      nonce: revealNonce,
    }
    return result.revealed
  }

  /** Turn a single cube over. */
  function revealOne(cubeId: number): boolean {
    const cube = applyReveal(cubeId)
    if (!cube) return false
    cubeFanfare(cube)
    return true
  }

  /** Skip ahead: open everything still face down, one close after the other. */
  function revealRest(): boolean {
    const hidden = hiddenCubes(state.value)
    if (state.value.phase !== 'revealing' || hidden.length === 0) return false

    clearTimers()
    isRevealing.value = true
    playSound('drumroll')

    hidden.forEach((cube, index) => {
      later(() => {
        applyReveal(cube.id)
        playSound('flip')
      }, index * REVEAL_STAGGER_MS)
    })
    later(
      () => {
        // belt and braces: whatever a timer missed still ends up face up
        state.value = revealAllPure(state.value)
        isRevealing.value = false
      },
      hidden.length * REVEAL_STAGGER_MS + 40,
    )
    return true
  }

  /** Draw attention to the winner picker after a blocked tap on the wall. */
  function nudgeWinnerPicker(): void {
    winnerHintNonce.value += 1
  }

  function undo(): boolean {
    const result = undoPure(state.value)
    if (!result.undone) return false
    clearTimers()
    state.value = result.state
    lastClaim.value = null
    playSound('undo')
    return true
  }

  function updateTeam(id: TeamId, patch: Partial<TeamSetup>): void {
    const team = state.value.teams[id]
    state.value.teams[id] = {
      ...team,
      name: patch.name !== undefined ? patch.name : team.name,
      color: patch.color ?? team.color,
    }
  }

  function setSound(value: boolean): void {
    state.value.soundEnabled = value
    setSoundEnabled(value)
    if (value) playSound('click')
  }

  function toggleSound(): void {
    setSound(!state.value.soundEnabled)
  }

  // --- the final tally -----------------------------------------------------

  // The totals are only announced once the last cube has actually settled.
  watch(allRevealed, (done) => {
    if (!done) {
      revealFinished.value = false
      return
    }
    later(() => {
      revealFinished.value = true
    }, FLIP_DURATION_MS + TALLY_DELAY_MS)
  })

  // --- persistence ---------------------------------------------------------

  watch(state, (value) => saveGameState(value), { deep: true })
  watch(
    () => state.value.soundEnabled,
    (value) => setSoundEnabled(value),
  )

  return {
    state,
    phase,
    teams,
    cubes,
    pendingTeamId,
    pendingTeam,
    claimCounts,
    revealedClaimCounts,
    remaining,
    claimedCount,
    outOfPlayCount,
    scores,
    liveScores,
    soundEnabled,
    canUndo,
    canFinish,
    wallFull,
    needsWinner,
    winnerHintNonce,
    nudgeWinnerPicker,
    isRevealStage,
    isRevealing,
    revealedCount,
    hiddenCount,
    allRevealed,
    revealFinished,
    winner,
    lastClaim,
    lastReveal,
    teamColor,
    isCubeSelectable,
    isCubeRevealable,
    startGame,
    restartGame,
    backToSetup,
    chooseWinner,
    claim,
    finishGame,
    revealOne,
    revealRest,
    undo,
    updateTeam,
    setSound,
    toggleSound,
  }
})
