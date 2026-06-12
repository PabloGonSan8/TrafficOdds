/**
 * roulette.js — Ruleta europea (un solo 0) jugada con puntos del juego.
 * El 0 da la ventaja de la casa, como en el casino real (~2,7%).
 */

// Orden real de los números en una ruleta europea.
export const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30,
  8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7,
  28, 12, 35, 3, 26,
];

export const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export function colorOf(n) {
  if (n === 0) return "green";
  return RED_NUMBERS.has(n) ? "red" : "black";
}

/**
 * Tipos de apuesta con su multiplicador de pago (incluye el stake),
 * como en la ruleta europea real: pleno 35:1, caballo 17:1, calle 11:1,
 * cuadro 8:1, seisena 5:1, docena/columna 2:1, sencillas 1:1.
 */
export const ROULETTE_BETS = [
  { id: "red",    label: "Rojo",       payout: 2,  wins: (n) => colorOf(n) === "red" },
  { id: "black",  label: "Negro",      payout: 2,  wins: (n) => colorOf(n) === "black" },
  { id: "even",   label: "Par",        payout: 2,  wins: (n) => n !== 0 && n % 2 === 0 },
  { id: "odd",    label: "Impar",      payout: 2,  wins: (n) => n % 2 === 1 },
  { id: "low",    label: "1–18",       payout: 2,  wins: (n) => n >= 1 && n <= 18 },
  { id: "high",   label: "19–36",      payout: 2,  wins: (n) => n >= 19 && n <= 36 },
  { id: "dozen1", label: "1ª docena",  payout: 3,  wins: (n) => n >= 1 && n <= 12 },
  { id: "dozen2", label: "2ª docena",  payout: 3,  wins: (n) => n >= 13 && n <= 24 },
  { id: "dozen3", label: "3ª docena",  payout: 3,  wins: (n) => n >= 25 && n <= 36 },
  { id: "col1",   label: "Columna",    payout: 3,  wins: (n) => n !== 0 && n % 3 === 1 },
  { id: "col2",   label: "Columna",    payout: 3,  wins: (n) => n !== 0 && n % 3 === 2 },
  { id: "col3",   label: "Columna",    payout: 3,  wins: (n) => n !== 0 && n % 3 === 0 },
  { id: "straight", label: "Pleno",    payout: 36, wins: (n, v) => n === Number(v) },
  // Interiores combinadas: el valor codifica los números cubiertos.
  // split: "a-b" (adyacentes en el tapete) · street/six: número inicial
  // de la fila · corner: número menor del cuadrado.
  {
    id: "split", label: "Caballo", payout: 18,
    wins: (n, v) => String(v).split("-").map(Number).includes(n),
  },
  {
    id: "street", label: "Calle", payout: 12,
    wins: (n, v) => n >= Number(v) && n <= Number(v) + 2,
  },
  {
    id: "corner", label: "Cuadro", payout: 9,
    wins: (n, v) => {
      const s = Number(v);
      return n === s || n === s + 1 || n === s + 3 || n === s + 4;
    },
  },
  {
    id: "six", label: "Seisena", payout: 6,
    wins: (n, v) => n >= Number(v) && n <= Number(v) + 5,
  },
];

/**
 * Límites de mesa, como en un casino real: las apuestas con mayor premio
 * tienen máximos más bajos para evitar pagos excesivos.
 */
export const TABLE_LIMITS = {
  min: 10,          // apuesta mínima por posición
  inside: 500,      // pleno, caballo, calle, cuadro, seisena
  dozenColumn: 2500,
  even: 5000,       // rojo/negro, par/impar, 1-18/19-36
};

const INSIDE_TYPES = new Set(["straight", "split", "street", "corner", "six"]);

/** Máximo de mesa para un tipo de apuesta. */
export function maxForBet(type) {
  if (INSIDE_TYPES.has(type)) return TABLE_LIMITS.inside;
  if (type.startsWith("dozen") || type.startsWith("col")) return TABLE_LIMITS.dozenColumn;
  return TABLE_LIMITS.even;
}

/** Etiqueta humana de un tipo de apuesta. */
export function labelForBet(type) {
  return ROULETTE_BETS.find((b) => b.id === type)?.label ?? type;
}

export function spin() {
  return Math.floor(Math.random() * 37); // 0..36
}

/** Resuelve una apuesta: devuelve el pago total (0 si pierde). */
export function resolveRoulette(betId, stake, number, straightValue = null) {
  const bet = ROULETTE_BETS.find((b) => b.id === betId);
  if (!bet) return 0;
  return bet.wins(number, straightValue) ? stake * bet.payout : 0;
}

/**
 * Resuelve un conjunto de apuestas de mesa contra el número ganador.
 * bets: [{ type, value, stake }] — devuelve el pago total.
 */
export function resolveAll(bets, number) {
  return bets.reduce(
    (sum, b) => sum + resolveRoulette(b.type, b.stake, number, b.value),
    0
  );
}
