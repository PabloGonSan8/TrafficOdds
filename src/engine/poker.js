/**
 * poker.js — Motor de póker con puntos: Texas Hold'em y póker de 5 cartas (draw).
 * Mesa de hasta 4 jugadores (tú + bots). Sin dinero real: las fichas de la mesa
 * se compran con puntos y se cobran de vuelta al salir.
 *
 * El corazón es evaluate5/bestHand: comparan manos de forma exacta. El resto
 * (reparto, IA, apuestas) se apoya en ellos. Reglas estándar:
 * https://en.wikipedia.org/wiki/List_of_poker_hands
 */

export const SUITS = [
  { id: "S", icon: "♠", red: false },
  { id: "H", icon: "♥", red: true },
  { id: "D", icon: "♦", red: true },
  { id: "C", icon: "♣", red: false },
];

export const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

const RANK_VALUE = Object.fromEntries(RANKS.map((r, i) => [r, i + 2])); // 2..14

export const HAND_NAMES = [
  "Carta alta",
  "Pareja",
  "Doble pareja",
  "Trío",
  "Escalera",
  "Color",
  "Full",
  "Póker",
  "Escalera de color",
];

/** Baraja francesa de 52, mezclada (Fisher–Yates). */
export function newDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) deck.push({ rank, suit: suit.id });
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function draw(deck, n = 1) {
  return deck.splice(0, n);
}

/** Valor de escalera más alto entre valores únicos (incluye la rueda A-2-3-4-5). */
function straightHigh(uniqDesc) {
  if (uniqDesc.length < 5) {
    // Rueda: A actúa como 1. Comprobamos 5-4-3-2 con un As presente.
    if (uniqDesc.includes(14) && [5, 4, 3, 2].every((v) => uniqDesc.includes(v))) return 5;
    return 0;
  }
  for (let i = 0; i + 4 < uniqDesc.length; i++) {
    if (uniqDesc[i] - uniqDesc[i + 4] === 4) return uniqDesc[i];
  }
  if (uniqDesc.includes(14) && [5, 4, 3, 2].every((v) => uniqDesc.includes(v))) return 5;
  return 0;
}

/**
 * Evalúa exactamente 5 cartas. Devuelve { cat, tie, cards } donde cat es la
 * categoría (0..8) y tie es el array de desempate (mayor a menor). Dos manos se
 * comparan con compareScore sobre [cat, ...tie].
 */
export function evaluate5(cards) {
  const values = cards.map((c) => RANK_VALUE[c.rank]).sort((a, b) => b - a);
  const flush = cards.every((c) => c.suit === cards[0].suit);

  const countMap = {};
  for (const v of values) countMap[v] = (countMap[v] || 0) + 1;
  // Grupos ordenados por frecuencia y, a igualdad, por valor: ese orden ya es
  // el desempate correcto (póker, full, trío, dobles, pareja).
  const groups = Object.entries(countMap)
    .map(([v, n]) => ({ v: Number(v), n }))
    .sort((a, b) => b.n - a.n || b.v - a.v);
  const pattern = groups.map((g) => g.n).join("");
  const tieRanks = groups.map((g) => g.v);

  const uniqDesc = [...new Set(values)];
  const sh = straightHigh(uniqDesc);

  let cat, tie;
  if (sh && flush) (cat = 8), (tie = [sh]);
  else if (pattern === "41") (cat = 7), (tie = tieRanks);
  else if (pattern === "32") (cat = 6), (tie = tieRanks);
  else if (flush) (cat = 5), (tie = values);
  else if (sh) (cat = 4), (tie = [sh]);
  else if (pattern === "311") (cat = 3), (tie = tieRanks);
  else if (pattern === "221") (cat = 2), (tie = tieRanks);
  else if (pattern === "2111") (cat = 1), (tie = tieRanks);
  else (cat = 0), (tie = values);

  return { cat, tie, cards };
}

/** Compara [cat,...tie] lexicográficamente. >0 si a gana. */
export function compareScore(a, b) {
  if (a.cat !== b.cat) return a.cat - b.cat;
  for (let i = 0; i < Math.max(a.tie.length, b.tie.length); i++) {
    const d = (a.tie[i] || 0) - (b.tie[i] || 0);
    if (d) return d;
  }
  return 0;
}

function combinations(arr, k) {
  const out = [];
  const pick = (start, combo) => {
    if (combo.length === k) return out.push(combo.slice());
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      pick(i + 1, combo);
      combo.pop();
    }
  };
  pick(0, []);
  return out;
}

/** Mejor mano de 5 entre 5..7 cartas (Hold'em: 2 propias + 5 comunitarias). */
export function bestHand(cards) {
  if (cards.length <= 5) return evaluate5(cards);
  let best = null;
  for (const combo of combinations(cards, 5)) {
    const score = evaluate5(combo);
    if (!best || compareScore(score, best) > 0) best = score;
  }
  return best;
}

export function handName(score) {
  return HAND_NAMES[score.cat];
}

// ---------------------------------------------------------------------------
// IA para la mesa con bots (modo "contra la IA"). Estima fuerza de mano y
// decide apostar/pasar/subir/retirarse con algo de farol.
// ---------------------------------------------------------------------------

/** Fuerza preflop de 2 cartas en Hold'em (Chen-ish simplificado), 0..1. */
function preflopStrength(hole) {
  const [a, b] = hole.map((c) => RANK_VALUE[c.rank]).sort((x, y) => y - x);
  const pair = a === b;
  const suited = hole[0].suit === hole[1].suit;
  const gap = a - b;
  let s = (a - 2) / 24 + (b - 2) / 24;
  if (pair) s += 0.45;
  if (suited) s += 0.1;
  if (!pair && gap === 1) s += 0.08;
  if (gap > 4) s -= 0.1;
  return Math.max(0, Math.min(1, s));
}

/** Fuerza de una mano hecha (cat 0..8) a 0..1. */
function madeStrength(score) {
  const base = score.cat / 8;
  const kicker = (score.tie[0] || 0) / 14;
  return Math.max(0, Math.min(1, base * 0.85 + kicker * 0.15));
}

/**
 * Decisión de un bot. Devuelve { action, amount }.
 * action: "fold" | "check" | "call" | "raise" (amount = total al que sube).
 * ctx: { toCall, minRaise, chips, pot, variant, stage, hole, community }
 */
export function aiDecision(ctx) {
  const { toCall, minRaise, chips, pot } = ctx;
  let strength;
  if (ctx.variant === "holdem" && ctx.community.length === 0) {
    strength = preflopStrength(ctx.hole);
  } else {
    const cards = ctx.variant === "holdem" ? [...ctx.hole, ...ctx.community] : ctx.hole;
    strength = madeStrength(bestHand(cards));
  }

  const bluff = Math.random() < 0.12;
  const noise = (Math.random() - 0.5) * 0.15;
  const s = Math.max(0, Math.min(1, strength + noise + (bluff ? 0.4 : 0)));

  if (toCall <= 0) {
    if (s > 0.62) {
      const amount = Math.min(chips, Math.max(minRaise, Math.round(pot * 0.6)));
      return { action: "raise", amount };
    }
    return { action: "check", amount: 0 };
  }
  const odds = toCall / (pot + toCall);
  if (s < odds * 0.9 && !bluff) return { action: "fold", amount: 0 };
  if (s > 0.78 && chips > toCall + minRaise) {
    const amount = Math.min(chips, toCall + Math.max(minRaise, Math.round(pot * 0.7)));
    return { action: "raise", amount };
  }
  if (toCall >= chips) return { action: "call", amount: chips };
  return { action: "call", amount: toCall };
}

/** Bots de 5 cartas: qué descartar. Conserva grupos (parejas+) y cartas altas. */
export function aiDiscard(hand) {
  const countMap = {};
  for (const c of hand) countMap[c.rank] = (countMap[c.rank] || 0) + 1;
  const score = evaluate5(hand);
  if (score.cat >= 4 || score.cat === 6 || score.cat === 7) return [];
  const keep = new Set();
  hand.forEach((c, i) => {
    if (countMap[c.rank] >= 2) keep.add(i);
  });
  if (keep.size === 0) {
    const order = hand.map((c, i) => ({ i, v: RANK_VALUE[c.rank] })).sort((a, b) => b.v - a.v);
    keep.add(order[0].i);
    keep.add(order[1].i);
  }
  return hand.map((_, i) => i).filter((i) => !keep.has(i));
}

// ---------------------------------------------------------------------------
// Tabla de pagos (casino de puntos). Hay 10 niveles: la escalera de color real
// (escalera real) se separa de la escalera de color normal.
// ---------------------------------------------------------------------------

export const TIER_NAMES = [
  "Carta alta",
  "Pareja",
  "Doble pareja",
  "Trío",
  "Escalera",
  "Color",
  "Full",
  "Póker",
  "Escalera de color",
  "Escalera real",
];

// Multiplicadores sobre la apuesta, según la categoría de la mano.
export const HOLDEM_MULT = [1, 1.2, 2, 3, 5, 8, 12, 25, 50, 100];
export const DRAW_MULT = [0, 1, 2, 3, 5, 8, 12, 25, 50, 100]; // carta alta pierde

/** Nivel de pago 0..9. La escalera de color con As alto (10-J-Q-K-A) es real. */
export function handTier(score) {
  if (score.cat === 8 && score.tie[0] === 14) return 9; // escalera real
  return score.cat; // 0..8 (8 = escalera de color normal)
}

export function tierName(score) {
  return TIER_NAMES[handTier(score)];
}

// ---------------------------------------------------------------------------
// Autocomprobación (node src/engine/poker.js). Solo el camino crítico: el
// evaluador. Si esto falla, todo el reparto de botes está mal.
// ---------------------------------------------------------------------------
function demo() {
  const C = (r, s) => ({ rank: r, suit: s });
  const sf = evaluate5([C("10", "H"), C("J", "H"), C("Q", "H"), C("K", "H"), C("A", "H")]);
  console.assert(sf.cat === 8, "escalera de color");
  const quads = evaluate5([C("9", "H"), C("9", "D"), C("9", "C"), C("9", "S"), C("2", "H")]);
  console.assert(quads.cat === 7, "póker");
  const full = evaluate5([C("9", "H"), C("9", "D"), C("9", "C"), C("2", "S"), C("2", "H")]);
  console.assert(full.cat === 6, "full");
  const flush = evaluate5([C("2", "H"), C("5", "H"), C("9", "H"), C("J", "H"), C("K", "H")]);
  console.assert(flush.cat === 5, "color");
  const wheel = evaluate5([C("A", "H"), C("2", "D"), C("3", "C"), C("4", "S"), C("5", "H")]);
  console.assert(wheel.cat === 4 && wheel.tie[0] === 5, "rueda A-5");
  const trips = evaluate5([C("9", "H"), C("9", "D"), C("9", "C"), C("J", "S"), C("2", "H")]);
  console.assert(trips.cat === 3, "trío");
  const twoPair = evaluate5([C("9", "H"), C("9", "D"), C("2", "C"), C("2", "S"), C("K", "H")]);
  console.assert(twoPair.cat === 2, "doble pareja");
  // Comparación: full gana a color; mejor kicker rompe empate de pareja.
  console.assert(compareScore(full, flush) > 0, "full > color");
  const pairA = evaluate5([C("A", "H"), C("A", "D"), C("K", "C"), C("5", "S"), C("2", "H")]);
  const pairB = evaluate5([C("A", "C"), C("A", "S"), C("Q", "C"), C("5", "D"), C("2", "C")]);
  console.assert(compareScore(pairA, pairB) > 0, "kicker K > Q");
  // bestHand de 7: encuentra el color escondido.
  const seven = bestHand([
    C("2", "H"), C("5", "H"), C("9", "H"), C("J", "H"), C("K", "H"),
    C("A", "S"), C("3", "D"),
  ]);
  console.assert(seven.cat === 5, "bestHand 7 → color");
  // Niveles de pago: escalera real vs escalera de color normal.
  const royal = evaluate5([C("10", "S"), C("J", "S"), C("Q", "S"), C("K", "S"), C("A", "S")]);
  console.assert(handTier(royal) === 9, "escalera real → nivel 9");
  const sf2 = evaluate5([C("5", "C"), C("6", "C"), C("7", "C"), C("8", "C"), C("9", "C")]);
  console.assert(handTier(sf2) === 8, "escalera de color → nivel 8");
  console.assert(handTier(wheel) === 4 && HOLDEM_MULT[handTier(pairA)] === 1.2, "tiers/mult");
  console.log("poker.js OK");
}

// Ejecuta el self-check solo bajo Node, nunca en el navegador.
if (typeof process !== "undefined" && process.argv?.[1]?.includes("poker")) demo();
