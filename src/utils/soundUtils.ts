/**
 * Synthesizes subtle, crisp audio feedback using the Web Audio API
 * Warm, polished Web Audio synth micro-chime (Things 3 / Apple Reminders style)
 * 100% offline and zero latency.
 */

export function playCompletionSound(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    // Dual harmonic sine blend: warm, organic, tactile
    const now = ctx.currentTime;
    
    // Tone 1: Fundamental note (F#5 - 739.99 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(739.99, now);

    // Tone 2: Warm overtone harmonic (C#6 - 1108.73 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1108.73, now);

    // Master Gain with soft envelope to avoid popping
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, now);
    // Quick 4ms attack (removes click)
    masterGain.gain.linearRampToValueAtTime(0.12, now + 0.004);
    // Gentle exponential natural decay (~180ms total)
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    // Connect graph
    osc1.connect(gain1);
    osc2.connect(gain2);
    gain1.gain.value = 0.7;
    gain2.gain.value = 0.3; // softer overtone

    gain1.connect(masterGain);
    gain2.connect(masterGain);
    masterGain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);

    osc1.stop(now + 0.19);
    osc2.stop(now + 0.19);

    // Clean up audio context
    setTimeout(() => {
      ctx.close();
    }, 250);
  } catch (e) {
    console.error("Audio playback error", e);
  }
}

// Alias for backwards compatibility across all views and components
export const playStepCompleteSound = playCompletionSound;

/**
 * Celebratory fanfare when all 3 passes are 100% Mastered
 */
export function playTopicCompletedFanfare(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const chords = [523.25, 659.25, 783.99, 1046.50]; // C Major arpeggio
    chords.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const startTime = ctx.currentTime + idx * 0.08;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.09, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.4);
    });

    setTimeout(() => {
      ctx.close();
    }, 1000);
  } catch (e) {
    // Ignore audio permission error
  }
}
