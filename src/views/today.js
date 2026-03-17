import { MOODS, getMoodById } from '../modules/moods.js'
import { analyzeText } from '../modules/sentiment.js'
import { getEntryByDate, saveEntry, buildEntry, getSettings } from '../modules/storage.js'
import { playMoodSound } from '../modules/audio.js'
import { showToast } from '../main.js'

const MAX_NOTE = 500

let selectedMood = null
let sentimentResult = { score: 0, comparative: 0, tags: [], positive: [], negative: [] }
let debounceTimer = null

export function renderToday() {
  const moodButtons = MOODS.map((m) => `
    <button class="mood-btn" data-mood="${m.id}" aria-label="${m.label}" title="${m.label}">
      <span class="mood-emoji">${m.emoji}</span>
      <span class="mood-label">${m.label}</span>
    </button>
  `).join('')

  return `
    <div class="card">
      <p class="section-title">How are you feeling today?</p>
      <p id="today-date" style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:16px;"></p>
      <div class="mood-grid" id="mood-grid">${moodButtons}</div>
    </div>

    <div class="card" style="margin-top:20px;">
      <p class="section-title">Add a note <span style="color:var(--text-muted);font-weight:400;text-transform:none;">(optional)</span></p>
      <textarea
        id="note-input"
        class="note-textarea"
        maxlength="${MAX_NOTE}"
        placeholder="What's on your mind? How did your day go?"
        aria-label="Mood note"
      ></textarea>
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

    <div style="margin-top:20px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
      <button class="btn-primary" id="save-btn" disabled>Save today's mood</button>
      <p id="edit-note" style="font-size:0.82rem;color:var(--text-muted);display:none;">
        ✏️ Editing today's entry
      </p>
    </div>
  `
}

export function initToday() {
  const today = new Date()
  const dateEl = document.getElementById('today-date')
  if (dateEl) {
    dateEl.textContent = today.toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
    })
  }

  // Pre-fill existing entry if any
  const isoToday = today.toISOString().slice(0, 10)
  const existing = getEntryByDate(isoToday)
  if (existing) {
    selectMood(existing.mood)
    const noteEl = document.getElementById('note-input')
    if (noteEl) noteEl.value = existing.note ?? ''
    updateCharCounter(existing.note?.length ?? 0)
    if (existing.note) updateSentiment(existing.note)
    document.getElementById('edit-note')?.style.setProperty('display', 'block')
  }

  // Mood button clicks
  document.getElementById('mood-grid')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.mood-btn')
    if (!btn) return
    const moodId = btn.dataset.mood
    selectMood(moodId)

    const settings = getSettings()
    if (settings.soundEnabled) {
      const mood = getMoodById(moodId)
      if (mood) playMoodSound(mood)
    }
  })

  // Note textarea
  const noteInput = document.getElementById('note-input')
  noteInput?.addEventListener('input', () => {
    const val = noteInput.value
    updateCharCounter(val.length)
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => updateSentiment(val), 150)
  })

  // Save button
  document.getElementById('save-btn')?.addEventListener('click', handleSave)
}

function selectMood(moodId) {
  selectedMood = moodId
  document.querySelectorAll('.mood-btn').forEach((btn) => {
    btn.classList.toggle('selected', btn.dataset.mood === moodId)
  })
  const saveBtn = document.getElementById('save-btn')
  if (saveBtn) saveBtn.disabled = false
}

function updateCharCounter(len) {
  const el = document.getElementById('char-counter')
  if (!el) return
  el.textContent = `${len} / ${MAX_NOTE}`
  el.classList.toggle('warn', len > MAX_NOTE * 0.85)
}

function updateSentiment(text) {
  const wrap = document.getElementById('sentiment-wrap')
  if (!text.trim()) {
    if (wrap) wrap.style.display = 'none'
    return
  }
  sentimentResult = analyzeText(text)
  if (wrap) wrap.style.display = 'block'

  // Bar: centre = 50%, width fills based on comparative (−5..+5)
  const pct = sentimentResult.comparative // −5..+5
  const fillWidth = Math.abs(pct) * 10 // 0..50 %
  const bar = document.getElementById('sent-bar')
  if (bar) {
    const isPos = pct >= 0
    bar.style.width = `${fillWidth}%`
    bar.style.left = isPos ? '50%' : `${50 - fillWidth}%`
    bar.style.background = isPos
      ? 'linear-gradient(90deg, #78C800, #a8e000)'
      : 'linear-gradient(90deg, #FF4444, #FF6347)'
  }

  const scoreEl = document.getElementById('sent-score')
  if (scoreEl) {
    const sign = pct > 0 ? '+' : ''
    scoreEl.textContent = `${sign}${pct.toFixed(1)}`
    scoreEl.style.color = pct > 0.5 ? '#78C800' : pct < -0.5 ? '#FF6347' : 'var(--text-secondary)'
  }

  const tagsEl = document.getElementById('sent-tags')
  if (tagsEl) {
    tagsEl.innerHTML = sentimentResult.tags.map((tag) => {
      const isPos = sentimentResult.positive.includes(tag)
      return `<span class="sentiment-tag ${isPos ? 'positive' : 'negative'}">${tag}</span>`
    }).join('')
  }
}

function handleSave() {
  if (!selectedMood) return
  const mood = getMoodById(selectedMood)
  if (!mood) return
  const note = document.getElementById('note-input')?.value?.trim() ?? ''
  const entry = buildEntry({
    mood: selectedMood,
    moodScore: mood.score,
    note,
    sentimentScore: sentimentResult.comparative,
    keywords: sentimentResult.tags,
  })
  const ok = saveEntry(entry)
  if (ok) {
    showToast('✅ Mood saved!')
    document.getElementById('edit-note')?.style.setProperty('display', 'block')
  } else {
    showToast('❌ Could not save – storage full?')
  }
}
