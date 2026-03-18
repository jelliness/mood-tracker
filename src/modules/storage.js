const ENTRIES_KEY = 'moodjar_entries'
const SETTINGS_KEY = 'moodjar_settings'

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      dispatchEvent(new CustomEvent('storage:quota-exceeded'))
    }
    return false
  }
}

export function getEntries() {
  return readJSON(ENTRIES_KEY, [])
}

export function saveEntry(entry) {
  const entries = getEntries()
  const idx = entries.findIndex((e) => e.id === entry.id)
  if (idx >= 0) {
    entries[idx] = entry
  } else {
    entries.push(entry)
  }
  entries.sort((a, b) => a.id.localeCompare(b.id))
  const ok = writeJSON(ENTRIES_KEY, entries)
  if (ok) dispatchEvent(new CustomEvent('moodjar:entry-saved', { detail: entry }))
  return ok
}

export function getEntryByDate(isoDate) {
  return getEntries().find((e) => e.id === isoDate) ?? null
}

export function getLast30Entries() {
  const all = getEntries()
  return all.slice(-30)
}

export function getEntriesForMonth(year, month) {
  // month is 1-based
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  return getEntries().filter((e) => e.id.startsWith(prefix))
}

export function getEntriesForLastNDays(n) {
  const entries = getEntries()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - n)
  cutoff.setHours(0, 0, 0, 0)
  return entries.filter((e) => new Date(e.id) >= cutoff)
}

export function getSettings() {
  return readJSON(SETTINGS_KEY, { soundEnabled: true })
}

export function saveSettings(patch) {
  writeJSON(SETTINGS_KEY, { ...getSettings(), ...patch })
}

export function buildEntry({ mood, moodScore, note, sentimentScore, keywords, source = 'manual' }) {
  const now = new Date()
  const id = now.toISOString().slice(0, 10)
  return { id, date: id, mood, moodScore, note, sentimentScore, keywords, source, savedAt: now.getTime() }
}
