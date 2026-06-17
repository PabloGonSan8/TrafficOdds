/**
 * progression.js — XP, niveles, logros y misiones diarias.
 * Lógica pura: recibe el estado, devuelve mutaciones y notificaciones.
 */

/* ---------- Niveles ---------- */

/** Nivel a partir de XP total. Cada nivel cuesta un 35% más que el anterior. */
export function levelFromXp(xp) {
  let level = 1;
  let need = 100;
  let rest = xp;
  while (rest >= need) {
    rest -= need;
    level++;
    need = Math.round(need * 1.35);
  }
  return { level, into: rest, need };
}

export const XP_RULES = {
  betPlaced: 10,
  betWon: 30,
  roundPlayed: 5,
};

/** Niveles que desbloquean tipos de mercado. */
export const UNLOCKS = [
  { level: 1, kinds: ["total", "range"], label: "Más/Menos y rangos" },
  { level: 2, kinds: ["comp", "count"], label: "Comparativas y recuentos" },
  { level: 3, kinds: ["dominant"], label: "Vehículo dominante" },
  { level: 4, kinds: ["exact"], label: "Predicción exacta" },
];

export function minLevelForKind(kind) {
  const entry = UNLOCKS.find((u) => u.kinds.includes(kind));
  return entry ? entry.level : 1;
}

/* ---------- Logros ---------- */

export const ACHIEVEMENTS = [
  { id: "first-win", icon: "🥇", name: "Primera victoria", desc: "Gana tu primera apuesta", check: (s) => s.stats.wins >= 1 },
  { id: "streak-3", icon: "🔥", name: "En racha", desc: "Encadena 3 aciertos", check: (s) => s.bestStreak >= 3 },
  { id: "streak-5", icon: "🌋", name: "Imparable", desc: "Encadena 5 aciertos", check: (s) => s.bestStreak >= 5 },
  { id: "rich-5k", icon: "💰", name: "Banca creciente", desc: "Acumula 5.000 puntos", check: (s) => s.points >= 5000 },
  { id: "rich-25k", icon: "🏦", name: "Magnate del asfalto", desc: "Acumula 25.000 puntos", check: (s) => s.points >= 25000 },
  { id: "bets-50", icon: "🎟️", name: "Cliente habitual", desc: "Coloca 50 apuestas", check: (s) => s.stats.totalBets >= 50 },
  { id: "bets-250", icon: "🎰", name: "Veterano del mercado", desc: "Coloca 250 apuestas", check: (s) => s.stats.totalBets >= 250 },
  { id: "big-win", icon: "💎", name: "Pelotazo", desc: "Gana 1.000+ puntos en una apuesta", check: (s, ev) => ev.payoutMax >= 1000 },
  { id: "exact-win", icon: "🎯", name: "Ojo clínico", desc: "Acierta una predicción exacta", check: (s, ev) => ev.exactWin },
  { id: "dominant-win", icon: "👑", name: "Rey de la vía", desc: "Acierta el vehículo dominante", check: (s, ev) => ev.kindsWon.includes("dominant") },
  { id: "night-owl", icon: "🦉", name: "Búho nocturno", desc: "Gana en una ronda de madrugada (0-6h)", check: (s, ev) => ev.wins > 0 && ev.hour >= 0 && ev.hour < 6 },
  { id: "level-5", icon: "⭐", name: "Profesional", desc: "Alcanza el nivel 5", check: (s) => levelFromXp(s.xp).level >= 5 },
];

/* ---------- Misiones diarias ---------- */

const MISSION_POOL = [
  {
    id: "place-bets",
    make: (rng) => {
      const goal = 4 + Math.floor(rng() * 4); // 4-7
      return { goal, label: `Coloca ${goal} apuestas`, reward: goal * 30 };
    },
    progress: (ev) => ev.betsPlaced,
  },
  {
    id: "win-bets",
    make: (rng) => {
      const goal = 2 + Math.floor(rng() * 2); // 2-3
      return { goal, label: `Gana ${goal} apuestas`, reward: goal * 90 };
    },
    progress: (ev) => ev.wins,
  },
  {
    id: "play-rounds",
    make: (rng) => {
      const goal = 3 + Math.floor(rng() * 3); // 3-5
      return { goal, label: `Participa en ${goal} rondas`, reward: goal * 30 };
    },
    progress: (ev) => (ev.played ? 1 : 0),
  },
  {
    id: "win-comp",
    make: () => ({ goal: 1, label: "Gana una comparativa", reward: 200 }),
    progress: (ev) => ev.kindsWon.filter((k) => k === "comp").length,
  },
  {
    id: "win-total",
    make: () => ({ goal: 2, label: "Gana 2 apuestas de Más/Menos", reward: 220 }),
    progress: (ev) => ev.kindsWon.filter((k) => k === "total").length,
  },
  {
    id: "profit",
    make: (rng) => {
      const goal = (3 + Math.floor(rng() * 3)) * 100; // 300-500
      return { goal, label: `Gana ${goal} puntos netos`, reward: 250 };
    },
    progress: (ev) => Math.max(0, ev.profit),
  },
];

export function hashString(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

export function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 3 misiones deterministas por fecha: mismo día = mismas misiones. */
export function generateDailyMissions(dateStr) {
  const rng = mulberry32(hashString(dateStr));
  const pool = [...MISSION_POOL];
  const list = [];
  while (list.length < 3 && pool.length > 0) {
    const idx = Math.floor(rng() * pool.length);
    const def = pool.splice(idx, 1)[0];
    const { goal, label, reward } = def.make(rng);
    list.push({ id: def.id, label, goal, reward, progress: 0, done: false });
  }
  return { date: dateStr, list };
}

/* ---------- Aplicación al final de ronda ---------- */

/**
 * Procesa el final de una ronda jugada.
 * ev: { betsPlaced, wins, kindsWon, profit, played, hour, payoutMax, exactWin }
 * Muta state (xp, misiones, logros, puntos por recompensas) y
 * devuelve notificaciones [{ kind, text }].
 */
export function applyRoundEnd(state, ev) {
  const notifications = [];

  // XP
  const before = levelFromXp(state.xp).level;
  state.xp +=
    ev.betsPlaced * XP_RULES.betPlaced +
    ev.wins * XP_RULES.betWon +
    (ev.played ? XP_RULES.roundPlayed : 0);
  const after = levelFromXp(state.xp).level;
  if (after > before) {
    notifications.push({ kind: "levelup", text: `⭐ ¡Nivel ${after} alcanzado!` });
    const unlock = UNLOCKS.find((u) => u.level === after);
    if (unlock) {
      notifications.push({ kind: "levelup", text: `🔓 Desbloqueado: ${unlock.label}` });
    }
  }

  // Misiones del día
  const today = new Date().toISOString().slice(0, 10);
  if (state.missions.date !== today) {
    state.missions = generateDailyMissions(today);
  }
  for (const mission of state.missions.list) {
    if (mission.done) continue;
    const def = MISSION_POOL.find((d) => d.id === mission.id);
    mission.progress = Math.min(mission.goal, mission.progress + def.progress(ev));
    if (mission.progress >= mission.goal) {
      mission.done = true;
      state.points += mission.reward;
      notifications.push({
        kind: "mission",
        text: `📋 Misión completada: ${mission.label} (+${mission.reward} pts)`,
      });
    }
  }

  // Logros
  for (const ach of ACHIEVEMENTS) {
    if (state.achievements.includes(ach.id)) continue;
    if (ach.check(state, ev)) {
      state.achievements.push(ach.id);
      notifications.push({ kind: "achievement", text: `${ach.icon} Logro: ${ach.name}` });
    }
  }

  return notifications;
}

/** Asegura misiones del día generadas (para mostrarlas antes de jugar). */
export function ensureDailyMissions(state) {
  const today = new Date().toISOString().slice(0, 10);
  if (state.missions.date !== today) {
    state.missions = generateDailyMissions(today);
    return true;
  }
  return false;
}
