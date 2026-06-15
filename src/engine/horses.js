/**
 * horses.js — Modelo de las carreras de caballos (hípica).
 *
 * Como en una casa de apuestas real: cada caballo tiene una "forma" (fuerza)
 * distinta en cada carrera, de la que salen las cuotas. Los favoritos pagan
 * poco y los outsiders mucho. Las cuotas de Ganador y Colocado se estiman por
 * simulación Monte Carlo del mismo modelo que decide la carrera; las exóticas
 * (Exacta, Trifecta) se valoran con el método de Harville a partir de las
 * probabilidades de victoria. Todo con una pequeña ventaja de la casa.
 */
import { HOUSE_EDGE, roundOdds } from "./casino";

// Parrilla fija de caballos: dorsal, nombre y color de la casaca (silk).
export const HORSE_BASES = [
  { num: 1, name: "Trueno", color: "#ef4444" },
  { num: 2, name: "Relámpago", color: "#3b82f6" },
  { num: 3, name: "Tornado", color: "#22c55e" },
  { num: 4, name: "Broberto Chati", color: "#eab308" },
  { num: 5, name: "Vendaval", color: "#a855f7" },
  { num: 6, name: "Huracán", color: "#f97316" },
  { num: 7, name: "Tormenta", color: "#06b6d4" },
  { num: 8, name: "Ciclón", color: "#ec4899" },
];

export const FIELD = HORSE_BASES.length; // 8 corredores
export const PLACES = FIELD >= 8 ? 3 : 2; // Colocado: top-3 con 8+, si no top-2
const SIGMA = 0.6; // dispersión: a más alto, más sorpresas

// Gaussiana estándar (Box-Muller).
function gauss() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Rendimiento de un caballo en una carrera = fuerza + ruido gaussiano. */
function performance(strength) {
  return strength + gauss() * SIGMA;
}

/** Orden de llegada (índices) a partir de las fuerzas: mayor rendimiento gana. */
export function sampleOrder(strengths) {
  const perf = strengths.map(performance);
  return [...perf.keys()].sort((a, b) => perf[b] - perf[a]);
}

// Monte Carlo: probabilidad de ganar y de entrar en el podio (top-PLACES).
function probs(strengths, sims = 6000) {
  const n = strengths.length;
  const win = new Array(n).fill(0);
  const place = new Array(n).fill(0);
  for (let s = 0; s < sims; s++) {
    const order = sampleOrder(strengths);
    win[order[0]]++;
    for (let k = 0; k < PLACES; k++) place[order[k]]++;
  }
  return { win: win.map((w) => w / sims), place: place.map((p) => p / sims) };
}

/**
 * Genera una carrera nueva: asigna forma aleatoria a cada caballo y calcula
 * sus cuotas de Ganador y Colocado. Devuelve también las probabilidades de
 * victoria (winP) para valorar las apuestas exóticas.
 */
const clampOdds = (o, max = 99) => Math.min(max, Math.max(1.1, roundOdds(o)));

export function buildRaceCard() {
  const strengths = HORSE_BASES.map(() => 1 + Math.random() * 1.4);
  const { win, place } = probs(strengths);
  // Suelo en las probabilidades: evita cuotas infinitas / apuestas imposibles.
  const winP = win.map((w) => Math.max(w, 0.005));
  const horses = HORSE_BASES.map((h, i) => ({
    ...h,
    idx: i,
    strength: strengths[i],
    winP: winP[i],
    placeP: place[i],
    winOdds: clampOdds(HOUSE_EDGE / winP[i]),
    placeOdds: clampOdds(HOUSE_EDGE / Math.max(place[i], 0.01), 40),
  }));
  return { horses, winP, strengths };
}

// Harville: P(a 1º, b 2º) = pa · pb/(1-pa). Cuota = ventaja / probabilidad.
export function exactaOdds(winP, a, b) {
  if (a === b) return 0;
  const p = winP[a] * (winP[b] / (1 - winP[a]));
  return p > 0 ? clampOdds(HOUSE_EDGE / p, 400) : 0;
}

export function trifectaOdds(winP, a, b, c) {
  if (a === b || a === c || b === c) return 0;
  const denom = 1 - winP[a] - winP[b];
  const p = denom > 0 ? winP[a] * (winP[b] / (1 - winP[a])) * (winP[c] / denom) : 0;
  return p > 0 ? clampOdds(HOUSE_EDGE / p, 2000) : 0;
}
