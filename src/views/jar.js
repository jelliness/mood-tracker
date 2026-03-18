import { getEntriesForMonth } from '../modules/storage.js'
import { getMoodById, MOODS } from '../modules/moods.js'

const JAR_W  = 220
const JAR_H  = 340          // slightly taller than before
const BODY_X = 30
const BODY_Y = 80
const BODY_W = 160
const BODY_H = 220          // taller body to fit larger bubbles
const NECK_X = 50
const NECK_Y = 55
const NECK_W = 120
const NECK_H = 28

// Usable interior
const INT_X = BODY_X + 14
const INT_Y = BODY_Y + 14
const INT_W = BODY_W - 28
const INT_H = BODY_H - 28

const GAP    = 6    // px gap between bubbles
const MIN_R  = 16   // smallest bubble (1 entry)
const MAX_R  = 32   // largest bubble (all entries in month = top mood)

// ── Radius from count ──────────────────────────────────────────────────────
function calcRadius(count, maxCount) {
  if (maxCount <= 1) return (MIN_R + MAX_R) / 2
  return MIN_R + ((count - 1) / (maxCount - 1)) * (MAX_R - MIN_R)
}

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
          <ellipse cx="${BODY_X + BODY_W / 2}" cy="${BODY_Y + BODY_H + 10}" rx="70" ry="10"
            fill="rgba(0,0,0,0.4)" filter="url(#bubble-shadow)"/>

          <!-- Jar body fill -->
          <rect x="${BODY_X}" y="${BODY_Y}" width="${BODY_W}" height="${BODY_H}" rx="18"
            fill="url(#jar-glass)" stroke="rgba(180,220,255,0.3)" stroke-width="1.5"/>

          <!-- Neck -->
          <rect x="${NECK_X}" y="${NECK_Y}" width="${NECK_W}" height="${NECK_H}"
            fill="rgba(160,200,240,0.12)" stroke="rgba(180,220,255,0.25)" stroke-width="1.5" rx="4"/>

          <!-- Lid body -->
          <rect x="${NECK_X - 4}" y="${NECK_Y - 28}" width="${NECK_W + 8}" height="30" rx="4"
            fill="url(#lid-grad)"/>
          ${[0, 6, 12, 18, 24].map((dy) => `
            <line x1="${NECK_X - 2}" y1="${NECK_Y - 26 + dy}" x2="${NECK_X + NECK_W + 2}" y2="${NECK_Y - 26 + dy}"
              stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
          `).join('')}
          <rect x="${NECK_X - 8}" y="${NECK_Y - 32}" width="${NECK_W + 16}" height="8" rx="3"
            fill="#a07820"/>

          <!-- Bubbles clipped to jar interior -->
          <g id="bubbles-group" clip-path="url(#jar-clip)" filter="url(#bubble-shadow)"></g>

          <!-- Glass shine (on top of bubbles) -->
          <ellipse cx="${BODY_X + 28}" cy="${BODY_Y + 40}" rx="10" ry="22"
            fill="rgba(255,255,255,0.07)" transform="rotate(-20, ${BODY_X + 28}, ${BODY_Y + 40})"/>
          <ellipse cx="${BODY_X + 22}" cy="${BODY_Y + 22}" rx="5" ry="10"
            fill="rgba(255,255,255,0.12)" transform="rotate(-20, ${BODY_X + 22}, ${BODY_Y + 22})"/>

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

  // Stagger float animations, then switch to wobble
  document.querySelectorAll('.jar-bubble').forEach((b, i) => {
    setTimeout(() => {
      b.classList.add('animated')
      setTimeout(() => {
        b.classList.remove('animated')
        b.classList.add('wobble')
      }, 950)
    }, i * 120)
  })
}

// ── Build count-based bubbles ──────────────────────────────────────────────
function buildBubbles(entries) {
  const group = document.getElementById('bubbles-group')
  if (!group) return

  if (!entries.length) {
    document.getElementById('jar-empty')?.style.setProperty('display', 'block')
    return
  }

  // Tally count per mood
  const counts = {}
  for (const e of entries) counts[e.mood] = (counts[e.mood] ?? 0) + 1
  const maxCount = Math.max(...Object.values(counts))
  const total = entries.length

  // Build bubble descriptors sorted by count descending (largest first)
  const bubbles = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([moodId, count]) => ({
      moodId,
      count,
      r: calcRadius(count, maxCount),
    }))

  const placed = packBubbles(bubbles)
  const tooltip = document.getElementById('bubble-tooltip')
  const wrap    = document.getElementById('jar-svg-wrap')

  placed.forEach((b, idx) => {
    const mood  = getMoodById(b.moodId)
    const color = mood?.color ?? '#A0A0A0'
    const pct   = Math.round((b.count / total) * 100)

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    g.classList.add('jar-bubble')
    g.setAttribute('data-idx', idx)

    // Main circle
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    circle.setAttribute('cx', b.x)
    circle.setAttribute('cy', b.fy)
    circle.setAttribute('r',  b.r)
    circle.setAttribute('fill', color)
    circle.setAttribute('opacity', '0.9')
    circle.style.animationDelay = `${idx * 0.12}s`
    g.appendChild(circle)

    // Highlight sheen
    const sheen = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse')
    sheen.setAttribute('cx', b.x - b.r * 0.25)
    sheen.setAttribute('cy', b.fy - b.r * 0.3)
    sheen.setAttribute('rx', b.r * 0.35)
    sheen.setAttribute('ry', b.r * 0.22)
    sheen.setAttribute('fill', 'rgba(255,255,255,0.28)')
    sheen.setAttribute('pointer-events', 'none')
    g.appendChild(sheen)

    // Emoji (top half of bubble)
    const emojiFontSize = Math.max(9, Math.min(b.r * 0.85, 20))
    const emojiY = b.r >= 22 ? b.fy - b.r * 0.18 : b.fy
    const emojiEl = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    emojiEl.setAttribute('x', b.x)
    emojiEl.setAttribute('y', emojiY)
    emojiEl.setAttribute('text-anchor', 'middle')
    emojiEl.setAttribute('dominant-baseline', 'central')
    emojiEl.setAttribute('font-size', emojiFontSize)
    emojiEl.setAttribute('pointer-events', 'none')
    emojiEl.textContent = mood?.emoji ?? '●'
    g.appendChild(emojiEl)

    // Count (below emoji when bubble is large enough)
    if (b.r >= 22) {
      const countEl = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      countEl.setAttribute('x', b.x)
      countEl.setAttribute('y', b.fy + b.r * 0.42)
      countEl.setAttribute('text-anchor', 'middle')
      countEl.setAttribute('dominant-baseline', 'central')
      countEl.setAttribute('font-size', Math.max(7, Math.min(b.r * 0.38, 12)))
      countEl.setAttribute('font-weight', '700')
      countEl.setAttribute('fill', 'rgba(255,255,255,0.9)')
      countEl.setAttribute('pointer-events', 'none')
      countEl.textContent = `${b.count}d`
      g.appendChild(countEl)
    }

    group.appendChild(g)

    // Tooltip
    g.addEventListener('mouseenter', (e) => {
      if (!tooltip || !wrap) return
      const svgRect = document.getElementById('jar-svg')?.getBoundingClientRect()
      const wrapRect = wrap.getBoundingClientRect()
      tooltip.innerHTML = `
        <strong>${mood?.emoji ?? ''} ${mood?.label ?? b.moodId}</strong><br>
        <span style="color:var(--text-secondary)">${b.count} day${b.count !== 1 ? 's' : ''} &nbsp;·&nbsp; ${pct}% of month</span>`
      tooltip.classList.add('visible')
      if (svgRect) {
        const scaleX = svgRect.width  / JAR_W
        const scaleY = svgRect.height / JAR_H
        tooltip.style.left = `${svgRect.left - wrapRect.left + b.x * scaleX + 12}px`
        tooltip.style.top  = `${svgRect.top  - wrapRect.top  + b.fy * scaleY - 32}px`
      }
    })
    g.addEventListener('mouseleave', () => tooltip?.classList.remove('visible'))
  })
}

// ── Row-based bottom-up packing ────────────────────────────────────────────
// Bubbles arrive sorted largest→smallest.
function packBubbles(bubbles) {
  const rows = []
  let current = []
  let currentW = 0

  for (const b of bubbles) {
    const needed = b.r * 2 + (current.length > 0 ? GAP : 0)
    if (current.length > 0 && currentW + needed > INT_W) {
      rows.push(current)
      current  = [b]
      currentW = b.r * 2
    } else {
      current.push(b)
      currentW += needed
    }
  }
  if (current.length) rows.push(current)

  // Assign (x, fy) bottom-up
  const placed = []
  let bottomY = INT_Y + INT_H   // current bottom edge

  // Rows are already top-to-bottom order here; we want to place from bottom up.
  // Reverse so the first (largest) row ends up at the bottom.
  for (const row of [...rows].reverse()) {
    const rowMaxR = Math.max(...row.map((b) => b.r))
    const rowW    = row.reduce((s, b) => s + b.r * 2, 0) + GAP * (row.length - 1)
    let x = INT_X + (INT_W - rowW) / 2

    const fy = bottomY - rowMaxR   // y of circle centres in this row

    for (const b of row) {
      // Vertically centre each bubble within the row's max-radius band
      placed.push({ ...b, x: x + b.r, fy: fy + (rowMaxR - b.r) })
      x += b.r * 2 + GAP
    }
    bottomY = fy - rowMaxR - GAP
  }

  return placed
}

// ── Stats ──────────────────────────────────────────────────────────────────
function buildStats(entries, now) {
  const el = document.getElementById('jar-stats')
  if (!el) return

  const daysElapsed  = now.getDate()
  const completeness = Math.round((entries.length / daysElapsed) * 100)

  const counts   = {}
  entries.forEach((e) => { counts[e.mood] = (counts[e.mood] ?? 0) + 1 })
  const topId    = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  const topMood  = topId ? getMoodById(topId) : null

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
      <div class="jar-stat-label">${topMood ? `${topMood.label} (${counts[topId]}×)` : 'No entries'}</div>
    </div>
  `
}

// ── Legend (sorted by count descending) ───────────────────────────────────
function buildLegend(entries) {
  const el = document.getElementById('jar-legend')
  if (!el) return

  const counts = {}
  entries.forEach((e) => { counts[e.mood] = (counts[e.mood] ?? 0) + 1 })

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
  if (!sorted.length) return

  el.innerHTML = sorted.map(([moodId, count]) => {
    const mood = getMoodById(moodId)
    if (!mood) return ''
    return `
      <div class="legend-item">
        <span class="legend-dot" style="background:${mood.color}"></span>
        <span>${mood.emoji} ${mood.label} — ${count} day${count !== 1 ? 's' : ''}</span>
      </div>`
  }).join('')
}
