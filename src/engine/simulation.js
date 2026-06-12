/**
 * simulation.js — Motor de tráfico virtual.
 * Reloj acelerado, patrones horarios, eventos sorpresa y generación
 * aleatoria controlada de vehículos. Lógica pura, sin DOM.
 */

// 1 segundo real = TIME_SCALE segundos virtuales.
export const TIME_SCALE = 30;

export const VEHICLE_TYPES = [
  { id: "coche",    emoji: "🚗", weight: 0.55, speed: [120, 180] },
  { id: "moto",     emoji: "🏍️", weight: 0.18, speed: [150, 220] },
  { id: "camion",   emoji: "🚚", weight: 0.12, speed: [80, 120] },
  { id: "autobus",  emoji: "🚌", weight: 0.08, speed: [90, 130] },
  { id: "especial", emoji: "🚑", weight: 0.07, speed: [140, 200] },
];

export const TYPE_LABELS = {
  coche: "coches", moto: "motos", camion: "camiones",
  autobus: "autobuses", especial: "vehículos especiales",
};

// Eventos sorpresa: alteran intensidad y mezcla de vehículos.
const EVENTS = [
  { id: "lluvia",    label: "🌧️ Lluvia intensa: el tráfico se reduce", mult: 0.65, mix: {} },
  { id: "horapunta", label: "🚨 Hora punta inesperada: ¡avalancha de vehículos!", mult: 1.6, mix: {} },
  { id: "accidente", label: "💥 Accidente en la vía: circulación a medio gas", mult: 0.5, mix: { especial: 3 } },
  { id: "obras",     label: "🚧 Obras en la calzada: carril cortado", mult: 0.75, mix: { camion: 1.8 } },
  { id: "deporte",   label: "🏟️ Evento deportivo: autobuses por todas partes", mult: 1.35, mix: { autobus: 3 } },
  { id: "motorada",  label: "🏍️ Quedada motera: rugen los motores", mult: 1.2, mix: { moto: 3 } },
];
const EVENT_CHANCE = 0.4; // probabilidad de evento por ronda (más caos = más difícil)

// Reloj virtual: arranca en hora aleatoria del día.
let virtualSeconds = Math.floor(Math.random() * 86400);

export function tickClock(dtReal) {
  virtualSeconds = (virtualSeconds + dtReal * TIME_SCALE) % 86400;
}

export function getVirtualHour() {
  return virtualSeconds / 3600;
}

export function getClockString() {
  const h = Math.floor(virtualSeconds / 3600);
  const m = Math.floor((virtualSeconds % 3600) / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Intensidad de tráfico según hora virtual (0..24).
 * Picos en hora punta de mañana (8:30) y tarde (19:00), valle nocturno.
 */
export function intensityAt(hour) {
  const morning = 0.55 * Math.exp(-Math.pow(hour - 8.5, 2) / 3);
  const evening = 0.65 * Math.exp(-Math.pow(hour - 19, 2) / 4);
  const night = hour < 6 || hour > 23 ? -0.18 : 0;
  return Math.max(0.15, 0.4 + morning + evening + night);
}

/**
 * Estado de una ronda de simulación.
 * expectedTotal se calcula SIN conocer el evento sorpresa:
 * las cuotas se fijan con esa estimación y el evento es el factor azar.
 */
export function createRound(durationRealSec) {
  const hour = getVirtualHour();
  const intensity = intensityAt(hour);
  // ~55 vehículos por ronda a intensidad 1, con ruido por ronda.
  const noise = 0.85 + Math.random() * 0.3;
  const expectedTotal = Math.round(55 * intensity * noise);
  // Deriva oculta: las cuotas se fijan con expectedTotal, pero el flujo
  // real se desvía en secreto — imposible fiarse ciegamente de la media.
  const hiddenDrift = 0.85 + Math.random() * 0.3;

  let event = null;
  if (Math.random() < EVENT_CHANCE) {
    event = EVENTS[Math.floor(Math.random() * EVENTS.length)];
  }

  return {
    durationRealSec,
    expectedTotal,
    hiddenDrift,
    startHour: hour,
    event,
    eventRevealed: false,
    // El evento se revela en un punto aleatorio del primer tercio.
    eventRevealAt: durationRealSec * (0.1 + Math.random() * 0.25),
    elapsed: 0,
    counts: { coche: 0, moto: 0, camion: 0, autobus: 0, especial: 0, total: 0 },
    spawnCarry: 0, // acumulador fraccional de spawns
    finished: false,
  };
}

/** Mezcla de pesos por tipo aplicando el sesgo del evento activo. */
function currentWeights(round) {
  const eventActive = round.event && round.eventRevealed;
  const weights = VEHICLE_TYPES.map((t) => {
    const bias = eventActive ? (round.event.mix[t.id] || 1) : 1;
    return { id: t.id, w: t.weight * bias };
  });
  const sum = weights.reduce((a, b) => a + b.w, 0);
  weights.forEach((w) => (w.w /= sum));
  return weights;
}

function pickType(round) {
  const weights = currentWeights(round);
  let r = Math.random();
  for (const { id, w } of weights) {
    r -= w;
    if (r <= 0) return id;
  }
  return weights[weights.length - 1].id;
}

/**
 * Avanza la ronda dt segundos reales.
 * Devuelve lista de ids de tipos generados en este tick.
 */
export function tickRound(round, dtReal) {
  if (round.finished) return [];
  round.elapsed += dtReal;

  if (round.event && !round.eventRevealed && round.elapsed >= round.eventRevealAt) {
    round.eventRevealed = true;
  }

  const eventMult = round.event && round.eventRevealed ? round.event.mult : 1;
  // Micro-variación para que el flujo no sea uniforme.
  const flutter = 0.7 + Math.random() * 0.6;
  const ratePerSec =
    (round.expectedTotal / round.durationRealSec) * round.hiddenDrift * eventMult * flutter;

  round.spawnCarry += ratePerSec * dtReal;
  const spawned = [];
  while (round.spawnCarry >= 1) {
    round.spawnCarry -= 1;
    const type = pickType(round);
    round.counts[type]++;
    round.counts.total++;
    spawned.push(type);
  }

  if (round.elapsed >= round.durationRealSec) round.finished = true;
  return spawned;
}

export function getVehicleDef(id) {
  return VEHICLE_TYPES.find((t) => t.id === id);
}
