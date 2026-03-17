import { getEntries } from '../modules/storage.js'
import { generateInsights } from '../modules/insights.js'
import { getMoodById, MOODS } from '../modules/moods.js'

export function renderReflections() {
  return `<div id="refl-content"></div>`
}

export function initReflections() {
  const el = document.getElementById('refl-content')
  if (!el) return

  const entries = getEntries()
  const insights = generateInsights(entries)

  if (!insights || entries.length < 1) {
    el.innerHTML = `
      <div class="card">
        <div class="refl-empty">
          <span class="refl-empty-icon">💭</span>
          <h3>Nothing to reflect on yet</h3>
          <p style="margin-top:8px;color:var(--text-muted)">Log a few days of moods and come back here for personalised weekly reflections.</p>
        </div>
      </div>`
    return
  }

  // ── Quick stats ──────────────────────────────────────────────────────────
  const trendIcon = insights.weekOverWeek === 'improving' ? '📈'
    : insights.weekOverWeek === 'declining' ? '📉' : '〰️'
  const trendClass = insights.weekOverWeek === 'improving' ? 'trend-up'
    : insights.weekOverWeek === 'declining' ? 'trend-down' : 'trend-flat'

  const dominantMood = insights.dominantMood ? getMoodById(insights.dominantMood) : null

  el.innerHTML = `
    <div class="card">
      <p class="section-title">This Week at a Glance</p>
      <div class="refl-stats">
        <div class="refl-stat">
          <div class="refl-stat-val" style="color:var(--accent)">${insights.streak}</div>
          <div class="refl-stat-lbl">Day streak 🔥</div>
        </div>
        <div class="refl-stat">
          <div class="refl-stat-val">${insights.longestStreak}</div>
          <div class="refl-stat-lbl">Best streak</div>
        </div>
        <div class="refl-stat">
          <div class="refl-stat-val ${trendClass}">${trendIcon}</div>
          <div class="refl-stat-lbl">Week trend</div>
        </div>
        <div class="refl-stat">
          <div class="refl-stat-val">${insights.totalLogged}</div>
          <div class="refl-stat-lbl">Total entries</div>
        </div>
        <div class="refl-stat">
          <div class="refl-stat-val">${insights.completenessThisMonth}%</div>
          <div class="refl-stat-lbl">Month logged</div>
        </div>
        ${dominantMood ? `
        <div class="refl-stat">
          <div class="refl-stat-val" style="color:${dominantMood.color}">${dominantMood.emoji}</div>
          <div class="refl-stat-lbl">Top mood (7d)</div>
        </div>` : ''}
      </div>
    </div>

    <div class="card" style="margin-top:20px;">
      <p class="section-title">Weekly Reflections</p>
      ${insights.reflectionLines.map((line) => {
        const [icon, ...rest] = line.split(' ')
        const isEmoji = /^\p{Emoji}/u.test(icon)
        return `<div class="reflection-line">
          ${isEmoji ? `<span class="reflection-icon">${icon}</span><span>${rest.join(' ')}</span>` : `<span>${line}</span>`}
        </div>`
      }).join('')}
    </div>

    ${insights.bestDay || insights.lowDay ? `
    <div class="card" style="margin-top:20px;">
      <p class="section-title">Memorable Days</p>
      ${insights.bestDay ? buildDayHighlight(insights.bestDay, 'Best day') : ''}
      ${insights.lowDay && insights.lowDay.id !== insights.bestDay?.id ? buildDayHighlight(insights.lowDay, 'Toughest day') : ''}
    </div>` : ''}

    <div class="card" style="margin-top:20px;">
      <p class="section-title">Mood Distribution (All Time)</p>
      ${buildMoodBar(entries)}
    </div>
  `
}

function buildDayHighlight(entry, label) {
  const mood = getMoodById(entry.mood)
  const date = new Date(entry.id).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
  return `
    <div class="day-highlight">
      <span class="day-hi-emoji">${mood?.emoji ?? '📅'}</span>
      <div class="day-hi-content">
        <div class="day-hi-date">${label} · ${date}</div>
        <div class="day-hi-label" style="color:${mood?.color ?? 'inherit'}">${mood?.label ?? entry.mood}</div>
        ${entry.note ? `<div class="day-hi-note">"${entry.note}"</div>` : ''}
      </div>
    </div>`
}

function buildMoodBar(entries) {
  if (!entries.length) return '<p style="color:var(--text-muted);font-size:0.88rem;">No data yet.</p>'

  const counts = {}
  entries.forEach((e) => { counts[e.mood] = (counts[e.mood] ?? 0) + 1 })
  const total = entries.length

  return MOODS
    .filter((m) => counts[m.id])
    .sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0))
    .map((m) => {
      const pct = Math.round((counts[m.id] / total) * 100)
      return `
        <div style="margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:0.82rem;">
            <span>${m.emoji} ${m.label}</span>
            <span style="color:var(--text-secondary)">${counts[m.id]} (${pct}%)</span>
          </div>
          <div style="background:var(--surface-2);border-radius:4px;height:8px;overflow:hidden;">
            <div style="width:${pct}%;height:100%;background:${m.color};border-radius:4px;transition:width 0.6s ease;"></div>
          </div>
        </div>`
    }).join('')
}
