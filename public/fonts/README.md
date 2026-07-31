# Display fonts

Headings pair a plain bold setup line with a gold brush line lifted off the
crest. The brush face is self-hosted from this directory via `next/font/local`
in `src/app/layout.tsx` — no runtime request to a third party, and no
font-service cookie or IP leak.

| Heading line | Face      | Foundry        | Licence status        |
| ------------ | --------- | -------------- | --------------------- |
| Setup line   | Sora Bold | Google Fonts   | SIL OFL — cleared     |
| Gold line    | Road Rage | Youssef Habchi | **Personal use only** |

## ⚠ Outstanding licence

**Road Rage is not licensed for this deployment yet.** It is distributed free
for *personal* use only; The Editor's Arena is a company-run recruitment
platform, which is commercial use. Buy a licence from Youssef Habchi before
production, or swap in the open alternative below.

Ethnocentric was briefly used for the setup line and has been removed — that
line is now plain Sora Bold, so only one licence is outstanding.

## Cleared alternative, if the licence is not bought

**Protest Guerrilla** (SIL OFL) is the closest open face to Road Rage — its
outlines are genuinely torn rather than a clean italic.

To revert, swap the `localFont` call in `src/app/layout.tsx` for
`next/font/google`'s `Protest_Guerrilla` (`weight: ["400"]`), keeping the
`--font-brush` variable name. Then in
`globals.css` restore `.type-arena`'s `skewX(-8deg)` — Protest Guerrilla is
upright and needs the lean added, whereas Road Rage draws its own.

## How the wiring works

`.type-arena` in `globals.css` is the only consumer of `--font-brush`, so
replacing that one variable retypes the whole site. Road Rage is single-weight,
so the rule sets `font-weight: 400` — synthesised bold smears its outlines.

`.type-chrome` (the setup line) uses no custom face at all: it is `font-display`
(Sora) at `font-bold`.

Every gold line `--font-brush` drives:

- `src/components/landing/hero.tsx` — REAL EDITING TALENT
- `src/components/landing/section-heading.tsx` — all four landing section accents
- `src/components/landing/cta-section.tsx` — WHAT YOU'VE GOT
- `src/app/register/page.tsx` — THE EDITOR'S ARENA
- `src/app/leaderboard/page.tsx` — LEADERBOARD

## Regenerating the woff2 files

The source TTFs are not committed. To rebuild from a TTF:

```bash
pip3 install fonttools brotli
python3 -c "
from fontTools.ttLib import TTFont
f = TTFont('Road_Rage.ttf'); f.flavor = 'woff2'; f.save('road-rage.woff2')"
```

woff2 came out roughly 73% smaller than the TTF: 623 KB → 169 KB.
