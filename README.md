# MoodJar 🫙

A privacy-first, offline mood tracking web app built with Vite and vanilla JavaScript. No accounts, no servers — everything lives in your browser.

## Features

- **Daily mood logging** — Choose from 8 moods with animated emoji feedback and optional notes
- **Sentiment analysis** — Live AFINN-165 scoring as you type, with keyword tagging
- **Camera mood detection** — Face expression recognition via face-api.js (TinyFaceDetector), auto-selects your mood from your webcam
- **Dashboard** — 3-column full-width view with:
  - 30-day mood trend line chart (Chart.js)
  - Monthly calendar heatmap
  - Emotional keywords word cloud (SVG spiral layout)
  - Animated Mason jar visualization of recent moods
- **Streak gamification** — Daily logging streak with milestone toasts (3, 7, 14, 30, 50, 100 days)
- **Light / Dark theme** — Persisted preference, no flash on load
- **Zero network dependency at runtime** — AFINN data bundled, Chart.js bundled, face models served locally

## Stack

| Layer | Technology |
|---|---|
| Bundler | Vite |
| Language | Vanilla ES modules (no framework, no TypeScript) |
| Charts | Chart.js (lazy-loaded) |
| Face detection | face-api.js (dynamic import, ~664 KB chunk) |
| Sentiment | AFINN-165 (bundled in `src/data/afinn.js`) |
| Storage | `localStorage` |
| Audio | Web Audio API (synthesized tones, no audio files) |

## Getting Started

```bash
npm install
npm run dev       # dev server at http://localhost:5173
```

```bash
npm run build     # production build → dist/
npm run preview   # serve the dist/ build locally
```

## Project Structure

```
src/
├── main.js                   # Tab router, toast, theme toggle, streak badge
├── views/
│   ├── today.js              # Mood selector, note input, camera integration
│   ├── dashboard.js          # 3-column dashboard compositor
│   ├── insights.js           # Trend chart, calendar heatmap, word cloud
│   ├── jar.js                # SVG Mason jar with animated mood bubbles
│   ├── reflections.js        # Rule-based text insights, mood distribution
│   └── camera.js             # Standalone camera tab
├── modules/
│   ├── moods.js              # MOODS array (id, emoji, label, color, score, audio config)
│   ├── storage.js            # localStorage read/write, entry schema
│   ├── sentiment.js          # AFINN scorer, negation detection, wordFrequency()
│   ├── insights.js           # generateInsights() → streak, weekOverWeek, etc.
│   ├── audio.js              # Web Audio synthesis via mood.audioConfig
│   ├── faceDetection.js      # face-api.js wrapper, expression → mood mapping
│   ├── camera.js             # getUserMedia helper
│   └── moodQuotes.js         # Witty quotes per mood for camera auto-fill
├── data/
│   └── afinn.js              # ~500 word AFINN-165 sentiment map
└── styles/
    ├── base.css              # CSS variables, light/dark themes
    ├── layout.css            # App shell, header, cards, toast
    ├── moods.css             # Today tab, mood buttons, face circle, camera FAB
    ├── insights.css          # Dashboard grid, chart, calendar, word cloud
    ├── jar.css               # SVG jar styles
    ├── reflections.css       # Reflections tab
    └── camera.css            # Standalone camera tab

public/
└── models/                   # face-api.js model weights (~511 KB, served statically)
    ├── tiny_face_detector_model-*
    └── face_expression_model-*
```

## Data Schema

Entries are stored in `localStorage` under `moodjar_entries` as a date-sorted array:

```js
{
  id:             "2026-03-17",   // ISO date — one entry per day (upsert)
  date:           "2026-03-17",
  mood:           "happy",        // ecstatic | happy | calm | meh | anxious | sad | frustrated | angry
  moodScore:      3,              // -4 to +4
  note:           "...",          // max 500 chars
  sentimentScore: 2.4,            // AFINN comparative, normalised to -5..+5
  keywords:       ["great"],      // top AFINN-matched words
  savedAt:        1742220000000   // Date.now()
}
```

## Privacy

All data is stored exclusively in your browser's `localStorage`. Nothing is sent to any server. Clearing site data will erase your entries — consider exporting before doing so.
