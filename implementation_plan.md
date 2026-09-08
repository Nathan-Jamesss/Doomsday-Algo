# Implementation Plan: Doomsday Algorithm Portal

This plan proposes the development of a premium web application for the **V-TAPP 2026 Doomsday Algorithm Competition** organized by the **Data Science Club**. The design will directly mirror the poster's visual themes (red/green portals, Doctor Doom silhouette, scientific probability/pattern displays) and serve as a technical resource, submission hub, and live leaderboard.

---

## Proposed Web Application Structure

The application will be built as a single-page dashboard with three main sections:
1. **Interactive Event Hub (Landing)**: Details, logistics, judging criteria, and downloadable dataset.
2. **Doomsday Data Lab (Interactive Explorer)**: Live visualizations of the MCU dataset (network graphs of character co-appearances, probability curves of screentimes, and box office trends) to give teams analytical ideas.
3. **Logistics & Leaderboard (Portal)**: Submission form for teams, an admin evaluation panel for the organizers (**Nathan James** & **Dr. Yada Nandukumar**), and a live scoreboard.

---

## Technical Details & Component Specifications

### 1. Style & Design (Vanilla CSS)
* **Theme**: Sleek, immersive dark-tech theme matching the poster.
* **Palette**: 
  * Background: Deep matte charcoal/black (`#0c0f12`).
  * Accent Left (Probability & Patterns): Neon crimson red (`#e23636` to `#ff6b6b`).
  * Accent Right (Data & Predictions): Cyber/Gamma green (`#2ecc71` to `#58d68d`).
  * Text: Warm titanium white and muted platinum.
* **Visual Effects**: 
  * Dual-glowing circular radial gradients mimicking the portal on the poster.
  * Particle network animations in the background.
  * Glassmorphism panels (`backdrop-filter: blur()`) with subtle metallic borders.
  * Fonts: Clean, heavy-weighted editorial titles (Outfit / Montserrat) and high-legibility monospace fonts for data.

### 2. Interactive Data Lab (Javascript & Chart.js)
To emphasize the "data and technical" focus of the event, the app will include a live exploratory dashboard featuring:
* **The Pattern Network (Character Co-appearances)**:
  * An interactive node graph (built via canvas or SVG) visualizing character relationships. 
  * Hovering over a character node (e.g., *Doctor Strange*) highlights their scene co-occurrences with others (e.g., *Spider-Man*, *Iron Man*) with customizable edge thicknesses representing shared screetime.
* **The Probability Density Curve (Screentime distribution)**:
  * A bell-curve representation (normal/kernel density estimation) of screetime across all characters in various MCU phases, demonstrating to participants how to fit statistical distributions to the data.
* **The Data Insight Dashboard**:
  * Bar charts comparing dialogue volume vs. character survival metrics across previous crossovers (Avengers, Civil War).
  * Scatter plot showing Box Office Success vs. Number of Character Appearances, allowing participants to examine correlation coefficients.

### 3. Submission Terminal
* A custom interactive form for teams of 1-4 members.
* Inputs: Team Name, Participant Names, Registration IDs, Email, Main Predictions (dropdown/tags), and a direct upload drop-zone for their final report/notebook (simulated or persisted to browser LocalStorage).

### 4. Admin Grading Panel & Live Leaderboard
* **Admin Login**: A hidden panel accessible with a coordinator passkey (for **Nathan James** and **Dr. Yada Nandukumar**).
* **Grading Interface**:
  * Evaluates submitted teams against the four official criteria:
    1. **Data Sophistication (25%)** — Python/SQL/R depth.
    2. **Logic & Evidence (25%)** — Data-backed predictions.
    3. **Visualization (25%)** — Clarity and readability of graphics.
    4. **Communication (25%)** — Narrative quality.
  * Features custom sliders that auto-tally scores.
* **Live Leaderboard**: 
  * Displays real-time standings of all teams.
  * Features a gorgeous animated ranking shift (teams slide up/down depending on score updates).

---

## Proposed Changes in Workspace

We will build this project entirely in the current workspace.

### [NEW] [index.html](file:///c:/Users/natha/Desktop/Organization/DSC/DOOMSDAY/index.html)
* Core structure, housing the dashboard panels, admin modals, forms, and leaderboard layout. Includes links to Chart.js and Google Fonts.

### [NEW] [style.css](file:///c:/Users/natha/Desktop/Organization/DSC/DOOMSDAY/style.css)
* Implements the premium dark-tech system, custom layout grids, glassmorphic panels, glows, and keyframe animations for the glowing red/green portals.

### [NEW] [app.js](file:///c:/Users/natha/Desktop/Organization/DSC/DOOMSDAY/app.js)
* Core logic containing:
  * Mock dataset of MCU character statistics (screetime, co-occurrences, dialogue lines, movie budgets, gross).
  * Data Explorer logic, rendering the SVG network graph and the Chart.js graphs.
  * Form submission logic storing entries in `localStorage` for offline persistence.
  * Admin grading interface and dynamic scoreboard sorting.

### [NEW] [mcu_dataset.json](file:///c:/Users/natha/Desktop/Organization/DSC/DOOMSDAY/mcu_dataset.json)
* Structured dataset (characters, screen time, dialogue, movie metadata) that participants can preview and download directly from the portal.

---

## Open Questions for the User

> [!IMPORTANT]
> 1. **Do you have a specific CSV or JSON dataset already?** If yes, I can read it and pre-load it into the explorer. If not, I will generate a realistic, rich dataset containing accurate character screentimes, co-appearances, and box office metrics based on MCU movies up to *Avengers: Endgame* / *Guardians of the Galaxy Vol 3*.
> 2. **Would you like the submission file-upload to save simulated files in LocalStorage, or simply mock a success message?** (Simulated LocalStorage is great because we can show the actual files in the Admin Panel for grading).

---

## Verification Plan

### Manual Verification
1. **Visual Testing**: Open the app in the browser and verify the responsive layout and dark-tech theme elements (red/green portal styling).
2. **Interactive Chart Testing**: Interact with the character network graph nodes and verify the correlation scatter plots correctly update on hover.
3. **Logistics Workflow**:
   - Register a mock team and submit a mock prediction report.
   - Enter the Admin Panel, grade the team, and verify they appear on the live leaderboard.
   - Verify the score calculation is mathematically accurate.
