/**
 * football.js — Apuestas sobre el Mundial 2026 con puntos del juego.
 *
 * Datos REALES de partidos y resultados desde OpenFootball (dominio público,
 * sin API key, CORS abierto). Con eso resolvemos lo que el dato real permite:
 *   - Resultado 1X2 (Local / Empate / Visitante).
 *   - Más/Menos de goles.
 *
 * Las "props" de casino (córners, tarjetas amarillas, tiros a puerta) NO están
 * en ninguna fuente gratis, así que se SIMULAN de forma determinista por
 * partido (semilla = equipos+fecha). La línea y el valor real son estables y
 * se revelan cuando el partido termina (según el dato real). Es ficción
 * coherente con el resto del juego, pero los marcamos como simuladas.
 *
 * Si algún día quieres props reales, API-Football las tiene (córners, tarjetas,
 * tiros) en su free tier (100 req/día) — pero expone la key en el cliente.
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

/* ---------- Props simuladas (deterministas por partido) ---------- */

const PROPS = [
  { id: "corners", label: "Córners totales", mean: 10, sd: 2.6 },
  { id: "cards", label: "Tarjetas amarillas", mean: 4, sd: 1.4 },
  { id: "shots", label: "Tiros a puerta", mean: 8.5, sd: 2.2 },
];

/** Normal estándar por Box-Muller con el rng sembrado. */
function gauss(rng, mean, sd) {
  const u = Math.max(1e-9, rng());
  const v = rng();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Valores REALES simulados de las props (estables por partido). */
export function propActuals(match) {
  const rng = mulberry32(hashString("prop-" + match.key));
  const out = {};
  for (const p of PROPS) {
    out[p.id] = Math.max(0, Math.round(gauss(rng, p.mean, p.sd)));
  }
  return out;
}

/* ---------- Generación de mercados ---------- */

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

/**
 * Mercados de un partido. Cada apuesta:
 *  { id, group, label, odds, sim, resolve(match) -> "win"|"lose"|null(pending) }
 */
export function marketsFor(match) {
  const list = [];
  const { pH, pD, pA } = odds1x2(match);
  const res = (cond) => () => (match.finished ? (cond() ? "win" : "lose") : null);

  list.push(
    { id: "1", group: "Resultado", label: `Gana ${match.team1}`, odds: clampOdds(pH), sim: false,
      resolve: res(() => match.ft[0] > match.ft[1]) },
    { id: "X", group: "Resultado", label: "Empate", odds: clampOdds(pD), sim: false,
      resolve: res(() => match.ft[0] === match.ft[1]) },
    { id: "2", group: "Resultado", label: `Gana ${match.team2}`, odds: clampOdds(pA), sim: false,
      resolve: res(() => match.ft[1] > match.ft[0]) }
  );

  // Goles Más/Menos 2.5 (real, desde el marcador).
  const rngG = mulberry32(hashString("ou-" + match.key));
  const pOver = 0.45 + rngG() * 0.2;
  list.push(
    { id: "o25", group: "Goles", label: "Más de 2.5 goles", odds: clampOdds(pOver), sim: false,
      resolve: res(() => match.ft[0] + match.ft[1] > 2.5) },
    { id: "u25", group: "Goles", label: "Menos de 2.5 goles", odds: clampOdds(1 - pOver), sim: false,
      resolve: res(() => match.ft[0] + match.ft[1] < 2.5) }
  );

  // Props simuladas: línea en X.5 cerca de la media, ~50/50 con margen.
  for (const p of PROPS) {
    const line = p.mean + 0.5; // sin empate posible
    const winOver = () => propActuals(match)[p.id] > line;
    list.push(
      { id: `${p.id}-o`, group: p.label, label: `Más de ${line} ${p.label.toLowerCase()}`,
        odds: clampOdds(0.5), sim: true, resolve: res(winOver) },
      { id: `${p.id}-u`, group: p.label, label: `Menos de ${line} ${p.label.toLowerCase()}`,
        odds: clampOdds(0.5), sim: true, resolve: res(() => !winOver()) }
    );
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

  // Props deterministas: mismo partido → mismos valores.
  const a = JSON.stringify(propActuals(finished));
  const b = JSON.stringify(propActuals(finished));
  console.assert(a === b, "props no deterministas");

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
  console.log("football self-check OK", { props: JSON.parse(a) });
}

if (typeof process !== "undefined" && process.argv?.[1]?.endsWith("football.js")) {
  _selfCheck();
}
