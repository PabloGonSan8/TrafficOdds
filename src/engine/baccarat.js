/**
 * baccarat.js — Baccarat (Punto Banco) jugado con puntos.
 * Reglas oficiales de casino: el usuario solo apuesta a Player, Banker o Tie.
 * No hay decisiones durante la mano; el robo de tercera carta es automático.
 * Reutiliza el zapato de blackjack (SUITS, newShoe, draw). Sin dinero real.
 */

import { draw } from "./blackjack";
export { SUITS, RANKS, newShoe, draw } from "./blackjack";

/** Pagos oficiales. Banker cobra 5% de comisión sobre la ganancia. */
export const PAYOUTS = {
  player: 1, // 1:1
  banker: 1, // 1:1 menos 5% de comisión
  tie: 8, // 8:1 (configurable a 9:1)
};
export const BANKER_COMMISSION = 0.05;

/** Límites de mesa. */
export const BAC_LIMITS = { min: 10, max: 500 };

/** Valor Baccarat de una carta: As=1, 2-9 nominal, 10/J/Q/K=0. */
export function cardPoints(rank) {
  if (rank === "A") return 1;
  if (rank === "10" || rank === "J" || rank === "Q" || rank === "K") return 0;
  return Number(rank);
}

/** Puntuación de una mano: solo la última cifra de la suma (módulo 10). */
export function handScore(cards) {
  return cards.reduce((sum, c) => sum + cardPoints(c.rank), 0) % 10;
}

/** Natural: 8 o 9 con las dos primeras cartas. */
export function isNatural(cards) {
  return cards.length === 2 && handScore(cards) >= 8;
}

/**
 * ¿Roba la banca su tercera carta? Tabla oficial de Punto Banco.
 * @param bankerScore puntuación de la banca con 2 cartas.
 * @param playerThird carta robada por Player (objeto carta) o null si Player se plantó.
 */
export function bankerDraws(bankerScore, playerThird) {
  // Player no robó (se plantó con 6-7): la banca pide con 0-5.
  if (playerThird === null) return bankerScore <= 5;

  const p = cardPoints(playerThird.rank);
  switch (bankerScore) {
    case 0:
    case 1:
    case 2:
      return true;
    case 3:
      return p !== 8;
    case 4:
      return p >= 2 && p <= 7;
    case 5:
      return p >= 4 && p <= 7;
    case 6:
      return p === 6 || p === 7;
    default: // 7
      return false;
  }
}

/**
 * Juega una ronda completa y devuelve el desarrollo según las reglas oficiales.
 * @returns { player: cartas[], banker: cartas[], playerScore, bankerScore, winner }
 *   winner: "player" | "banker" | "tie".
 */
export function playRound(shoe) {
  const player = [draw(shoe), draw(shoe)];
  const banker = [draw(shoe), draw(shoe)];

  // Naturales: la ronda termina de inmediato, nadie roba.
  if (!isNatural(player) && !isNatural(banker)) {
    let playerThird = null;
    if (handScore(player) <= 5) {
      playerThird = draw(shoe);
      player.push(playerThird);
    }
    if (bankerDraws(handScore(banker), playerThird)) {
      banker.push(draw(shoe));
    }
  }

  const playerScore = handScore(player);
  const bankerScore = handScore(banker);
  const winner =
    playerScore > bankerScore
      ? "player"
      : bankerScore > playerScore
        ? "banker"
        : "tie";

  return { player, banker, playerScore, bankerScore, winner };
}

/**
 * Liquida la apuesta. Devuelve el retorno total (incluye el stake si gana o empata).
 * @param bet "player" | "banker" | "tie"
 * @param winner resultado de la ronda.
 * @param tiePayout pago configurable para Tie (8 o 9).
 */
export function settle(bet, winner, stake, tiePayout = PAYOUTS.tie) {
  if (bet === winner) {
    if (bet === "tie") return stake + stake * tiePayout;
    if (bet === "banker") {
      const profit = stake * PAYOUTS.banker;
      return stake + Math.round(profit * (1 - BANKER_COMMISSION));
    }
    return stake + stake * PAYOUTS.player; // player
  }
  // Apostar a Player/Banker y salir Tie: la apuesta se empuja (se devuelve).
  if (winner === "tie" && bet !== "tie") return stake;
  return 0;
}

// ponytail: self-check inline para no añadir framework de test.
export function __demo() {
  console.assert(handScore([{ rank: "7" }, { rank: "8" }]) === 5, "7+8=15→5");
  console.assert(handScore([{ rank: "9" }, { rank: "8" }]) === 7, "9+8=17→7");
  console.assert(handScore([{ rank: "10" }, { rank: "9" }]) === 9, "10+9→9");
  console.assert(isNatural([{ rank: "9" }, { rank: "K" }]), "9+0=9 natural");
  console.assert(bankerDraws(3, { rank: "8" }) === false, "banco 3 vs P8 planta");
  console.assert(bankerDraws(6, { rank: "7" }) === true, "banco 6 vs P7 roba");
  console.assert(bankerDraws(6, { rank: "5" }) === false, "banco 6 vs P5 planta");
  console.assert(bankerDraws(5, null) === true, "banco 5, player plantó, roba");
  // Comisión: 100 a banker → +95 ganancia, retorno 195.
  console.assert(settle("banker", "banker", 100) === 195, "banker 5% comisión");
  console.assert(settle("tie", "tie", 10) === 90, "tie 8:1 → 90");
  console.assert(settle("player", "tie", 50) === 50, "push en empate");
  return "ok";
}
