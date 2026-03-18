// Rainbow-ordered for the mood wheel (left → right: red → pink)
export const MOODS = [
  {
    id: 'ecstatic',
    emoji: '🤩',
    label: 'Ecstatic',
    color: '#FF5F6D',        // red
    darkColor: '#CC2030',
    bgGradient: 'linear-gradient(135deg, #FF5F6D 0%, #CC2030 100%)',
    score: 4,
    animClass: 'anim-ecstatic',
    audioConfig: {
      notes: [523.25, 659.25, 783.99, 1046.5], // C5 E5 G5 C6
      type: 'sine',
      noteDuration: 0.12,
      noteGap: 0.04,
      gain: 0.3,
    },
  },
  {
    id: 'happy',
    emoji: '😊',
    label: 'Happy',
    color: '#FF9F43',        // orange
    darkColor: '#CC6600',
    bgGradient: 'linear-gradient(135deg, #FF9F43 0%, #CC6600 100%)',
    score: 3,
    animClass: 'anim-happy',
    audioConfig: {
      notes: [523.25, 659.25, 783.99],
      type: 'sine',
      noteDuration: 0.35,
      noteGap: 0,
      gain: 0.25,
    },
  },
  {
    id: 'calm',
    emoji: '😌',
    label: 'Calm',
    color: '#FFD93D',        // yellow
    darkColor: '#B89800',
    bgGradient: 'linear-gradient(135deg, #FFD93D 0%, #B89800 100%)',
    score: 2,
    animClass: 'anim-calm',
    audioConfig: {
      notes: [329.63], // E4
      type: 'sine',
      noteDuration: 0.9,
      noteGap: 0,
      gain: 0.2,
    },
  },
  {
    id: 'meh',
    emoji: '😐',
    label: 'Meh',
    color: '#6BCB77',        // green
    darkColor: '#3A9A45',
    bgGradient: 'linear-gradient(135deg, #6BCB77 0%, #3A9A45 100%)',
    score: 0,
    animClass: 'anim-meh',
    audioConfig: {
      notes: [220],
      type: 'triangle',
      noteDuration: 0.3,
      noteGap: 0,
      gain: 0.15,
    },
  },
  {
    id: 'anxious',
    emoji: '😰',
    label: 'Anxious',
    color: '#4D96FF',        // blue
    darkColor: '#1155CC',
    bgGradient: 'linear-gradient(135deg, #4D96FF 0%, #1155CC 100%)',
    score: -1,
    animClass: 'anim-anxious',
    audioConfig: {
      notes: [440, 466.16], // A4 + Bb4 – slight dissonance
      type: 'triangle',
      noteDuration: 0.18,
      noteGap: 0.06,
      gain: 0.2,
    },
  },
  {
    id: 'sad',
    emoji: '😢',
    label: 'Sad',
    color: '#6C5CE7',        // indigo
    darkColor: '#3922CC',
    bgGradient: 'linear-gradient(135deg, #6C5CE7 0%, #3922CC 100%)',
    score: -2,
    animClass: 'anim-sad',
    audioConfig: {
      notes: [311.13, 369.99, 440], // Eb4 F#4 A4 – minor
      type: 'sine',
      noteDuration: 0.5,
      noteGap: 0.12,
      gain: 0.2,
    },
  },
  {
    id: 'frustrated',
    emoji: '😤',
    label: 'Frustrated',
    color: '#C77DFF',        // violet
    darkColor: '#8822CC',
    bgGradient: 'linear-gradient(135deg, #C77DFF 0%, #8822CC 100%)',
    score: -3,
    animClass: 'anim-frustrated',
    audioConfig: {
      notes: [233.08, 246.94], // Bb3 + B3 – dissonant
      type: 'sawtooth',
      noteDuration: 0.12,
      noteGap: 0.08,
      gain: 0.18,
    },
  },
  {
    id: 'angry',
    emoji: '😡',
    label: 'Angry',
    color: '#FF78C4',        // pink
    darkColor: '#CC3388',
    bgGradient: 'linear-gradient(135deg, #FF78C4 0%, #CC3388 100%)',
    score: -4,
    animClass: 'anim-angry',
    audioConfig: {
      notes: [110, 116.54], // A2 + Bb2 – very dissonant low
      type: 'sawtooth',
      noteDuration: 0.3,
      noteGap: 0,
      gain: 0.22,
    },
  },
]

export function getMoodById(id) {
  return MOODS.find((m) => m.id === id) ?? null
}
