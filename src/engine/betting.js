/**
 * betting.js — Generación del mercado, cuotas dinámicas, live odds y resolución.
 * Las cuotas se estiman con una aproximación normal de Poisson sobre
 * el total esperado de la ronda (sin conocer el evento sorpresa).
 * Cada mercado lleva `kind` (para misiones/desbloqueos por nivel).
 * Live odds: durante la simulación se recalculan en tiempo real según
 * la proyección del tráfico observado.
 */
import { minLevelForKind } from "./progression";

export const MIN_ODDS = 1.05;
export const MAX_ODDS = 25;
export const HOUSE_EDGE = 0.91;

export function clampOdds(p) {
  const fair = HOUSE_EDGE / Math.max(0.01, Math.min(0.99, p));
  return Math.round(Math.max(MIN_ODDS, Math.min(MAX_ODDS, fair)) * 100) / 100;
}

// Aproximación de la función de distribución normal estándar.
function normCdf(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

/** P(X > k) con X ~ Poisson(lambda) aproximada por normal. */
function probOver(lambda, k) {
  const sigma = Math.sqrt(Math.max(1, lambda));
  return 1 - normCdf((k + 0.5 - lambda) / sigma);
}

function probBetween(lambda, lo, hi) {
  const sigma = Math.sqrt(Math.max(1, lambda));
  return normCdf((hi + 0.5 - lambda) / sigma) - normCdf((lo - 0.5 - lambda) / sigma);
}

function market(def) {
  return { ...def, minLevel: minLevelForKind(def.kind) };
}

/**
 * Genera el mercado de una ronda a partir del total esperado.
 * Cada apuesta lleva: id, title, sub, kind, minLevel, odds y resolve(counts).
 */
export function generateMarket(round) {
  const L = round.expectedTotal;
  const list = [];

  // Más/Menos sobre el total (umbral cerca de la media, con desvío).
  const overThreshold = Math.max(5, Math.round(L * (0.9 + Math.random() * 0.2)));
  const pOver = probOver(L, overThreshold);
  list.push(market({
    id: "over",
    kind: "total",
    title: `Más de ${overThreshold} vehículos`,
    sub: "Total de la ronda",
    odds: clampOdds(pOver),
    _params: { threshold: overThreshold, lambda: L },
    resolve: (c) => c.total > overThreshold,
  }));
  list.push(market({
    id: "under",
    kind: "total",
    title: `${overThreshold} vehículos o menos`,
    sub: "Total de la ronda",
    odds: clampOdds(1 - pOver),
    _params: { threshold: overThreshold, lambda: L },
    resolve: (c) => c.total <= overThreshold,
  }));

  // Rango de valores sobre el total (estrecho: difícil de clavar).
  const span = Math.max(3, Math.round(L * 0.13));
  const lo = Math.max(0, Math.round(L - span / 2 + (Math.random() * 6 - 3)));
  const hi = lo + span;
  list.push(market({
    id: "range",
    kind: "range",
    title: `Entre ${lo} y ${hi} vehículos`,
    sub: "Total de la ronda (inclusive)",
    odds: clampOdds(probBetween(L, lo, hi)),
    _params: { lo, hi, lambda: L },
    resolve: (c) => c.total >= lo && c.total <= hi,
  }));

  // Comparativa: ¿más motos que camiones?
  // Probabilidad real por diferencia de Poissons (antes era fija y explotable).
  const diffMean = L * (0.18 - 0.12);
  const diffSigma = Math.sqrt(Math.max(1, L * (0.18 + 0.12)));
  const pMotos = 1 - normCdf((0.5 - diffMean) / diffSigma);
  list.push(market({
    id: "motos-vs-camiones",
    kind: "comp",
    title: "Más motos que camiones",
    sub: "Comparativa de la ronda",
    odds: clampOdds(pMotos),
    _params: { lambda: L },
    resolve: (c) => c.moto > c.camion,
  }));
  list.push(market({
    id: "camiones-vs-motos",
    kind: "comp",
    title: "Camiones igualan o superan a motos",
    sub: "Comparativa de la ronda",
    odds: clampOdds(1 - pMotos),
    _params: { lambda: L },
    resolve: (c) => c.camion >= c.moto,
  }));

  // Recuento por tipo: ¿más de X motos? (lambda_motos ≈ 0.18·L)
  const motoLambda = L * 0.18;
  const motoThreshold = Math.max(1, Math.round(motoLambda * (0.85 + Math.random() * 0.3)));
  list.push(market({
    id: "motos-over",
    kind: "count",
    title: `Más de ${motoThreshold} motos`,
    sub: "Recuento por tipo",
    odds: clampOdds(probOver(motoLambda, motoThreshold)),
    _params: { threshold: motoThreshold, lambda: L },
    resolve: (c) => c.moto > motoThreshold,
  }));

  // Vehículo dominante.
  list.push(market({
    id: "coche-top",
    kind: "dominant",
    title: "El coche será el más frecuente",
    sub: "Tipo dominante de la ronda",
    odds: clampOdds(0.9),
    _params: { lambda: L },
    resolve: (c) => ["moto", "camion", "autobus", "especial"].every((t) => c.coche > c[t]),
  }));
  list.push(market({
    id: "no-coche-top",
    kind: "dominant",
    title: "El coche NO será el más frecuente",
    sub: "Tipo dominante · cuota alta",
    odds: clampOdds(0.08),
    _params: { lambda: L },
    resolve: (c) => ["moto", "camion", "autobus", "especial"].some((t) => c[t] >= c.coche),
  }));

  // Predicción exacta de coches (cuota según probabilidad real, no fija:
  // la cuota fija de 25 era explotable apostando siempre a la moda).
  const carLambda = L * 0.55;
  const exactGuess = Math.max(1, Math.round(carLambda + (Math.random() * 8 - 4)));
  const carSigma = Math.sqrt(Math.max(1, carLambda));
  const pExact =
    Math.exp(-Math.pow(exactGuess - carLambda, 2) / (2 * carLambda)) /
    (carSigma * Math.sqrt(2 * Math.PI));
  list.push(market({
    id: "exact-coches",
    kind: "exact",
    title: `Exactamente ${exactGuess} coches`,
    sub: "Predicción exacta · cuota máxima",
    odds: clampOdds(pExact),
    _params: { exactGuess, lambda: L },
    resolve: (c) => c.coche === exactGuess,
  }));

  return list;
}

/**
 * Resuelve las apuestas del jugador contra los recuentos finales.
 * Devuelve [{ bet, won, payout, delta, streakAfter }].
 * El multiplicador de racha premia aciertos consecutivos (+5% por nivel, máx +50%).
 */
export function resolveBets(playerBets, counts, streak) {
  let currentStreak = streak;
  return playerBets.map((pb) => {
    const won = pb.market.resolve(counts);
    if (won) {
      currentStreak++;
      const streakBonus = 1 + Math.min(0.5, (currentStreak - 1) * 0.05);
      const payout = Math.round(pb.stake * pb.market.odds * streakBonus);
      return { bet: pb, won, payout, delta: payout - pb.stake, streakAfter: currentStreak };
    }
    currentStreak = 0;
    return { bet: pb, won, payout: 0, delta: -pb.stake, streakAfter: 0 };
  });
}

/* ---------- Live Odds ---------- */

/** Proyecta los totales finales basándose en la tasa actual. */
function projectCounts(round) {
  const elapsed = Math.max(0.1, round.elapsed);
  const progress = elapsed / round.durationRealSec;

  if (progress > 0.98) return { ...round.counts };

  const factor = 1 / progress;
  return {
    total: Math.round(round.counts.total * factor),
    coche: Math.round(round.counts.coche * factor),
    moto: Math.round(round.counts.moto * factor),
    camion: Math.round(round.counts.camion * factor),
    autobus: Math.round(round.counts.autobus * factor),
    especial: Math.round(round.counts.especial * factor),
  };
}

/**
 * Recalcula la cuota de un mercado en tiempo real basándose en
 * los datos parciales de la ronda. Devuelve la cuota actualizada.
 */
export function recalculateLiveOdds(market, round) {
  if (round.elapsed <= 0.5) return market.odds;

  const P = projectCounts(round);
  const params = market._params || {};
  let newOdds;

  switch (market.id) {
    case "over": {
      newOdds = round.counts.total > params.threshold
        ? MIN_ODDS
        : clampOdds(probOver(P.total, params.threshold));
      break;
    }
    case "under": {
      newOdds = round.counts.total > params.threshold
        ? MAX_ODDS
        : clampOdds(1 - probOver(P.total, params.threshold));
      break;
    }
    case "range": {
      newOdds = clampOdds(probBetween(P.total, params.lo, params.hi));
      break;
    }
    case "motos-vs-camiones": {
      const diffMean = P.moto - P.camion;
      const diffSigma = Math.sqrt(Math.max(1, P.moto + P.camion));
      const p = 1 - normCdf((0.5 - diffMean) / diffSigma);
      newOdds = clampOdds(p);
      break;
    }
    case "camiones-vs-motos": {
      const diffMean = P.moto - P.camion;
      const diffSigma = Math.sqrt(Math.max(1, P.moto + P.camion));
      const p = 1 - normCdf((0.5 - diffMean) / diffSigma);
      newOdds = clampOdds(1 - p);
      break;
    }
    case "motos-over": {
      newOdds = round.counts.moto > params.threshold
        ? MIN_ODDS
        : clampOdds(probOver(P.moto, params.threshold));
      break;
    }
    case "coche-top": {
      const others = ["moto", "camion", "autobus", "especial"];
      const gap = others.reduce((min, t) => Math.min(min, P.coche - P[t]), Infinity);
      if (gap >= 3) {
        newOdds = clampOdds(0.88);
      } else if (gap <= -3) {
        newOdds = clampOdds(0.08);
      } else {
        newOdds = clampOdds(0.5);
      }
      break;
    }
    case "no-coche-top": {
      const others = ["moto", "camion", "autobus", "especial"];
      const maxOther = Math.max(...others.map((t) => P[t]));
      const gap = maxOther - P.coche;
      if (gap >= 3) {
        newOdds = clampOdds(0.88);
      } else if (gap <= -3) {
        newOdds = clampOdds(0.08);
      } else {
        newOdds = clampOdds(0.5);
      }
      break;
    }
    case "exact-coches": {
      if (round.counts.coche > params.exactGuess) {
        newOdds = MAX_ODDS;
      } else {
        const carP = Math.max(1, P.coche || P.total * 0.55);
        const carLambda = carP * 0.55;
        const sigma = Math.sqrt(Math.max(1, carLambda));
        const pExact =
          Math.exp(-Math.pow(params.exactGuess - carLambda, 2) / (2 * Math.max(0.1, carLambda))) /
          (sigma * Math.sqrt(2 * Math.PI));
        newOdds = clampOdds(Math.max(0.001, pExact));
      }
      break;
    }
    default:
      newOdds = market.odds;
  }

  return Math.round(newOdds * 100) / 100;
}
