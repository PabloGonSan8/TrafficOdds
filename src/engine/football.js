/**
 * football.js — Apuestas sobre el Mundial 2026 con puntos del juego.
 *
 * Datos REALES de partidos y resultados desde OpenFootball (dominio público,
 * sin API key, CORS abierto). TODOS los mercados se resuelven con el marcador
 * real, así que no hay nada simulado:
 *   - Resultado 1X2 y doble oportunidad.
 *   - Más/Menos de goles en varias líneas (0.5 … 4.5).
 *   - Ambos equipos marcan, par/impar, portería a cero, marcador exacto.
 *
 * Córners/tarjetas/tiros no existen en ninguna fuente gratis con CORS, así que
 * NO se ofrecen (API-Football los tiene pero expone la key en el cliente).
 */
import { mulberry32, hashString } from "./progression";

const SOURCE = "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

const MIN_ODDS = 1.05;
const MAX_ODDS = 25;
const HOUSE_EDGE = 0.93;

function clampOdds(p) {
  const fair = HOUSE_EDGE / Math.max(0.01, Math.min(0.99, p));
  return Math.round(Math.max(MIN_ODDS, Math.min(MAX_ODDS, fair)) * 100) / 100;
}

/** Saca el offset horario de un texto tipo "13:00 UTC-6". */
function parseKickoff(date, time) {
  const [y, mo, d] = (date || "").split("-").map(Number);
  if (!y) return null;
  const [hm = "12:00", tz = ""] = (time || "").split(" ");
  const [hh = 12, mm = 0] = hm.split(":").map(Number);
  const m = /UTC([+-]\d+)/.exec(tz);
  const off = m ? Number(m[1]) : 0;
  return new Date(Date.UTC(y, mo - 1, d, hh - off, mm));
}

/** Reúne los partidos de las distintas formas en que viene el JSON. */
function collect(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.matches)) return data.matches;
  if (Array.isArray(data?.rounds)) return data.rounds.flatMap((r) => r.matches || []);
  return [];
}

/** Normaliza un partido crudo de OpenFootball a nuestro modelo. */
export function normalizeMatch(raw) {
  const ft = raw.score?.ft && raw.score.ft.length === 2 ? raw.score.ft : null;
  const kickoff = parseKickoff(raw.date, raw.time);
  return {
    key: `${raw.date}_${raw.team1}_${raw.team2}`.replace(/\s+/g, "-"),
    date: raw.date,
    time: raw.time || "",
    group: raw.group || raw.round || "",
    team1: raw.team1,
    team2: raw.team2,
    kickoff,
    ft, // [local, visitante] o null
    finished: !!ft,
  };
}

export async function fetchMatches() {
  const res = await fetch(SOURCE, { cache: "no-store" });
  if (!res.ok) throw new Error(`Datos del Mundial no disponibles (${res.status})`);
  const data = await res.json();
  return collect(data)
    .filter((m) => m.team1 && m.team2)
    .map(normalizeMatch);
}

/** Estado de un partido respecto a ahora. */
export function matchStatus(match, now = Date.now()) {
  if (match.finished) return "finished";
  const k = match.kickoff ? match.kickoff.getTime() : null;
  if (k && now >= k && now < k + 2.5 * 3600 * 1000) return "live";
  return "upcoming";
}

/* ---------- Generación de mercados (todo real desde el marcador) ---------- */

/** Probabilidades 1X2 sembradas con ventaja de local (no son cuotas reales). */
function odds1x2(match) {
  const rng = mulberry32(hashString("1x2-" + match.key));
  let pH = 0.30 + rng() * 0.30; // 0.30-0.60 local (con ventaja)
  let pA = 0.20 + rng() * 0.28;
  let pD = 0.22 + rng() * 0.10;
  const s = pH + pD + pA;
  pH /= s; pD /= s; pA /= s;
  return { pH, pD, pA };
}

/** Probabilidad estable por partido+mercado (semilla determinista). */
function seedProb(match, tag, lo, hi) {
  const rng = mulberry32(hashString(tag + "-" + match.key));
  return lo + rng() * (hi - lo);
}

const OU_LINES = [0.5, 1.5, 2.5, 3.5, 4.5];
const EXACT = [[0, 0], [1, 0], [0, 1], [1, 1], [2, 0], [0, 2], [2, 1], [1, 2], [2, 2], [3, 1], [1, 3]];

/**
 * Mercados de un partido. Cada apuesta:
 *  { id, group, label, odds, resolve(match) -> "win"|"lose"|null(pending) }
 */
export function marketsFor(match) {
  const list = [];
  const { pH, pD, pA } = odds1x2(match);
  const res = (cond) => () => (match.finished ? (cond() ? "win" : "lose") : null);
  const total = () => match.ft[0] + match.ft[1];

  // Resultado 1X2.
  list.push(
    { id: "1", group: "Resultado", label: `Gana ${match.team1}`, odds: clampOdds(pH),
      resolve: res(() => match.ft[0] > match.ft[1]) },
    { id: "X", group: "Resultado", label: "Empate", odds: clampOdds(pD),
      resolve: res(() => match.ft[0] === match.ft[1]) },
    { id: "2", group: "Resultado", label: `Gana ${match.team2}`, odds: clampOdds(pA),
      resolve: res(() => match.ft[1] > match.ft[0]) }
  );

  // Doble oportunidad.
  list.push(
    { id: "1X", group: "Doble oportunidad", label: `${match.team1} o empate`, odds: clampOdds(pH + pD),
      resolve: res(() => match.ft[0] >= match.ft[1]) },
    { id: "12", group: "Doble oportunidad", label: "Sin empate", odds: clampOdds(pH + pA),
      resolve: res(() => match.ft[0] !== match.ft[1]) },
    { id: "X2", group: "Doble oportunidad", label: `Empate o ${match.team2}`, odds: clampOdds(pD + pA),
      resolve: res(() => match.ft[1] >= match.ft[0]) }
  );

  // Goles Más/Menos en varias líneas (la prob de Más baja al subir la línea).
  const base = seedProb(match, "ou", 0.48, 0.62); // pOver en la línea 2.5
  for (const line of OU_LINES) {
    const pOver = Math.min(0.92, Math.max(0.08, base - (line - 2.5) * 0.14));
    const tag = String(line).replace(".", "");
    list.push(
      { id: `o${tag}`, group: "Goles +/-", label: `Más de ${line}`, odds: clampOdds(pOver),
        resolve: res(() => total() > line) },
      { id: `u${tag}`, group: "Goles +/-", label: `Menos de ${line}`, odds: clampOdds(1 - pOver),
        resolve: res(() => total() < line) }
    );
  }

  // Ambos equipos marcan.
  const pBtts = seedProb(match, "btts", 0.45, 0.6);
  list.push(
    { id: "btts-y", group: "Ambos marcan", label: "Sí", odds: clampOdds(pBtts),
      resolve: res(() => match.ft[0] > 0 && match.ft[1] > 0) },
    { id: "btts-n", group: "Ambos marcan", label: "No", odds: clampOdds(1 - pBtts),
      resolve: res(() => match.ft[0] === 0 || match.ft[1] === 0) }
  );

  // Total par / impar.
  const pEven = seedProb(match, "par", 0.48, 0.52);
  list.push(
    { id: "par", group: "Par/Impar", label: "Par", odds: clampOdds(pEven),
      resolve: res(() => total() % 2 === 0) },
    { id: "impar", group: "Par/Impar", label: "Impar", odds: clampOdds(1 - pEven),
      resolve: res(() => total() % 2 === 1) }
  );

  // Portería a cero (gana el equipo sin encajar).
  list.push(
    { id: "cs1", group: "Portería a cero", label: `${match.team1} no encaja`, odds: clampOdds(seedProb(match, "cs1", 0.30, 0.50)),
      resolve: res(() => match.ft[1] === 0) },
    { id: "cs2", group: "Portería a cero", label: `${match.team2} no encaja`, odds: clampOdds(seedProb(match, "cs2", 0.25, 0.45)),
      resolve: res(() => match.ft[0] === 0) }
  );

  // Marcador exacto (selección habitual).
  for (const [a, b] of EXACT) {
    list.push({
      id: `ex${a}${b}`, group: "Marcador exacto", label: `${a}-${b}`,
      odds: clampOdds(seedProb(match, `ex${a}${b}`, 0.05, 0.13)),
      resolve: res(() => match.ft[0] === a && match.ft[1] === b),
    });
  }

  return list;
}

/* ---------- Persistencia de apuestas (localStorage, usa el wallet) ---------- */

const KEY = "to-mundial";

export function loadBets() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || { pending: [], history: [] };
  } catch {
    return { pending: [], history: [] };
  }
}

function save(store) {
  localStorage.setItem(KEY, JSON.stringify(store));
}

/** Cuota combinada de un boleto: producto de las cuotas (estilo casa real). */
export function combinedOdds(legs) {
  const p = legs.reduce((a, l) => a * l.odds, 1);
  return Math.round(p * 100) / 100;
}

/** Registra un boleto pendiente (el wallet ya descontó el stake fuera). */
export function addBet(store, bet) {
  const next = { pending: [bet, ...store.pending], history: store.history };
  save(next);
  return next;
}

/** ¿Hay ya un boleto pendiente con alguna selección de este partido? */
export function matchLocked(store, matchKey) {
  return store.pending.some((bet) => bet.legs.some((l) => l.matchKey === matchKey));
}

/**
 * Resuelve un boleto (combinada): gana si TODAS las selecciones ganan; pierde
 * si alguna pierde; sigue pendiente si a alguna le falta el resultado.
 */
function resolveSlip(bet, byKey) {
  for (const leg of bet.legs) {
    const match = byKey.get(leg.matchKey);
    const market = match ? marketsFor(match).find((m) => m.id === leg.marketId) : null;
    const o = market ? market.resolve(match) : null;
    if (o === null) return null; // falta un partido por terminar
    if (o === "lose") return "lose"; // una sola caída tumba la combinada
  }
  return "win";
}

/**
 * Liquida los boletos cuyos partidos ya terminaron. `award(amount)` acredita
 * el premio en el wallet. Devuelve { store, settled: [{...bet, outcome, payout}] }.
 */
export function settle(store, matches, award) {
  const byKey = new Map(matches.map((m) => [m.key, m]));
  const stillPending = [];
  const settled = [];
  let history = store.history;

  for (const bet of store.pending) {
    const outcome = resolveSlip(bet, byKey);
    if (outcome === null) {
      stillPending.push(bet);
      continue;
    }
    const payout = outcome === "win" ? Math.round(bet.stake * bet.odds) : 0;
    if (payout > 0) award(payout);
    const done = { ...bet, outcome, payout, settledAt: Date.now() };
    settled.push(done);
    history = [done, ...history].slice(0, 100);
  }

  const next = { pending: stillPending, history };
  save(next);
  return { store: next, settled };
}

/* ---------- Self-check: `jiti src/engine/football.js` ---------- */
export function _selfCheck() {
  const finished = normalizeMatch({
    date: "2026-06-11", time: "13:00 UTC-6", group: "Group A",
    team1: "Mexico", team2: "South Africa", score: { ft: [2, 0], ht: [1, 0] },
  });
  console.assert(finished.finished === true, "debería estar terminado");
  console.assert(finished.ft[0] === 2, "marcador mal parseado");
  const mkts = marketsFor(finished);
  const win1 = mkts.find((m) => m.id === "1").resolve(finished);
  console.assert(win1 === "win", "local ganó 2-0, debe ser win");
  console.assert(mkts.find((m) => m.id === "X").resolve(finished) === "lose", "empate debe perder");
  console.assert(mkts.find((m) => m.id === "o25").resolve(finished) === "lose", "2 goles < 2.5");

  const upcoming = normalizeMatch({ date: "2026-07-19", time: "19:00 UTC-4", team1: "A", team2: "B" });
  console.assert(upcoming.finished === false, "futuro no terminado");
  console.assert(marketsFor(upcoming).find((m) => m.id === "1").resolve(upcoming) === null, "pendiente = null");

  // Mercados de goles reales: 2-0 → ambos marcan No, par, U2.5, portería a cero local.
  console.assert(mkts.find((m) => m.id === "btts-n").resolve(finished) === "win", "2-0: ambos marcan No");
  console.assert(mkts.find((m) => m.id === "par").resolve(finished) === "win", "2 goles es par");
  console.assert(mkts.find((m) => m.id === "u25").resolve(finished) === "win", "2 < 2.5");
  console.assert(mkts.find((m) => m.id === "cs1").resolve(finished) === "win", "local no encajó");
  console.assert(mkts.find((m) => m.id === "ex20").resolve(finished) === "win", "marcador exacto 2-0");

  // Combinada: gana solo si todas las patas ganan.
  const leg1 = { matchKey: finished.key, marketId: "1", odds: mkts.find((m) => m.id === "1").odds };
  const legX = { matchKey: finished.key, marketId: "X", odds: mkts.find((m) => m.id === "X").odds };
  console.assert(combinedOdds([leg1, legX]) > leg1.odds, "combinada debe multiplicar");

  let credited = 0;
  const orig = globalThis.localStorage;
  globalThis.localStorage = { getItem: () => null, setItem: () => {} };

  // Boleto ganador (1 pata correcta).
  const winSlip = { legs: [leg1], stake: 100, odds: combinedOdds([leg1]) };
  let r = settle({ pending: [winSlip], history: [] }, [finished], (amt) => (credited += amt));
  console.assert(r.settled[0].outcome === "win" && credited > 100, "boleto simple ganador mal");

  // Combinada con una pata perdedora (empate) → pierde, no acredita.
  credited = 0;
  const loseSlip = { legs: [leg1, legX], stake: 100, odds: combinedOdds([leg1, legX]) };
  r = settle({ pending: [loseSlip], history: [] }, [finished], (amt) => (credited += amt));
  console.assert(r.settled[0].outcome === "lose" && credited === 0, "combinada con caída debe perder");

  globalThis.localStorage = orig;
  console.log("football self-check OK", { markets: marketsFor(finished).length });
}

if (typeof process !== "undefined" && process.argv?.[1]?.endsWith("football.js")) {
  _selfCheck();
}
