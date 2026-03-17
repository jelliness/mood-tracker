import { getEntriesForMonth } from '../modules/storage.js'
import { getMoodById, MOODS } from '../modules/moods.js'

const JAR_W = 220
const JAR_H = 320
const BODY_X = 30
const BODY_Y = 80
const BODY_W = 160
const BODY_H = 200
const NECK_X = 50
const NECK_Y = 55
const NECK_W = 120
const NECK_H = 28

// Usable interior for bubble placement
const INT_X = BODY_X + 12
const INT_Y = BODY_Y + 12
const INT_W = BODY_W - 24
const INT_H = BODY_H - 24

export function renderJar() {
  const now = new Date()
  const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return `
    <div class="jar-view-wrap">
      <div class="jar-header">
        <h2>Your Month in a Jar</h2>
        <p>${monthName}</p>
      </div>

      <div class="jar-svg-wrap" id="jar-svg-wrap">
        <svg
          id="jar-svg"
          class="jar-svg"
          viewBox="0 0 ${JAR_W} ${JAR_H}"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Monthly mood jar"
        >
          <defs>
            <clipPath id="jar-clip">
              <rect x="${BODY_X}" y="${BODY_Y}" width="${BODY_W}" height="${BODY_H}" rx="18" ry="18"/>
            </clipPath>
            <linearGradient id="jar-glass" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stop-color="rgba(180,220,255,0.08)"/>
              <stop offset="35%"  stop-color="rgba(180,220,255,0.18)"/>
              <stop offset="100%" stop-color="rgba(180,220,255,0.04)"/>
            </linearGradient>
            <linearGradient id="lid-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%"   stop-color="#b8860b"/>
              <stop offset="100%" stop-color="#7a5c10"/>
            </linearGradient>
            <filter id="bubble-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.35"/>
            </filter>
          </defs>

          <!-- Jar shadow -->
          <ellipse cx="${BODY_X + BODY_W/2}" cy="${BODY_Y + BODY_H + 10}" rx="70" ry="10"
            fill="rgba(0,0,0,0.4)" filter="url(#bubble-shadow)"/>

          <!-- Jar body fill (glass tint) -->
          <rect x="${BODY_X}" y="${BODY_Y}" width="${BODY_W}" height="${BODY_H}" rx="18"
            fill="url(#jar-glass)" stroke="rgba(180,220,255,0.3)" stroke-width="1.5"/>

          <!-- Neck -->
          <rect x="${NECK_X}" y="${NECK_Y}" width="${NECK_W}" height="${NECK_H}"
            fill="rgba(160,200,240,0.12)" stroke="rgba(180,220,255,0.25)" stroke-width="1.5" rx="4"/>

          <!-- Lid body -->
          <rect x="${NECK_X - 4}" y="${NECK_Y - 28}" width="${NECK_W + 8}" height="30" rx="4"
            fill="url(#lid-grad)"/>
          <!-- Screw threads on lid -->
          ${[0,6,12,18,24].map((dy) => `
            <line x1="${NECK_X - 2}" y1="${NECK_Y - 26 + dy}" x2="${NECK_X + NECK_W + 2}" y2="${NECK_Y - 26 + dy}"
              stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
          `).join('')}
          <!-- Lid top rim -->
          <rect x="${NECK_X - 8}" y="${NECK_Y - 32}" width="${NECK_W + 16}" height="8" rx="3"
            fill="#a07820"/>

          <!-- Bubbles clipped to jar -->
          <g id="bubbles-group" clip-path="url(#jar-clip)" filter="url(#bubble-shadow)"></g>

          <!-- Glass shine overlays (drawn on top of bubbles) -->
          <ellipse cx="${BODY_X + 28}" cy="${BODY_Y + 40}" rx="10" ry="22"
            fill="rgba(255,255,255,0.07)" transform="rotate(-20, ${BODY_X+28}, ${BODY_Y+40})"/>
          <ellipse cx="${BODY_X + 22}" cy="${BODY_Y + 22}" rx="5" ry="10"
            fill="rgba(255,255,255,0.12)" transform="rotate(-20, ${BODY_X+22}, ${BODY_Y+22})"/>

          <!-- Jar body stroke (front) -->
          <rect x="${BODY_X}" y="${BODY_Y}" width="${BODY_W}" height="${BODY_H}" rx="18"
            fill="none" stroke="rgba(180,220,255,0.4)" stroke-width="1.5"/>
        </svg>

        <div class="bubble-tooltip" id="bubble-tooltip"></div>
      </div>

      <div class="jar-stats" id="jar-stats"></div>

      <div class="mood-legend" id="jar-legend"></div>

      <p class="jar-empty" id="jar-empty" style="display:none;">
        No entries logged this month yet. Start logging your mood to fill your jar!
      </p>
    </div>
  `
}

export function initJar() {
  const now = new Date()
  const entries = getEntriesForMonth(now.getFullYear(), now.getMonth() + 1)

  buildBubbles(entries)
  buildStats(entries, now)
  buildLegend(entries)

  // After a brief delay, trigger float animations in sequence
  const bubbles = document.querySelectorAll('.jar-bubble')
  bubbles.forEach((b, i) => {
    setTimeout(() => {
      b.classList.add('animated')
      // After float completes, switch to wobble
      setTimeout(() => {
        b.classList.remove('animated')
        b.classList.add('wobble')
      }, 950)
    }, i * 80)
  })
}

// ── Bubble layout (bottom-up packing) ─────────────────────────────────────
function buildBubbles(entries) {
  const group = document.getElementById('bubbles-group')
  if (!group) return

  if (!entries.length) {
    document.getElementById('jar-empty')?.style.setProperty('display', 'block')
    return
  }

  const tooltip = document.getElementById('bubble-tooltip')
  const wrap = document.getElementById('jar-svg-wrap')

  const bubbles = packBubbles(entries)

  bubbles.forEach((b, idx) => {
    const mood = getMoodById(b.entry.mood)
    const color = mood?.color ?? '#A0A0A0'
    const day = b.entry.id.slice(8)  // "17" from "2026-03-17"

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    g.classList.add('jar-bubble')
    g.setAttribute('data-idx', idx)
    g.style.setProperty('--bubble-dy', `${-(b.fy - b.y)}px`)

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    circle.setAttribute('cx', b.x)
    circle.setAttribute('cy', b.fy)
    circle.setAttribute('r', b.r)
    circle.setAttribute('fill', color)
    circle.setAttribute('opacity', '0.88')
    circle.style.animationDelay = `${idx * 0.08}s`

    // Day number text inside bubble
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    text.setAttribute('x', b.x)
    text.setAttribute('y', b.fy + 4)
    text.setAttribute('text-anchor', 'middle')
    text.setAttribute('fill', 'rgba(255,255,255,0.8)')
    text.setAttribute('font-size', b.r > 13 ? '9' : '7')
    text.setAttribute('font-weight', '700')
    text.setAttribute('pointer-events', 'none')
    text.textContent = day

    g.appendChild(circle)
    g.appendChild(text)
    group.appendChild(g)

    // Tooltip on hover
    g.addEventListener('mouseenter', (e) => {
      if (!tooltip || !wrap) return
      const rect = wrap.getBoundingClientRect()
      const date = new Date(b.entry.id).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      const note = b.entry.note ? `"${b.entry.note.slice(0, 55)}${b.entry.note.length > 55 ? '…' : ''}"` : ''
      tooltip.innerHTML = `<strong>${mood?.emoji ?? ''} ${mood?.label ?? ''}</strong><br><span style="color:var(--text-muted)">${date}</span>${note ? `<br><em style="color:var(--text-secondary);font-size:0.75rem">${note}</em>` : ''}`
      tooltip.classList.add('visible')

      // Position relative to wrap
      const svgEl = document.getElementById('jar-svg')
      const svgRect = svgEl?.getBoundingClientRect()
      if (svgRect) {
        // Bubble SVG coords to screen coords
        const scaleX = svgRect.width / JAR_W
        const scaleY = svgRect.height / JAR_H
        const screenX = svgRect.left - rect.left + b.x * scaleX
        const screenY = svgRect.top - rect.top + b.fy * scaleY
        tooltip.style.left = `${screenX + 10}px`
        tooltip.style.top = `${screenY - 30}px`
      }
    })
    g.addEventListener('mouseleave', () => tooltip?.classList.remove('visible'))
  })
}

function packBubbles(entries) {
  const sorted = [...entries].sort((a, b) => a.id.localeCompare(b.id))
  const placed = []
  const R = 14

  const cols = Math.floor(INT_W / (R * 2 + 2))
  const rows = Math.ceil(sorted.length / cols)

  sorted.forEach((entry, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    // Stagger alternate rows
    const offsetX = (row % 2 === 1) ? R : 0
    const x = INT_X + R + col * (R * 2 + 2) + offsetX
    const fy = INT_Y + INT_H - R - row * (R * 2 + 3)
    placed.push({ entry, x: Math.min(x, INT_X + INT_W - R), fy, y: INT_Y + INT_H - R, r: R })
  })

  return placed
}

// ── Stats ──────────────────────────────────────────────────────────────────
function buildStats(entries, now) {
  const el = document.getElementById('jar-stats')
  if (!el) return

  const daysElapsed = now.getDate()
  const completeness = Math.round((entries.length / daysElapsed) * 100)

  // Dominant mood
  const counts = {}
  entries.forEach((e) => { counts[e.mood] = (counts[e.mood] ?? 0) + 1 })
  const topMoodId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  const topMood = topMoodId ? getMoodById(topMoodId) : null

  el.innerHTML = `
    <div class="jar-stat">
      <div class="jar-stat-value" style="color:var(--accent)">${entries.length}</div>
      <div class="jar-stat-label">Entries</div>
    </div>
    <div class="jar-stat">
      <div class="jar-stat-value">${completeness}%</div>
      <div class="jar-stat-label">Month filled</div>
    </div>
    <div class="jar-stat">
      <div class="jar-stat-value" style="color:${topMood?.color ?? 'inherit'}">${topMood?.emoji ?? '—'}</div>
      <div class="jar-stat-label">${topMood ? `${topMood.label} (${counts[topMoodId]}×)` : 'No entries'}</div>
    </div>
  `
}

// ── Legend ─────────────────────────────────────────────────────────────────
function buildLegend(entries) {
  const el = document.getElementById('jar-legend')
  if (!el) return

  const usedMoodIds = new Set(entries.map((e) => e.mood))
  const usedMoods = MOODS.filter((m) => usedMoodIds.has(m.id))

  if (!usedMoods.length) return
  el.innerHTML = usedMoods.map((m) => `
    <div class="legend-item">
      <span class="legend-dot" style="background:${m.color}"></span>
      <span>${m.emoji} ${m.label}</span>
    </div>
  `).join('')
}
