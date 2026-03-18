import { getMoodById } from '../modules/moods.js'
import { saveEntry, buildEntry } from '../modules/storage.js'
import { loadModels, detectMood } from '../modules/faceDetection.js'
import { startCamera, stopCamera } from '../modules/camera.js'
import { getRandomQuote } from '../modules/moodQuotes.js'
import { showToast } from '../main.js'

const DETECTION_MS       = 800   // poll every 800 ms
const STABLE_FRAMES_NEED = 3     // frames at same mood before auto-capture
const AUTO_CONF_THRESHOLD = 0.72 // minimum confidence for auto-capture

let detectionInterval = null
let lastMoodId        = null
let stableCount       = 0
let autoCaptureOn     = false

// ── render() ──────────────────────────────────────────────────────────────
export function renderCamera() {
  return `
    <div class="camera-screen">

      <div class="today-greeting">
        <h1 class="greeting-title">Auto Mood Detector 📸</h1>
        <p class="greeting-date">Let your face tell the story</p>
      </div>

      <!-- Viewfinder -->
      <div class="viewfinder-wrap">
        <video id="cam-video" class="cam-video" autoplay playsinline muted></video>
        <canvas id="cam-canvas" style="display:none;"></canvas>

        <!-- Loading / error status overlay -->
        <div class="cam-status" id="cam-status">
          <span class="cam-status-icon" id="cam-status-icon">⏳</span>
          <span id="cam-status-text">Loading models…</span>
        </div>

        <!-- Live detection bubble (shown after camera starts) -->
        <div class="det-bubble" id="det-bubble" style="display:none;">
          <span class="det-emoji" id="det-emoji">😶</span>
          <div class="det-info">
            <span class="det-label" id="det-label">Detecting…</span>
            <div class="det-conf-track">
              <div class="det-conf-fill" id="det-conf-fill"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Controls -->
      <div class="cam-controls">

        <label class="auto-toggle">
          <input type="checkbox" id="auto-toggle-input">
          <span class="auto-toggle-pill"></span>
          <span class="auto-toggle-text">Auto-capture when stable</span>
        </label>

        <div class="auto-progress-wrap" id="auto-progress-wrap" style="display:none;">
          <div class="auto-progress-track">
            <div class="auto-progress-fill" id="auto-progress-fill"></div>
          </div>
          <span class="auto-progress-label" id="auto-progress-label">Waiting for stable mood…</span>
        </div>

        <button class="btn-save-mood" id="capture-btn" disabled>📸 Capture &amp; Save Mood</button>

      </div>

      <!-- Result card (shown after save) -->
      <div class="capture-result card" id="capture-result" style="display:none;">
        <div class="capture-preview">
          <img id="capture-snapshot" class="snapshot-img" alt="Captured face" />
          <div class="capture-badge" id="capture-badge"></div>
        </div>
        <p class="capture-msg" id="capture-msg"></p>
      </div>

    </div>`
}

// ── initCamera() ──────────────────────────────────────────────────────────
export async function initCamera() {
  // Reset state on each activation
  detectionInterval = null
  lastMoodId        = null
  stableCount       = 0
  autoCaptureOn     = false

  const videoEl = document.getElementById('cam-video')

  try {
    setStatus('⏳', 'Loading models…')
    await loadModels()

    setStatus('📷', 'Starting camera…')
    const stream = await startCamera()
    videoEl.srcObject = stream
    await new Promise((res) => { videoEl.onloadedmetadata = res })
    videoEl.play()

    // Camera ready — hide status, show detection bubble
    document.getElementById('cam-status').style.display   = 'none'
    document.getElementById('det-bubble').style.display   = 'flex'
    document.getElementById('capture-btn').disabled = false

    startDetectionLoop(videoEl)

  } catch (err) {
    const msg = err?.name === 'NotAllowedError'
      ? 'Camera permission denied'
      : err?.name === 'NotFoundError'
      ? 'No camera found'
      : (err?.message ?? 'Camera unavailable')
    setStatus('❌', msg)
    return
  }

  // Auto-capture toggle
  document.getElementById('auto-toggle-input')?.addEventListener('change', (e) => {
    autoCaptureOn = e.target.checked
    const wrap = document.getElementById('auto-progress-wrap')
    if (wrap) wrap.style.display = autoCaptureOn ? 'block' : 'none'
    if (!autoCaptureOn) { stableCount = 0; updateAutoProgress(0) }
  })

  // Manual capture
  document.getElementById('capture-btn')?.addEventListener('click', () => doCapture(videoEl))
}

// Called by main.js when leaving the camera tab
export function cleanupCamera() {
  stopDetectionLoop()
  stopCamera()
}

// ── Detection loop ─────────────────────────────────────────────────────────
function startDetectionLoop(videoEl) {
  stopDetectionLoop()
  detectionInterval = setInterval(async () => {
    const result = await detectMood(videoEl)
    updateDetectionUI(result)

    if (!result || !autoCaptureOn) return

    if (result.moodId === lastMoodId && result.confidence >= AUTO_CONF_THRESHOLD) {
      stableCount++
      updateAutoProgress(stableCount / STABLE_FRAMES_NEED)
      if (stableCount >= STABLE_FRAMES_NEED) {
        stableCount = 0
        updateAutoProgress(0)
        doCapture(videoEl)
      }
    } else {
      stableCount = 0
      updateAutoProgress(0)
    }

    lastMoodId = result.moodId
  }, DETECTION_MS)
}

function stopDetectionLoop() {
  if (detectionInterval) {
    clearInterval(detectionInterval)
    detectionInterval = null
  }
}

// ── UI helpers ─────────────────────────────────────────────────────────────
function setStatus(icon, text) {
  const statusEl = document.getElementById('cam-status')
  const iconEl   = document.getElementById('cam-status-icon')
  const textEl   = document.getElementById('cam-status-text')
  if (statusEl) statusEl.style.display = 'flex'
  if (iconEl)   iconEl.textContent = icon
  if (textEl)   textEl.textContent = text
}

function updateDetectionUI(result) {
  const emojiEl = document.getElementById('det-emoji')
  const labelEl = document.getElementById('det-label')
  const confEl  = document.getElementById('det-conf-fill')

  if (!result) {
    if (emojiEl) emojiEl.textContent = '🔍'
    if (labelEl) labelEl.textContent = 'No face detected'
    if (confEl)  confEl.style.width  = '0%'
    return
  }

  const mood = getMoodById(result.moodId)
  if (emojiEl) emojiEl.textContent = mood?.emoji ?? '😶'
  if (labelEl) labelEl.textContent = `${mood?.label ?? result.moodId} · ${Math.round(result.confidence * 100)}%`
  if (confEl) {
    confEl.style.width      = `${result.confidence * 100}%`
    confEl.style.background = mood?.color ?? 'var(--accent)'
    confEl.style.boxShadow  = `0 0 8px ${mood?.color ?? 'var(--accent)'}88`
  }
}

function updateAutoProgress(ratio) {
  const fill  = document.getElementById('auto-progress-fill')
  const label = document.getElementById('auto-progress-label')
  if (fill)  fill.style.width = `${ratio * 100}%`
  if (label) label.textContent = ratio >= 1 ? '✅ Saving…' : ratio > 0 ? 'Hold still…' : 'Waiting for stable mood…'
}

// ── Capture & Save ─────────────────────────────────────────────────────────
async function doCapture(videoEl) {
  const canvas = document.getElementById('cam-canvas')
  if (!canvas || !videoEl) return

  // Snapshot
  canvas.width  = videoEl.videoWidth  || 640
  canvas.height = videoEl.videoHeight || 480
  canvas.getContext('2d').drawImage(videoEl, 0, 0)
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85)

  // Final detection on the captured frame
  const result = await detectMood(videoEl)
  if (!result) {
    showToast('❌ No face detected — try again')
    return
  }

  const mood = getMoodById(result.moodId)
  if (!mood) return

  const ok = saveEntry(buildEntry({
    mood:           mood.id,
    moodScore:      mood.score,
    note:           getRandomQuote(mood.id),
    sentimentScore: 0,
    keywords:       [result.expression],
    source:         'camera',
  }))

  if (ok) {
    showCaptureResult(dataUrl, mood, result)
    showToast(`${mood.emoji} ${mood.label} saved!`)
  } else {
    showToast('❌ Could not save – storage full?')
  }
}

function showCaptureResult(dataUrl, mood, result) {
  const resultEl   = document.getElementById('capture-result')
  const snapshotEl = document.getElementById('capture-snapshot')
  const badgeEl    = document.getElementById('capture-badge')
  const msgEl      = document.getElementById('capture-msg')

  if (snapshotEl) snapshotEl.src = dataUrl
  if (badgeEl)    { badgeEl.textContent = mood.emoji; badgeEl.style.background = mood.color }
  if (msgEl) {
    msgEl.innerHTML = `<strong>${mood.emoji} ${mood.label}</strong> saved for today
      <span style="color:var(--text-muted)"> · ${Math.round(result.confidence * 100)}% confidence</span>`
  }
  if (resultEl) {
    resultEl.style.display = 'block'
    resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }
}
