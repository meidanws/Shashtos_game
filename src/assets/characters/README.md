# Character artwork

Drop one image per character in **this folder**. The filename (without the
extension) must be the character id from the list below.

Accepted formats: `.png` `.jpg` `.jpeg` `.webp` `.avif`

Vite picks the files up automatically at build time — no code change needed.
A character with no image here shows its name on a plain coloured tile, so
don't remove one without replacing it.

| File name to use | Character   |
| ---------------- | ----------- |
| `nils.jpg`       | נילס        |
| `turtles.jpg`    | צבי הנינג'ה |
| `arthur.jpg`     | ארתור       |
| `smurfs.png`     | הדרדסים     |
| `moomins.png`    | המומינים    |
| `powerpuff.jpg`  | בנות הכוח   |
| `pokemon.jpg`    | פוקימון     |
| `kofiko.jpg`     | קופיקו      |
| `spongebob.jpg`  | בובספוג     |
| `pepperpot.jpg`  | גברת פפרפוט |
| `parpar.jpg`     | פרפר נחמד   |
| `pippi.jpg`      | בילבי       |

## Image guidance

- **Any aspect ratio works.** The image is shown whole, never cropped — a
  blurred copy of it fills the rest of the square behind it. Square images
  still look tidiest.
- Around **600×600 px** is plenty; the largest a cube ever gets is ~300 px.
  Anything much bigger just inflates the bundle (the whole folder ships to the
  browser).
- Keep the character's face near the centre so the bandana (top-left corner of
  the cube) never covers it.
- A file whose name matches no character id is **bundled but never shown** —
  the dev server logs a warning listing any such files.
