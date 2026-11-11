import { CHARACTERS } from './characters'

/**
 * Real character artwork.
 *
 * Drop an image into `src/assets/characters/` named after the character id
 * (see CHARACTERS in characters.ts) — e.g. `spongebob.jpg`. Any of
 * png / jpg / jpeg / webp / avif works. Vite picks it up at build time,
 * hashes it and bundles it, so there are no runtime 404s.
 *
 * Until an image is supplied, the cube falls back to the placeholder vector
 * drawing for that character.
 */
const modules = import.meta.glob<string>('../assets/characters/*.{png,jpg,jpeg,webp,avif}', {
  eager: true,
  import: 'default',
})

const BY_ID: Record<string, string> = {}

for (const [path, url] of Object.entries(modules)) {
  const file = path.split('/').pop()
  if (!file) continue
  const id = file.replace(/\.[^.]+$/, '').toLowerCase()
  BY_ID[id] = url
}

/**
 * Files whose name matches no character id. They are still bundled (the glob
 * imports everything it matches), so they are dead weight until renamed.
 */
export function unrecognisedImageFiles(): string[] {
  const known = new Set(CHARACTERS.map((c) => c.id))
  return Object.keys(BY_ID).filter((id) => !known.has(id))
}

if (import.meta.env.DEV) {
  const stray = unrecognisedImageFiles()
  if (stray.length > 0) {
    console.warn(
      `[characters] ignored image file(s) that match no character id: ${stray.join(', ')}.\n` +
        'Rename them to a character id (see src/assets/characters/README.md) or remove them — ' +
        'they are bundled but never shown.',
    )
  }
}

export function getCharacterImage(id: string): string | undefined {
  return BY_ID[id]
}

/** Character ids that have no image file yet. */
export function missingCharacterImages(): string[] {
  return CHARACTERS.filter((c) => !BY_ID[c.id]).map((c) => c.id)
}
