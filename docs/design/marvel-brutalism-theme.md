# Marvel Brutalism — Design Theme

**For:** Doomsday Algorithm (V-TAPP 2026, Data Science Club, VIT-AP)
**Use for:** the participant-facing PPT (`docs/design/`) and any future portal/marketing visuals that need the same identity.
**Style in one line:** a comic-book incursion warning crossed with a raw, unstyled HTML page — no rounded corners, no soft shadows, no gradients-for-decoration-only. Everything looks stamped, not designed.

---

## 1. Why brutalism + Marvel

- **Brutalism** = raw structure shown on purpose. Thick black borders, exposed grid lines, huge blunt type, flat color blocks, deliberate "unfinished" look. No drop shadows, no soft gradients, no rounded corners, no decorative icons.
- **Marvel incursion framing** = this event's own narrative (Earth-4471, Doctor Doom fractured the timeline, "this is not Earth-616"). The visual style should read like a classified in-world dossier — alert, dangerous, official — not a friendly SaaS landing page.
- Together: **stamped warning poster**, not polished product marketing. Bold, loud, high-contrast, slightly aggressive.

## 2. Color palette

Carried forward from the existing portal theme (`doomsday_algorithm_redesign_spec.md` §12) and extended for print/slide use.

| Role | Hex | Notes |
|---|---|---|
| Base background (void black) | `#0C0F12` | primary background, near-black not pure black — matches portal |
| Pure black (borders/text on light) | `#000000` | brutalist borders, hairline rules, outlines |
| Crimson (primary accent) | `#E23636` | headers, key numbers, danger/warning elements |
| Crimson bright (hover/glow) | `#FF6B6B` | glow text-shadow, active states, emphasis |
| Doom green (secondary accent) | `#2ECC71` | "safe"/confirmed data, success states, contrast pop against red |
| Doom green bright | `#58D68D` | glow variant of green |
| Bronze/gold (Marvel classic accent) | `#C9A227` | small accents only — rank medals, judge/official stamps, "Phase" labels. Use sparingly, never as a base color |
| Off-white (body text on dark) | `#F2F0EA` | slightly warm white, not pure `#FFFFFF` — avoids sterile look |
| Concrete gray (structure/dividers) | `#4A4E54` | table borders, disabled states, secondary text |

**Rule of thumb:** every slide/page is 90% black + off-white, with ONE accent color doing the work (usually crimson). Green and bronze are used only when the content is literally about a "safe/confirmed" fact or an official/judging element — never decoratively.

## 3. Typography

- **Display / headlines:** a bold condensed grotesk — **Bebas Neue** (Google Fonts) or **Anton** (Google Fonts) for maximum "stamped poster" impact. All caps. Tight letter-spacing is fine; never soften with lowercase display type.
- **Body / UI text:** a plain, honest grotesk — **Arial** or **Helvetica** (system-safe) or **Inter** (Google Fonts) if available. No italics for emphasis — use bold or color instead.
- **Numbers/data (scores, stats, countdowns):** a monospace face — **JetBrains Mono** or **Roboto Mono** (Google Fonts). Monospace numbers read as "raw data," reinforcing the brutalist/dossier feel.
- **Never use:** script fonts, thin/light weights, serif fonts (except a single ironic "case file" label if wanted), soft rounded fonts (Poppins, Quicksand, etc.).

## 4. Shapes, borders, structure

- **No rounded corners anywhere.** `border-radius: 0` is a hard rule.
- **Thick borders** — 2–4px solid black or crimson around cards, panels, buttons. Borders are structural, not decorative.
- **Flat color blocks**, not gradients — except the one signature effect below.
- **Hard drop shadows only** (offset block shadow, e.g. `4px 4px 0 #000`), never soft/blurred shadows.
- **Exposed grid** — visible dividing lines between sections, like a classified document with rulers. Section numbers ("01 / 06") shown plainly, monospace.
- **One signature glow effect allowed:** crimson text-shadow glow on hero/impact headlines only (`text-shadow: 0 0 20px rgba(226,54,54,0.6)`), echoing the dark hero-video reference look. Used once per page/slide max — overuse kills the brutalist restraint.

## 5. Texture & motifs

- **Halftone dots** (classic comic-book texture) as a subtle background pattern behind section headers — small black or crimson dots, low opacity, never covering text.
- **Warning-stripe motif** (diagonal black/crimson stripes, like hazard tape) for section dividers or "danger/hidden data" callouts (e.g. marking Phase 5 as unknown).
- **Redacted-bar motif** — solid black rectangles over placeholder/hidden text, reinforcing "classified" framing (great for teasing Phase 5 content before reveal).
- **Stamp motif** — a rotated bordered box reading things like "EARTH-4471" or "CLASSIFIED" or "PHASE 5 — LOCKED," used as a corner accent.

## 6. Layout principles

- **Big, blunt hierarchy.** One huge headline, short supporting line, then a hard rule, then content. No small multi-level nested hierarchies.
- **Left-aligned or full-bleed centered — avoid cute asymmetric compositions.** Brutalism reads as institutional, not playful.
- **High contrast always.** Off-white text on near-black background, or black text on a flat crimson/green block. Never place low-contrast text on busy imagery.
- **Whitespace is a wall, not a breath.** Large flat empty black areas are fine and intentional — they aren't "unfinished," they're part of the dossier look.

## 7. Reference points

- **Brutalist web design** (general movement): raw HTML aesthetics, exposed structure, bold Helvetica/grotesk type, hard borders, no decoration — the "brutalist websites" gallery style informs the flat-block/no-gradient rules above.
- **Neubrutalism** (the modern UI flavor): flat bold colors + thick black borders + hard offset shadows + zero border-radius — this is the specific technical rule-set encoded in §4.
- **Marvel Cinematic Universe branding**: condensed bold display type, black/red/gold color language, comic halftone texture — informs the palette (§2) and texture motifs (§5).
- **This project's own existing theme** (`doomsday_algorithm_redesign_spec.md` §12): dark-tech background `#0c0f12`, crimson `#e23636→#ff6b6b`, green `#2ecc71→#58d68d` — this doc extends that exact palette rather than replacing it, so the PPT and the live portal stay visually consistent.

## 8. Quick-reference token sheet

```
BG_VOID        #0C0F12
BLACK          #000000
CRIMSON        #E23636
CRIMSON_GLOW   #FF6B6B
GREEN          #2ECC71
GREEN_GLOW     #58D68D
BRONZE         #C9A227
OFFWHITE       #F2F0EA
GRAY           #4A4E54

FONT_DISPLAY   "Bebas Neue", "Anton", sans-serif (all caps, bold, condensed)
FONT_BODY      "Inter", Arial, Helvetica, sans-serif
FONT_MONO      "JetBrains Mono", "Roboto Mono", monospace

BORDER_RADIUS  0 (always)
BORDER_WEIGHT  2-4px solid
SHADOW         hard offset only, e.g. 4px 4px 0 #000 (never blurred)
```
