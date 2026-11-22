// Tiny sound effects, synthesised with WebAudio — no audio files, no network.
// Created lazily on the first user gesture, so the page stays silent until played.
let context = null;
let muted = false;

export function isMuted() {
  return muted;
}

export function toggleMuted() {
  muted = !muted;
  return muted;
}

function ensureContext() {
  if (context) return context;
  const AudioContext = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContext) return null;
  context = new AudioContext();
  return context;
}

function blip(frequency, durationMs, type, volume) {
  if (muted) return;
  const ctx = ensureContext();
  if (!ctx) return;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + durationMs / 1000);
}

export const sfx = {
  play() { blip(520, 90, 'triangle', 0.12); },
  hit() { blip(140, 160, 'sawtooth', 0.14); },
  heal() { blip(660, 180, 'sine', 0.12); blip(880, 220, 'sine', 0.08); },
  block() { blip(300, 120, 'square', 0.07); },
  turn() { blip(440, 80, 'triangle', 0.1); },
  win() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, 200, 'triangle', 0.12), i * 120)); },
  lose() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => blip(f, 220, 'sine', 0.1), i * 140)); },
};
