/*
 * Book Batches – sound effects.
 *
 * Sounds are synthesised with Web Audio, so the game ships no audio files.
 */

window.BookSounds = (() => {
  let context = null;

  function audio() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    if (!context) context = new AudioContext();
    if (context.state === "suspended") context.resume();
    return context;
  }

  /** Paper crackles: many short, decaying noise bursts that thin out over time. */
  function crumpleBuffer(ctx, seconds) {
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * seconds);
    const buffer = ctx.createBuffer(1, length, rate);
    const data = buffer.getChannelData(0);
    const crackles = 150;
    for (let i = 0; i < crackles; i += 1) {
      const at = Math.pow(Math.random(), 1.6) * (length - rate * 0.02);
      const span = Math.floor(rate * (0.002 + Math.random() * 0.016));
      const loudness = (0.25 + Math.random() * 0.75) * (1 - at / length * 0.7);
      for (let j = 0; j < span; j += 1) {
        const index = Math.floor(at) + j;
        data[index] += (Math.random() * 2 - 1) * loudness * Math.exp(-j / (span * 0.3));
      }
    }
    for (let i = 0; i < length; i += 1) {
      data[i] += (Math.random() * 2 - 1) * 0.04 * (1 - i / length);
    }
    return buffer;
  }

  function crumple() {
    const ctx = audio();
    if (!ctx) return;
    const source = ctx.createBufferSource();
    source.buffer = crumpleBuffer(ctx, 0.55);
    source.playbackRate.value = 0.9 + Math.random() * 0.2;

    const highpass = ctx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 700;

    const presence = ctx.createBiquadFilter();
    presence.type = "peaking";
    presence.frequency.value = 3200;
    presence.Q.value = 0.8;
    presence.gain.value = 5;

    const volume = ctx.createGain();
    const now = ctx.currentTime;
    volume.gain.setValueAtTime(0.0001, now);
    volume.gain.exponentialRampToValueAtTime(0.45, now + 0.015);
    volume.gain.setValueAtTime(0.45, now + 0.22);
    volume.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

    source.connect(highpass).connect(presence).connect(volume).connect(ctx.destination);
    source.start(now);
    source.stop(now + 0.62);
  }

  return { crumple };
})();
