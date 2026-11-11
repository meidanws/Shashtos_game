import { describe, expect, it } from 'vitest'
import { CHARACTERS } from './characters'
import {
  CUBE_COUNT,
  SCORE_DISTRIBUTION,
  allCubesRevealed,
  calculateRevealedScores,
  calculateTeamScores,
  canClaimCube,
  canFinishGame,
  canRevealCube,
  claimCube,
  cloneTeams,
  countClaimed,
  countRevealedClaimed,
  createNewGame,
  createSetupState,
  finishGame,
  generateRandomScores,
  getWinner,
  hiddenCubes,
  isCubeOutOfPlay,
  remainingCubes,
  revealAllCubes,
  revealCube,
  revealedCount,
  selectWinner,
  undoLastClaim,
  validateGameState,
  wallIsFull,
} from './logic'
import type { GameConfig, GameState, TeamId } from './types'

const CONFIG: GameConfig = {
  team1: { name: 'הנמרים', color: '#2f7ff5' },
  team2: { name: 'הכרישים', color: '#f0392b' },
}

function newGame(): GameState {
  return createNewGame(CONFIG)
}

/** Win a round for `teamId` and take cube `cubeId`. */
function round(state: GameState, teamId: TeamId, cubeId: number): GameState {
  return claimCube(selectWinner(state, teamId), cubeId).state
}

/** Claim every cube, alternating winners unless told otherwise. */
function claimAll(state: GameState, winnerFor: (i: number) => TeamId = (i) => (i % 2 ? 'team2' : 'team1')): GameState {
  let current = state
  state.cubes.forEach((cube, i) => {
    current = round(current, winnerFor(i), cube.id)
  })
  return current
}

/** Call the game and turn every cube over. */
function openAll(state: GameState): GameState {
  return revealAllCubes(finishGame(state))
}

function tally(values: readonly number[]): Map<number, number> {
  const counts = new Map<number, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return counts
}

describe('score generation', () => {
  it('produces exactly 12 scores', () => {
    expect(generateRandomScores()).toHaveLength(CUBE_COUNT)
  })

  it('always matches the required distribution, over many runs', () => {
    for (let run = 0; run < 500; run += 1) {
      const counts = tally(generateRandomScores())
      for (const { value, count } of SCORE_DISTRIBUTION) {
        expect(counts.get(value), `score ${value} on run ${run}`).toBe(count)
      }
      expect([...counts.values()].reduce((a, b) => a + b, 0)).toBe(CUBE_COUNT)
    }
  })

  it('shuffles — two games rarely share the same order', () => {
    const a = newGame().cubes.map((c) => c.score)
    let differs = false
    for (let i = 0; i < 20 && !differs; i += 1) {
      const b = newGame().cubes.map((c) => c.score)
      differs = a.some((score, index) => score !== b[index])
    }
    expect(differs).toBe(true)
  })
})

describe('createNewGame', () => {
  it('builds 12 cubes, each character exactly once', () => {
    const game = newGame()
    expect(game.cubes).toHaveLength(CUBE_COUNT)
    const ids = new Set(game.cubes.map((c) => c.characterId))
    expect(ids.size).toBe(CHARACTERS.length)
    expect(CHARACTERS.every((c) => ids.has(c.id))).toBe(true)
  })

  it('starts in the claiming phase with nothing claimed and no winner pending', () => {
    const game = newGame()
    expect(game.phase).toBe('claiming')
    expect(game.pendingTeam).toBeNull()
    expect(game.moves).toEqual([])
    expect(remainingCubes(game.cubes)).toBe(CUBE_COUNT)
    expect(countClaimed(game.cubes)).toEqual({ team1: 0, team2: 0 })
  })

  it('falls back to default names when given blank ones', () => {
    const game = createNewGame({
      team1: { name: '   ', color: '#2f7ff5' },
      team2: { name: '', color: '#f0392b' },
    })
    expect(game.teams.team1.name.length).toBeGreaterThan(0)
    expect(game.teams.team2.name.length).toBeGreaterThan(0)
  })
})

describe('cloneTeams', () => {
  it('returns a detached copy that survives a reactive proxy', () => {
    const game = newGame()
    // A Proxy stands in for Vue's reactive state: structuredClone would throw
    // on this, so the clone must not rely on it.
    const proxied = new Proxy(game.teams, {})
    const copy = cloneTeams(proxied)

    expect(copy).toEqual(game.teams)
    expect(copy.team1).not.toBe(game.teams.team1)

    copy.team1.name = 'שונה'
    expect(game.teams.team1.name).toBe('הנמרים')
  })
})

describe('claiming a cube', () => {
  it('needs a round winner to be chosen first', () => {
    const game = newGame()
    const result = claimCube(game, 3)
    expect(result.claimed).toBeNull()
    expect(result.refusedBecause).toBe('no-team-selected')
    expect(result.state).toBe(game)
    expect(canClaimCube(game, 3).ok).toBe(false)
  })

  it('hands the cube to the selected winner and clears the selection', () => {
    const armed = selectWinner(newGame(), 'team2')
    expect(armed.pendingTeam).toBe('team2')

    const { state, claimed } = claimCube(armed, 4)
    expect(claimed).toEqual({ cubeId: 4, teamId: 'team2' })
    expect(state.cubes[4].claimedBy).toBe('team2')
    expect(state.cubes[4].pickOrder).toBe(1)
    expect(state.pendingTeam).toBeNull()
  })

  it('awards no points — totals stay at zero until the reveal', () => {
    const game = newGame()
    const after = round(game, 'team1', game.cubes.findIndex((c) => c.score === 500))
    expect(after.phase).toBe('claiming')
    expect(countClaimed(after.cubes)).toEqual({ team1: 1, team2: 0 })
    // the score exists on the cube but belongs to nobody's visible total yet
    expect(after.cubes.find((c) => c.claimedBy === 'team1')?.score).toBe(500)
  })

  it('lets the same team win several rounds in a row', () => {
    let game = newGame()
    game = round(game, 'team1', 0)
    game = round(game, 'team1', 1)
    game = round(game, 'team1', 2)
    expect(countClaimed(game.cubes)).toEqual({ team1: 3, team2: 0 })
    expect(game.moves.map((m) => m.teamId)).toEqual(['team1', 'team1', 'team1'])
  })

  it('allows an uneven split of the twelve cubes', () => {
    const game = claimAll(newGame(), (i) => (i < 9 ? 'team1' : 'team2'))
    expect(countClaimed(game.cubes)).toEqual({ team1: 9, team2: 3 })
  })

  it('never regenerates a score', () => {
    const game = newGame()
    const before = game.cubes.map((c) => c.score)
    const after = openAll(claimAll(game))
    expect(after.cubes.map((c) => c.score)).toEqual(before)
  })

  it('leaves the original state untouched', () => {
    const armed = selectWinner(newGame(), 'team1')
    claimCube(armed, 0)
    expect(armed.cubes[0].claimedBy).toBeNull()
    expect(armed.moves).toHaveLength(0)
    expect(armed.pendingTeam).toBe('team1')
  })

  it('refuses a cube that is already claimed', () => {
    const once = round(newGame(), 'team1', 3)
    const armed = selectWinner(once, 'team2')
    const again = claimCube(armed, 3)
    expect(again.claimed).toBeNull()
    expect(again.refusedBecause).toBe('already-claimed')
    expect(again.state).toBe(armed)
  })

  it('refuses a cube id that does not exist', () => {
    expect(claimCube(selectWinner(newGame(), 'team1'), 99).refusedBecause).toBe('unknown-cube')
  })

  it('refuses a claim attributed to a team that did not win the round', () => {
    const armed = selectWinner(newGame(), 'team1')
    expect(claimCube(armed, 2, 'team2').refusedBecause).toBe('wrong-team')
    expect(claimCube(armed, 2, 'team1').claimed).toEqual({ cubeId: 2, teamId: 'team1' })
  })

  it('accepts nothing more once the game has been called', () => {
    const called = finishGame(claimAll(newGame()))
    expect(selectWinner(called, 'team1').pendingTeam).toBeNull()
    expect(claimCube(called, 0).refusedBecause).toBe('not-claiming')
  })
})

describe('calling the game', () => {
  it('needs at least one round to have been played', () => {
    const game = newGame()
    expect(canFinishGame(game)).toBe(false)
    expect(finishGame(game)).toBe(game)

    const played = round(game, 'team1', 0)
    expect(canFinishGame(played)).toBe(true)
    expect(finishGame(played).phase).toBe('revealing')
  })

  it('can be called at any point, cubes still on the wall', () => {
    const called = finishGame(round(round(newGame(), 'team1', 0), 'team2', 1))
    expect(called.phase).toBe('revealing')
    expect(remainingCubes(called.cubes)).toBe(CUBE_COUNT - 2)
    // nothing is given away until a cube is actually turned over
    expect(called.cubes.every((cube) => !cube.revealed)).toBe(true)
  })

  it('drops a winner who never got to pick', () => {
    const armed = selectWinner(round(newGame(), 'team1', 0), 'team2')
    expect(armed.pendingTeam).toBe('team2')
    expect(finishGame(armed).pendingTeam).toBeNull()
  })

  it('stops the picker once every cube has been taken', () => {
    const full = claimAll(newGame())
    expect(wallIsFull(full)).toBe(true)
    expect(selectWinner(full, 'team1').pendingTeam).toBeNull()
    expect(canFinishGame(full)).toBe(true)
  })

  it('is never offered during setup or after the wall is open', () => {
    expect(canFinishGame(createSetupState())).toBe(false)
    const called = finishGame(round(newGame(), 'team1', 0))
    expect(canFinishGame(called)).toBe(false)
    expect(finishGame(called)).toBe(called)
  })
})

describe('opening the wall, one cube at a time', () => {
  const called = () => finishGame(claimAll(newGame()))

  it('turns over only the cube that was tapped', () => {
    const { state, revealed } = revealCube(called(), 7)
    expect(revealed?.id).toBe(7)
    expect(state.cubes[7].revealed).toBe(true)
    expect(revealedCount(state)).toBe(1)
    expect(hiddenCubes(state)).toHaveLength(CUBE_COUNT - 1)
    expect(allCubesRevealed(state)).toBe(false)
  })

  it('ignores a cube that is already face up, or one that does not exist', () => {
    const once = revealCube(called(), 2).state
    expect(canRevealCube(once, 2)).toBe(false)

    const again = revealCube(once, 2)
    expect(again.revealed).toBeNull()
    expect(again.state).toBe(once)
    expect(revealCube(once, 99).revealed).toBeNull()
  })

  it('turns over nothing while the game is still being played', () => {
    const playing = round(newGame(), 'team1', 0)
    expect(canRevealCube(playing, 0)).toBe(false)
    expect(revealCube(playing, 0).state).toBe(playing)
    expect(revealAllCubes(playing)).toBe(playing)
  })

  it('is open only after the last cube — including those nobody played for', () => {
    // two rounds played, so ten cubes were never chosen
    let state = finishGame(round(round(newGame(), 'team1', 0), 'team2', 1))
    for (const cube of state.cubes) {
      expect(allCubesRevealed(state)).toBe(false)
      state = revealCube(state, cube.id).state
    }
    expect(allCubesRevealed(state)).toBe(true)
    expect(revealedCount(state)).toBe(CUBE_COUNT)
  })

  it('opens everything still face down when someone skips ahead', () => {
    const half = revealCube(called(), 0).state
    const all = revealAllCubes(half)
    expect(allCubesRevealed(all)).toBe(true)
    expect(hiddenCubes(all)).toHaveLength(0)
    // with nothing left to open it is a no-op
    expect(revealAllCubes(all)).toBe(all)
  })

  it('leaves the original state untouched', () => {
    const state = called()
    revealCube(state, 3)
    revealAllCubes(state)
    expect(state.cubes[3].revealed).toBe(false)
    expect(revealedCount(state)).toBe(0)
  })

  it('totals every claimed score, negatives included', () => {
    const open = openAll(claimAll(newGame()))
    const expected = { team1: 0, team2: 0 }
    for (const cube of open.cubes) expected[cube.claimedBy!] += cube.score
    expect(calculateTeamScores(open.cubes)).toEqual(expected)
    expect(expected.team1 + expected.team2).toBe(
      SCORE_DISTRIBUTION.reduce((sum, s) => sum + s.value * s.count, 0),
    )
  })

  it('subtracts the -100 cubes from the team that claimed them', () => {
    const game = newGame()
    let played = game
    for (const cube of game.cubes.filter((c) => c.score === -100)) {
      played = round(played, 'team1', cube.id)
    }
    for (const cube of game.cubes.filter((c) => c.score !== -100)) {
      played = round(played, 'team2', cube.id)
    }
    expect(calculateTeamScores(openAll(played).cubes)).toEqual({ team1: -200, team2: 2100 })
  })

  it('gives one team the whole board when it wins every round', () => {
    const played = openAll(claimAll(newGame(), () => 'team2'))
    expect(calculateTeamScores(played.cubes)).toEqual({ team1: 0, team2: 1900 })
  })
})

describe('the running tally', () => {
  it('starts at nothing, however much is already claimed', () => {
    const called = finishGame(claimAll(newGame()))
    expect(calculateRevealedScores(called.cubes)).toEqual({ team1: 0, team2: 0 })
    expect(countRevealedClaimed(called.cubes)).toEqual({ team1: 0, team2: 0 })
  })

  it('adds a cube to its team only once that cube is face up', () => {
    const game = newGame()
    let state = finishGame(round(round(game, 'team1', 0), 'team2', 1))

    state = revealCube(state, 0).state
    expect(calculateRevealedScores(state.cubes)).toEqual({
      team1: state.cubes[0].score,
      team2: 0,
    })
    expect(countRevealedClaimed(state.cubes)).toEqual({ team1: 1, team2: 0 })

    state = revealCube(state, 1).state
    expect(calculateRevealedScores(state.cubes)).toEqual({
      team1: state.cubes[0].score,
      team2: state.cubes[1].score,
    })
  })

  it('ignores cubes nobody claimed, however they are opened', () => {
    const state = revealAllCubes(finishGame(round(newGame(), 'team1', 4)))
    expect(countRevealedClaimed(state.cubes)).toEqual({ team1: 1, team2: 0 })
    expect(calculateRevealedScores(state.cubes)).toEqual({
      team1: state.cubes[4].score,
      team2: 0,
    })
  })

  it('ends up exactly at the final scores', () => {
    const open = openAll(claimAll(newGame()))
    expect(calculateRevealedScores(open.cubes)).toEqual(calculateTeamScores(open.cubes))
    expect(countRevealedClaimed(open.cubes)).toEqual(countClaimed(open.cubes))
  })
})

describe('a game called early', () => {
  it('leaves the cubes nobody reached out of play and out of the scores', () => {
    let game = newGame()
    game = round(game, 'team1', 0)
    game = round(game, 'team1', 1)
    game = round(game, 'team2', 2)
    const open = openAll(game)

    expect(open.phase).toBe('revealing')

    const outOfPlay = open.cubes.filter((c) => isCubeOutOfPlay(open, c))
    expect(outOfPlay).toHaveLength(9)
    expect(outOfPlay.every((c) => c.claimedBy === null)).toBe(true)
    // they are still turned over at the end, they simply count for nobody
    expect(outOfPlay.every((c) => c.revealed)).toBe(true)

    const scores = calculateTeamScores(open.cubes)
    expect(scores).toEqual({
      team1: open.cubes[0].score + open.cubes[1].score,
      team2: open.cubes[2].score,
    })

    // the untouched cubes contribute nothing, however rich they were
    const total = open.cubes.reduce((sum, c) => sum + c.score, 0)
    expect(scores.team1 + scores.team2).not.toBe(total)
  })

  it('counts a claimed cube as in play however early the game was called', () => {
    const open = openAll(round(newGame(), 'team1', 7))
    expect(isCubeOutOfPlay(open, open.cubes[7])).toBe(false)
    expect(countClaimed(open.cubes)).toEqual({ team1: 1, team2: 0 })
  })

  it('can be a single round', () => {
    const game = round(newGame(), 'team2', 3)
    expect(canFinishGame(game)).toBe(true)
    const open = openAll(game)
    expect(calculateTeamScores(open.cubes).team2).toBe(open.cubes[3].score)
  })

  it('keeps the full wall of 12 cubes with the exact score spread', () => {
    const open = openAll(round(newGame(), 'team1', 4))
    expect(open.cubes).toHaveLength(CUBE_COUNT)
    const counts = tally(open.cubes.map((c) => c.score))
    for (const { value, count } of SCORE_DISTRIBUTION) {
      expect(counts.get(value)).toBe(count)
    }
  })
})

describe('undo', () => {
  it('releases the cube and re-arms the team that won that round', () => {
    const first = round(newGame(), 'team1', 4)
    const second = round(first, 'team2', 7)

    const { state, undone } = undoLastClaim(second)
    expect(undone).toEqual({ cubeId: 7, teamId: 'team2' })
    expect(state.cubes[7].claimedBy).toBeNull()
    expect(state.cubes[7].pickOrder).toBeNull()
    expect(state.pendingTeam).toBe('team2')
    expect(remainingCubes(state.cubes)).toBe(CUBE_COUNT - 1)
    expect(countClaimed(state.cubes)).toEqual({ team1: 1, team2: 0 })
    expect(state.moves).toHaveLength(1)
  })

  it('lets the re-armed team pick a different cube', () => {
    const game = round(round(newGame(), 'team1', 0), 'team2', 5)
    const undone = undoLastClaim(game).state
    const redone = claimCube(undone, 8).state
    expect(redone.cubes[5].claimedBy).toBeNull()
    expect(redone.cubes[8].claimedBy).toBe('team2')
  })

  it('returns the game to the exact previous state (bar the re-armed team)', () => {
    const before = round(newGame(), 'team1', 1)
    const after = undoLastClaim(round(before, 'team2', 9)).state
    expect({ ...after, pendingTeam: null }).toEqual(before)
  })

  it('does nothing when there is nothing to undo', () => {
    const game = newGame()
    const { state, undone } = undoLastClaim(game)
    expect(undone).toBeNull()
    expect(state).toBe(game)
  })

  it('is not available once the game has been called', () => {
    const called = finishGame(claimAll(newGame()))
    const { state, undone } = undoLastClaim(called)
    expect(undone).toBeNull()
    expect(state).toBe(called)
  })
})

describe('winner', () => {
  it('picks the higher total, or reports a tie', () => {
    expect(getWinner({ team1: 900, team2: 400 })).toEqual({ kind: 'win', teamId: 'team1' })
    expect(getWinner({ team1: -100, team2: 100 })).toEqual({ kind: 'win', teamId: 'team2' })
    expect(getWinner({ team1: 500, team2: 500 })).toEqual({ kind: 'tie' })
  })

  it('can go to the team that won fewer rounds', () => {
    const game = newGame()
    const jackpot = game.cubes.find((c) => c.score === 500)!
    const others = game.cubes.filter((c) => c.id !== jackpot.id)

    let played = round(game, 'team2', jackpot.id)
    for (const cube of others.slice(0, 2)) played = round(played, 'team2', cube.id)
    for (const cube of others.slice(2)) played = round(played, 'team1', cube.id)

    const counts = countClaimed(played.cubes)
    expect(counts.team1).toBe(9)
    expect(counts.team2).toBe(3)
    // the point: rounds won and points won are different things
    expect(calculateTeamScores(played.cubes).team2).toBeGreaterThanOrEqual(500 - 200)
  })
})

describe('validateGameState', () => {
  it('accepts setup, mid-claim, half-open and fully open states', () => {
    const game = newGame()
    expect(validateGameState(createSetupState())).toBe(true)
    expect(validateGameState(game)).toBe(true)
    expect(validateGameState(round(game, 'team1', 0))).toBe(true)
    expect(validateGameState(selectWinner(game, 'team2'))).toBe(true)

    const called = finishGame(round(game, 'team1', 0))
    expect(validateGameState(called)).toBe(true)
    expect(validateGameState(revealCube(called, 5).state)).toBe(true)
    expect(validateGameState(revealAllCubes(called))).toBe(true)
  })

  it('survives a JSON round trip', () => {
    const game = round(newGame(), 'team2', 6)
    expect(validateGameState(JSON.parse(JSON.stringify(game)))).toBe(true)
  })

  it('rejects junk and outdated versions', () => {
    expect(validateGameState(null)).toBe(false)
    expect(validateGameState('nope')).toBe(false)
    expect(validateGameState({})).toBe(false)
    expect(validateGameState({ ...newGame(), version: 3 })).toBe(false)
  })

  it('rejects a tampered score distribution', () => {
    const game = newGame()
    expect(validateGameState({ ...game, cubes: game.cubes.map((c) => ({ ...c, score: 500 })) })).toBe(
      false,
    )
  })

  it('rejects a duplicated character', () => {
    const game = newGame()
    const tampered = {
      ...game,
      cubes: game.cubes.map((c, i) =>
        i === 1 ? { ...c, characterId: game.cubes[0].characterId } : c,
      ),
    }
    expect(validateGameState(tampered)).toBe(false)
  })

  it('rejects the wrong number of cubes', () => {
    const game = newGame()
    expect(validateGameState({ ...game, cubes: game.cubes.slice(0, 11) })).toBe(false)
  })

  it('rejects moves that disagree with the cubes', () => {
    const game = round(newGame(), 'team1', 2)
    expect(validateGameState({ ...game, moves: [] })).toBe(false)
    expect(validateGameState({ ...game, moves: [{ cubeId: 2, teamId: 'team2' }] })).toBe(false)
  })

  it('rejects an opened wall that was never played on', () => {
    expect(validateGameState({ ...newGame(), phase: 'revealing' })).toBe(false)
  })

  it('rejects a cube turned over while the game is still being played', () => {
    const game = round(newGame(), 'team1', 0)
    const tampered = {
      ...game,
      cubes: game.cubes.map((c) => (c.id === 0 ? { ...c, revealed: true } : c)),
    }
    expect(validateGameState(tampered)).toBe(false)
    // the same cubes are fine once the game has been called
    expect(validateGameState({ ...tampered, phase: 'revealing' })).toBe(true)
  })

  it('rejects a cube with no revealed flag at all', () => {
    const game = newGame()
    expect(
      validateGameState({
        ...game,
        cubes: game.cubes.map(({ revealed: _revealed, ...rest }) => rest),
      }),
    ).toBe(false)
  })

  it('rejects a malformed team colour or pending team', () => {
    const game = newGame()
    expect(
      validateGameState({
        ...game,
        teams: { ...game.teams, team1: { ...game.teams.team1, color: 'blue' } },
      }),
    ).toBe(false)
    expect(validateGameState({ ...game, pendingTeam: 'team3' })).toBe(false)
  })
})
