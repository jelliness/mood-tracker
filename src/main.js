import { renderToday, initToday } from './views/today.js'
import { renderInsights, initInsights } from './views/insights.js'
import { renderJar, initJar } from './views/jar.js'
import { renderReflections, initReflections } from './views/reflections.js'

// ── View registry ─────────────────────────────────────────────────────────
const VIEWS = {
  today:       { render: renderToday,       init: initToday },
  insights:    { render: renderInsights,    init: initInsights },
  jar:         { render: renderJar,         init: initJar },
  reflections: { render: renderReflections, init: initReflections },
}

let activeTab = null

function activateTab(tab) {
  if (activeTab === tab) return
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
  if (activeTab && activeTab !== 'today') {
    // Silently re-render the other tabs on next activation
    // For the current active tab, just let it be (today view handles its own state)
  }
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

// ── Boot ──────────────────────────────────────────────────────────────────
activateTab('today')
