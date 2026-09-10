# DOOMSDAY ALGORITHM — UI DESIGN SPECIFICATION

**Neobrutalism × Marvel Comic · The Earth-4471 Archive**

Data Science Club · VIT-AP · V-TAPP 2026
Target: https://doomsdayalgorithm-5f1e8.web.app

---

## 0. HOW TO USE THIS DOCUMENT

This is an **implementation spec, not a mood board**. Every section below is meant to be executed literally. Read sections 1, 2, and 7 before writing a single line of code — section 7 (The DOM Contract) is the one that will break the entire event if ignored.

Work in this order: §3 tokens → §4 textures → §6 components → §9 page-by-page. Do not start a page until the component library it uses exists.

Anything described as **MUST** is load-bearing. Anything described as *may* is taste.

---

## 1. STACK REALITY — READ THIS FIRST

The inspiration component you were given is **React + Tailwind + shadcn + TypeScript + framer-motion**. This codebase is **none of those things**.

| | Inspiration assumes | This project actually is |
|---|---|---|
| Framework | React 18, JSX | Vanilla DOM, `document.createElement` |
| Styling | Tailwind 4 utility classes | One hand-written `shared/theme.css` |
| Components | shadcn/ui in `/components/ui` | No component system at all |
| Types | TypeScript | Plain ES2017 JS |
| Build | Vite/Next bundler | **No build step.** Files are served exactly as written |
| Deps | npm packages | Two `<script>` CDN tags (Firebase compat SDK) |
| Deploy | Node build → static out | `firebase deploy --only hosting` on the raw folder |

### The ruling: DO NOT MIGRATE TO REACT.

Reasons, in order of weight:

1. **The event runs September 11, 2026.** A framework migration the day before is how a working event becomes a broken one.
2. **The zero-cost architecture depends on the current shape.** Grading runs from a laptop script against Firestore. Adding a bundler adds a build artifact that must be rebuilt and redeployed correctly under time pressure, with no CI to catch a mistake.
3. **Neobrutalism is a CSS aesthetic, not a component aesthetic.** Thick borders, hard offset shadows, flat color, zero radius — every single visual property in the reference is reproducible in plain CSS. Tailwind is a *delivery mechanism* for those properties, not a prerequisite.
4. **The interesting parts of the reference are CSS anyway.** The window chrome, the offset shadow press effect, the flat palette — none of it needs React. The one genuinely JS-driven piece (the rotating headline word) is ~15 lines of vanilla JS.

**What we take from the inspiration:** the windowed-panel motif, the hard-offset shadow language, the flat saturated palette, the confident oversized type, and the press-into-the-shadow interaction.

**What we discard:** the entire toolchain, the video background (2.3 MB over campus wifi, for a page teams look at for eight seconds), and the muted glassmorphic overlay (that is the *opposite* of brutalism — brutalism does not blur).

If someone later insists on React, that is a separate project after the event. Note it and move on.

---

## 2. DESIGN THESIS

Three ideas, layered. Every visual decision must serve at least one.

### 2.1 Neobrutalism — *the structure*

Raw, honest, undecorated. Elements look like physical objects sitting on a surface, casting hard shadows. Nothing is soft, nothing fades, nothing blurs. Borders are visible and thick because the boundary between things is information. Interaction is physical: a button pressed moves *into* its shadow.

**Non-negotiable rules:**
- `border-radius: 0` everywhere. No exceptions. Not on buttons, not on inputs, not on cards.
- Every shadow is `Npx Npx 0` — **zero blur, zero spread**, always pure black.
- No gradients on surfaces. (One exception: the archive banner stripe, §6.2.)
- No `backdrop-filter`, no `opacity` on containers, no translucent panels.
- Every interactive element has a visible black border of at least 3px.
- Color is flat and fully saturated or it is black/paper. No tints, no 60%-opacity greys — if text needs to be quieter, use a *different flat color*, not transparency.

### 2.2 Marvel Comic — *the skin*

Silver-age comic print: newsprint paper, ben-day halftone dots, panel gutters, caption boxes with hard borders, sound-effect lettering, rubber-stamp overprints.

- Panels are laid out like comic panels: rectangular, gutter-separated, irregular sizes.
- Headers behave like **caption boxes** (the yellow box in the corner of a comic panel).
- Emphasis uses **sound-effect type** (`Bangers`) sparingly — maximum one per page.
- Rubber stamps (`CLASSIFIED`, `SEALED`, `TAKEN`) are rotated 4–8° and overprinted at the element's edge.

### 2.3 Earth-4471 — *the twist*

This is not the real Marvel universe, and the site should feel **subtly wrong** — a corrupted archive from a parallel timeline. This is the concept that keeps the design from being generic comic-book pastiche.

Expressed through:
- **Magenta glitch accent** (`--glitch`) used *only* for wrongness: the banner, redacted values, the "not Earth-616" warning, sealed Phase 5 data.
- **Redaction bars** — solid black rectangles over "unknown" values, especially Phase 5.
- **Archive-file framing** — window title bars read like file headers: `EARTH-4471 // FILE: APPEARANCES.CSV`.
- **Registration misprint** — a 1–2px magenta offset ghost behind display headlines, like badly aligned comic printing.

---

## 3. DESIGN TOKENS

Replace the whole of `portal/public/shared/theme.css` with this token block at the top. **Every value below is final** — do not invent new colors or spacing values while implementing.

```css
/* ============================================================
   DOOMSDAY ALGORITHM — DESIGN TOKENS
   Neobrutalism × Marvel × Earth-4471
   ============================================================ */
:root {
  /* ---- INK & PAPER (the two structural colors) ---- */
  --ink:            #0A0A0A;   /* every border, every shadow, most text */
  --paper:          #F2EDE0;   /* aged newsprint — the default page ground */
  --paper-bright:   #FFFBF0;   /* raised surfaces: window bodies, inputs */
  --paper-dark:     #DCD5C4;   /* recessed: table stripes, disabled fills */

  /* ---- MARVEL PRIMARIES (flat, saturated, never tinted) ---- */
  --marvel-red:     #ED1D24;   /* primary action, danger, the brand */
  --marvel-red-deep:#B31217;   /* pressed/hover state of red only */
  --marvel-yellow:  #FFD400;   /* caption boxes, highlights, warnings */
  --marvel-blue:    #0476D9;   /* data, links, informational */
  --marvel-green:   #00A550;   /* success, submitted, verified */

  /* ---- EARTH-4471 CORRUPTION ---- */
  --glitch:         #FF2E88;   /* wrongness ONLY — never decorative */
  --redact:         #0A0A0A;   /* redaction bars (same as ink, named for intent) */

  /* ---- SEMANTIC ALIASES (use these in components) ---- */
  --bg:             var(--paper);
  --surface:        var(--paper-bright);
  --text:           var(--ink);
  --text-quiet:     #55504A;   /* a real color, NOT ink at 60% opacity */
  --accent:         var(--marvel-red);
  --accent-alt:     var(--marvel-yellow);
  --info:           var(--marvel-blue);
  --success:        var(--marvel-green);

  /* ---- BORDERS (only three widths exist) ---- */
  --bw-thin:        2px;
  --bw:             3px;
  --bw-thick:       5px;
  --border:         var(--bw) solid var(--ink);
  --border-thin:    var(--bw-thin) solid var(--ink);
  --border-thick:   var(--bw-thick) solid var(--ink);

  /* ---- HARD SHADOWS (zero blur, always) ---- */
  --sh-xs:          2px 2px 0 var(--ink);
  --sh-sm:          4px 4px 0 var(--ink);
  --sh:             6px 6px 0 var(--ink);
  --sh-lg:          10px 10px 0 var(--ink);
  --sh-xl:          14px 14px 0 var(--ink);
  /* colored shadows for stacked/emphasis elements */
  --sh-red:         6px 6px 0 var(--marvel-red);
  --sh-yellow:      6px 6px 0 var(--marvel-yellow);

  /* ---- SPACING (8px base, no arbitrary values) ---- */
  --s-1: 4px;   --s-2: 8px;   --s-3: 12px;  --s-4: 16px;
  --s-5: 24px;  --s-6: 32px;  --s-7: 48px;  --s-8: 64px;  --s-9: 96px;

  /* ---- TYPE SCALE ---- */
  --font-display: 'Archivo Black', 'Impact', sans-serif;
  --font-body:    'Space Grotesk', 'Helvetica Neue', Arial, sans-serif;
  --font-mono:    'JetBrains Mono', 'Consolas', monospace;
  --font-fx:      'Bangers', 'Impact', cursive;

  --t-xs:    12px;  --t-sm:   14px;  --t-base: 16px;  --t-lg:   19px;
  --t-xl:    24px;  --t-2xl:  32px;  --t-3xl:  44px;  --t-4xl:  64px;
  --t-5xl:   88px;

  --lh-tight: 1.05;  --lh-snug: 1.25;  --lh-body: 1.55;

  /* ---- RADIUS: THERE IS NONE ---- */
  --radius: 0;

  /* ---- MOTION (fast, mechanical, no easing drama) ---- */
  --dur-fast:  80ms;
  --dur:       140ms;
  --dur-slow:  260ms;
  --ease:      cubic-bezier(0.2, 0, 0, 1);
  --press:     translate(3px, 3px);

  /* ---- LAYERS ---- */
  --z-base: 1;  --z-sticky: 50;  --z-nav: 100;  --z-toast: 500;  --z-modal: 900;

  /* ---- LAYOUT ---- */
  --w-narrow:  720px;   /* report, judge */
  --w-content: 960px;   /* landing, question rounds */
  --w-wide:    1240px;  /* draft board, leaderboard */
}
```

### 3.1 Font loading

Add to the `<head>` of **every** page, before `theme.css`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Space+Grotesk:wght@400;500;700&family=JetBrains+Mono:wght@400;700&family=Bangers&display=swap" rel="stylesheet">
```

`display=swap` is mandatory — a blocked font must never blank the page mid-event.

### 3.2 Color usage rules (enforced)

| Color | Use for | NEVER use for |
|---|---|---|
| `--marvel-red` | Primary buttons, active nav, round numbers, danger | Body text, large fills over 30% of viewport |
| `--marvel-yellow` | Caption boxes, highlight bars, "your turn" markers | Text color (fails contrast on paper) |
| `--marvel-blue` | Data values, links, info callouts | Buttons (red owns actions) |
| `--marvel-green` | Submitted ✓, success toasts, verified states | Anything not-yet-successful |
| `--glitch` | Banner, redactions, Phase-5 sealed markers, misprint ghost | Buttons, body copy, decoration |
| `--ink` | All borders, all shadows, all body text | — |

**Contrast floor:** body text on `--paper` must be `--ink` or `--text-quiet`. Never place `--marvel-yellow` text on paper. Never place `--ink` on `--marvel-red` (use `--paper-bright`).

---

## 4. TEXTURES & EFFECTS

Four recipes. Implement all four in `theme.css` as utility classes. All are pure CSS — **no image assets, no downloads**.

### 4.1 Halftone (ben-day dots)

```css
.tex-halftone {
  background-image: radial-gradient(var(--ink) 1px, transparent 1px);
  background-size: 6px 6px;
  background-position: 0 0;
}
.tex-halftone--red {
  background-image: radial-gradient(var(--marvel-red) 1.5px, transparent 1.5px);
  background-size: 8px 8px;
}
/* Halftone used as a fade: dots get sparse toward one edge */
.tex-halftone--fade {
  background-image: radial-gradient(var(--ink) 1px, transparent 1px);
  background-size: 6px 6px;
  -webkit-mask-image: linear-gradient(to bottom, #000, transparent);
          mask-image: linear-gradient(to bottom, #000, transparent);
}
```

Use on: hero panel background, window title bars, leaderboard header, empty states. **Opacity of the effect is controlled by dot size, never by `opacity`.**

### 4.2 Registration misprint (the Earth-4471 tell)

Display headlines get a magenta ghost offset 2px up-left, like a comic printed with the plates misaligned.

```css
.misprint {
  position: relative;
  color: var(--ink);
}
.misprint::before {
  content: attr(data-text);
  position: absolute;
  left: -2px; top: -2px;
  color: var(--glitch);
  z-index: -1;
  pointer-events: none;
}
```

Usage: `<h1 class="misprint" data-text="DOOMSDAY">DOOMSDAY</h1>`. The `data-text` MUST match the visible text exactly.

Apply to: the landing `<h1>` only, and the leaderboard `<h1>`. Overuse kills it.

### 4.3 Rubber stamp

```css
.stamp {
  display: inline-block;
  font-family: var(--font-display);
  font-size: var(--t-sm);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--marvel-red);
  border: var(--bw) solid var(--marvel-red);
  padding: var(--s-1) var(--s-3);
  transform: rotate(-6deg);
  background: transparent;
}
.stamp--taken   { color: var(--ink);    border-color: var(--ink); transform: rotate(4deg); }
.stamp--sealed  { color: var(--glitch); border-color: var(--glitch); }
.stamp--done    { color: var(--marvel-green); border-color: var(--marvel-green); transform: rotate(-3deg); }
```

Use on: drafted character cards (`TAKEN`), Phase-5 references (`SEALED`), completed rounds (`DONE`).

### 4.4 Redaction bar

```css
.redact {
  background: var(--redact);
  color: var(--redact);      /* text present for screen readers, invisible visually */
  user-select: none;
  padding: 0 var(--s-2);
}
.redact::selection { background: var(--redact); color: var(--redact); }
```

Use on: any Phase 5 value shown as a placeholder, the answer-key teaser on the landing page.

---

## 5. TYPOGRAPHY SYSTEM

```css
body {
  font-family: var(--font-body);
  font-size: var(--t-base);
  line-height: var(--lh-body);
  color: var(--text);
  background: var(--bg);
  margin: 0;
  -webkit-font-smoothing: antialiased;
}

h1, .h1 {
  font-family: var(--font-display);
  font-size: clamp(var(--t-3xl), 7vw, var(--t-5xl));
  line-height: var(--lh-tight);
  letter-spacing: -0.02em;
  text-transform: uppercase;
  margin: 0 0 var(--s-4);
}
h2, .h2 {
  font-family: var(--font-display);
  font-size: clamp(var(--t-xl), 4vw, var(--t-2xl));
  line-height: var(--lh-snug);
  letter-spacing: -0.01em;
  text-transform: uppercase;
  margin: 0 0 var(--s-3);
}
h3, .h3 {
  font-family: var(--font-body);
  font-weight: 700;
  font-size: var(--t-lg);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 0 0 var(--s-2);
}
p { margin: 0 0 var(--s-3); max-width: 68ch; }

/* Data, IDs, question codes, percentages, scores — ALWAYS mono */
code, .mono, .num { font-family: var(--font-mono); font-weight: 700; }

/* Sound effect — max one per page */
.fx {
  font-family: var(--font-fx);
  font-size: clamp(var(--t-2xl), 6vw, var(--t-4xl));
  color: var(--marvel-red);
  letter-spacing: 0.02em;
  transform: rotate(-4deg);
  display: inline-block;
}

/* Caption box — the yellow narration box from comics */
.caption {
  display: inline-block;
  background: var(--marvel-yellow);
  border: var(--border);
  box-shadow: var(--sh-sm);
  padding: var(--s-2) var(--s-3);
  font-family: var(--font-body);
  font-weight: 700;
  font-size: var(--t-sm);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
```

**Rule: every number a participant is scored on renders in `--font-mono`, bold.** Percentages, ranks, totals, question IDs, point values. This makes data visually distinct from prose across the whole site.

---

## 6. COMPONENT LIBRARY

Build every one of these in `theme.css` before touching any page.

### 6.1 The Window (`.win`) — THE signature component

This is the motif carried from the reference. **Every content block on the site is a window.** No bare `<div>` panels.

```html
<section class="win">
  <header class="win__bar">
    <span class="win__dots" aria-hidden="true"><i></i><i></i><i></i></span>
    <span class="win__title">EARTH-4471 // ROUND 01 — EXPLORE</span>
  </header>
  <div class="win__body">
    <!-- content -->
  </div>
</section>
```

```css
.win {
  background: var(--surface);
  border: var(--border);
  box-shadow: var(--sh);
  margin-bottom: var(--s-5);
}
.win__bar {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  background: var(--ink);
  color: var(--paper);
  border-bottom: var(--border);
  padding: var(--s-2) var(--s-3);
  font-family: var(--font-mono);
  font-size: var(--t-xs);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.win__dots { display: inline-flex; gap: var(--s-1); flex-shrink: 0; }
.win__dots i {
  width: 11px; height: 11px;
  border: var(--bw-thin) solid var(--paper);
  background: transparent;
  display: block;
}
.win__dots i:first-child { background: var(--marvel-red); }
.win__title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.win__body { padding: var(--s-5); }

/* Variants */
.win--accent  .win__bar { background: var(--marvel-red); }
.win--warn    .win__bar { background: var(--marvel-yellow); color: var(--ink); }
.win--warn    .win__dots i { border-color: var(--ink); }
.win--glitch  .win__bar { background: var(--glitch); }
.win--flush   .win__body { padding: 0; }        /* for tables and boards */
.win--lift    { box-shadow: var(--sh-lg); }     /* hero / leaderboard */
```

**Title bar copy convention** — always `EARTH-4471 // <CONTEXT>`, uppercase, mono:
- `EARTH-4471 // BRIEFING`
- `EARTH-4471 // ROUND 01 — EXPLORE`
- `EARTH-4471 // FILE: APPEARANCES.CSV`
- `EARTH-4471 // DRAFT BOARD — 43 ASSETS`
- `EARTH-4471 // STANDINGS [LIVE]`

### 6.2 Archive banner (`.banner`)

Full-bleed strip at the very top of every page. Already rendered by `shared/banner.js` — restyle only, do not change the JS.

```css
.banner-earth4471 {
  background: var(--glitch);
  color: var(--ink);
  border-bottom: var(--border-thick);
  padding: var(--s-2) var(--s-4);
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: var(--t-xs);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  text-align: center;
}
```

### 6.3 Navigation (`.top-nav`)

Rendered by `shared/nav.js` — restyle only.

```css
nav.top-nav {
  display: flex;
  gap: 0;
  background: var(--paper);
  border-bottom: var(--border-thick);
  padding: 0 var(--s-4);
  position: sticky;
  top: 0;
  z-index: var(--z-nav);
  overflow-x: auto;
}
nav.top-nav a {
  font-family: var(--font-display);
  font-size: var(--t-sm);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ink);
  text-decoration: none;
  padding: var(--s-3) var(--s-4);
  border-right: var(--border);
  white-space: nowrap;
  transition: background var(--dur-fast) var(--ease);
}
nav.top-nav a:first-child { border-left: var(--border); }
nav.top-nav a:hover  { background: var(--marvel-yellow); }
nav.top-nav a.active { background: var(--marvel-red); color: var(--paper-bright); }
```

### 6.4 Buttons

```css
button, .btn {
  font-family: var(--font-display);
  font-size: var(--t-sm);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  background: var(--marvel-red);
  color: var(--paper-bright);
  border: var(--border);
  box-shadow: var(--sh-sm);
  padding: var(--s-3) var(--s-5);
  cursor: pointer;
  transition: transform var(--dur-fast) var(--ease),
              box-shadow var(--dur-fast) var(--ease),
              background var(--dur-fast) var(--ease);
}
button:hover, .btn:hover   { background: var(--marvel-red-deep); }
button:active, .btn:active { transform: var(--press); box-shadow: var(--sh-xs); }
button:focus-visible, .btn:focus-visible {
  outline: var(--bw) solid var(--marvel-blue);
  outline-offset: 3px;
}
button:disabled, .btn:disabled {
  background: var(--paper-dark);
  color: var(--text-quiet);
  box-shadow: none;
  transform: var(--press);
  cursor: not-allowed;
}

/* Variants */
.btn--secondary { background: var(--paper-bright); color: var(--ink); }
.btn--secondary:hover { background: var(--marvel-yellow); }
.btn--ghost { background: transparent; color: var(--ink); box-shadow: none; }
.btn--lg { font-size: var(--t-lg); padding: var(--s-4) var(--s-7); box-shadow: var(--sh); }
.btn--block { display: block; width: 100%; }

/* Submitted state — set by JS changing textContent to 'Submitted ✓' */
.btn--done {
  background: var(--marvel-green);
  color: var(--paper-bright);
  box-shadow: var(--sh-xs);
  transform: var(--press);
  cursor: default;
}
```

**The press effect is the soul of this design.** `transform: translate(3px,3px)` + shadow shrinking from 4px to 2px = the button physically moves into its own shadow. Every clickable thing on the site does this.

### 6.5 Inputs, textareas, range sliders

```css
input[type="text"], input:not([type]), textarea {
  font-family: var(--font-mono);
  font-size: var(--t-base);
  background: var(--paper-bright);
  color: var(--ink);
  border: var(--border);
  box-shadow: inset var(--sh-xs);
  padding: var(--s-3);
  width: 100%;
}
input:focus, textarea:focus {
  outline: none;
  border-color: var(--marvel-blue);
  box-shadow: var(--sh-sm);
}
textarea { resize: vertical; min-height: 72px; }

label {
  display: block;
  font-family: var(--font-body);
  font-weight: 700;
  font-size: var(--t-sm);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: var(--s-2);
}

/* Number inputs used for multichoice probability splits */
input[type="number"] {
  font-family: var(--font-mono);
  font-weight: 700;
  border: var(--border);
  background: var(--paper-bright);
  padding: var(--s-2);
  width: 5rem;
  text-align: center;
}

/* Range slider — the primary Predict/Explore control. Style ALL THREE
   vendor tracks or it silently falls back to the OS default on one browser. */
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 28px;
  background: transparent;
  cursor: pointer;
}
input[type="range"]::-webkit-slider-runnable-track {
  height: 16px;
  background: var(--paper-dark);
  border: var(--border);
}
input[type="range"]::-moz-range-track {
  height: 16px;
  background: var(--paper-dark);
  border: var(--border);
}
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 28px; height: 28px;
  margin-top: -9px;
  background: var(--marvel-red);
  border: var(--border);
  box-shadow: var(--sh-xs);
}
input[type="range"]::-moz-range-thumb {
  width: 28px; height: 28px;
  background: var(--marvel-red);
  border: var(--border);
  box-shadow: var(--sh-xs);
  border-radius: 0;
}

/* Checkbox — judge checklist. Custom, chunky, unmistakable. */
input[type="checkbox"] {
  appearance: none;
  -webkit-appearance: none;
  width: 24px; height: 24px;
  border: var(--border);
  background: var(--paper-bright);
  cursor: pointer;
  vertical-align: middle;
  margin-right: var(--s-2);
  flex-shrink: 0;
}
input[type="checkbox"]:checked {
  background: var(--marvel-red);
  box-shadow: inset 0 0 0 4px var(--paper-bright);
}
```

### 6.6 Question card (`.q`)

Used in Explore and Predict. Built by JS — see §7 for the required DOM.

```css
.q {
  background: var(--surface);
  border: var(--border);
  box-shadow: var(--sh-sm);
  padding: var(--s-5);
  margin-bottom: var(--s-4);
  position: relative;
}
.q__id {
  position: absolute;
  top: calc(-1 * var(--bw));
  left: calc(-1 * var(--bw));
  background: var(--ink);
  color: var(--paper);
  font-family: var(--font-mono);
  font-size: var(--t-xs);
  font-weight: 700;
  padding: var(--s-1) var(--s-2);
  letter-spacing: 0.08em;
}
.q__text {
  font-size: var(--t-lg);
  font-weight: 500;
  margin: var(--s-4) 0 var(--s-5);
  max-width: 60ch;
}
.q__control { display: flex; align-items: center; gap: var(--s-4); flex-wrap: wrap; }
.q__value {
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: var(--t-2xl);
  min-width: 4.5ch;
  text-align: right;
}
.q__options { display: grid; gap: var(--s-3); margin-bottom: var(--s-4); }
.q__option {
  display: flex; align-items: center; justify-content: space-between;
  gap: var(--s-3);
  border: var(--border-thin);
  background: var(--paper);
  padding: var(--s-2) var(--s-3);
}
.q__sum {
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: var(--t-sm);
  padding: var(--s-2) var(--s-3);
  border: var(--border-thin);
  background: var(--paper);
}
.q__sum--bad { background: var(--marvel-yellow); }  /* total ≠ 100 */
.q--answered { box-shadow: var(--sh-xs); transform: var(--press); }
.q--answered .q__id { background: var(--marvel-green); }
```

### 6.7 Character card (`.char`) — Draft board

```css
.char {
  background: var(--surface);
  border: var(--border);
  box-shadow: var(--sh-sm);
  padding: var(--s-4);
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
  min-height: 150px;
  position: relative;
  transition: transform var(--dur-fast) var(--ease),
              box-shadow var(--dur-fast) var(--ease);
}
.char:hover { transform: translate(-2px,-2px); box-shadow: var(--sh); }
.char__name {
  font-family: var(--font-display);
  font-size: var(--t-lg);
  text-transform: uppercase;
  line-height: var(--lh-tight);
}
.char__meta { font-family: var(--font-mono); font-size: var(--t-xs); color: var(--text-quiet); }
.char button { margin-top: auto; }

/* Taken state — dead card, stamped, no hover */
.char--taken {
  background: var(--paper-dark);
  box-shadow: none;
  transform: var(--press);
}
.char--taken:hover { transform: var(--press); box-shadow: none; }
.char--taken .char__name { color: var(--text-quiet); }
.char__stamp { position: absolute; top: var(--s-4); right: var(--s-3); }
```

### 6.8 Leaderboard table (`.board`)

```css
.board { width: 100%; border-collapse: collapse; font-family: var(--font-mono); }
.board th {
  background: var(--ink);
  color: var(--paper);
  font-family: var(--font-display);
  font-size: var(--t-sm);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  text-align: left;
  padding: var(--s-3) var(--s-4);
  border: var(--border);
}
.board td {
  padding: var(--s-3) var(--s-4);
  border: var(--border);
  font-size: var(--t-lg);
  font-weight: 700;
  background: var(--surface);
}
.board tr:nth-child(even) td { background: var(--paper); }
.board tr[data-rank="1"] td { background: var(--marvel-yellow); }
.board tr[data-rank="2"] td { background: var(--paper-dark); }
.board tr[data-rank="3"] td { background: #E8C9A0; }
.board td:first-child { width: 5rem; font-family: var(--font-display); font-size: var(--t-xl); }
```

### 6.9 Step tracker (`.step`) — landing page only

```css
.step { display: grid; grid-template-columns: 72px 1fr; gap: var(--s-4); margin-bottom: var(--s-2); }
.step__num {
  width: 72px; height: 72px;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-display);
  font-size: var(--t-2xl);
  background: var(--marvel-red);
  color: var(--paper-bright);
  border: var(--border);
  box-shadow: var(--sh-sm);
}
.step__num--zero { background: var(--ink); }
.step__rail { grid-column: 1; justify-self: center; width: var(--bw); background: var(--ink); height: var(--s-5); }
.step__time {
  font-family: var(--font-mono);
  font-size: var(--t-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--marvel-red);
  display: block;
  margin-bottom: var(--s-1);
}
```

### 6.10 Toast (`.toast`) — replaces every `alert()`

The current code calls `alert()` for errors and confirmations. `alert()` is a browser-chrome modal that cannot be styled and blocks the page — unacceptable in a designed UI. Add a toast utility to `theme.css` and a `toast()` helper in a new `shared/toast.js`.

```css
.toast-stack {
  position: fixed;
  bottom: var(--s-5); right: var(--s-5);
  z-index: var(--z-toast);
  display: flex; flex-direction: column; gap: var(--s-3);
  max-width: 380px;
}
.toast {
  background: var(--surface);
  border: var(--border);
  box-shadow: var(--sh);
  padding: var(--s-4);
  font-weight: 500;
  animation: toast-in var(--dur-slow) var(--ease);
}
.toast--ok    { border-left: var(--s-2) solid var(--marvel-green); }
.toast--error { border-left: var(--s-2) solid var(--marvel-red); }
.toast--info  { border-left: var(--s-2) solid var(--marvel-blue); }
@keyframes toast-in { from { transform: translateX(20px); opacity: 0; } to { transform: none; opacity: 1; } }
```

```js
// portal/public/shared/toast.js
function toast(message, kind = 'info', ms = 4500) {
  let stack = document.querySelector('.toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    stack.setAttribute('role', 'status');
    stack.setAttribute('aria-live', 'polite');
    document.body.appendChild(stack);
  }
  const el = document.createElement('div');
  el.className = `toast toast--${kind}`;
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(() => el.remove(), ms);
}
```

Then replace every `alert(...)` call across `predict.js`, `draft.js`, `report.js`, `judge.js` with `toast(..., 'error')` or `toast(..., 'ok')`. **Keep the message strings exactly as they are** — they were written to be actionable.

### 6.11 Empty / loading states

Never leave a container blank while data loads. Every async container gets a placeholder.

```css
.placeholder {
  border: var(--bw) dashed var(--ink);
  background: var(--paper);
  padding: var(--s-6);
  text-align: center;
  font-family: var(--font-mono);
  font-size: var(--t-sm);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-quiet);
}
```

Copy, by context:
- Questions loading → `RETRIEVING ARCHIVE…`
- Draft board loading → `SCANNING ROSTER…`
- Leaderboard empty → `NO STANDINGS YET — ARCHIVE QUIET`
- Judge queue done → `QUEUE COMPLETE — NO REPORTS PENDING`
- Load failure → `ARCHIVE UNREACHABLE — CHECK CONNECTION AND RELOAD`

---

## 7. THE DOM CONTRACT — **DO NOT BREAK THIS**

Every JS file queries elements by exact ID. **If you rename or remove any of these, that page silently stops working, and you will not find out until the event.** Restyle freely; never re-key.

You may add wrapper elements, classes, and new markup around these — the requirement is only that an element with the listed ID exists, and (where noted) that a JS-created element keeps its class hooks.

### 7.1 `explore.html` + `predict.html` → `predict.js`

| ID / selector | Role | Notes |
|---|---|---|
| `#team-id-prompt` | Team-ID gate container | JS sets `.style.display = 'none'` |
| `#team-id-input` | Text input | `.value` read on save |
| `#team-id-save` | Button | Click listener attached |
| `#questions` | Question list container | JS sets `.style.display = 'block'`, appends children |
| `window.DOOMSDAY_ROUND` | Round filter | **`explore.html` MUST set this to `'explore'` before loading `predict.js`** |
| `#range-{docId}` | Per-question slider | Created by JS |
| `#val-{docId}` | Live percentage readout | Created by JS |
| `#submit-{docId}` | Per-question submit | Created by JS |
| `#sum-{docId}` | Multichoice total readout | Created by JS |
| `.opt-input` | Multichoice number inputs | Class is queried — **must survive** |
| `data-option` attr | Option name on each input | Read on submit — **must survive** |

> **Because JS builds the question markup, restyling the question card requires editing `predict.js`'s template strings.** Update the HTML *inside* `predict.js` to the `.q` structure in §6.6, keeping every ID and `.opt-input` / `data-option` hook.

### 7.2 `draft.html` → `draft.js`

| ID / selector | Role |
|---|---|
| `#board` | Grid container; JS clears with `innerHTML = ''` and appends `.panel` cards |
| card class `panel` | Set by JS — **change to `char` in `draft.js` when restyling** |
| `data/draft_pool.json` | Fetched at runtime — path must stay relative to the hosting root |

### 7.3 `report.html` → `report.js`

| ID | Role |
|---|---|
| `#report-form` | Container the three prediction blocks append into |
| `#submit-report` | Submit button; listener attached **inside** `loadTopThree()` |
| `#chart-{0..2}` | Textareas, read on submit |
| `#trap-{0..2}` | Textareas, read on submit |

> **Known fragility:** `#submit-report` only becomes functional after `loadTopThree()` resolves. If a team has zero submissions, `top3` is empty and the button still binds but submits an empty `entries` array. Leave the behavior as-is; add a `.placeholder` reading `NO PREDICTIONS FOUND — COMPLETE ROUND 1 OR 2 FIRST` when `top3.length === 0`.

### 7.4 `admin.html` → `admin.js`

| ID | Role |
|---|---|
| `#board` | `<table>`; JS writes full `innerHTML` including `<tr><th>` header row |
| `#reveal-status` | Reveal-state text line |

> To use the `.board` styling in §6.8 and rank-based row colors, edit `admin.js` to emit `<tr data-rank="${r.rank}">` and give the table `class="board"`.

### 7.5 `judge.html` → `judge.js`

| ID / selector | Role |
|---|---|
| `#judge-id-prompt` | Judge-ID gate |
| `#judge-id-input` | Text input |
| `#judge-id-save` | Button |
| `#report-view` | Queue container; JS writes full `innerHTML` |
| `#submit-judge` | Created per report by JS |
| `input[type=checkbox]` + `data-cat` + `data-pts` | **Scoring depends on these attributes. Never remove.** |

### 7.6 Global

| Symbol | Source | Note |
|---|---|---|
| `renderBanner()` | `shared/banner.js` | Prepends `.banner-earth4471` to `<body>` |
| `renderNav(activeId)` | `shared/nav.js` | Inserts `nav.top-nav` as the 2nd body child |
| `firebaseConfig` | `shared/firebaseConfig.js` | Must load before any page script |
| `localStorage['doomsday_team_id']` | All participant pages | The only persistence |

**Nav page IDs** (must match `renderNav()` arguments): `landing`, `explore`, `predict`, `draft`, `report`, `leaderboard`.

---

## 8. SITE MAP

**Seven pages.** Five are participant-facing, two are staff-facing.

```
                        ┌─────────────────────┐
                        │  index.html         │  ← the only entry point
                        │  MISSION BRIEFING   │     participants are given
                        └──────────┬──────────┘
                                   │
      ┌──────────────┬─────────────┼─────────────┬──────────────┐
      ▼              ▼             ▼             ▼              ▼
┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐  ┌───────────┐
│explore    │ │predict    │ │draft      │ │report     │  │admin      │
│.html      │→│.html      │→│.html      │→│.html      │  │.html      │
│ROUND 01   │ │ROUND 02   │ │ROUND 03   │ │ROUND 04   │  │STANDINGS  │
│10 q       │ │24 q       │ │43 assets  │ │3 justif.  │  │projector  │
└───────────┘ └───────────┘ └───────────┘ └───────────┘  └───────────┘
                                                              ▲
                                          ┌───────────┐       │
                                          │judge      │───────┘
                                          │.html      │ scores feed standings
                                          │JUDGE QUEUE│
                                          └───────────┘
                                          (staff URL, not linked in nav)
```

| # | Page | Audience | In nav? | Purpose |
|---|---|---|---|---|
| 1 | `index.html` | Participants | ✅ Home | Full briefing + round tracker. The only page that explains the game. |
| 2 | `explore.html` | Participants | ✅ Explore | Round 1 — 10 lookup questions |
| 3 | `predict.html` | Participants | ✅ Predict | Round 2 — 24 forecast questions |
| 4 | `draft.html` | Participants | ✅ Draft | Round 3 — exclusive character claim |
| 5 | `report.html` | Participants | ✅ Report | Round 4 — written justification |
| 6 | `admin.html` | Everyone (projector) | ✅ Leaderboard | Live rank + total |
| 7 | `judge.html` | Judges only | ❌ **hidden** | Blind scoring queue |

`judge.html` is deliberately absent from `nav.js`. It is reachable only by typing the URL. Keep it that way.

---

## 9. PAGE SPECIFICATIONS

### 9.1 `index.html` — MISSION BRIEFING

**Purpose.** There is no live host at this event. This page is the entire briefing. A team must be able to land here cold and understand the game, the rounds, the scoring, and the time budget without asking anyone.

**Max width:** `--w-content` (960px).

**Wireframe:**

```
╔══════════════════════════════════════════════════════════════╗
║  EARTH-4471 ARCHIVE — This is not Earth-616 …   (magenta)    ║  banner
╠══════════════════════════════════════════════════════════════╣
║ HOME │ EXPLORE │ PREDICT │ DRAFT │ REPORT │ LEADERBOARD      ║  nav (sticky)
╚══════════════════════════════════════════════════════════════╝

  ┌────────────────────────────────────────────────────────┐
  │ ███ EARTH-4471 // BRIEFING                             │  win--lift
  ├────────────────────────────────────────────────────────┤
  │                                                        │
  │   DOOMSDAY          ← .misprint, magenta ghost         │
  │   ALGORITHM         ← 88px Archivo Black, red          │
  │                                                        │
  │   ┌──────────────────────────────────┐                 │
  │   │ MCU PREDICTION CHALLENGE · V-TAPP│ ← .caption      │
  │   └──────────────────────────────────┘                 │
  │                                                        │
  │   You have four completed phases of a film universe    │
  │   that does not exist. Phase 5 ████████████ has not    │
  │   happened. Predict it.                 ↑ .redact      │
  │                                                        │
  │   ┌───────────┐ ┌───────────┐ ┌───────────┐            │
  │   │ 09:00     │ │ ~2.5–3    │ │ 34        │            │  stat trio
  │   │ –18:00    │ │ HOURS     │ │ QUESTIONS │            │
  │   │ WINDOW    │ │ RUNTIME   │ │ TOTAL     │            │
  │   └───────────┘ └───────────┘ └───────────┘            │
  │                                                        │
  │   [ START ROUND 1 → ]  [ DOWNLOAD DATA ]                │
  └────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────┐
  │ ███ EARTH-4471 // ARRIVING LATE?              (yellow) │  win--warn
  ├────────────────────────────────────────────────────────┤
  │ Start anyway. Rounds 1, 2 and 4 score on submit —      │
  │ partial progress keeps every point it earns.           │
  └────────────────────────────────────────────────────────┘

  ┌────┐  ┌────────────────────────────────────────────────┐
  │ 0  │  │ 5 MINUTES                                      │
  │████│  │ SET UP                                         │
  └────┘  │ Pick a team ID · download six files            │
    │     │ films.csv characters.csv appearances.csv …     │
    │     └────────────────────────────────────────────────┘
  ┌────┐  ┌────────────────────────────────────────────────┐
  │ 1  │  │ 30–45 MINUTES · 10 QUESTIONS                   │
  │████│  │ ROUND 01 — EXPLORE                             │
  └────┘  │ Answers are already in your files.             │
    │     │ [ START ROUND 1 → ]                            │
    │     └────────────────────────────────────────────────┘
  ┌────┐  ┌────────────────────────────────────────────────┐
  │ 2  │  │ 60–90 MINUTES · 24 QUESTIONS                   │
  │████│  │ ROUND 02 — PREDICT                             │
  └────┘  │ Phase 5. No file has these answers.            │
    │     │ [ START ROUND 2 → ]                            │
    │     └────────────────────────────────────────────────┘
  ┌────┐  ┌────────────────────────────────────────────────┐
  │ 3  │  │ 5 MINUTES · POOL SHRINKS ALL DAY               │
  │████│  │ ROUND 03 — DRAFT                               │
  └────┘  │ [ START ROUND 3 → ]                            │
    │     └────────────────────────────────────────────────┘
  ┌────┐  ┌────────────────────────────────────────────────┐
  │ 4  │  │ 20–30 MINUTES                                  │
  │████│  │ ROUND 04 — REPORT                              │
  └────┘  │ [ START ROUND 4 → ]                            │
          └────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────┐
  │ ███ EARTH-4471 // SCORING                              │
  ├────────────────────────────────────────────────────────┤
  │   0.5 × ANALYSIS  +  0.2 × DRAFT  +  0.3 × REPORT      │  mono, large
  │                                                        │
  │   YOU SAID │ TRUTH │ POINTS        ← scoring table     │
  │   100%     │ YES   │ 100                               │
  │   90%      │ YES   │ 99                                │
  │   50%      │ EITHER│ 75                                │
  │   90%      │ NO    │ 19                                │
  │   100%     │ NO    │ 0                                 │
  │                                                        │
  │   Honest beats loud.                        ← .fx      │
  └────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────┐
  │ ███ EARTH-4471 // THE ARCHIVE IS NOT CLEAN     (glitch)│  win--glitch
  ├────────────────────────────────────────────────────────┤
  │ Three traps are planted in this data. Naive models     │
  │ will find strong, confident, wrong answers.            │
  │ Catching one earns points in Round 4.                  │
  │                                                        │
  │  ▸ SIMPSON'S PARADOX   ▸ SURVIVORSHIP   ▸ LEAKY COLUMN │
  │    (names only — no explanation. Let them find it.)    │
  └────────────────────────────────────────────────────────┘
```

**Content requirements:**

- The stat trio numbers MUST render in `--font-mono`, `--t-3xl`, bold.
- The six CSV links live inside the Step 0 window, styled as a `.files` row: mono, `--marvel-blue`, underlined, separated by `·`.
- Every "START ROUND N" is a `.btn--lg`.
- **The traps window names the three traps but never explains them.** Naming them is a fair warning; explaining them gives away Round 4 points.
- No countdown timer. There is no shared clock in a drop-in event; a ticking timer would be fiction.

**States:** none. This page is fully static — no Firestore reads, no JS beyond `renderBanner()` / `renderNav('landing')` and the optional headline animation.

**Optional motion (§12.3):** the word after "PREDICT THE" cycles through `UNWRITTEN` / `UNRELEASED` / `UNKNOWABLE`. 15 lines of vanilla JS, no library. Skip it if time is short.

---

### 9.2 `explore.html` — ROUND 01

**Purpose.** Ten questions whose answers are already in the downloaded CSVs. This round exists to force an actual read of the data.

**Max width:** `--w-content`.

**Wireframe:**

```
  banner / nav

  ┌────────────────────────────────────────────────────────┐
  │ ███ EARTH-4471 // ROUND 01 — EXPLORE                    │
  ├────────────────────────────────────────────────────────┤
  │  ROUND 01                              ← .caption      │
  │  EXPLORE                               ← h1            │
  │                                                        │
  │  Every answer is already in the files you downloaded.  │
  │  Nothing here is a prediction.                         │
  │                                                        │
  │  ┌────────┐┌────────┐┌────────┐                        │
  │  │10      ││30–45   ││GRADED  │      ← stat chips      │
  │  │QUESTNS ││MINUTES ││ON      │                        │
  │  │        ││        ││SUBMIT  │                        │
  │  └────────┘└────────┘└────────┘                        │
  │                                                        │
  │  FILES YOU NEED:                                       │
  │  films.csv · characters.csv · appearances.csv ·        │
  │  post_credits.csv                    ← mono, blue      │
  └────────────────────────────────────────────────────────┘

  ┌── TEAM GATE (#team-id-prompt) ─────────────────────────┐
  │ ███ EARTH-4471 // IDENTIFY                     (yellow)│
  ├────────────────────────────────────────────────────────┤
  │ TEAM ID                                                │
  │ [___________________________]  [ CONTINUE ]            │
  │ Use the exact same ID on every page.                   │
  └────────────────────────────────────────────────────────┘

  ── after gate passes, #questions becomes visible ──

  ┌─[e1]───────────────────────────────────────────────────┐
  │                                                        │
  │  Did Earth-4471 Chronicle 4 earn a higher worldwide    │
  │  gross than Earth-4471 Chronicle 19?                   │
  │                                                        │
  │  NO ├──────────●───────────────┤ YES        62 %       │
  │                                                        │
  │                                    [ SUBMIT ]          │
  └────────────────────────────────────────────────────────┘

  ┌─[e5]───────────────────────────────────────────────────┐
  │  Which of these has the most total screentime          │
  │  across Phases 1–4?                                    │
  │                                                        │
  │  ┌──────────────────────────────────┬───────┐          │
  │  │ Nick Fury                        │ [ 25 ]│ %        │
  │  ├──────────────────────────────────┼───────┤          │
  │  │ Riri Williams                    │ [ 25 ]│ %        │
  │  ├──────────────────────────────────┼───────┤          │
  │  │ Loki                             │ [ 25 ]│ %        │
  │  ├──────────────────────────────────┼───────┤          │
  │  │ Okoye                            │ [ 25 ]│ %        │
  │  └──────────────────────────────────┴───────┘          │
  │  TOTAL: 100%                       [ SUBMIT ]          │
  └────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────┐
  │ Check the projector for live standings.  ← quiet note  │
  └────────────────────────────────────────────────────────┘
```

**Question card details:**
- `.q__id` badge shows the raw question ID (`e1`, `e5`) — mono, black tab in the top-left corner, overlapping the border.
- Slider track is labeled `NO` at 0 and `YES` at 100, both in mono `--t-xs`.
- `.q__value` shows the live percentage at `--t-2xl` mono, updating on `input`.
- Multichoice options render as `.q__option` rows with the option name left, number input right.
- `.q__sum` turns `--marvel-yellow` when the total ≠ 100 (advisory only — do not block submission; the scorer normalizes).

**States:**

| State | Visual |
|---|---|
| Loading | `#questions` shows `.placeholder` → `RETRIEVING ARCHIVE…` |
| Gate not passed | `#questions` hidden, `#team-id-prompt` visible |
| Gate passed | `#team-id-prompt` hidden, `#questions` visible |
| Question answered | Button → `SUBMITTED ✓`, `.btn--done` green; card gets `.q--answered` (presses into its shadow, ID badge turns green) |
| Submit failed | `toast(msg,'error')` — card stays interactive |
| Load failed | `.placeholder` → `ARCHIVE UNREACHABLE — CHECK CONNECTION AND RELOAD` |

**Progress affordance (add this).** A sticky bar under the nav: `ROUND 01 ▸ 4 / 10 ANSWERED`, mono, on `--marvel-yellow`, full-width, `border-bottom: var(--border)`. Count is derived client-side from how many buttons carry `.btn--done`. Purely local — **no extra Firestore reads.**

---

### 9.3 `predict.html` — ROUND 02

Structurally identical to Explore. Every difference is copy and emphasis.

| | Explore | Predict |
|---|---|---|
| Title bar | `EARTH-4471 // ROUND 01 — EXPLORE` | `EARTH-4471 // ROUND 02 — PREDICT [SEALED]` |
| Window variant | default | `.win--glitch` on the intro window |
| Stat chips | 10 · 30–45 min · graded on submit | 24 · 60–90 min · Brier scored |
| Framing line | "Every answer is already in your files." | "**No file contains these answers.**" |
| Extra callout | "Files you need: …" | Brier scoring mini-table + trap warning |
| Question ID badges | `e1`–`e10` | `q1`–`q24` |
| Phase 5 mentions | — | Rendered with `.stamp--sealed` beside the heading |

**Add to the Predict intro window** (Explore does not get this):

```
  ┌────────────────────────────────────────────────────────┐
  │ HOW CONFIDENCE IS SCORED                               │
  │  YOU SAY 100% → RIGHT: 100 pts  │  WRONG:   0 pts      │
  │  YOU SAY  90% → RIGHT:  99 pts  │  WRONG:  19 pts      │
  │  YOU SAY  50% → EITHER WAY:  75 pts                    │
  │                                                        │
  │  Skipping = 50%. An honest shrug costs nothing extra.  │
  └────────────────────────────────────────────────────────┘
```

Because 24 questions is a long scroll, **group them visually**: insert a section divider window before each block of question types.

```
  ══ SURVIVAL · 10 QUESTIONS ═════════════════════════════
  ══ TEAM-UPS · 6 QUESTIONS ══════════════════════════════
  ══ CLOSEST PARTNER · 4 QUESTIONS ═══════════════════════
  ══ SCREENTIME · 4 QUESTIONS ════════════════════════════
```

Dividers are derived client-side by inspecting question text — **do not add fields to Firestore for this.** Match on the question text: contains `survive Phase 5` → Survival; `team-up` → Team-ups; `share the most scenes` → Closest partner; `more total screentime` → Screentime. If a match fails, render the question with no divider rather than crashing.

---

### 9.4 `draft.html` — ROUND 03

**Purpose.** Claim one character, exclusively, before someone else does. The only round with genuine time pressure.

**Max width:** `--w-wide` (1240px).

**Wireframe:**

```
  banner / nav

  ┌────────────────────────────────────────────────────────┐
  │ ███ EARTH-4471 // DRAFT BOARD — 43 ASSETS              │
  ├────────────────────────────────────────────────────────┤
  │  ROUND 03                                              │
  │  DRAFT                                                 │
  │                                                        │
  │  Claim ONE character you believe survives Phase 5.     │
  │  First team to claim takes them off the board          │
  │  for everyone else. Permanently.                       │
  │                                                        │
  │  ┌───────────┐ ┌───────────┐ ┌───────────┐             │
  │  │ 31        │ │ 12        │ │ 1         │             │
  │  │ AVAILABLE │ │ CLAIMED   │ │ PICK EACH │             │
  │  └───────────┘ └───────────┘ └───────────┘             │
  │           ↑ live counts from the snapshot              │
  └────────────────────────────────────────────────────────┘

  ┌─────────┐┌─────────┐┌─────────┐┌─────────┐┌─────────┐
  │ MANTIS  ││ LOKI    ││ SHURI   ││ THANOS  ││ VISION  │
  │         ││         ││         ││ ╱TAKEN╲ ││         │
  │         ││         ││         ││         ││         │
  │ [DRAFT] ││ [DRAFT] ││ [DRAFT] ││ dimmed  ││ [DRAFT] │
  └─────────┘└─────────┘└─────────┘└─────────┘└─────────┘
  ┌─────────┐┌─────────┐┌─────────┐┌─────────┐┌─────────┐
  │ …43 cards total, 5 across on desktop                 │
  └─────────┘└─────────┘└─────────┘└─────────┘└─────────┘
```

**Grid:** `repeat(auto-fill, minmax(200px, 1fr))`, gap `--s-4`. Do not hard-code 4 columns — 43 cards at fixed columns leaves an ugly orphan row on most widths.

**Card states:**

| State | Visual |
|---|---|
| Available | `.char`, white surface, `[DRAFT]` red button, lifts on hover |
| Taken by another team | `.char--taken`: grey fill, no shadow, pressed-in, `TAKEN` stamp rotated 4°, name in `--text-quiet`, no button |
| Taken by *this* team | `.char--taken` + `.stamp--done` reading `YOURS`, green |
| This team already picked | All remaining cards lose their button; a sticky yellow bar reads `YOU HAVE DRAFTED — ONE PICK PER TEAM` |
| Pool empty | `.placeholder` → `ROSTER EXHAUSTED — ALL 43 ASSETS CLAIMED` |

**Live updates.** `draft_picks` has an `onSnapshot` listener. A card flipping to taken while the participant watches is the single most dramatic moment in the UI — **give it a transition**: 200ms, card fills grey, stamp scales in from 1.4× to 1×. Do not animate all 43 on first paint (see §12.2).

**Critical:** when restyling, `draft.js` currently sets `card.className = 'panel'`. Change it to `'char'` and rebuild the inner markup to the `.char` structure. Keep the `#board` container ID and the batch-write logic exactly as they are.

---

### 9.5 `report.html` — ROUND 04

**Purpose.** Written justification of the team's three boldest predictions. Judged by hand.

**Max width:** `--w-narrow` (720px) — this is a writing page; long lines hurt.

**Wireframe:**

```
  banner / nav

  ┌────────────────────────────────────────────────────────┐
  │ ███ EARTH-4471 // ROUND 04 — JUSTIFY                   │
  ├────────────────────────────────────────────────────────┤
  │  ROUND 04                                              │
  │  DEFEND YOUR CALLS                                     │
  │                                                        │
  │  We pulled your three boldest predictions. For each,   │
  │  say what in the data backs it — and name any trap     │
  │  you caught.                                           │
  │                                                        │
  │  ┌──────────────────────────────────────────────────┐  │
  │  │ WHAT EARNS POINTS                     (yellow)   │  │
  │  │ ▸ Cite a specific chart or number, not a vibe    │  │
  │  │ ▸ Combine more than one CSV                      │  │
  │  │ ▸ Name a trap and say how you handled it         │  │
  │  │ ▸ Half a page. A stranger should follow it       │  │
  │  │   in under a minute.                             │  │
  │  └──────────────────────────────────────────────────┘  │
  └────────────────────────────────────────────────────────┘

  ┌─ PREDICTION 1 ─────────────────────────────────────────┐
  │  QUESTION q7                          ← mono badge     │
  │  YOU SAID: 92%                        ← mono, red, big │
  │                                                        │
  │  CHART / NUMBER THAT BACKS IT                          │
  │  ┌──────────────────────────────────────────────────┐  │
  │  │                                                  │  │
  │  └──────────────────────────────────────────────────┘  │
  │                                                        │
  │  TRAP NOTICED, AND HOW YOU HANDLED IT                  │
  │  ┌──────────────────────────────────────────────────┐  │
  │  │                                                  │  │
  │  └──────────────────────────────────────────────────┘  │
  └────────────────────────────────────────────────────────┘

  ┌─ PREDICTION 2 ─┐  (same)
  ┌─ PREDICTION 3 ─┐  (same)

              [ SUBMIT REPORT ]        ← .btn--lg, block
```

**Details:**
- Each prediction block is a `.win` with title bar `PREDICTION N`.
- `YOU SAID: 92%` in mono, `--t-2xl`, `--marvel-red`. This is the team's own boldness reflected back — make it loud.
- Textareas: `min-height: 96px`, mono font (they're citing data).
- **Empty state:** if `top3.length === 0`, replace the form with `.placeholder` → `NO PREDICTIONS FOUND — COMPLETE ROUND 1 OR 2 FIRST`, and disable `#submit-report`.
- **Submitted state:** after a successful write, replace the whole form with a success window: green title bar, `REPORT LOGGED`, plus `A judge will score it. You don't have to wait.` Do not leave the form editable — it writes to `reports/{teamId}` and a resubmit silently overwrites.

---

### 9.6 `admin.html` — LIVE STANDINGS (projector)

**Purpose.** Runs on a projector for hours. Read from across a room. This is the one page that should be **dark** — a lit screen in a bright hall, and it is the visual payoff of the whole event.

**Max width:** `--w-wide`. No nav interaction needed, but keep the nav for organizer convenience.

**Inverted palette (scoped to this page only):**

```css
body.projector {
  --bg: var(--ink);
  --surface: #16130F;
  --text: var(--paper);
  --text-quiet: #8A8279;
  background: var(--ink);
}
body.projector .win { border-color: var(--paper); box-shadow: 10px 10px 0 var(--marvel-red); }
body.projector .win__bar { background: var(--marvel-red); color: var(--paper-bright); border-bottom-color: var(--paper); }
body.projector .board th { background: var(--paper); color: var(--ink); border-color: var(--paper); }
body.projector .board td { background: var(--surface); color: var(--paper); border-color: var(--paper); }
body.projector .board tr:nth-child(even) td { background: #1E1A15; }
body.projector .board tr[data-rank="1"] td { background: var(--marvel-yellow); color: var(--ink); }
```

**Wireframe:**

```
╔══════════════════════════════════════════════════════════════╗
║  EARTH-4471 ARCHIVE — …                                      ║
╚══════════════════════════════════════════════════════════════╝

     LIVE STANDINGS               ← .misprint, huge, paper on ink
     ┌──────────────────────────────────┐
     │ PHASE 5 NOT YET REVEALED         │  ← #reveal-status
     └──────────────────────────────────┘     as .stamp--sealed

  ┌────────────────────────────────────────────────────────┐
  │ ███ EARTH-4471 // STANDINGS [LIVE]                      │
  ├────────────────────────────────────────────────────────┤
  │  RANK │ TEAM              │ TOTAL                      │
  │ ══════╪═══════════════════╪══════════════              │
  │   1   │ QUANTUM CORE      │ 84.2      ← yellow row     │
  │   2   │ NULL POINTER      │ 81.7      ← grey row       │
  │   3   │ VARIANCE          │ 79.0      ← bronze row     │
  │   4   │ SIGMA SQUAD       │ 76.4                       │
  │   5   │ …                                              │
  └────────────────────────────────────────────────────────┘
```

**Requirements:**

- Base font size on this page: **`--t-xl` minimum**. Rank column at `--t-3xl`. This is read from 10 metres away.
- Rank 1 row: `--marvel-yellow` background, ink text, and a `.fx` `#1` marker in the margin.
- `#reveal-status` renders as a `.stamp`: `.stamp--sealed` (magenta) while unrevealed, `.stamp--done` (green, reading `PHASE 5 REVEALED — DRAFT FINAL`) after.
- **Empty state:** `.placeholder` → `NO STANDINGS YET — ARCHIVE QUIET`. This is what the room sees at 9:00 AM; make it look intentional, not broken.
- **Rank-change motion:** when a row's rank improves, flash its background to `--marvel-yellow` for 600ms then settle. Track previous ranks in a local object. Do not animate on the first snapshot.
- **Never show per-round breakdowns.** The `leaderboard_public` collection only carries `rank` and `total` by deliberate design — a visible raw Predict score is an answer-extraction oracle. If you find yourself adding columns, stop.

**Auto-refresh safety:** this page sits open for 9 hours. Ensure no unbounded array grows across snapshots (rebuild the table body each time, which the current code already does).

---

### 9.7 `judge.html` — JUDGE QUEUE

**Purpose.** A judge works through submitted reports blind and ticks a checklist. Target: 60–90 seconds per report. **Speed and scannability beat beauty here.**

**Max width:** `--w-narrow`.

**Wireframe:**

```
  banner (no nav — this page is not in the participant flow)

  ┌── #judge-id-prompt ────────────────────────────────────┐
  │ ███ EARTH-4471 // JUDGE ACCESS                 (yellow)│
  ├────────────────────────────────────────────────────────┤
  │  JUDGE ID                                              │
  │  [___________________]   [ START ]                     │
  │  Reports are shown blind. Team names are hidden.       │
  └────────────────────────────────────────────────────────┘

  ── after start, #report-view ──

  ┌────────────────────────────────────────────────────────┐
  │ ███ EARTH-4471 // REPORT 3 OF 11                        │
  ├────────────────────────────────────────────────────────┤
  │  ┌──────────────────────────────────────────────────┐  │
  │  │ q7 · "Screentime dropped every phase, but within │  │
  │  │ Phase 3 alone the correlation flips positive…"   │  │
  │  │ TRAP: "Simpson's paradox — segmented by phase"   │  │
  │  └──────────────────────────────────────────────────┘  │
  │  (one bordered block per prediction, mono, escaped)     │
  └────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────┐
  │ 1 · DATA SOPHISTICATION                    ── / 25     │
  ├────────────────────────────────────────────────────────┤
  │  ☐ Combined more than one data table          +10      │
  │  ☐ Used a real statistic — rate/trend/corr    +10      │
  │  ☐ Tool/method matches the claim               +5      │
  │                              RUNNING: 20 / 25          │
  └────────────────────────────────────────────────────────┘
  ┌ 2 · LOGIC & EVIDENCE      /25 ┐  (4 checks)
  ┌ 3 · VISUALIZATION         /25 ┐  (3 checks)
  ┌ 4 · COMMUNICATION         /25 ┐  (3 checks)

  ┌────────────────────────────────────────────────────────┐
  │  TOTAL                                    68 / 100     │  sticky
  │                            [ SUBMIT AND NEXT → ]       │  bottom
  └────────────────────────────────────────────────────────┘
```

**Requirements:**

- **Add a live running total.** The current code computes the total only on submit. A judge should see the number they're building. Implement with an `input` listener on `#report-view` that sums `:checked` boxes' `data-pts` — **read the same attributes the submit handler uses**, so the two can never disagree.
- The total bar is `position: sticky; bottom: 0`, `--marvel-yellow` background, `border-top: var(--border-thick)`, total in mono at `--t-2xl`.
- Checkboxes are 24px (§6.5). Each check row is a `<label>` with `display:flex; gap: var(--s-3); padding: var(--s-2)`, and the whole row is clickable. `cursor: pointer` on the label.
- Point values right-aligned in mono, `--marvel-blue`.
- Team-authored text (`chartJustification`, `trapNote`) renders in a bordered mono block. **It is already HTML-escaped in `judge.js` — do not remove `escapeHtml()`.** That escaping is a security control: a judge's session can create `judge_scores` documents.
- **Queue complete:** `.placeholder` → `QUEUE COMPLETE — NO REPORTS PENDING`, plus a `.fx` reading `NICE.`
- **Do not display the team ID anywhere.** The queue is blind by design; only the position (`REPORT 3 OF 11`) is shown.

---

## 10. USER FLOWS

### 10.1 Participant (the 2.5–3 hour path)

```
  arrives at venue, given the URL
        │
        ▼
  index.html ─── reads briefing, sees 5 steps ─── downloads 6 CSVs
        │
        ▼
  explore.html ─ types team ID (saved to localStorage, once, forever)
        │        answers 10 lookup questions in their own tools
        │        each submit → green ✓ → graded within ~3s (invisibly)
        ▼
  predict.html ─ same team ID auto-filled — no re-prompt
        │        24 forecast questions, Brier scored
        │        sees confidence table, hunts for traps
        ▼
  draft.html ─── claims 1 character; watches others vanish live
        │        (if they already picked, all buttons are gone)
        ▼
  report.html ── their 3 boldest calls pre-loaded
        │        writes justifications, names a trap
        │        submits → REPORT LOGGED
        ▼
  admin.html ─── (optional) checks the projector for rank
        │
        ▼
  leaves. Draft score posts later, at the 6 PM reveal.
```

**Persistence rule:** the team ID is typed **once**. `localStorage['doomsday_team_id']` is read by every subsequent page. If a team switches laptops they must retype it — the landing page says so.

**Failure paths:**
- Lands on `report.html` first → `prompt()` fallback for team ID, then `NO PREDICTIONS FOUND` placeholder.
- Lands on `draft.html` first → `prompt()` fallback, draft works fine standalone.
- Refreshes mid-round → answered questions do **not** show as answered (submissions aren't re-read on load). This is known and accepted; a resubmit simply overwrites the same document ID. **Do not "fix" this by adding a per-load submissions query** — that multiplies Firestore reads across every team for cosmetic benefit.

### 10.2 Organizer

```
  before 09:00 ─ node grading-server.js (terminal stays open all day)
        │        confirms "Loaded 34 questions … Answer key: present"
        │        opens admin.html on the projector
        ▼
  09:00–18:00 ─ nothing. Watches standings. Assigns team IDs at check-in.
        │
        ▼
  ~18:00 ────── second terminal: node reveal.js
        │        #reveal-status flips to PHASE 5 REVEALED
        │        every team's draft score posts at once
        ▼
  announces winners from the projector
```

### 10.3 Judge

```
  given judge.html URL (not linked anywhere)
        │
        ▼
  types Judge ID ─── queue loads all submitted reports, blind
        │
        ▼
  per report: read 3 justifications → tick boxes → watch running total
        │       → SUBMIT AND NEXT (60–90 seconds)
        ▼
  QUEUE COMPLETE — scores average server-side into each team's total
```

Multiple judges can work the same queue simultaneously under different Judge IDs. The document key is `{judgeId}_{reportId}`, so two judges never collide, and the grading server averages them.

---

## 11. RESPONSIVE

Three breakpoints. No more.

```css
/* Mobile-first base: single column, everything full width */

@media (min-width: 720px) {
  /* stat chips go horizontal; draft board 3 across */
}
@media (min-width: 1024px) {
  /* draft board auto-fill; landing steps get the number rail */
}
@media (min-width: 1440px) {
  /* projector sizing on admin.html only */
}
```

**Per-page rules:**

| Page | < 720px | 720–1024px | > 1024px |
|---|---|---|---|
| index | Step numbers shrink to 48px, sit above the card | Full step layout | Full |
| explore / predict | Slider full width, value below | Side-by-side | Side-by-side |
| draft | 2 cards across | 3 across | auto-fill, 5–6 across |
| report | Single column (already) | Single | Single, 720px max |
| admin | Rank + total only, hide long names with ellipsis | Full table | Projector scale |
| judge | Checks stack, sticky total stays | Full | Full |

**Shadow scaling:** below 720px, reduce `--sh` to `4px 4px 0` and `--sh-lg` to `6px 6px 0`. A 10px offset shadow on a 360px screen eats the layout.

```css
@media (max-width: 719px) {
  :root { --sh: 4px 4px 0 var(--ink); --sh-lg: 6px 6px 0 var(--ink); --sh-xl: 8px 8px 0 var(--ink); }
}
```

**Nav on mobile:** horizontally scrollable (`overflow-x: auto`, already set). Do not build a hamburger menu — six items, and a burger hides the round structure that is the whole point.

---

## 12. MOTION

Motion is **mechanical, fast, and physical**. Nothing floats, nothing fades slowly, nothing eases in a bouncy way. The whole vocabulary is: things move into their shadows, things stamp into place, things flash once.

### 12.1 Interaction motion (required)

| Element | Trigger | Motion |
|---|---|---|
| Button | `:active` | `translate(3px,3px)` + shadow 4px→2px, `80ms` |
| Character card | `:hover` | `translate(-2px,-2px)` + shadow 4px→6px, `80ms` |
| Nav link | `:hover` | background → yellow, `80ms`, no movement |
| Question card | on submit | gains `.q--answered`: presses in, ID badge → green, `140ms` |
| Toast | on create | slide 20px from right + fade, `260ms` |
| Slider thumb | drag | none (native) |

### 12.2 Snapshot motion (careful)

Firestore `onSnapshot` fires once on attach with **every existing document as an "added" change**. Animating that first paint means 43 draft cards or 50 leaderboard rows all animating at once on load — a mess, and janky on a projector left running for hours.

**Rule:** track a `firstPaint` boolean per listener. Skip all entrance animation while it is true; set it false after the first snapshot completes.

```js
let firstPaint = true;
db.collection('draft_picks').onSnapshot(snap => {
  renderBoard(buildTakenMap(snap), { animate: !firstPaint });
  firstPaint = false;
});
```

| Event | Motion (after first paint only) |
|---|---|
| Character becomes taken | Card greys, `TAKEN` stamp scales 1.4→1, `200ms` |
| Leaderboard rank improves | Row background flashes yellow, `600ms`, then settles |
| Reveal flips true | `#reveal-status` stamp swaps sealed→done with a single 300ms scale pop |

### 12.3 Optional: landing headline cycle

```js
// index.html, inline. Cycles the word after "PREDICT THE".
(function () {
  const el = document.getElementById('cycle-word');
  if (!el) return;
  const words = ['UNWRITTEN', 'UNRELEASED', 'UNKNOWABLE'];
  let i = 0;
  setInterval(() => {
    i = (i + 1) % words.length;
    el.style.transform = 'translateY(-100%)';
    el.style.opacity = '0';
    setTimeout(() => {
      el.textContent = words[i];
      el.style.transition = 'none';
      el.style.transform = 'translateY(100%)';
      requestAnimationFrame(() => {
        el.style.transition = 'transform 260ms cubic-bezier(0.2,0,0,1), opacity 260ms';
        el.style.transform = 'translateY(0)';
        el.style.opacity = '1';
      });
    }, 260);
  }, 2600);
})();
```

This is the one idea worth keeping from the React reference. It needs no framer-motion.

### 12.4 Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

The press effect on `:active` may stay — it is a state change, not an animation, and it is the primary affordance.

---

## 13. ACCESSIBILITY & PERFORMANCE

### 13.1 Accessibility floor

- **Contrast:** `--ink` on `--paper` = 15.8:1. `--paper-bright` on `--marvel-red` = 4.9:1 — passes AA for the ≥14px bold button text we use, and nothing smaller. Never put `--marvel-yellow` text on paper.
- **Focus:** every interactive element gets `outline: 3px solid var(--marvel-blue); outline-offset: 3px` on `:focus-visible`. Do not remove outlines.
- **Labels:** every input has a real `<label>`. The judge checklist rows are already labels — keep the input *inside* the label so the whole row is clickable.
- **Live regions:** the toast stack is `role="status" aria-live="polite"`. The leaderboard table gets `aria-live="polite"` so rank changes are announced.
- **Redaction bars** keep their text content (invisible via matching color) so screen readers still read the value — this is decorative redaction, not real secrecy. Never use `.redact` for actual secrets; the answer key's secrecy is enforced by Firestore rules, not CSS.
- **Sliders:** add `aria-label` describing the question, and `aria-valuetext="62 percent"` updated alongside the visible value.

### 13.2 Performance budget

This runs on student laptops over campus wifi for three hours.

| Item | Budget | Note |
|---|---|---|
| Total CSS | < 30 KB | One file, no framework |
| Fonts | 4 families, `display=swap` | ~120 KB — the largest cost, and worth it |
| JS added by redesign | < 5 KB | `toast.js` only |
| Images | **zero** | Every texture is CSS |
| Video | **zero** | The reference's 2.3 MB video is deleted, not adapted |
| Extra Firestore reads | **zero** | Redesign must not add a single query |

**The zero-extra-reads rule is hard.** The Spark free tier allows 50,000 reads/day. Current per-team load is ~34 (questions) + ~43 (draft pool via static JSON, no reads) + a handful. A "show which questions I already answered on reload" feature would add ~34 reads per page load per team — tempting, and not worth the quota risk mid-event.

---

## 14. IMPLEMENTATION ORDER

Do these in order. Each step leaves the site deployable and working.

**Step 1 — Foundation.** Rewrite `shared/theme.css` with §3 tokens, §5 typography, §4 textures. Add the font `<link>` to all 7 pages. Deploy. Site will look half-finished but must not be broken. *Verify: every page still loads, no console errors.*

**Step 2 — Global chrome.** Style `.banner-earth4471` (§6.2) and `nav.top-nav` (§6.3). Do not edit `banner.js` or `nav.js` beyond adding `explore` if missing. *Verify: nav active state correct on all 6 linked pages.*

**Step 3 — Component library.** Add every component in §6 to `theme.css`: `.win`, buttons, inputs, `.q`, `.char`, `.board`, `.step`, `.toast`, `.placeholder`. Nothing uses them yet. *Verify: CSS parses, no page regressions.*

**Step 4 — `index.html`.** Full rebuild to §9.1. Pure markup work, no JS risk. This is the highest-visibility page — get it right. *Verify: screenshot at 360px, 768px, 1440px.*

**Step 5 — `toast.js`.** Add `shared/toast.js`, include it on `predict.html`, `explore.html`, `draft.html`, `report.html`, `judge.html`. Replace every `alert()` with `toast()`, preserving message strings. *Verify: trigger a failed submit, confirm toast appears and auto-dismisses.*

**Step 6 — Question rounds.** Update the template strings inside `predict.js` to the `.q` markup (§6.6), **preserving every ID and the `.opt-input` / `data-option` hooks (§7.1)**. Rebuild `explore.html` and `predict.html` intro windows. Add the sticky progress bar. *Verify: submit one question on each round on the live site; confirm the leaderboard row appears in Firestore.*

**Step 7 — `draft.html`.** Rebuild the intro window; change `draft.js`'s `card.className` from `'panel'` to `'char'` and rebuild card markup. Add live available/claimed counts. Add first-paint guard. *Verify: draft a character in one browser, confirm it flips to TAKEN in a second browser within ~1s.*

**Step 8 — `report.html`.** Rebuild to §9.5, including empty state and submitted state. *Verify: submit a report, confirm `reports/{teamId}` written.*

**Step 9 — `admin.html`.** Add `class="projector"` to `<body>`, apply the inverted palette, update `admin.js` to emit `class="board"` and `data-rank`. Add rank-change flash with first-paint guard. *Verify: leave open 10 minutes with a live submission; no memory growth, no duplicated rows.*

**Step 10 — `judge.html`.** Rebuild to §9.7, add the live running total, sticky total bar. **Confirm `escapeHtml()` is still called on both team-authored fields.** *Verify: score a test report end-to-end, confirm `judge_scores` document and `reportRaw` on the leaderboard.*

**Step 11 — Full pass.** Run every page through the §15 checklist. Delete test data from Firestore. Redeploy.

---

## 15. ACCEPTANCE CHECKLIST

Design:
- [ ] No `border-radius` anywhere except `0`
- [ ] Every shadow is `Npx Npx 0` — zero blur, zero spread
- [ ] No `backdrop-filter`, no translucent panels, no gradients on surfaces
- [ ] No color uses `opacity` for emphasis — quiet text uses `--text-quiet`
- [ ] Every content block is a `.win` with a title bar reading `EARTH-4471 // …`
- [ ] Every scored number renders in `--font-mono`, bold
- [ ] `.misprint` used on exactly two headlines (landing, leaderboard)
- [ ] `.fx` used at most once per page
- [ ] Zero image files, zero video files added

Function (test against the **live deployed site**, not locally):
- [ ] All 7 pages load with zero console errors
- [ ] `explore.html` shows exactly 10 questions; `predict.html` exactly 24
- [ ] A submission on each round writes to `submissions` and produces a `leaderboard` row within ~5s
- [ ] Drafting in browser A flips the card to TAKEN in browser B
- [ ] A second draft attempt by the same team is refused
- [ ] Report page pre-loads the team's three boldest predictions
- [ ] Judge queue scores a report and writes `judge_scores`
- [ ] Leaderboard shows rank + total only — **no per-round columns**
- [ ] `judge.html` is not linked from `nav.js`
- [ ] `escapeHtml()` still called on `chartJustification` and `trapNote`
- [ ] Every `localStorage` read is wrapped or falls back to `prompt()`
- [ ] Zero new Firestore queries added vs. the pre-redesign code

Responsive & a11y:
- [ ] No horizontal body scroll at 360px on any page
- [ ] Tab order reaches every control; focus ring visible on all
- [ ] `prefers-reduced-motion` honored
- [ ] Leaderboard readable from across a room at projector size

---

## 16. DO-NOT LIST

1. **Do not migrate to React, Next, Vite, or Tailwind.** §1.
2. **Do not rename or remove any ID in §7.** The event breaks silently.
3. **Do not add Firestore reads.** §13.2.
4. **Do not add per-round score columns to the leaderboard.** It is an answer-extraction oracle — a team submits 100% on a throwaway ID, reads the score back, and recovers the answer key one question at a time.
5. **Do not remove `escapeHtml()` from `judge.js`.** Team-authored text reaches a privileged session.
6. **Do not link `judge.html` from the nav.**
7. **Do not add a background video.** The reference has one; it costs 2.3 MB over shared campus wifi for eight seconds of viewing.
8. **Do not explain the three traps on the landing page.** Name them; that is the fair warning. Explaining them gives away Round 4 points.
9. **Do not add a countdown timer.** Drop-in event, no shared clock — a timer would be fiction.
10. **Do not soften the aesthetic.** The instinct after two hours of hard borders is to round a corner or blur a shadow. Resist it. Half-brutalism reads as a mistake; full brutalism reads as a decision.
