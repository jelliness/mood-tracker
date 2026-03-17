import { getLast30Entries, getEntriesForMonth } from '../modules/storage.js'
import { getMoodById, MOODS } from '../modules/moods.js'
import { wordFrequency } from '../modules/sentiment.js'

let chartInstance = null

export function renderInsights() {
  return `
    <div class="card">
      <p class="section-title">30-Day Mood Trend</p>
      <div class="chart-wrap">
        <canvas id="trend-chart"></canvas>
      </div>
    </div>

    <div class="card" style="margin-top:20px;">
      <p class="section-title">This Month</p>
      <div class="cal-grid-header" id="cal-header"></div>
      <div class="cal-grid" id="cal-grid"></div>
      <div class="cal-tooltip" id="cal-tooltip"></div>
    </div>

    <div class="card" style="margin-top:20px;">
      <p class="section-title">Your Emotional Keywords</p>
      <div class="word-cloud" id="word-cloud"></div>
      <p id="word-cloud-empty" style="color:var(--text-muted);font-size:0.88rem;display:none;">
        Write notes on your mood entries to see your emotional vocabulary here.
      </p>
    </div>
  `
}

export async function initInsights() {
  const { Chart, registerables } = await import('chart.js')
  Chart.register(...registerables)

  buildTrendChart(Chart)
  buildCalendar()
  buildWordCloud()
}

// ── 30-day line chart ──────────────────────────────────────────────────────
function buildTrendChart(Chart) {
  const entries = getLast30Entries()
  const canvas = document.getElementById('trend-chart')
  if (!canvas) return

  // Generate last-30-day date labels
  const labels = []
  const moodData = []
  const sentData = []
  const moodColors = []

  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const iso = d.toISOString().slice(0, 10)
    const entry = entries.find((e) => e.id === iso)
    labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
    moodData.push(entry ? entry.moodScore : null)
    sentData.push(entry ? (entry.sentimentScore ?? null) : null)
    moodColors.push(entry ? getMoodById(entry.mood)?.color ?? '#A0A0A0' : 'transparent')
  }

  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }

  chartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Mood Score',
          data: moodData,
          borderColor: '#7c6af7',
          backgroundColor: 'rgba(124,106,247,0.12)',
          tension: 0.4,
          spanGaps: true,
          fill: true,
          pointBackgroundColor: moodColors,
          pointRadius: 5,
          pointHoverRadius: 7,
          yAxisID: 'y',
        },
        {
          label: 'Sentiment',
          data: sentData,
          borderColor: '#FFD700',
          borderDash: [5, 4],
          tension: 0.4,
          spanGaps: true,
          fill: false,
          pointRadius: 3,
          pointHoverRadius: 5,
          yAxisID: 'y2',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: { color: '#9090b0', font: { size: 11 } },
        },
        tooltip: {
          backgroundColor: '#1c1b2e',
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          titleColor: '#eaeaea',
          bodyColor: '#9090b0',
        },
      },
      scales: {
        x: {
          ticks: { color: '#55556a', maxRotation: 45, font: { size: 9 }, maxTicksLimit: 10 },
          grid: { color: 'rgba(255,255,255,0.04)' },
        },
        y: {
          min: -5, max: 5,
          ticks: { color: '#55556a', font: { size: 10 } },
          grid: { color: 'rgba(255,255,255,0.04)' },
          title: { display: true, text: 'Mood', color: '#55556a', font: { size: 10 } },
        },
        y2: {
          position: 'right',
          min: -5, max: 5,
          ticks: { color: '#55556a', font: { size: 10 } },
          grid: { drawOnChartArea: false },
          title: { display: true, text: 'Sentiment', color: '#55556a', font: { size: 10 } },
        },
      },
    },
  })
}

// ── Monthly calendar heatmap ───────────────────────────────────────────────
function buildCalendar() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const entries = getEntriesForMonth(year, month)

  const headerEl = document.getElementById('cal-header')
  const gridEl = document.getElementById('cal-grid')
  const tooltipEl = document.getElementById('cal-tooltip')
  if (!headerEl || !gridEl) return

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  headerEl.innerHTML = dayNames.map((d) => `<div class="cal-day-name">${d}</div>`).join('')

  const firstDay = new Date(year, month - 1, 1).getDay() // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate()
  const todayDate = now.getDate()

  let cells = ''
  // Leading empty cells
  for (let i = 0; i < firstDay; i++) cells += '<div class="cal-cell empty"></div>'

  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const entry = entries.find((e) => e.id === iso)
    const mood = entry ? getMoodById(entry.mood) : null
    const bg = mood ? mood.color : 'var(--surface-2)'
    const isFuture = d > todayDate
    const opacity = isFuture ? 0.3 : 1

    cells += `<div
      class="cal-cell${entry ? ' has-entry' : ''}"
      data-iso="${iso}"
      data-mood="${entry?.mood ?? ''}"
      data-note="${entry ? encodeURIComponent(entry.note ?? '') : ''}"
      style="background:${bg};opacity:${opacity};"
      title="${entry ? mood?.label ?? '' : ''}"
    >
      <span class="cal-cell-day">${d}</span>
    </div>`
  }
  gridEl.innerHTML = cells

  // Tooltip on hover
  gridEl.addEventListener('mouseover', (e) => {
    const cell = e.target.closest('.cal-cell.has-entry')
    if (!cell || !tooltipEl) return
    const mood = getMoodById(cell.dataset.mood)
    const note = decodeURIComponent(cell.dataset.note)
    const noteSnip = note ? `"${note.slice(0, 60)}${note.length > 60 ? '…' : ''}"` : ''
    tooltipEl.innerHTML = `<strong>${mood?.emoji ?? ''} ${mood?.label ?? ''}</strong>${noteSnip ? `<br><em style="color:var(--text-muted)">${noteSnip}</em>` : ''}`
    tooltipEl.classList.add('visible')
  })
  gridEl.addEventListener('mousemove', (e) => {
    if (!tooltipEl) return
    tooltipEl.style.left = `${e.clientX + 12}px`
    tooltipEl.style.top = `${e.clientY - 10}px`
  })
  gridEl.addEventListener('mouseleave', () => tooltipEl?.classList.remove('visible'))
}

// ── Word cloud ─────────────────────────────────────────────────────────────
function buildWordCloud() {
  const entries = getLast30Entries()
  const cloudEl = document.getElementById('word-cloud')
  const emptyEl = document.getElementById('word-cloud-empty')
  if (!cloudEl) return

  const words = wordFrequency(entries).slice(0, 45)
  if (!words.length) {
    cloudEl.style.display = 'none'
    if (emptyEl) emptyEl.style.display = 'block'
    return
  }

  const maxCount = words[0].count
  const minCount = words[words.length - 1].count

  cloudEl.innerHTML = words.map(({ word, count, sentimentAvg }) => {
    const ratio = maxCount === minCount ? 1 : (count - minCount) / (maxCount - minCount)
    const fontSize = 0.75 + ratio * 1.35
    const alpha = 0.5 + ratio * 0.5

    let color
    if (sentimentAvg > 0.5) color = `rgba(120,200,0,${alpha})`
    else if (sentimentAvg < -0.5) color = `rgba(255,99,71,${alpha})`
    else color = `rgba(144,144,176,${alpha})`

    return `<span class="word-tag" style="font-size:${fontSize}rem;color:${color};" title="${count} uses">${word}</span>`
  }).join('')
}
