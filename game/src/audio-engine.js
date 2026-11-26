export function createAudio() {
  let context = null;
  let engine = null;
  let engineGain = null;
  let windGain = null;
  let enabled = false;

  function noiseBuffer(ctx) {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i += 1) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    }
    return buffer;
  }

  function start() {
    if (enabled) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    context = new AudioContextClass();
    engineGain = context.createGain();
    engineGain.gain.value = 0.035;
    engine = context.createOscillator();
    engine.type = 'sawtooth';
    engine.frequency.value = 70;
    const engineFilter = context.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 620;
    engine.connect(engineFilter).connect(engineGain).connect(context.destination);
    engine.start();

    const wind = context.createBufferSource();
    wind.buffer = noiseBuffer(context);
    wind.loop = true;
    const windFilter = context.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 520;
    windGain = context.createGain();
    windGain.gain.value = 0.02;
    wind.connect(windFilter).connect(windGain).connect(context.destination);
    wind.start();
    enabled = true;
  }

  function update(plane) {
    if (!enabled) return;
    const rpm = 55 + plane.throttle * 95 + plane.speed * 0.35;
    engine.frequency.setTargetAtTime(rpm, context.currentTime, 0.08);
    engineGain.gain.setTargetAtTime(0.02 + plane.throttle * 0.055, context.currentTime, 0.1);
    windGain.gain.setTargetAtTime(0.006 + plane.speed * 0.00045, context.currentTime, 0.1);
  }

  function tone(frequency, duration, type = 'sine', volume = 0.12) {
    if (!enabled) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.4, context.currentTime + duration);
    gain.gain.setValueAtTime(volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }

  return {
    start,
    update,
    gate() { tone(720, 0.24, 'sine', 0.1); },
    success() { tone(520, 0.5, 'triangle', 0.12); setTimeout(() => tone(780, 0.55, 'triangle', 0.1), 140); },
    crash() { tone(130, 0.6, 'sawtooth', 0.14); },
    drop() { tone(380, 0.18, 'square', 0.07); },
  };
}
