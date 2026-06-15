/**
 * casino.js — Matemática pura y compartida de los juegos de casino.
 * Probabilidades, cuotas justas con una pequeña ventaja de la casa y
 * utilidades de azar. Sin DOM ni React: testeable y reutilizable.
 */

// Ventaja de la casa por defecto: el jugador cobra el 99% de la cuota justa.
export const HOUSE_EDGE = 0.99;

export function randInt(maxExclusive) {
  return Math.floor(Math.random() * maxExclusive);
}

/** Baraja Fisher-Yates (copia, no muta el original). */
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Redondea cuotas a 2 decimales para mostrarlas limpias. */
export function roundOdds(x) {
  return Math.round(x * 100) / 100;
}

/**
 * MINAS — multiplicador acumulado tras descubrir `picks` casillas seguras.
 * Cuota justa = 1 / P(descubrir picks seguras seguidas), con ventaja de casa.
 * total = casillas totales, mines = número de bombas.
 */
export function minesMultiplier(picks, mines, total = 25) {
  const safe = total - mines;
  if (picks <= 0) return 1;
  let prob = 1;
  for (let i = 0; i < picks; i++) {
    prob *= (safe - i) / (total - i);
  }
  return roundOdds(HOUSE_EDGE / prob);
}

/**
 * CRASH — punto de estallido del cohete. Distribución de cola pesada con
 * ~1% de estallidos instantáneos (la ventaja de la casa). Tope a 1000×.
 */
export function crashPoint() {
  const u = Math.random();
  if (u < 1 - HOUSE_EDGE) return 1; // estallido inmediato
  const m = HOUSE_EDGE / (1 - u);
  return Math.min(1000, Math.max(1, Math.floor(m * 100) / 100));
}

/**
 * MAYOR/MENOR — cuota justa de acertar mayor o menor que `value` (2..14),
 * usando las cartas restantes. counts: nº de cartas vivas por valor.
 */
export function higherLowerOdds(value, dir, deckCounts, remaining) {
  let favorable = 0;
  for (let v = 2; v <= 14; v++) {
    if (dir === "higher" && v > value) favorable += deckCounts[v];
    if (dir === "lower" && v < value) favorable += deckCounts[v];
  }
  if (favorable === 0) return 0;
  return roundOdds((HOUSE_EDGE * remaining) / favorable);
}

// PLINKO — multiplicadores por ranura según nº de filas y "riesgo".
export const PLINKO_PAYOUTS = {
  low: [8, 3, 1.5, 1.1, 1, 0.7, 0.5, 0.7, 1, 1.1, 1.5, 3, 8],
  mid: [18, 5, 2, 1.2, 0.8, 0.5, 0.3, 0.5, 0.8, 1.2, 2, 5, 18],
  high: [60, 12, 4, 1.4, 0.5, 0.2, 0.1, 0.2, 0.5, 1.4, 4, 12, 60],
};
export const PLINKO_ROWS = 12; // 12 filas → 13 ranuras

// RUEDA DE LA FORTUNA — 16 segmentos equiprobables (0× = pierde).
// Reparto: 0×10, 1,5×2, 2×2, 3×1, 5×1 → EV ≈ 0,94 (ventaja de casa ~6%).
const WHEEL_COLOR = { 0: "#3a3f4a", 1.5: "#2ee06f", 2: "#3b82f6", 3: "#f97316", 5: "#a855f7" };
export const WHEEL_SEGMENTS = [0, 1.5, 0, 2, 0, 3, 0, 2, 0, 1.5, 0, 5, 0, 0, 0, 0].map((mult) => ({
  mult,
  color: WHEEL_COLOR[mult],
}));

// DADOS — cuotas de los mercados (2 dados, suma 2..12).
// Cuotas justas = 36 / nº de combinaciones favorables, con ventaja de casa.
export const DICE_MARKETS = {
  low: { label: "Menos de 7", odds: 2.3, test: (s) => s < 7 },
  high: { label: "Más de 7", odds: 2.3, test: (s) => s > 7 },
  seven: { label: "Igual a 7", odds: 5, test: (s) => s === 7 },
  even: { label: "Par", odds: 1.95, test: (s) => s % 2 === 0 },
  odd: { label: "Impar", odds: 1.95, test: (s) => s % 2 === 1 },
  doubles: { label: "Dobles", odds: 5, test: (s, a, b) => a === b },
  field: { label: "Campo (2-4,9-12)", odds: 2.2, test: (s) => s <= 4 || s >= 9 },
  big: { label: "Más de 10", odds: 11, test: (s) => s > 10 },
  small: { label: "Menos de 4", odds: 11, test: (s) => s < 4 },
};

// CARRERA — vehículos participantes y cuota (4 corredores).
export const RACERS = [
  { id: "coche", emoji: "🚗", name: "Coche" },
  { id: "moto", emoji: "🏍️", name: "Moto" },
  { id: "camion", emoji: "🚚", name: "Camión" },
  { id: "bus", emoji: "🚌", name: "Autobús" },
];
export const RACE_ODDS = roundOdds(HOUSE_EDGE * RACERS.length); // ~3.96×
