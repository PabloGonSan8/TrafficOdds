/**
 * music.js — Música de fondo procedural con WebAudio.
 * Loop chill lo-fi generado en tiempo real: bajo + pads + arpegio pentatónico.
 * Sin assets ni copyright: todo se sintetiza. Volumen bajo a propósito.
 */
let ctx = null;
let master = null;
let playing = false;
let schedulerId = null;
let step = 0;
let nextNoteTime = 0;

const BPM = 84;
const STEP = 60 / BPM / 2; // corcheas
const LOOKAHEAD_MS = 60;
const AHEAD = 0.15;

// Progresión Am – F – C – G (frecuencias en Hz).
const CHORDS = [
  { bass: 110.0, notes: [220.0, 261.63, 329.63] },   // Am
  { bass: 87.31, notes: [174.61, 220.0, 261.63] },   // F
  { bass: 130.81, notes: [261.63, 329.63, 392.0] },  // C
  { bass: 98.0, notes: [196.0, 246.94, 293.66] },    // G
];
const PENTA = [220.0, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25];
const STEPS_PER_CHORD = 16; // 2 compases por acorde

function ensureContext() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx.state === "running";
}

function note(freq, t, dur, { type = "sine", gain = 0.03, attack = 0.02, filterFreq = 0 } = {}) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let chain = osc;
  if (filterFreq > 0) {
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(filterFreq, t);
    osc.connect(filter);
    chain = filter;
  }
  chain.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.1);
}

function scheduleStep(s, t) {
  const chord = CHORDS[Math.floor(s / STEPS_PER_CHORD) % CHORDS.length];
  const inChord = s % STEPS_PER_CHORD;

  // Pad: triada suave al inicio de cada acorde.
  if (inChord === 0) {
    for (const f of chord.notes) {
      note(f, t, STEP * STEPS_PER_CHORD, {
        type: "sawtooth", gain: 0.012, attack: 1.2, filterFreq: 900,
      });
    }
  }

  // Bajo: redonda por pulso (pasos pares).
  if (inChord % 4 === 0) {
    note(chord.bass, t, STEP * 3.5, { type: "sine", gain: 0.05, attack: 0.03 });
  }

  // Arpegio pentatónico: plucks aleatorios en contratiempos.
  if (s % 2 === 1 && Math.random() < 0.4) {
    const f = PENTA[Math.floor(Math.random() * PENTA.length)];
    note(f, t, STEP * 1.8, { type: "triangle", gain: 0.018, attack: 0.01 });
  }

  // Hi-hat sutil: ruido corto cada pulso alterno.
  if (inChord % 4 === 2 && Math.random() < 0.7) {
    note(6000 + Math.random() * 2000, t, 0.04, { type: "square", gain: 0.004 });
  }
}

function scheduler() {
  while (nextNoteTime < ctx.currentTime + AHEAD) {
    scheduleStep(step, nextNoteTime);
    nextNoteTime += STEP;
    step++;
  }
}

export function start() {
  if (playing) return;
  if (!ensureContext()) return; // sin gesto de usuario aún: se reintentará
  playing = true;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setValueAtTime(0, ctx.currentTime);
  master.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.4);
  step = 0;
  nextNoteTime = ctx.currentTime + 0.05;
  schedulerId = setInterval(scheduler, LOOKAHEAD_MS);
}

export function stop() {
  playing = false;
  if (schedulerId) clearInterval(schedulerId);
  schedulerId = null;
  // Corte real: las notas ya programadas (pads largos) deben callarse también.
  if (ctx && master) {
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
  }
}

export function isPlaying() {
  return playing;
}
