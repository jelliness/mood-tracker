let _ctx = null

function ctx() {
  if (!_ctx) _ctx = new AudioContext()
  if (_ctx.state === 'suspended') _ctx.resume()
  return _ctx
}

function playTone(audioCtx, freq, type, startTime, duration, gain, detune = 0) {
  const osc = audioCtx.createOscillator()
  const gainNode = audioCtx.createGain()

  osc.type = type
  osc.frequency.setValueAtTime(freq, startTime)
  if (detune) osc.detune.setValueAtTime(detune, startTime)

  gainNode.gain.setValueAtTime(0, startTime)
  gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.02)
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration)

  osc.connect(gainNode)
  gainNode.connect(audioCtx.destination)

  osc.start(startTime)
  osc.stop(startTime + duration + 0.05)
}

export function playMoodSound(mood) {
  const { notes, type, noteDuration, noteGap, gain } = mood.audioConfig
  const c = ctx()
  const now = c.currentTime + 0.05

  notes.forEach((freq, i) => {
    const t = now + i * (noteDuration + noteGap)
    playTone(c, freq, type, t, noteDuration, gain)

    // For anxious: add slight detune on second note for dissonance
    if (mood.id === 'anxious' && i === 1) {
      playTone(c, freq, type, t, noteDuration, gain * 0.5, 15)
    }
    // For ecstatic: add harmony a third above
    if (mood.id === 'ecstatic') {
      playTone(c, freq * 1.25, type, t, noteDuration, gain * 0.4)
    }
  })

  // For calm: add a soft low-pass filtered pad
  if (mood.id === 'calm') {
    const osc = c.createOscillator()
    const gainNode = c.createGain()
    const filter = c.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(400, now)
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(164.81, now)
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(0.12, now + 0.2)
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.4)
    osc.connect(filter)
    filter.connect(gainNode)
    gainNode.connect(c.destination)
    osc.start(now)
    osc.stop(now + 1.5)
  }

  // For sad: frequency glides downward
  if (mood.id === 'sad') {
    const osc = c.createOscillator()
    const gainNode = c.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(notes[0], now)
    osc.frequency.exponentialRampToValueAtTime(notes[0] * 0.8, now + 1.2)
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(gain * 0.6, now + 0.15)
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.2)
    osc.connect(gainNode)
    gainNode.connect(c.destination)
    osc.start(now)
    osc.stop(now + 1.3)
  }
}
