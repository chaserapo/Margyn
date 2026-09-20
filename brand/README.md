# Margyn brand

## Mark

A bold "M" (Anton) on a dark tile, paired with a 2×2 grid of the four
arithmetic operators (−, +, ÷, ×) — margin is a calculation, so the mark says
that directly instead of using an abstract trend line.

## Colors

| Token | Hex | Use |
|---|---|---|
| Ink | `#231F20` | Text, icon strokes, app icon tile background |
| Cream | `#F7F4EE` | Page background, wordmark on dark |

Two colors only — no accent. Keeps it printable, keeps it legible small.

## Typeface

[Anton](https://fonts.google.com/specimen/Anton) (Google Fonts, OFL) — heavy,
condensed, all-caps by convention here. Used for the wordmark, the tagline,
and the app-icon "M".

## Files

- `icon.svg` / `icon.png` — app icon tile (ink bg, cream "M"), full-bleed square
- `adaptive-foreground.svg` — Android adaptive icon foreground, cream "M" only,
  transparent bg, sized to the safe zone — pairs with a flat ink-colored
  background image
- `lockup.svg` / `lockup.png` — primary horizontal lockup (operator grid +
  "MARGYN"), cream bg — use anywhere there's room to run wide (README, web,
  splash screens, print)
- `lockup-tagline.svg` / `lockup-tagline.png` — operator grid + big "M" +
  "KNOW YOUR MARGIN." tagline, for square-ish placements (social profile
  images, a title screen)

Regenerate PNGs from the SVGs with `cairosvg` if you edit the source files.
The wordmark text needs the Anton font installed locally to render correctly
(`fc-list | grep -i anton` to check) — grab it from
`google/fonts` (`ofl/anton/Anton-Regular.ttf`) if missing.
