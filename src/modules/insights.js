import { MOODS } from './moods.js'

export function generateInsights(entries) {
  if (!entries.length) return null

  const sorted = [...entries].sort((a, b) => a.id.localeCompare(b.id))
  const last7 = sorted.slice(-7)

  // ── Current streak ────────────────────────────────────────────────────────
  let streak = 0
  const today = new Date().toISOString().slice(0, 10)
  let cursor = new Date()
  while (true) {
    const d = cursor.toISOString().slice(0, 10)
    if (sorted.some((e) => e.id === d)) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    } else {
      break
    }
  }

  // ── Longest streak ────────────────────────────────────────────────────────
  let longest = 0, cur = 0
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0) { cur = 1; continue }
    const prev = new Date(sorted[i - 1].id)
    prev.setDate(prev.getDate() + 1)
    if (prev.toISOString().slice(0, 10) === sorted[i].id) {
      cur++
    } else {
      cur = 1
    }
    if (cur > longest) longest = cur
  }
  if (cur > longest) longest = cur

  // ── Week-over-week mood trend ──────────────────────────────────────────────
  const prev7 = sorted.slice(-14, -7)
  const avg = (arr) =>
    arr.length ? arr.reduce((s, e) => s + e.moodScore, 0) / arr.length : null
  const last7Avg = avg(last7)
  const prev7Avg = avg(prev7)
  let weekOverWeek = 'stable'
  if (last7Avg !== null && prev7Avg !== null) {
    const diff = last7Avg - prev7Avg
    if (diff > 0.4) weekOverWeek = 'improving'
    else if (diff < -0.4) weekOverWeek = 'declining'
  }

  // ── Dominant mood in last 7 days ──────────────────────────────────────────
  const moodCounts = {}
  for (const e of last7) moodCounts[e.mood] = (moodCounts[e.mood] ?? 0) + 1
  const dominantMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  const dominantMoodPercent = dominantMood
    ? Math.round((moodCounts[dominantMood] / last7.length) * 100)
    : 0

  // ── Sentiment slope (linear regression) over last 7 days ─────────────────
  const sentSlope = linearSlope(last7.map((e) => e.sentimentScore ?? 0))

  // ── Best and low day ──────────────────────────────────────────────────────
  const bestDay = [...sorted].sort((a, b) => b.moodScore - a.moodScore)[0] ?? null
  const lowDay = [...sorted].sort((a, b) => a.moodScore - b.moodScore)[0] ?? null

  // ── Month completeness ────────────────────────────────────────────────────
  const now = new Date()
  const daysElapsed = now.getDate()
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const thisMonthCount = sorted.filter((e) => e.id.startsWith(prefix)).length
  const completenessThisMonth = Math.round((thisMonthCount / daysElapsed) * 100)

  // ── Rule-based reflection text ─────────────────────────────────────────────
  const reflectionLines = buildReflectionLines({
    streak, weekOverWeek, dominantMood, dominantMoodPercent, sentSlope, last7Avg,
    totalLogged: sorted.length, last7,
  })

  return {
    streak,
    longestStreak: Math.max(longest, streak),
    weekOverWeek,
    dominantMood,
    dominantMoodPercent,
    sentimentTrend: sentSlope,
    bestDay,
    lowDay,
    totalLogged: sorted.length,
    completenessThisMonth,
    reflectionLines,
  }
}

function linearSlope(values) {
  const n = values.length
  if (n < 2) return 0
  const xs = values.map((_, i) => i)
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = values.reduce((a, b) => a + b, 0) / n
  const num = xs.reduce((s, x, i) => s + (x - mx) * (values[i] - my), 0)
  const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0)
  return den === 0 ? 0 : num / den
}

const NEGATIVE_MOODS = new Set(['anxious', 'sad', 'frustrated', 'angry'])
const POSITIVE_MOODS = new Set(['ecstatic', 'happy', 'calm'])

function buildReflectionLines(data) {
  const { streak, weekOverWeek, dominantMood, dominantMoodPercent, sentSlope,
    last7Avg, totalLogged, last7 } = data
  const lines = []

  if (totalLogged === 0) return ['Start logging your mood to see insights here!']

  // Streak messages
  if (streak >= 7) lines.push(`🔥 You're on a ${streak}-day logging streak — incredible consistency!`)
  else if (streak >= 3) lines.push(`⚡ ${streak} days in a row! You're building a solid habit.`)
  else if (streak === 0) lines.push('📅 You haven\'t logged recently. A quick check-in is all it takes.')

  // Week-over-week
  if (weekOverWeek === 'improving') lines.push('📈 Your mood has been improving compared to last week. Keep it up!')
  else if (weekOverWeek === 'declining') lines.push('📉 Your mood dipped a bit this week compared to last. Be gentle with yourself.')
  else if (last7.length >= 3) lines.push('〰️ Your mood has been fairly steady this week.')

  // Dominant mood
  if (dominantMood) {
    const mood = MOODS.find((m) => m.id === dominantMood)
    if (NEGATIVE_MOODS.has(dominantMood) && dominantMoodPercent >= 50) {
      lines.push(`💙 ${mood?.label ?? dominantMood} has been your most frequent feeling (${dominantMoodPercent}% of days). Consider a little self-care.`)
    } else if (POSITIVE_MOODS.has(dominantMood) && dominantMoodPercent >= 50) {
      lines.push(`😊 ${mood?.label ?? dominantMood} dominated your week at ${dominantMoodPercent}% of days. That's wonderful!`)
    }
  }

  // Sentiment trend
  if (sentSlope > 0.3) lines.push('✨ The language in your notes has been noticeably more positive this week.')
  else if (sentSlope < -0.3) lines.push('📝 Your notes carry a heavier emotional tone this week. It\'s okay to express that.')

  // Positive streak in last 7
  const positiveCount = last7.filter((e) => POSITIVE_MOODS.has(e.mood)).length
  if (positiveCount >= 5) lines.push(`🌟 ${positiveCount} out of your last 7 days were positive moods!`)

  if (lines.length === 0) lines.push('Keep logging to see deeper patterns in your emotional journey.')
  return lines
}
