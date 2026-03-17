# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start Vite dev server (http://localhost:5173)
npm run build    # production build → dist/
npm run preview  # serve the dist/ build locally
```

No test runner is configured. There are no lint commands — the project uses plain ES modules with no TypeScript.

## Architecture

**Stack:** Vite + vanilla JS (no framework), Chart.js (only npm dep, lazy-loaded).

**Entry point:** `index.html` → `src/main.js`

### Module graph

```
src/main.js               Tab router, showToast(), boots "today" view on load
  └─ src/views/today.js         Mood selector, note input, live sentiment display, save
  └─ src/views/insights.js      30-day Chart.js trend, calendar heatmap, word cloud
  └─ src/views/jar.js           SVG mason jar with animated mood bubbles
  └─ src/views/reflections.js   Rule-based text insights + mood distribution bar

src/modules/
  moods.js       MOODS array: id, emoji, label, color, score (-4..+4), Web Audio config
  storage.js     All localStorage access (key: moodjar_entries). saveEntry() upserts by ISO date.
  sentiment.js   AFINN-165 scorer + negation detection. analyzeText() → {score, comparative, tags}
                 wordFrequency() → word counts for the cloud
  audio.js       Web Audio API synthesis. playMoodSound(mood) generates tones from mood.audioConfig
  insights.js    generateInsights(entries) → streak, weekOverWeek, reflectionLines, etc.

src/data/afinn.js   Inline AFINN-165 word→score map (~500 emotional words), no network needed
```

### Data schema (localStorage)

Key `moodjar_entries` stores a sorted array of day entries:
```js
{
  id: "2026-03-17",       // ISO date, primary key (one entry per day — upsert semantics)
  date: "2026-03-17",
  mood: "happy",          // one of 8 mood IDs: ecstatic/happy/calm/meh/anxious/sad/frustrated/angry
  moodScore: 3,           // numeric from MOODS config (-4 to +4)
  note: "...",            // user text, max 500 chars
  sentimentScore: 2.4,    // AFINN comparative score, normalised to -5..+5
  keywords: ["great"],    // top 2-3 AFINN-matched words
  savedAt: 1742220000000  // Date.now()
}
```

### View lifecycle

Each view exports `render()` (returns HTML string) and `init()` (wires events). `main.js` calls `render()` then `init()` on every tab switch — views are fully re-rendered on each activation, so no stale DOM state management is needed. Chart.js is dynamically imported inside `initInsights()` to keep the initial bundle lean.

### Key conventions

- **Mood colours** are CSS custom properties (`--mood-happy`, etc.) in `src/styles/base.css` and also in `moods.js` — keep them in sync when adding moods.
- **CSS animations** for each mood are in `src/styles/moods.css`; the `.selected` class on `.mood-btn` triggers the animation via `animation-name` on `.mood-emoji`.
- **SVG jar** is built inline in `src/views/jar.js` as a template literal. Bubbles are SVG `<circle>` elements injected into `#bubbles-group` and clipped by `#jar-clip`. The float animation starts `paused` and is triggered sequentially via `setTimeout` in `initJar()`.
- **Audio** is synthesized entirely via Web Audio API — no audio files. `AudioContext` is created lazily on first mood button click.
- **No internet required at runtime.** AFINN data is bundled; Chart.js is bundled; no external APIs.
