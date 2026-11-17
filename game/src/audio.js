// Synthesised sound: every effect is an oscillator or a burst of filtered noise
// built on first use, so the game ships no audio files. The audio context is
// created lazily on the first user gesture (browsers refuse sound before one),
// and a quiet bass pulse keeps time under the action while playing.

/** Create the sound engine; call `unlock()` from a user gesture before playing. */
export function createAudio() {
  let context = null;
  let master = null;
  let musicTimer = 0;
  let musicOn = false;
  let beat = 0;
  /** A minor pulse line: root, root, flat third, fifth, flat seventh, fifth. */
  const BASS_LINE = [55, 55, 65.41, 82.41, 98, 82.41];

  function ensure() {
    if (context) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.5;
      master.connect(context.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type, volume, slideTo) {
    if (!ensure() || context.state === 'suspended') return;
    const now = context.currentTime;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), now + dur);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  function noise(dur, volume, cutoff) {
    if (!ensure() || context.state === 'suspended') return;
    const now = context.currentTime;
    const length = Math.max(1, Math.floor(context.sampleRate * dur));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(now);
  }

  return {
    /** Call from a click or key press: browsers allow sound only after a gesture. */
    unlock() {
      if (ensure() && context.state === 'suspended') context.resume();
    },
    shoot() {
      tone(880, 0.07, 'square', 0.1, 220);
    },
    hit() {
      tone(220, 0.05, 'triangle', 0.12, 140);
    },
    explode() {
      noise(0.35, 0.3, 900);
      tone(120, 0.3, 'sawtooth', 0.16, 40);
    },
    pickup() {
      tone(660, 0.08, 'sine', 0.14, 990);
    },
    heal() {
      tone(520, 0.12, 'sine', 0.14, 780);
      tone(780, 0.14, 'sine', 0.1, 1040);
    },
    dash() {
      noise(0.16, 0.16, 2400);
    },
    hurt() {
      tone(160, 0.22, 'sawtooth', 0.22, 60);
      noise(0.12, 0.14, 500);
    },
    wave() {
      tone(220, 0.35, 'sawtooth', 0.12, 440);
      tone(330, 0.35, 'sawtooth', 0.08, 660);
    },
    boss() {
      tone(65, 0.7, 'sawtooth', 0.22, 49);
      tone(98, 0.7, 'sawtooth', 0.12, 73);
    },
    upgrade() {
      tone(523, 0.1, 'sine', 0.14);
      tone(659, 0.1, 'sine', 0.14);
      tone(784, 0.18, 'sine', 0.14);
    },
    over() {
      tone(392, 0.3, 'triangle', 0.18, 196);
      tone(311, 0.4, 'triangle', 0.18, 155);
      tone(233, 0.7, 'triangle', 0.16, 116);
    },
    click() {
      tone(700, 0.05, 'sine', 0.1);
    },
    /** Start the quiet bass pulse; call `stopMusic()` on pause, upgrade and game over. */
    startMusic() {
      musicOn = true;
      musicTimer = 0;
      beat = 0;
    },
    stopMusic() {
      musicOn = false;
    },
    /** Advance the pulse line; call once per fixed step while playing. */
    step(dt) {
      if (!musicOn || !context || context.state === 'suspended') return;
      musicTimer += dt;
      if (musicTimer >= 0.42) {
        musicTimer -= 0.42;
        tone(BASS_LINE[beat % BASS_LINE.length], 0.36, 'triangle', 0.07);
        beat += 1;
      }
    },
  };
}
