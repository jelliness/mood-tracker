export const MOODS = [
  {
    id: 'ecstatic',
    emoji: '🤩',
    label: 'Ecstatic',
    color: '#FFD700',
    darkColor: '#B8960C',
    bgGradient: 'linear-gradient(135deg, #FFD700 0%, #FF8C00 100%)',
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
    color: '#78C800',
    darkColor: '#4A7B00',
    bgGradient: 'linear-gradient(135deg, #78C800 0%, #40A000 100%)',
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
    color: '#00BFFF',
    darkColor: '#007AA8',
    bgGradient: 'linear-gradient(135deg, #00BFFF 0%, #0077CC 100%)',
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
    color: '#A0A0A0',
    darkColor: '#606060',
    bgGradient: 'linear-gradient(135deg, #A0A0A0 0%, #707070 100%)',
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
    color: '#FFA500',
    darkColor: '#B36B00',
    bgGradient: 'linear-gradient(135deg, #FFA500 0%, #CC6600 100%)',
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
    color: '#6495ED',
    darkColor: '#2B5CE6',
    bgGradient: 'linear-gradient(135deg, #6495ED 0%, #3355AA 100%)',
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
    color: '#FF6347',
    darkColor: '#CC2200',
    bgGradient: 'linear-gradient(135deg, #FF6347 0%, #CC2200 100%)',
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
    color: '#DC143C',
    darkColor: '#8B0000',
    bgGradient: 'linear-gradient(135deg, #DC143C 0%, #8B0000 100%)',
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
