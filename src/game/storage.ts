import { validateGameState } from './logic'
import type { GameState } from './types'

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
    const parsed: unknown = JSON.parse(raw)
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
