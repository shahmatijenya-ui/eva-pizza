let context;
let master;
let audioEnabled = true;
let muteGeneration = 0;
let unlockedContext;
const voices = new Set();
const masterVolume = .9;

function trackVoice(oscillator, nodes) {
  const voice = {
    oscillator,
    cleanup() {
      voices.delete(voice);
      oscillator.onended = null;
      for (const node of [oscillator, ...nodes]) {
        try { node.disconnect(); } catch { /* Already disconnected. */ }
      }
    },
  };
  oscillator.onended = voice.cleanup;
  voices.add(voice);
  return voice;
}

function stopVoices() {
  for (const voice of voices) {
    try { voice.oscillator.stop(); } catch { /* Not started or already stopped. */ }
    voice.cleanup();
  }
}

export function setAudioEnabled(enabled) {
  audioEnabled = Boolean(enabled);
  if (!audioEnabled) {
    muteGeneration++;
    stopVoices();
  }
  try {
    if (context && master && context.state !== 'closed') {
      const now = context.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(audioEnabled ? masterVolume : 0, now);
    }
  } catch { /* Muting must also work while the audio device is unavailable. */ }
  return audioEnabled;
}

export async function wakeAudio() {
  try {
    // Safari can otherwise keep Web Audio on the channel muted by the silent switch.
    try {
      if (globalThis.navigator?.audioSession) globalThis.navigator.audioSession.type = 'playback';
    } catch { /* Other browsers use their normal audio routing. */ }
    // Keep creation, the silent unlock, and resume inside the original gesture.
    if (!context || context.state === 'closed') {
      const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AudioContext) return false;
      stopVoices();
      const audio = new AudioContext();
      try {
        const output = audio.createGain();
        const compressor = audio.createDynamicsCompressor();
        output.gain.value = audioEnabled ? masterVolume : 0;
        compressor.threshold.value = -14;
        compressor.knee.value = 12;
        compressor.ratio.value = 4;
        compressor.attack.value = .003;
        compressor.release.value = .18;
        output.connect(compressor).connect(audio.destination);
        context = audio;
        master = output;
      } catch {
        try { await audio.close(); } catch { /* Best-effort disposal. */ }
        return false;
      }
    }

    const audio = context;
    if (unlockedContext !== audio || audio.state !== 'running') {
      const unlock = audio.createBufferSource();
      unlock.buffer = audio.createBuffer(1, 1, audio.sampleRate);
      unlock.onended = () => {
        unlock.disconnect();
        unlock.onended = null;
      };
      unlock.connect(audio.destination);
      try {
        unlock.start(0);
      } catch (error) {
        unlock.disconnect();
        unlock.onended = null;
        throw error;
      }
      unlockedContext = audio;
    }
    // iOS may report "interrupted", not just "suspended".
    if (audio.state !== 'running') await audio.resume();
    return audio === context && audio.state === 'running';
  } catch {
    return false;
  }
}

export async function sound(kind, enabled = true) {
  if (!enabled || !audioEnabled) return false;
  const generation = muteGeneration;
  if (!await wakeAudio()) return false;
  if (!audioEnabled || generation !== muteGeneration) return false;

  const audio = context;
  if (audio.state !== 'running') return false;
  const output = master;
  const now = audio.currentTime + .01;
  const scheduled = [];
  const note = (frequency, start, duration, type = 'triangle', volume = .2) => {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const voice = trackVoice(oscillator, [gain]);
    scheduled.push(voice);
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + .015);
    gain.gain.exponentialRampToValueAtTime(.001, start + duration);
    oscillator.connect(gain).connect(output);
    oscillator.start(start);
    oscillator.stop(start + duration + .02);
  };

  try {
    if (kind === 'agree') {
      note(659.25, now, .13, 'triangle', .19);
      note(987.77, now + .12, .25, 'triangle', .19);
    } else if (kind === 'deny') {
      for (const [i, frequency] of [196, 130.81].entries()) {
        const start = now + i * .17;
        const oscillator = audio.createOscillator();
        const lowpass = audio.createBiquadFilter();
        const gain = audio.createGain();
        const voice = trackVoice(oscillator, [lowpass, gain]);
        scheduled.push(voice);
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(frequency, start);
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 850;
        lowpass.Q.value = .7;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(.16, start + .012);
        gain.gain.setValueAtTime(.16, start + .08);
        gain.gain.exponentialRampToValueAtTime(.001, start + .19);
        oscillator.connect(lowpass).connect(gain).connect(output);
        oscillator.start(start);
        oscillator.stop(start + .21);
      }
    } else if (kind === 'pop') {
      const noise = audio.createBufferSource();
      const highpass = audio.createBiquadFilter();
      const noiseGain = audio.createGain();
      const noiseVoice = trackVoice(noise, [highpass, noiseGain]);
      scheduled.push(noiseVoice);
      const buffer = audio.createBuffer(1, Math.ceil(audio.sampleRate * .1), audio.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      noise.buffer = buffer;
      highpass.type = 'highpass';
      highpass.frequency.value = 1000;
      highpass.Q.value = .7;
      noiseGain.gain.setValueAtTime(0, now);
      noiseGain.gain.linearRampToValueAtTime(.42, now + .001);
      noiseGain.gain.exponentialRampToValueAtTime(.001, now + .075);
      noise.connect(highpass).connect(noiseGain).connect(output);
      noise.start(now);
      noise.stop(now + .08);

      const thump = audio.createOscillator();
      const thumpGain = audio.createGain();
      const thumpVoice = trackVoice(thump, [thumpGain]);
      scheduled.push(thumpVoice);
      thump.type = 'sine';
      thump.frequency.setValueAtTime(160, now);
      thump.frequency.exponentialRampToValueAtTime(45, now + .075);
      thumpGain.gain.setValueAtTime(0, now);
      thumpGain.gain.linearRampToValueAtTime(.24, now + .002);
      thumpGain.gain.exponentialRampToValueAtTime(.001, now + .085);
      thump.connect(thumpGain).connect(output);
      thump.start(now);
      thump.stop(now + .1);
    } else if (kind === 'oink') {
      // Pitch falls under a moving nasal formant, with the harsh highs removed.
      for (let i = 0; i < 2; i++) {
        const start = now + i * .24;
        const oscillator = audio.createOscillator();
        const lowpass = audio.createBiquadFilter();
        const formant = audio.createBiquadFilter();
        const gain = audio.createGain();
        const voice = trackVoice(oscillator, [lowpass, formant, gain]);
        scheduled.push(voice);
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(145, start);
        oscillator.frequency.exponentialRampToValueAtTime(72, start + .2);
        lowpass.type = 'lowpass';
        lowpass.Q.value = .7;
        lowpass.frequency.setValueAtTime(2200, start);
        lowpass.frequency.exponentialRampToValueAtTime(850, start + .2);
        formant.type = 'peaking';
        formant.Q.value = 3.5;
        formant.gain.value = 12;
        formant.frequency.setValueAtTime(650, start);
        formant.frequency.linearRampToValueAtTime(1150, start + .055);
        formant.frequency.exponentialRampToValueAtTime(480, start + .2);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(.32, start + .025);
        gain.gain.linearRampToValueAtTime(.22, start + .09);
        gain.gain.exponentialRampToValueAtTime(.001, start + .21);
        oscillator.connect(lowpass).connect(formant).connect(gain).connect(output);
        oscillator.start(start);
        oscillator.stop(start + .23);
      }
    } else if (kind === 'alarm') {
      note(880, now, .14, 'triangle', .23);
      note(587.33, now + .18, .14, 'triangle', .23);
      note(880, now + .36, .24, 'triangle', .23);
    } else {
      const melody = kind === 'success' ? [523.25, 659.25, 783.99, 1046.5] : [659.25, 880];
      melody.forEach((frequency, i) => note(frequency, now + i * .105, .35));
    }
    return true;
  } catch {
    for (const voice of scheduled) {
      try { voice.oscillator.stop(); } catch { /* Scheduling may have failed. */ }
      voice.cleanup();
    }
    return false;
  }
}
