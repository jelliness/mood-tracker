import { AFINN } from '../data/afinn.js'

const NEGATORS = new Set([
  'not', 'no', 'never', 'neither', 'nobody', 'nothing',
  "don't", "didn't", "doesn't", "wasn't", "won't",
  "can't", "couldn't", "shouldn't", "wouldn't", "hardly",
  'barely', 'scarcely', 'nor', 'without',
])

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'shall', 'can', 'i', 'me', 'my',
  'we', 'our', 'you', 'your', 'he', 'she', 'it', 'they', 'this', 'that',
  'these', 'those', 'what', 'which', 'who', 'how', 'when', 'where', 'why',
  'all', 'any', 'both', 'each', 'some', 'such', 'so', 'than', 'too',
  'very', 'just', 'about', 'as', 'its', 'their', 'there', 'then', 'them',
  'him', 'her', 'up', 'out', 'into', 'before', 'after', 'during',
  'really', 'got', 'get', 'went', 'go', 'know', 'think', 'feel', 'felt',
  'see', 'say', 'said', 'make', 'made', 'come', 'came', 'take', 'took',
  'want', 'wanted', 'need', 'day', 'today', 'time', 'work', 'home',
  'also', 'again', 'here', 'still', 'most', 'other', 'same', 'only',
  'well', 'even', 'more', 'now', 'much', 'many', 'own', 'like', 'back',
  'had', 'him', 'his', 'her', 'hers', 'ours', 'theirs', 'mine', 'yours',
])

export function analyzeText(text) {
  if (!text || text.trim().length === 0) {
    return { score: 0, comparative: 0, tags: [], positive: [], negative: [] }
  }

  const tokens = text
    .toLowerCase()
    .replace(/[^a-z'\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1)
    .map((t) => t.replace(/^'+|'+$/g, ''))

  let totalScore = 0
  const positiveWords = []
  const negativeWords = []

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    const score = AFINN[token]
    if (score === undefined) continue

    // Look back up to 3 positions for a negator
    let negated = false
    for (let j = Math.max(0, i - 3); j < i; j++) {
      if (NEGATORS.has(tokens[j])) {
        negated = true
        break
      }
    }

    const effective = negated ? -score : score
    totalScore += effective

    if (effective > 0) positiveWords.push({ word: token, score: effective })
    else negativeWords.push({ word: token, score: effective })
  }

  const comparative = tokens.length > 0 ? totalScore / tokens.length : 0
  // Normalise to −5 … +5 with a gentle scaling
  const normalised = Math.max(-5, Math.min(5, comparative * 12))

  // Extract top emotional keywords (highest absolute score, unique, non-stopword)
  const allScored = [...positiveWords, ...negativeWords]
    .filter((w) => !STOPWORDS.has(w.word) && w.word.length > 2)
    .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
  const seen = new Set()
  const tags = []
  for (const w of allScored) {
    if (!seen.has(w.word)) {
      seen.add(w.word)
      tags.push(w.word)
      if (tags.length === 3) break
    }
  }

  return {
    score: totalScore,
    comparative: normalised,
    tags,
    positive: positiveWords.map((w) => w.word),
    negative: negativeWords.map((w) => w.word),
  }
}

// Word frequency + sentiment colouring for the tag cloud
export function wordFrequency(entries) {
  const freq = {}
  const sentSum = {}
  for (const entry of entries) {
    if (!entry.note) continue
    const tokens = entry.note
      .toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2 && !STOPWORDS.has(t))
    for (const t of tokens) {
      freq[t] = (freq[t] ?? 0) + 1
      sentSum[t] = (sentSum[t] ?? 0) + (AFINN[t] ?? 0)
    }
  }
  return Object.entries(freq)
    .map(([word, count]) => ({ word, count, sentimentAvg: sentSum[word] / count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 60)
}
