import { renderToday, initToday } from './views/today.js'
import { renderInsights, initInsights } from './views/insights.js'
import { renderJar, initJar } from './views/jar.js'
import { renderReflections, initReflections } from './views/reflections.js'
import { renderCamera, initCamera, cleanupCamera } from './views/camera.js'
import { stopCamera } from './modules/camera.js'
import { getEntries, getSettings, saveSettings } from './modules/storage.js'
import { generateInsights } from './modules/insights.js'

// ── View registry ─────────────────────────────────────────────────────────
const VIEWS = {
  today:       { render: renderToday,       init: initToday },
  insights:    { render: renderInsights,    init: initInsights },
  jar:         { render: renderJar,         init: initJar },
  reflections: { render: renderReflections, init: initReflections },
  camera:      { render: renderCamera,      init: initCamera },
}

let activeTab = null

function activateTab(tab) {
  if (activeTab === tab) return
  // Stop cameras when leaving their respective tabs
  if (activeTab === 'camera') cleanupCamera()
  if (activeTab === 'today') stopCamera()
  activeTab = tab

  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tab)
    btn.setAttribute('aria-selected', String(btn.dataset.tab === tab))
  })

  // Show/hide views and (re-)render
  document.querySelectorAll('.view').forEach((el) => el.classList.remove('active'))
  const viewEl = document.getElementById(`view-${tab}`)
  if (!viewEl) return

  viewEl.innerHTML = VIEWS[tab].render()
  viewEl.classList.add('active')

  // Async init (insights lazy-loads Chart.js)
  Promise.resolve(VIEWS[tab].init()).catch(console.error)
}

// ── Tab click handler ─────────────────────────────────────────────────────
document.querySelector('.tab-nav')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.tab-btn')
  if (!btn) return
  activateTab(btn.dataset.tab)
})

// ── Re-render active tab when an entry is saved ───────────────────────────
window.addEventListener('moodjar:entry-saved', () => {
  updateStreakBadge()
})

// ── Storage quota warning ─────────────────────────────────────────────────
window.addEventListener('storage:quota-exceeded', () => {
  showToast('⚠️ Storage almost full! Consider exporting your data.')
})

// ── Toast ─────────────────────────────────────────────────────────────────
let toastTimer = null
export function showToast(message, duration = 2600) {
  const el = document.getElementById('toast')
  if (!el) return
  el.textContent = message
  el.classList.add('show')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => el.classList.remove('show'), duration)
}

// ── Theme toggle ──────────────────────────────────────────────────────────
function applyTheme(theme) {
  const root = document.documentElement
  const btn = document.getElementById('theme-toggle')
  if (theme === 'light') {
    root.dataset.theme = 'light'
    if (btn) btn.textContent = '☀️'
  } else {
    delete root.dataset.theme
    if (btn) btn.textContent = '🌙'
  }
}

document.getElementById('theme-toggle')?.addEventListener('click', () => {
  const current = document.documentElement.dataset.theme
  const next = current === 'light' ? 'dark' : 'light'
  applyTheme(next)
  saveSettings({ theme: next })
})

// ── Streak badge ───────────────────────────────────────────────────────────
const STREAK_MILESTONES = new Set([3, 7, 14, 30, 50, 100])
const MILESTONE_MESSAGES = {
  3:   '⚡ 3-day streak! You\'re building a habit.',
  7:   '🔥 One week streak! Incredible consistency!',
  14:  '💫 Two-week streak! Keep it going!',
  30:  '🏆 30-day streak! You\'re on fire!',
  50:  '👑 50 days in a row! Legendary!',
  100: '🌟 100-day streak! Absolutely unstoppable!',
}

let lastKnownStreak = -1

function updateStreakBadge() {
  const entries = getEntries()
  const insights = generateInsights(entries)
  const streak = insights?.streak ?? 0

  const badge = document.getElementById('streak-badge')
  const countEl = document.getElementById('streak-count')
  if (!badge || !countEl) return

  countEl.textContent = streak
  badge.classList.toggle('has-streak', streak > 0)

  // Milestone feedback — only when streak just increased
  if (streak > lastKnownStreak && lastKnownStreak !== -1 && STREAK_MILESTONES.has(streak)) {
    showToast(MILESTONE_MESSAGES[streak], 3500)
    badge.classList.remove('milestone')
    void badge.offsetWidth // reflow to restart animation
    badge.classList.add('milestone')
  }

  lastKnownStreak = streak
}

// ── Boot ──────────────────────────────────────────────────────────────────
applyTheme(getSettings().theme ?? 'light')
updateStreakBadge()
activateTab('today')
