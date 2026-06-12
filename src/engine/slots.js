/**
 * slots.js — Tragaperras 3×3 con 5 líneas de pago, jugada con puntos.
 * Mecánica como las máquinas reales:
 *  - Tira ponderada por rodillo: los símbolos altos salen menos.
 *  - Comodín (🃏): sustituye a cualquier símbolo de línea.
 *  - Bonus (🎁): 3 o más en cualquier posición → 8 giros gratis con premios ×2.
 * RTP ≈ 93% (líneas ~90% + contribución de los giros gratis), de forma que
 * la casa conserva ventaja como en el resto de juegos.
 */

export const SYMBOLS = {
  cherry: { icon: "🍒", label: "Cereza" },
  lemon: { icon: "🍋", label: "Limón" },
  orange: { icon: "🍊", label: "Naranja" },
  grape: { icon: "🍇", label: "Uva" },
  bell: { icon: "🔔", label: "Campana" },
  star: { icon: "⭐", label: "Estrella" },
  seven: { icon: "7️⃣", label: "Siete" },
  wild: { icon: "🃏", label: "Comodín" },
  scatter: { icon: "🎁", label: "Bonus" },
};

// Tira ponderada (34 posiciones). Igual para los tres rodillos.
const WEIGHTS = [
  ["cherry", 7],
  ["lemon", 7],
  ["orange", 6],
  ["grape", 5],
  ["bell", 4],
  ["star", 2],
  ["seven", 1],
  ["wild", 1],
  ["scatter", 1],
];

export const STRIP = WEIGHTS.flatMap(([id, w]) => Array(w).fill(id));

/**
 * Pago de 3 iguales en línea (el comodín sustituye), como multiplicador
 * de la apuesta POR LÍNEA (apuesta total / 5). Las cerezas además pagan
 * con solo 2 en línea.
 */
export const PAYTABLE = {
  wild: 250,
  seven: 150,
  star: 70,
  bell: 35,
  grape: 20,
  orange: 16,
  lemon: 12,
  cherry: 8,
};
export const TWO_CHERRIES_PAY = 2;

export const FREE_SPINS_AWARD = 8;
export const FREE_SPIN_MULTIPLIER = 2;

/**
 * Líneas de pago: para cada columna, la fila que toca.
 * 0 = arriba, 1 = centro, 2 = abajo.
 */
export const LINES = [
  { id: "mid", rows: [1, 1, 1], label: "Centro" },
  { id: "top", rows: [0, 0, 0], label: "Arriba" },
  { id: "bottom", rows: [2, 2, 2], label: "Abajo" },
  { id: "diagDown", rows: [0, 1, 2], label: "Diagonal ↘" },
  { id: "diagUp", rows: [2, 1, 0], label: "Diagonal ↗" },
];

function randomWindow() {
  const start = Math.floor(Math.random() * STRIP.length);
  return [0, 1, 2].map((i) => STRIP[(start + i) % STRIP.length]);
}

/** Gira los rodillos: devuelve grid[col][row] de ids de símbolo. */
export function spinReels() {
  return [randomWindow(), randomWindow(), randomWindow()];
}

/**
 * Símbolo efectivo de una línea con sustitución de comodín:
 * devuelve el id si los tres encajan (o "wild" si son tres comodines),
 * o null si la línea no paga triple.
 */
function tripleSymbol(syms) {
  const nonWild = syms.filter((s) => s !== "wild");
  if (nonWild.length === 0) return "wild";
  const target = nonWild[0];
  if (target === "scatter") return null; // el bonus no forma líneas
  return nonWild.every((s) => s === target) ? target : null;
}

/**
 * Evalúa el grid contra las 5 líneas y el bonus.
 * Devuelve { totalWin, lineWins, scatters, freeSpins }.
 */
export function evaluate(grid, totalBet) {
  const lineBet = totalBet / LINES.length;
  const lineWins = [];

  for (const line of LINES) {
    const syms = line.rows.map((row, col) => grid[col][row]);
    const triple = tripleSymbol(syms);
    let mult = 0;
    let symbol = triple;
    if (triple !== null) {
      mult = PAYTABLE[triple] ?? 0;
    } else if (syms.filter((s) => s === "cherry").length === 2) {
      mult = TWO_CHERRIES_PAY;
      symbol = "cherry";
    }
    if (mult > 0) {
      lineWins.push({ line, symbol, amount: Math.round(lineBet * mult) });
    }
  }

  const scatters = grid.flat().filter((s) => s === "scatter").length;
  const freeSpins = scatters >= 3 ? FREE_SPINS_AWARD : 0;

  const totalWin = lineWins.reduce((sum, w) => sum + w.amount, 0);
  return { totalWin, lineWins, scatters, freeSpins };
}

/** Símbolo aleatorio de la tira, para el relleno de la animación de giro. */
export function randomSymbol() {
  return STRIP[Math.floor(Math.random() * STRIP.length)];
}
