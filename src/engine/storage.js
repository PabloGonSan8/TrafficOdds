/**
 * storage.js — Persistencia en LocalStorage con esquema versionado.
 * v2: añade progresión (xp, logros, misiones), ajustes y tutorial.
 * Capa aislada para poder sustituirla por un backend en el futuro.
 */
const KEY = "traficbet_save_v2";
const LEGACY_KEY = "traficbet_save_v1";

export const DEFAULTS = {
  points: 1000,
  round: 1,
  lastDailyBonus: null, // "YYYY-MM-DD"
  streak: 0,
  bestStreak: 0,
  history: [], // [{ round, desc, stake, odds, won, delta, ts }]
  stats: {
    totalBets: 0,
    wins: 0,
    losses: 0,
    netProfit: 0,
    biggestWin: 0,
    roundsPlayed: 0,
  },
  xp: 0,
  achievements: [], // ids desbloqueados
  missions: { date: null, list: [] }, // misiones del día
  settings: { sound: true, music: true },
  tutorialSeen: false,
};

function mergeWithDefaults(data) {
  return {
    ...structuredClone(DEFAULTS),
    ...data,
    stats: { ...structuredClone(DEFAULTS.stats), ...(data.stats || {}) },
    missions: { ...structuredClone(DEFAULTS.missions), ...(data.missions || {}) },
    settings: { ...structuredClone(DEFAULTS.settings), ...(data.settings || {}) },
  };
}

/** Migración v1 → v2: conserva puntos, historial y estadísticas. */
function migrateLegacy() {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const v1 = JSON.parse(raw);
    const v2 = mergeWithDefaults(v1);
    localStorage.removeItem(LEGACY_KEY);
    localStorage.setItem(KEY, JSON.stringify(v2));
    return v2;
  } catch {
    return null;
  }
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      return migrateLegacy() ?? structuredClone(DEFAULTS);
    }
    return mergeWithDefaults(JSON.parse(raw));
  } catch (e) {
    console.warn("Partida corrupta, se reinicia.", e);
    return structuredClone(DEFAULTS);
  }
}

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("No se pudo guardar la partida.", e);
  }
}

export function reset() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* almacenamiento deshabilitado */
  }
  return structuredClone(DEFAULTS);
}
