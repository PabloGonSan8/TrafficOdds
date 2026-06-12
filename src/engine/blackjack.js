/**
 * blackjack.js — Blackjack clásico jugado con puntos.
 * Zapato de 4 barajas, la banca se planta en 17 (incluido 17 blando),
 * blackjack paga 3:2. Sin dinero real.
 */

export const SUITS = [
  { id: "S", icon: "♠", red: false },
  { id: "H", icon: "♥", red: true },
  { id: "D", icon: "♦", red: true },
  { id: "C", icon: "♣", red: false },
];

export const RANKS = [
  "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K",
];

const DECKS = 4;

/** Límites de mesa, como en un casino real. */
export const BJ_LIMITS = { min: 10, max: 500 };

/** El seguro paga 2:1 si la banca tiene Blackjack. */
export const INSURANCE_PAYOUT = 2;

/** Crea un zapato barajado de 4 barajas (Fisher–Yates). */
export function newShoe() {
  const shoe = [];
  for (let d = 0; d < DECKS; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        shoe.push({ rank, suit: suit.id });
      }
    }
  }
  for (let i = shoe.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
  }
  return shoe;
}

/** Roba la última carta del zapato (muta el array). */
export function draw(shoe) {
  return shoe.pop();
}

function cardValue(rank) {
  if (rank === "A") return 11;
  if (rank === "J" || rank === "Q" || rank === "K") return 10;
  return Number(rank);
}

/** Mejor valor de la mano: los ases bajan de 11 a 1 si hace falta. */
export function handValue(cards) {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    total += cardValue(c.rank);
    if (c.rank === "A") aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

/** Mano blanda: contiene un as que aún cuenta como 11. */
export function isSoft(cards) {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    total += cardValue(c.rank);
    if (c.rank === "A") aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return aces > 0;
}

export function isBlackjack(cards) {
  return cards.length === 2 && handValue(cards) === 21;
}

/** Se puede dividir: dos cartas iniciales del mismo valor (p. ej. 8-8 o K-10). */
export function canSplit(cards) {
  return cards.length === 2 && cardValue(cards[0].rank) === cardValue(cards[1].rank);
}

export function isBust(cards) {
  return handValue(cards) > 21;
}

/** ¿Debe la banca seguir pidiendo? Se planta en 17 o más (también blando). */
export function dealerShouldHit(cards) {
  return handValue(cards) < 17;
}

/**
 * Liquida la mano: devuelve { payout, outcome }.
 * payout es el retorno total (incluye el stake si se recupera).
 * outcome: "blackjack" | "win" | "push" | "lose".
 * fromSplit: un 21 de dos cartas tras dividir cuenta como 21 normal, no Blackjack.
 */
export function settle(playerCards, dealerCards, stake, fromSplit = false) {
  const player = handValue(playerCards);
  const dealer = handValue(dealerCards);
  const playerBJ = !fromSplit && isBlackjack(playerCards);
  const dealerBJ = isBlackjack(dealerCards);

  if (player > 21) return { payout: 0, outcome: "lose" };
  if (playerBJ && dealerBJ) return { payout: stake, outcome: "push" };
  if (playerBJ) return { payout: Math.round(stake * 2.5), outcome: "blackjack" };
  if (dealerBJ) return { payout: 0, outcome: "lose" };
  if (dealer > 21) return { payout: stake * 2, outcome: "win" };
  if (player > dealer) return { payout: stake * 2, outcome: "win" };
  if (player === dealer) return { payout: stake, outcome: "push" };
  return { payout: 0, outcome: "lose" };
}
