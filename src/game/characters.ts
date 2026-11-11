export interface CharacterDef {
  id: string
  /** Display name, Hebrew */
  name: string
  /** Tile gradient, light -> dark */
  tileFrom: string
  tileTo: string
  /** Colour of the name ribbon at the bottom of the tile */
  ribbon: string
}

/**
 * The twelve faces of the wall. Each one appears exactly once in a game.
 * The artwork itself lives in src/assets/characters/ (see the README there);
 * the colours below are the tile the image sits on, and set the cube's edge.
 */
export const CHARACTERS: readonly CharacterDef[] = [
  { id: 'nils', name: 'נילס', tileFrom: '#8fd4ff', tileTo: '#2f7fd1', ribbon: '#1b5fa8' },
  { id: 'turtles', name: "צבי הנינג'ה", tileFrom: '#9be36b', tileTo: '#35903a', ribbon: '#246b2a' },
  { id: 'arthur', name: 'ארתור', tileFrom: '#ffe08a', tileTo: '#e0922c', ribbon: '#b76c15' },
  { id: 'smurfs', name: 'הדרדסים', tileFrom: '#9fd0ff', tileTo: '#3f6ed6', ribbon: '#2d51ab' },
  { id: 'moomins', name: 'המומינים', tileFrom: '#c9f4ef', tileTo: '#49b3b5', ribbon: '#2f8a8d' },
  { id: 'powerpuff', name: 'בנות הכוח', tileFrom: '#ffc2e4', tileTo: '#e8569d', ribbon: '#bf2e78' },
  { id: 'pokemon', name: 'פוקימון', tileFrom: '#ffe566', tileTo: '#f0a81e', ribbon: '#c47a0c' },
  { id: 'kofiko', name: 'קופיקו', tileFrom: '#ffcf96', tileTo: '#d9772f', ribbon: '#a9541c' },
  { id: 'spongebob', name: 'בובספוג', tileFrom: '#fff07a', tileTo: '#e8c020', ribbon: '#b38f0b' },
  { id: 'pepperpot', name: 'גברת פפרפוט', tileFrom: '#ffb9b0', tileTo: '#d9534a', ribbon: '#a93a33' },
  { id: 'parpar', name: 'פרפר נחמד', tileFrom: '#b7f0a8', tileTo: '#49a85e', ribbon: '#2f7f42' },
  { id: 'pippi', name: 'בילבי', tileFrom: '#ffd0a6', tileTo: '#e8743a', ribbon: '#b84f1e' },
] as const

export const CHARACTER_IDS: readonly string[] = CHARACTERS.map((c) => c.id)

const BY_ID = new Map(CHARACTERS.map((c) => [c.id, c]))

export function getCharacter(id: string): CharacterDef {
  const found = BY_ID.get(id)
  if (!found) throw new Error(`Unknown character id: ${id}`)
  return found
}
