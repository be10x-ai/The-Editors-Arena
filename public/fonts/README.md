# Display fonts

Nothing is self-hosted here any more. Both faces come from Google Fonts through
`next/font/google` in `src/app/layout.tsx`, which downloads and self-hosts them
at build time — so there is still no runtime request to a third party, no
font-service cookie, and no IP leak.

| Role         | Face         | Foundry      | Licence           |
| ------------ | ------------ | ------------ | ----------------- |
| Body         | Barlow       | Jeremy Tribby| SIL OFL — cleared |
| Display      | Chakra Petch | Cadson Demak | SIL OFL — cleared |

Both are squared geometrics chosen to match the logo's clipped-corner
letterforms.

## Licence history — resolved

Earlier editions set the gold "hit" line in **Road Rage** (Youssef Habchi),
which is free for *personal* use only. The Editor's Arena is a company-run
recruitment platform, so that was commercial use without a licence.

Road Rage was removed when the identity moved to the blue mark: the struck-hit
treatment is now `.type-arena` in `globals.css` — Chakra Petch with a gradient
fill and a glow, no third-party brush face involved. The `.woff2` has been
deleted from this directory. Nothing further is outstanding.

Ethnocentric was briefly used for the setup line and has been removed — that
licence question is likewise closed.
