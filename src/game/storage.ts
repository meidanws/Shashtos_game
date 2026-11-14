import { validateGameState } from './logic'
import type { Cube, GameState } from './types'

export const STORAGE_KEY = 'shatus.wall.state'

function storage(): Storage | null {
  try {
    const ls = globalThis.localStorage
    // Touch it: private-mode browsers throw on access rather than on read.
    ls.getItem(STORAGE_KEY)
    return ls
  } catch {
    return null
  }
}

/** Persist the whole game. Failure is never fatal — the game keeps running in memory. */
export function saveGameState(state: GameState): void {
  const ls = storage()
  if (!ls) return
  try {
    ls.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* quota exceeded or blocked — ignore */
  }
}

/**
 * Fills in settings added after a game was saved, so a game in progress
 * survives the upgrade instead of being thrown out by the validator. Only for
 * additions that have a safe default — anything that changes the shape of the
 * board still goes through STATE_VERSION.
 */
function migrate(value: unknown): unknown {
  if (typeof value !== 'object' || value === null) return value
  const state = value as Record<string, unknown>
  // Added with the background theme; older saves predate the setting.
  if (typeof state.musicEnabled !== 'boolean') state.musicEnabled = true

  // The wall used to turn over all twelve cubes, including the ones nobody
  // picked. It only opens the cubes that were won now, so a wall saved
  // half-open under the old rule is squared up on the way in.
  if (Array.isArray(state.cubes)) {
    for (const cube of state.cubes as Cube[]) {
      if (cube && cube.revealed && cube.claimedBy === null) cube.revealed = false
    }
  }

  return state
}

/**
 * Restore a previously saved game. Returns null when nothing valid is stored,
 * so a corrupted or outdated entry falls back to a clean setup screen instead
 * of crashing or half-loading.
 */
export function restoreGameState(): GameState | null {
  const ls = storage()
  if (!ls) return null
  try {
    const raw = ls.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = migrate(JSON.parse(raw))
    return validateGameState(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function clearGameState(): void {
  const ls = storage()
  if (!ls) return
  try {
    ls.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
