/**
 * challenge.js — Reto Diario (estilo Wordle).
 *
 * Un día de tráfico DETERMINISTA por fecha: mismo reto para todo el mundo,
 * sin servidor. El jugador responde 3 preguntas sí/no sobre cómo acabará la
 * ronda y arriesga una cifra exacta de desempate. Compite contra 9 rivales
 * IA sembrados por la misma fecha (idénticos para todos → sensación de tabla
 * compartida). No reparte puntos del wallet: solo honor, récords y compartir.
 *
 * Todo se calcula con un RNG sembrado (mulberry32) — NUNCA Math.random — para
 * que el resultado sea el mismo en cualquier navegador el mismo día.
 */
import { mulberry32, hashString } from "./progression";
import { VEHICLE_TYPES, intensityAt, EVENTS } from "./simulation";

const RIVAL_NAMES = [
  "ElProfeta", "Asfaltado99", "DonaCurva", "MotoFantasma", "ViaLibre",
  "RadarMan", "LaRetenida", "TurboPaca", "CarrilBus", "NieblaTotal",
  "PeajeFeliz", "RotondaZen", "ClaxonKing", "GPSroto", "AdelantaYa",
  "FrenazoSur", "KmCero", "LunaCorta", "SemaforoJoe", "TraficoTina",
];

// Duración de la reproducción de la ronda (segundos reales, acelerada).
export const ROUND_SECS = 16;

/** Pesos por tipo normalizados, con sesgo de evento opcional. */
function weightsFor(event) {
  const w = VEHICLE_TYPES.map((t) => ({
    id: t.id,
    w: t.weight * (event ? event.mix[t.id] || 1 : 1),
  }));
  const sum = w.reduce((a, b) => a + b.w, 0);
  w.forEach((x) => (x.w /= sum));
  return w;
}

function pick(weights, r) {
  for (const { id, w } of weights) {
    r -= w;
    if (r <= 0) return id;
  }
  return weights[weights.length - 1].id;
}

/**
 * Día de tráfico DETERMINISTA. Devuelve:
 *  - expectedTotal: estimación PÚBLICA (para decidir las respuestas).
 *  - actual: recuento REAL (resuelve las preguntas y la animación).
 *  - event: evento sorpresa del día (o null), con su instante de revelado.
 *  - schedule: guion [{ t, type }] que reproduce la animación → mismo
 *    resultado en cualquier dispositivo (la animación no usa azar para contar).
 */
export function dailyOutcome(dateStr) {
  const rng = mulberry32(hashString("reto-" + dateStr));
  const hour = rng() * 24;
  const intensity = intensityAt(hour);
  const noise = 0.85 + rng() * 0.3;
  const expectedTotal = Math.round(55 * intensity * noise);

  const event = rng() < 0.45 ? EVENTS[Math.floor(rng() * EVENTS.length)] : null;
  const drift = 0.85 + rng() * 0.3; // desvío oculto respecto a la estimación
  const total = Math.max(5, Math.round(expectedTotal * drift * (event ? event.mult : 1)));
  const revealAt = event ? ROUND_SECS * (0.1 + rng() * 0.2) : null;

  const wBefore = weightsFor(null);
  const wAfter = weightsFor(event);
  const counts = { coche: 0, moto: 0, camion: 0, autobus: 0, especial: 0, total };
  const schedule = [];
  for (let i = 0; i < total; i++) {
    const t = ((i + rng() * 0.9) / total) * ROUND_SECS;
    const type = pick(revealAt !== null && t >= revealAt ? wAfter : wBefore, rng());
    counts[type]++;
    schedule.push({ t, type });
  }
  counts.total = total;
  schedule.sort((a, b) => a.t - b.t);

  return { dateStr, hour, expectedTotal, actual: counts, event, revealAt, schedule, duration: ROUND_SECS };
}

/** Las 3 preguntas sí/no + la cifra de desempate, con su respuesta real. */
export function dailyQuestions(outcome) {
  const rng = mulberry32(hashString("preg-" + outcome.dateStr));
  const a = outcome.actual;
  const overN = Math.max(5, Math.round(outcome.expectedTotal * (0.9 + rng() * 0.2)));
  const motoN = Math.max(2, Math.round(outcome.expectedTotal * (0.15 + rng() * 0.1)));
  return {
    overN,
    motoN,
    list: [
      { q: `¿Pasarán más de ${overN} vehículos en total?`, answer: a.total > overN },
      { q: "¿Habrá más motos que camiones?", answer: a.moto > a.camion },
      { q: `¿Pasarán más de ${motoN} motos?`, answer: a.moto > motoN },
    ],
  };
}

/** Puntúa respuestas del jugador: aciertos (0-3) + cercanía a la cifra real. */
export function scoreEntry(answers, exactGuess, outcome, questions) {
  let correct = 0;
  questions.list.forEach((item, i) => {
    if (answers[i] === item.answer) correct++;
  });
  const exactDelta = Math.abs((exactGuess ?? outcome.expectedTotal) - outcome.actual.total);
  return { correct, exactDelta };
}

/** 9 rivales IA deterministas: nombre, aciertos y desvío de su cifra. */
export function dailyRivals(outcome, questions) {
  const rng = mulberry32(hashString("rival-" + outcome.dateStr));
  const names = [...RIVAL_NAMES];
  const rivals = [];
  for (let n = 0; n < 9; n++) {
    const name = names.splice(Math.floor(rng() * names.length), 1)[0];
    const skill = 0.45 + rng() * 0.45; // 45%-90% de acierto por pregunta
    let correct = 0;
    for (const item of questions.list) {
      const guess = rng() < skill ? item.answer : !item.answer;
      if (guess === item.answer) correct++;
    }
    // Su cifra: la real con ruido inverso a la habilidad.
    const spread = Math.round((1.1 - skill) * 22);
    const exactDelta = Math.round(rng() * spread);
    rivals.push({ name, correct, exactDelta });
  }
  return rivals;
}

/** Ordena a todos (jugador incluido) y devuelve el puesto del jugador (1-based). */
export function rank(player, rivals) {
  const all = [...rivals, { ...player, you: true }];
  all.sort((x, y) => y.correct - x.correct || x.exactDelta - y.exactDelta);
  return {
    board: all,
    position: all.findIndex((e) => e.you) + 1,
    total: all.length,
  };
}

/* ---------- Persistencia (localStorage propio, sin tocar el wallet) ---------- */

const KEY = "to-reto";
export const todayStr = () => new Date().toISOString().slice(0, 10);

export function loadReto() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || { records: {} };
  } catch {
    return { records: {} };
  }
}

/** ¿Ya jugó hoy? Devuelve el envío del día o null. */
export function todaysEntry(state, date = todayStr()) {
  return state.play && state.play.date === date ? state.play : null;
}

/** Guarda el envío del día y actualiza récords (racha, mejor puesto, jugados). */
export function saveEntry(state, { date, answers, exactGuess, correct, position }) {
  const r = state.records || {};
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const streak = r.lastPlayed === yesterday ? (r.streak || 0) + 1 : 1;
  const next = {
    play: { date, answers, exactGuess, correct, position },
    records: {
      played: (r.played || 0) + 1,
      streak,
      bestStreak: Math.max(r.bestStreak || 0, streak),
      bestPosition: Math.min(r.bestPosition || 99, position),
      bestCorrect: Math.max(r.bestCorrect || 0, correct),
      lastPlayed: date,
    },
  };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

/* ---------- Self-check: `node src/engine/challenge.js` ---------- */
export function _selfCheck() {
  const a = JSON.stringify(dailyOutcome("2026-06-17"));
  const b = JSON.stringify(dailyOutcome("2026-06-17"));
  console.assert(a === b, "outcome no determinista");
  const o = dailyOutcome("2026-06-17");
  console.assert(o.actual.total >= 5, "total inválido");
  const sumTypes = ["coche", "moto", "camion", "autobus", "especial"].reduce(
    (s, k) => s + o.actual[k],
    0
  );
  console.assert(sumTypes === o.actual.total, `reparto roto ${sumTypes}!=${o.actual.total}`);
  console.assert(o.schedule.length === o.actual.total, "guion != total");
  const tally = o.schedule.reduce((m, s) => ((m[s.type] = (m[s.type] || 0) + 1), m), {});
  console.assert(tally.coche === o.actual.coche, "guion no cuadra con recuento");
  console.assert(o.schedule.every((s, i, a) => i === 0 || a[i - 1].t <= s.t), "guion sin ordenar");
  const q = dailyQuestions(o);
  const rivals = dailyRivals(o, q);
  console.assert(rivals.length === 9, "deben ser 9 rivales");
  const player = scoreEntry([true, true, true], o.expectedTotal, o, q);
  const r = rank(player, rivals);
  console.assert(r.position >= 1 && r.position <= 10, "puesto fuera de rango");
  console.assert(r.board.filter((e) => e.you).length === 1, "jugador duplicado/ausente");
  console.log("challenge self-check OK", { total: o.actual.total, pos: r.position });
}

if (typeof process !== "undefined" && process.argv?.[1]?.endsWith("challenge.js")) {
  _selfCheck();
}
