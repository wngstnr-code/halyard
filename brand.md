# Halyard brand

Borrow more against your tokenized stocks on BNB Chain, safely.

Status: active. Chosen on 2026-10-06: logo A ("Sail and line") and palette 1 ("Silver Harbor").

## Logo

- **Mark:** a mainsail raised on a mast, with a smaller jib at 45% opacity and a curved hull line. The halyard is the line that raises the sail, which stands for more speed under control.
- **Logotype:** the mark followed by the word "Halyard" in the app font (Satoshi, bold, tight tracking).
- **Color:** navy `#0F3562` on silver or white. Silver `#EBEFF2` or white on navy.
- **Favicon:** the sail in `#F6F9FC` on a rounded navy tile (`favicon.ico`). The bare navy sail is used for light browser tabs, and a light sail for dark tabs.
- **Source of truth:** `frontend/src/components/brand/HalyardMark.tsx` (mark), `HalyardLogo.tsx` (logotype) and `HalyardMarkAnimated.tsx` (animated mark on the landing).

## Hero illustration

- **What it shows:** one sailboat in the logo's shape on a calm sea with light streaks, two layers of mountain ridges, white mist bands between them and soft clouds in the sky. The boat sits on the right third so the hero copy on the left stays clean.
- **File:** `frontend/src/components/landing/images/hero-bg-dark.png`, 2912x1632, palette PNG, about 1.6 MB. The landing shows it at 55% opacity over the silver background (raised from 30% so the water, ridges and mist stay readable).
- **Source:** generated from SVG with `sharp` (variant A of two).

## Palette: Silver Harbor

Mood: premium and calm. Silver base, navy accent. Light is the default and only active mode. The dark set exists for later use.

### Seeds

| Role | Light | Dark |
|---|---|---|
| Background | `#ECEFF2` | `#0D1218` |
| Card / elevated | `#FBFCFE` | `#161C24` |
| Primary (navy) | `#0F3562` | `#88B6E6` |
| Primary soft | `#CBDDF2` | `#344F6D` |
| Foreground | `#141B24` | `#EBEFF2` |

### Supporting colors (light)

| Token | Value |
|---|---|
| Secondary text | `#4E5661` |
| Border / divider | `#CBCED1` / `#D6DBE3` |
| Input background | `#E5E8EB` |
| Success | `#007E46` |
| Warning | `#BB7400` |
| Destructive | `#CC272E` |
| Text on navy | `#F6F9FC` (11.65:1 on the navy button gradient) |

### Scales

- **Navy** (`primary` in Chakra): 50 `#F2F7FE`, 100 `#E4EEFA`, 200 `#CDDEF4`, 300 `#ADC6E8`, 400 `#85A7D3`, 500 `#5B82B5`, 600 `#396295`, 700 `#224878`, 800 `#0F3562`, 900 `#08264A`, 950 `#03162E`.
- **Silver neutral** (`gray` and `brown` in Chakra): 50 `#F7FAFE`, 100 `#F1F4F7`, 200 `#E7EAED`, 300 `#D6DBE3`, 400 `#B9BEC6`, 500 `#8D939A`, 600 `#6A6F76`, 700 `#494D54`, 800 `#2A2E34`, 900 `#171B20`.

All text and UI pairs pass WCAG AA in both modes.

### Gradients

- **Primary button:** `linear-gradient(135deg, #224878 0%, #0F3562 60%, #08264A 100%)`
- **Brand accent:** `linear-gradient(45deg, #0F3562 0%, #396295 55%, #85A7D3 100%)`
- **Secondary button:** `linear-gradient(180deg, #FBFCFE 0%, #DCE2E8 100%)`

## Where it is wired (Chakra UI)

| File | What it holds |
|---|---|
| `frontend/src/theme/base/colors.ts` | navy and silver scales, gradients |
| `frontend/src/theme/base/tokens.ts` | light (active) and dark token sets |
| `frontend/src/theme/base/semantic-tokens.ts` | semantic tokens, pointed at the light set |
| `frontend/src/theme/base/components.ts` | primary button uses light text and a navy glow |
| `frontend/src/theme/ThemeProvider.tsx` | color mode pinned to light |
| `frontend/src/lib/halyard/format.ts` | status colors for health (success, warning, danger) |

## Usage

- **Do:** use navy for primary actions, active states and key numbers. Keep surfaces silver or white. Use green, amber and red only for health and status meanings.
- **Don't:** introduce purple, orange or sand gradients. Don't put dark text on the navy button. Don't use the navy fill for large backgrounds; it is an accent.

## Voice

Calm, precise, reassuring. Short sentences with numbers instead of adjectives ("health 1.42", not "very safe"). Never promise returns. Talk about protection and headroom, not hype.
