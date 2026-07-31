# Licensed display fonts

The crest uses two commercial faces that are **not** in this repo. Until they are
present, `src/app/layout.tsx` falls back to the closest open substitutes:

| Crest line | Licensed face                        | Current substitute |
| ---------- | ------------------------------------ | ------------------ |
| `EDITOR'S` | TT Supermolot ExtraBold / Ethnocentric | Russo One        |
| `ARENA`    | Road Rage                            | Protest Guerrilla  |

## Dropping in Road Rage

1. Put the file here as **`road-rage.woff2`** (or `.ttf` / `.otf` — adjust the
   path below to match). Convert TTF → WOFF2 if you can; it is roughly 70%
   smaller over the wire.
2. In `src/app/layout.tsx`, replace the `Protest_Guerrilla` import and call:

   ```ts
   // remove Protest_Guerrilla from the next/font/google import, then:
   import localFont from "next/font/local";

   const brush = localFont({
     src: "../../public/fonts/road-rage.woff2",
     variable: "--font-brush",
     display: "swap",
   });
   ```

3. In `src/app/globals.css`, `.type-arena` currently sets `font-weight: 400` and
   `text-transform: uppercase` because Protest Guerrilla is single-weight and
   reads best in caps. Road Rage is also single-weight, so leave both as they
   are. If the lean looks doubled, reduce `skewX(-8deg)` — Road Rage already
   carries its own rightward pitch, unlike the substitute.

Nothing else changes. `.type-arena` is the only consumer of `--font-brush`, and
it drives every gold line on the site:

- `src/components/landing/hero.tsx` — "REAL EDITING TALENT"
- `src/components/landing/section-heading.tsx` — all four landing section accents
- `src/components/landing/cta-section.tsx` — "WHAT YOU'VE GOT"
- `src/app/register/page.tsx` — "THE EDITOR'S ARENA"
- `src/app/leaderboard/page.tsx` — "LEADERBOARD"

## Licensing

Road Rage is distributed as **free for personal use**; commercial use requires a
licence from the foundry. This site is a company-run recruitment platform, which
is commercial use — buy the licence before launch. The same applies to
TT Supermolot (TypeType) and Ethnocentric (Typodermic).
