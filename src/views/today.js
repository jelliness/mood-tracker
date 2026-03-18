import { MOODS } from '../modules/moods.js'
import { analyzeText } from '../modules/sentiment.js'
import { getEntryByDate, saveEntry, buildEntry, getSettings } from '../modules/storage.js'
import { playMoodSound } from '../modules/audio.js'
import { loadModels, detectMood } from '../modules/faceDetection.js'
import { startCamera, stopCamera } from '../modules/camera.js'
import { getRandomQuote } from '../modules/moodQuotes.js'
import { showToast } from '../main.js'

const MAX_NOTE = 500

// ── Module state ───────────────────────────────────────────────────────────
let selectedMoodIdx  = null
let sentimentResult  = { score: 0, comparative: 0, tags: [], positive: [], negative: [] }
let debounceTimer    = null

// Camera state
let camInterval      = null
let lastCamMoodId    = null
let camStableCount   = 0
const CAM_STABLE_FRAMES   = 2     // frames at same mood before auto-select
const CAM_CONF_THRESHOLD  = 0.68  // minimum confidence to preview/select
const CAM_POLL_MS         = 750

// ── Greeting ────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning! 🌅'
  if (h < 17) return 'Good afternoon! ☀️'
  return 'Good evening! 🌙'
}

// ── render() ──────────────────────────────────────────────────────────────
export function renderToday() {
  const moodButtons = MOODS.map((m, i) => `
    <button class="mood-btn" data-idx="${i}" data-mood="${m.id}"
            style="--mc:${m.color}" aria-label="${m.label}" role="radio" aria-checked="false">
      <span class="mood-btn-circle">${m.emoji}</span>
      <span class="mood-btn-label">${m.label}</span>
    </button>`).join('')

  return `
    <div class="today-screen">

      <div class="today-greeting">
        <p id="today-date" class="greeting-date"></p>
        <h1 class="greeting-title">${getGreeting()}<br><span>How are you feeling?</span></h1>
      </div>

      <div class="mood-face-wrap">
        <!-- Outer: positions the FAB relative to the circle -->
        <div class="mood-face-outer">
          <div class="mood-face-circle" id="mood-face-circle">
            <span class="mood-face-emoji" id="mood-face-emoji">😶</span>
            <video id="today-cam-video" class="face-cam-video" autoplay playsinline muted></video>
            <div class="face-cam-overlay" id="face-cam-overlay">
              <span id="face-cam-spinner">⏳</span>
            </div>
            <div class="face-cam-badge" id="face-cam-badge"></div>
          </div>
          <!-- Camera FAB clipped to circle edge -->
          <button class="btn-cam-toggle" id="btn-cam-toggle"
                  aria-pressed="false" title="Detect with camera">📷</button>
        </div>

        <!-- Single status line: hint OR selected mood name -->
        <p class="mood-status-text" id="mood-status-text">Tap a mood below</p>
      </div>

      <div class="mood-selector-wrap">
        <div class="mood-buttons-row" id="mood-buttons-row" role="radiogroup" aria-label="Mood selection">
          ${moodButtons}
        </div>
      </div>

      <div class="today-note-card card">
        <p class="section-title">Add a note
          <span style="color:var(--text-muted);font-weight:400;text-transform:none;">(optional)</span>
        </p>
        <textarea id="note-input" class="note-textarea" maxlength="${MAX_NOTE}"
          placeholder="What's on your mind? How did your day go?"></textarea>
        <div class="char-counter" id="char-counter">0 / ${MAX_NOTE}</div>

        <div id="sentiment-wrap" style="display:none;margin-top:8px;">
          <div class="sentiment-bar-wrap">
            <span style="font-size:0.78rem;color:var(--text-secondary);">Vibe</span>
            <div class="sentiment-bar-track">
              <div class="sentiment-bar-fill" id="sent-bar"></div>
            </div>
            <span class="sentiment-score" id="sent-score">0.0</span>
          </div>
          <div class="sentiment-tags" id="sent-tags"></div>
        </div>
      </div>

      <button class="btn-save-mood" id="save-btn" disabled>Confirm mood →</button>
      <p id="edit-note" style="font-size:0.82rem;color:var(--text-muted);text-align:center;display:none;">
        ✏️ Editing today's entry
      </p>

    </div>`
}

// ── initToday() ───────────────────────────────────────────────────────────
export function initToday() {
  selectedMoodIdx = null
  closeTodayCamera()   // ensure clean state on re-render

  const today    = new Date()
  const isoToday = today.toISOString().slice(0, 10)

  const dateEl = document.getElementById('today-date')
  if (dateEl) {
    dateEl.textContent = today.toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
    })
  }

  // Pre-fill existing entry for today
  const existing = getEntryByDate(isoToday)
  if (existing) {
    const idx = MOODS.findIndex((m) => m.id === existing.mood)
    if (idx >= 0) selectMoodByIndex(idx, false)
    const noteEl = document.getElementById('note-input')
    if (noteEl) noteEl.value = existing.note ?? ''
    updateCharCounter(existing.note?.length ?? 0)
    if (existing.note) updateSentiment(existing.note)
    document.getElementById('edit-note')?.style.setProperty('display', 'block')
  }

  initMoodButtons()
  initCameraToggle()

  const noteInput = document.getElementById('note-input')
  noteInput?.addEventListener('input', () => {
    updateCharCounter(noteInput.value.length)
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => updateSentiment(noteInput.value), 150)
  })

  document.getElementById('save-btn')?.addEventListener('click', handleSave)
}

// ── Mood buttons ───────────────────────────────────────────────────────────
function initMoodButtons() {
  document.querySelectorAll('.mood-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      closeTodayCamera()
      selectMoodByIndex(Number(btn.dataset.idx), true)
    })
  })
}

// ── selectMoodByIndex ──────────────────────────────────────────────────────
function selectMoodByIndex(idx, playSound) {
  if (selectedMoodIdx === idx) return
  selectedMoodIdx = idx
  const mood = MOODS[idx]

  document.querySelectorAll('.mood-btn').forEach((btn, i) => {
    btn.classList.toggle('selected', i === idx)
    btn.classList.remove('camera-preview')
    btn.setAttribute('aria-checked', String(i === idx))
  })

  updateFaceDisplay(mood)

  const saveBtn = document.getElementById('save-btn')
  if (saveBtn) saveBtn.disabled = false

  if (playSound && getSettings().soundEnabled) playMoodSound(mood)
}

function updateFaceDisplay(mood) {
  const circle   = document.getElementById('mood-face-circle')
  const emojiEl  = document.getElementById('mood-face-emoji')
  const statusEl = document.getElementById('mood-status-text')

  if (circle) circle.style.setProperty('--face-bg', mood.color)
  if (emojiEl) {
    emojiEl.textContent = mood.emoji
    emojiEl.className   = 'mood-face-emoji'
    void emojiEl.offsetWidth
    emojiEl.classList.add(`center-anim-${mood.id}`)
  }
  if (statusEl) {
    statusEl.textContent = mood.label
    statusEl.style.color = mood.color
    statusEl.classList.add('has-mood')
  }
}

// ── Camera toggle ──────────────────────────────────────────────────────────
function initCameraToggle() {
  document.getElementById('btn-cam-toggle')?.addEventListener('click', () => {
    const circle = document.getElementById('mood-face-circle')
    const isOn   = circle?.classList.contains('cam-active')
    isOn ? closeTodayCamera() : openTodayCamera()
  })
}

async function openTodayCamera() {
  const circle    = document.getElementById('mood-face-circle')
  const videoEl   = document.getElementById('today-cam-video')
  const overlay   = document.getElementById('face-cam-overlay')
  const spinner   = document.getElementById('face-cam-spinner')
  const toggleBtn = document.getElementById('btn-cam-toggle')

  if (!circle || !videoEl) return

  circle.classList.add('cam-active')
  overlay.style.display = 'flex'
  spinner.textContent   = '⏳'
  toggleBtn?.setAttribute('aria-pressed', 'true')
  if (toggleBtn) toggleBtn.textContent = '✕'

  camStableCount = 0
  lastCamMoodId  = null

  try {
    spinner.textContent = '⏳'
    await loadModels()

    const stream = await startCamera()
    videoEl.srcObject = stream
    await new Promise((res) => { videoEl.onloadedmetadata = res })
    videoEl.play()

    // Camera ready — hide overlay
    overlay.style.display = 'none'

    // Begin detection loop
    camInterval = setInterval(async () => {
      const result = await detectMood(videoEl)
      onCameraFrame(result)
    }, CAM_POLL_MS)

  } catch (err) {
    spinner.textContent = '❌'
    const msg = err?.name === 'NotAllowedError' ? 'Permission denied'
      : err?.name === 'NotFoundError' ? 'No camera found'
      : 'Camera unavailable'
    overlay.style.display = 'flex'
    setTimeout(() => closeTodayCamera(), 2000)
    showToast(`📷 ${msg}`)
  }
}

function closeTodayCamera() {
  if (camInterval) { clearInterval(camInterval); camInterval = null }
  stopCamera()

  const circle    = document.getElementById('mood-face-circle')
  const videoEl   = document.getElementById('today-cam-video')
  const overlay   = document.getElementById('face-cam-overlay')
  const badge     = document.getElementById('face-cam-badge')
  const toggleBtn = document.getElementById('btn-cam-toggle')

  circle?.classList.remove('cam-active')
  if (overlay)   overlay.style.display = 'none'
  if (videoEl)   videoEl.srcObject = null
  if (badge)     { badge.textContent = ''; badge.style.display = 'none' }
  if (toggleBtn) { toggleBtn.setAttribute('aria-pressed', 'false'); toggleBtn.textContent = '📷' }

  // Clear camera-preview states from mood buttons
  document.querySelectorAll('.mood-btn.camera-preview').forEach((btn) => {
    btn.classList.remove('camera-preview')
  })

  camStableCount = 0
  lastCamMoodId  = null
}

// ── Per-frame camera callback ──────────────────────────────────────────────
function onCameraFrame(result) {
  const badge = document.getElementById('face-cam-badge')

  if (!result || result.confidence < CAM_CONF_THRESHOLD) {
    // No confident face — clear preview
    if (badge) { badge.textContent = ''; badge.style.display = 'none' }
    document.querySelectorAll('.mood-btn.camera-preview').forEach((b) => b.classList.remove('camera-preview'))
    camStableCount = 0
    lastCamMoodId  = null
    return
  }

  const mood    = MOODS.find((m) => m.id === result.moodId)
  const moodIdx = MOODS.findIndex((m) => m.id === result.moodId)
  if (!mood || moodIdx < 0) return

  // Update badge on circle
  if (badge) {
    badge.textContent        = mood.emoji
    badge.style.display      = 'flex'
    badge.style.background   = mood.color
  }

  // Highlight corresponding mood button as "camera-preview"
  document.querySelectorAll('.mood-btn').forEach((btn, i) => {
    btn.classList.toggle('camera-preview', i === moodIdx && i !== selectedMoodIdx)
  })

  // Stability gate → auto-select
  if (result.moodId === lastCamMoodId) {
    camStableCount++
    if (camStableCount >= CAM_STABLE_FRAMES) {
      closeTodayCamera()
      selectMoodByIndex(moodIdx, true)
      // Pre-fill note with a witty quote if the textarea is empty
      const noteEl = document.getElementById('note-input')
      if (noteEl && !noteEl.value.trim()) {
        noteEl.value = getRandomQuote(mood.id)
        updateCharCounter(noteEl.value.length)
      }
    }
  } else {
    camStableCount = 1
  }
  lastCamMoodId = result.moodId
}

// ── Sentiment helpers ──────────────────────────────────────────────────────
function updateCharCounter(len) {
  const el = document.getElementById('char-counter')
  if (!el) return
  el.textContent = `${len} / ${MAX_NOTE}`
  el.classList.toggle('warn', len > MAX_NOTE * 0.85)
}

function updateSentiment(text) {
  const wrap = document.getElementById('sentiment-wrap')
  if (!text.trim()) { if (wrap) wrap.style.display = 'none'; return }
  sentimentResult = analyzeText(text)
  if (wrap) wrap.style.display = 'block'

  const pct  = sentimentResult.comparative
  const fill = Math.abs(pct) * 10
  const bar  = document.getElementById('sent-bar')
  if (bar) {
    const isPos = pct >= 0
    bar.style.width      = `${fill}%`
    bar.style.left       = isPos ? '50%' : `${50 - fill}%`
    bar.style.background = isPos
      ? 'linear-gradient(90deg,#6BCB77,#a8e000)'
      : 'linear-gradient(90deg,#FF5F6D,#FF9F43)'
  }

  const scoreEl = document.getElementById('sent-score')
  if (scoreEl) {
    scoreEl.textContent = `${pct > 0 ? '+' : ''}${pct.toFixed(1)}`
    scoreEl.style.color = pct > 0.5 ? '#6BCB77' : pct < -0.5 ? '#FF5F6D' : 'var(--text-secondary)'
  }

  const tagsEl = document.getElementById('sent-tags')
  if (tagsEl) {
    tagsEl.innerHTML = sentimentResult.tags.map((tag) => {
      const cls = sentimentResult.positive.includes(tag) ? 'positive' : 'negative'
      return `<span class="sentiment-tag ${cls}">${tag}</span>`
    }).join('')
  }
}

// ── Save ───────────────────────────────────────────────────────────────────
function handleSave() {
  if (selectedMoodIdx === null) return
  closeTodayCamera()
  const mood = MOODS[selectedMoodIdx]
  const note = document.getElementById('note-input')?.value?.trim() ?? ''
  const ok   = saveEntry(buildEntry({
    mood:           mood.id,
    moodScore:      mood.score,
    note,
    sentimentScore: sentimentResult.comparative,
    keywords:       sentimentResult.tags,
  }))
  if (ok) {
    showToast('✅ Mood saved!')
    document.getElementById('edit-note')?.style.setProperty('display', 'block')
  } else {
    showToast('❌ Could not save – storage full?')
  }
}
