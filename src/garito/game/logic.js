import { COMBOS, JOKERS, MATERIALS } from "./data";

export const rollDie = (material) => (material === "trucado" ? 4 + Math.floor(Math.random() * 3) : 1 + Math.floor(Math.random() * 6));
export const rollAllWith = (mats) => Array.from({ length: 5 }, (_, i) => rollDie(mats[i]));
export const randomBoss = (bossPool) => bossPool[Math.floor(Math.random() * bossPool.length)];

export function comboFor(dice) {
  const counts = {};
  dice.forEach((d) => (counts[d] = (counts[d] || 0) + 1));
  const freq = Object.values(counts).sort((a, b) => b - a);
  const uniq = Object.keys(counts).map(Number).sort((a, b) => a - b);
  const straight = uniq.length === 5 && ((uniq[0] === 1 && uniq[4] === 5) || (uniq[0] === 2 && uniq[4] === 6));
  if (freq[0] === 5) return COMBOS[7];
  if (straight) return COMBOS[6];
  if (freq[0] === 4) return COMBOS[5];
  if (freq[0] === 3 && freq[1] === 2) return COMBOS[4];
  if (freq[0] === 3) return COMBOS[3];
  if (freq[0] === 2 && freq[1] === 2) return COMBOS[2];
  if (freq[0] === 2) return COMBOS[1];
  return COMBOS[0];
}

export const levelOf = (levels, rank) => levels[rank] || 1;
export const comboChips = (c, lvl) => c.chips + (lvl - 1) * c.upC;
export const comboMult = (c, lvl) => Math.round((c.mult + (lvl - 1) * c.upM) * 10) / 10;

export function scoreHand(dice, jokers, ctx, resolve = false) {
  const { bossId, mats, levels, prevRank, money, round } = ctx;
  const c = comboFor(dice);
  const lvl = levelOf(levels, c.rank);
  const sumAll = dice.reduce((a, b) => a + b, 0);

  let sum = 0;
  dice.forEach((d, i) => {
    let v = bossId === "tuerto" && d === 1 ? 0 : d;
    if (mats[i] === "dorado") v *= 2;
    sum += v;
  });

  const has = (id) => jokers.some((j) => j.id === id);
  const count = (v) => dice.filter((d) => d === v).length;
  const triggered = [];
  const t = (id) => triggered.push(id);

  let chips = comboChips(c, lvl) + sum;
  let mult = comboMult(c, lvl);

  mats.forEach((m) => {
    if (m === "zafiro") chips += 8;
    if (m === "rubi") mult += 1;
  });

  if (has("seisero") && count(6) > 0) { chips += 10 * count(6); t("seisero"); }
  if (has("gemelos") && c.rank >= 1) { chips += 20; t("gemelos"); }
  if (has("contable")) { chips += sum; t("contable"); }
  if (has("vermutera") && sumAll % 2 === 1) { chips += 15; t("vermutera"); }
  if (has("gato") && new Set(dice).size === 5) { chips += 30; t("gato"); }
  if (has("churrero") && money > 0) { chips += 2 * money; t("churrero"); }
  if (has("madrugador") && count(1) > 0) { mult += 3 * count(1); t("madrugador"); }
  if (has("treseran") && c.rank >= 3) { mult += 2; t("treseran"); }
  if (has("funicular") && c.rank === 6) { mult += 4; t("funicular"); }
  if (has("calcetines") && dice.every((d) => d % 2 === 0)) { mult += 3; t("calcetines"); }
  if (has("eco") && prevRank !== null && prevRank !== undefined && c.rank === prevRank) { mult += 2; t("eco"); }
  if (has("faria") && round > 0) { mult += 0.5 * round; t("faria"); }
  if (has("castiza")) { mult += jokers.length; t("castiza"); }
  if (has("turbina")) { mult *= 1.5; t("turbina"); }
  let gambleWon = false;
  const gamble = has("dobleonada");
  if (gamble && resolve && Math.random() < 0.5) { mult *= 2; gambleWon = true; t("dobleonada"); }
  if (has("dueno")) { mult *= 2; t("dueno"); }

  mult = Math.round(mult * 10) / 10;
  let total = Math.floor(chips * mult);

  let blocked = false;
  if (bossId === "caprichoso" && prevRank !== null && prevRank !== undefined && c.rank === prevRank) {
    total = 0;
    blocked = true;
  }

  return { name: c.name, rank: c.rank, lvl, chips, mult, total, triggered, blocked, gamble, gambleWon };
}

const rollRarity = () => {
  const r = Math.random();
  if (r < 0.08) return "legendario";
  if (r < 0.4) return "raro";
  return "comun";
};

export function pickShop(owned) {
  const ownedIds = owned.map((j) => j.id);
  const jokersOut = [];
  for (let k = 0; k < 2; k++) {
    let pool = JOKERS.filter((j) => !ownedIds.includes(j.id) && !jokersOut.includes(j) && j.rarity === rollRarity());
    if (!pool.length) pool = JOKERS.filter((j) => !ownedIds.includes(j.id) && !jokersOut.includes(j));
    if (pool.length) jokersOut.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  const die = MATERIALS[Math.floor(Math.random() * MATERIALS.length)];
  const combo = COMBOS[Math.floor(Math.random() * COMBOS.length)];
  return { jokers: jokersOut, die, receta: { rank: combo.rank, cost: 4 } };
}
