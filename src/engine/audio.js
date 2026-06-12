/**
 * audio.js — Efectos de sonido sintetizados con WebAudio.
 * Sin assets: osciladores con envolvente corta. Si el contexto está
 * suspendido (sin gesto de usuario aún) los sonidos se omiten en silencio.
 */
let ctx = null;
let muted = false;

export function setMuted(value) {
  muted = value;
}

export function isMuted() {
  return muted;
}

function ensureContext() {
  if (muted) return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx.state === "running" ? ctx : null;
  } catch {
    return null;
  }
}

function beep(freq, duration, { type = "sine", gain = 0.06, delay = 0 } = {}) {
  const ac = ensureContext();
  if (!ac) return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

export function click() {
  beep(620, 0.06, { type: "square", gain: 0.03 });
}

/** Tick corto y suave: bola de ruleta pasando casillas / rebotes. */
export function tick() {
  beep(1300 + Math.random() * 400, 0.025, { type: "square", gain: 0.012 });
}

export function win() {
  beep(523, 0.12);
  beep(659, 0.12, { delay: 0.1 });
  beep(784, 0.22, { delay: 0.2 });
}

export function lose() {
  beep(233, 0.18, { type: "sawtooth", gain: 0.04 });
  beep(174, 0.25, { type: "sawtooth", gain: 0.04, delay: 0.12 });
}

export function levelUp() {
  beep(523, 0.1);
  beep(659, 0.1, { delay: 0.08 });
  beep(784, 0.1, { delay: 0.16 });
  beep(1046, 0.3, { delay: 0.24 });
}

export function eventAlert() {
  beep(880, 0.1, { type: "triangle" });
  beep(880, 0.1, { type: "triangle", delay: 0.15 });
}
