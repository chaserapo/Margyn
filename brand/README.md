# Margyn brand

## Mark

An "M" drawn as a trend line — the second peak sits higher than the first, with
a small gold marker on it. Reads as the letter, a profit trend, and a "here's
your current number" indicator all at once.

## Colors

| Token | Hex | Use |
|---|---|---|
| Brand green | `#1F6F4A` | Primary — icon background, wordmark text, mark on light |
| Cream | `#F7F7F5` | App background, mark on green |
| Gold accent | `#E8A63B` | The marker dot only — don't use it as a fill color elsewhere |

## Files

- `icon.svg` / rendered into `frontend/assets/icon.png` — full app icon (green bg + cream mark)
- `adaptive-foreground.svg` — Android adaptive icon foreground (transparent bg)
- `adaptive-monochrome.svg` — Android 13+ themed icon (single color, tinted by the OS)
- `wordmark-light.svg` / `wordmark-dark.svg` — horizontal lockup for README, web, marketing

Regenerate PNGs from the SVGs with `cairosvg` if you tweak the source files —
sizes used are 1024×1024 (icon/splash), 512×512 (adaptive fg/bg), 432×432
(monochrome), 48×48 (favicon).
