/**
 * bingo.js — Bingo de 50 bolas (puntos, sin dinero real). Variante rápida.
 * Cartón: 3 filas × 5 columnas = 15 números, SIN huecos (todas las casillas
 * llevan número). Columnas por decena (1-10, 11-20, …, 41-50), ordenadas de
 * menor a mayor de arriba abajo. Premios: Línea, Dos líneas, Bingo.
 */

export const BALLS = 50;
const COLS = 5;
const ROWS = 3;

export const CARD_COST = 100;
// Multiplicadores configurables (sobre el precio del cartón ganador).
export const PRIZES = { line: 2, twoLines: 5, bingo: 20 };

/**
 * Mercados de apuesta lateral (además de los premios del cartón). Cada uno es
 * opcional y se juega con su propio importe. La resolución vive en la página,
 * que conoce el desarrollo de la partida (bola del bingo, de la línea, etc.).
 *
 * kind: "option" (elige una opción con su multiplicador) | "lucky" (eliges nº).
 */
export const MARKETS = [
  // --- Asequibles ---
  {
    id: "bingoSpeed",
    icon: "⚡",
    label: "Bingo rápido",
    help: "¿En cuántas bolas caerá el BINGO?",
    kind: "option",
    options: [
      { label: "≤ 30", mult: 12, target: 30 },
      { label: "≤ 38", mult: 5, target: 38 },
      { label: "≤ 44", mult: 2, target: 44 },
    ],
  },
  {
    id: "lineSpeed",
    icon: "📏",
    label: "Línea rápida",
    help: "¿Cuándo saldrá tu primera LÍNEA?",
    kind: "option",
    options: [
      { label: "≤ 12", mult: 8, lineTarget: 12 },
      { label: "≤ 18", mult: 3, lineTarget: 18 },
      { label: "≤ 24", mult: 1.8, lineTarget: 24 },
    ],
  },
  {
    id: "bingoRange",
    icon: "🎯",
    label: "Tramo del bingo",
    help: "¿En qué tramo cae el bingo?",
    kind: "option",
    options: [
      { label: "36–40", mult: 5, range: [36, 40] },
      { label: "41–45", mult: 2.5, range: [41, 45] },
      { label: "46–50", mult: 2, range: [46, 50] },
    ],
  },
  {
    id: "parity",
    icon: "⚖️",
    label: "Par / Impar del bingo",
    help: "La bola que canta BINGO, ¿par o impar?",
    kind: "option",
    options: [
      { label: "Par", mult: 1.9, parity: 0 },
      { label: "Impar", mult: 1.9, parity: 1 },
    ],
  },
  {
    id: "lucky",
    icon: "🍀",
    label: "Número de la suerte",
    help: "Sale entre las 10 primeras bolas. ×4.",
    kind: "pick",
    resolve: "lucky",
    mult: 4,
    firstK: 10,
    pick: { min: 1, max: 50, def: 7, hint: "×4 si sale en las 10 primeras" },
  },

  // --- Difíciles, alto multiplicador ---
  {
    id: "bingoFlash",
    icon: "🔥",
    label: "Bingo relámpago",
    help: "Bingo MUY pronto. Pagos enormes.",
    hard: true,
    kind: "option",
    options: [
      { label: "≤ 25", mult: 30, target: 25 },
      { label: "≤ 21", mult: 80, target: 21 },
      { label: "≤ 18", mult: 200, target: 18 },
    ],
  },
  {
    id: "linePerfect",
    icon: "💥",
    label: "Línea perfecta",
    help: "Línea casi instantánea.",
    hard: true,
    kind: "option",
    options: [
      { label: "≤ 8", mult: 40, lineTarget: 8 },
      { label: "≤ 6", mult: 120, lineTarget: 6 },
      { label: "≤ 5", mult: 300, lineTarget: 5 },
    ],
  },
  {
    id: "firstBall",
    icon: "🎲",
    label: "Primera bola exacta",
    help: "Acierta el número de la PRIMERA bola. ×40.",
    hard: true,
    kind: "pick",
    resolve: "firstBall",
    mult: 40,
    pick: { min: 1, max: 50, def: 25, hint: "×40 si es la 1ª bola cantada" },
  },
  {
    id: "exactCount",
    icon: "🎰",
    label: "Bola exacta del bingo",
    help: "Acierta EN QUÉ bola cae el bingo. ×25.",
    hard: true,
    kind: "pick",
    resolve: "exactCount",
    mult: 25,
    pick: { min: 15, max: 50, def: 47, hint: "×25 si el bingo cae justo en esa bola" },
  },
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Rango [lo, hi] de la columna c (0-indexada). */
function colRange(c) {
  return [c * 10 + 1, c * 10 + 10];
}

/** Comprueba que un cartón cumple las reglas. */
export function validateCard(card) {
  if (card.length !== ROWS) return false;
  const seen = new Set();
  let total = 0;
  for (let r = 0; r < ROWS; r++) {
    if (card[r].length !== COLS) return false;
    for (let c = 0; c < COLS; c++) {
      const v = card[r][c];
      if (v == null) return false; // sin huecos en 50 bolas
      if (seen.has(v)) return false; // sin repetidos
      seen.add(v);
      const [lo, hi] = colRange(c);
      if (v < lo || v > hi) return false; // dentro de su decena
      total++;
    }
  }
  if (total !== 15) return false;
  // Columnas ordenadas de menor a mayor (de arriba abajo).
  for (let c = 0; c < COLS; c++) {
    for (let r = 1; r < ROWS; r++) if (card[r][c] <= card[r - 1][c]) return false;
  }
  return true;
}

/** Genera un cartón válido: 3 números por columna, ordenados de arriba abajo. */
export function generateCard() {
  const card = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  for (let c = 0; c < COLS; c++) {
    const [lo, hi] = colRange(c);
    const pool = [];
    for (let n = lo; n <= hi; n++) pool.push(n);
    const nums = shuffle(pool).slice(0, ROWS).sort((a, b) => a - b);
    for (let r = 0; r < ROWS; r++) card[r][c] = nums[r];
  }
  return card;
}

/** Secuencia aleatoria completa de las 50 bolas (cada número una vez). */
export function generateDraws() {
  return shuffle(Array.from({ length: BALLS }, (_, i) => i + 1));
}

/** Filas completas de un cartón dado el conjunto de bolas cantadas. */
export function completedRows(card, drawnSet) {
  let n = 0;
  for (let r = 0; r < ROWS; r++) {
    if (card[r].every((v) => drawnSet.has(v))) n++;
  }
  return n;
}

/** Cuántos de los 15 números del cartón han salido. */
export function markedCount(card, drawnSet) {
  let n = 0;
  for (const row of card) for (const v of row) if (drawnSet.has(v)) n++;
  return n;
}

// ---------------------------------------------------------------------------
// Autocomprobación: node src/engine/bingo.js.
// ---------------------------------------------------------------------------
function demo() {
  for (let i = 0; i < 5000; i++) {
    console.assert(validateCard(generateCard()), "cartón inválido generado");
  }
  const draws = generateDraws();
  console.assert(draws.length === 50 && new Set(draws).size === 50, "bolas 1..50 únicas");
  const card = generateCard();
  const all = new Set(draws);
  console.assert(completedRows(card, all) === 3 && markedCount(card, all) === 15, "bingo con todas");
  console.log("bingo.js OK");
}

if (typeof process !== "undefined" && process.argv?.[1]?.includes("bingo")) demo();
