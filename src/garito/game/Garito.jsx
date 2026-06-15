import { useEffect, useRef, useState } from "react";
import { IconControls } from "../components/IconControls";
import { EndScreen } from "../screens/EndScreen";
import { GameOverlays } from "../overlays/GameOverlays";
import { MenuScreen } from "../screens/MenuScreen";
import { PlayingScreen } from "../screens/PlayingScreen";
import { ShopScreen } from "../screens/ShopScreen";
import { COLORS, felt, gameCss } from "../styles/gameStyles";
import { BASE_PLAYS, BASE_REROLLS, BOSS_POOL, DIFFICULTIES, JOKERS, MATERIALS, MAX_JOKERS, TARGETS } from "./data";
import { pickShop, randomBoss, rollDie, rollAllWith, scoreHand } from "./logic";
import { tone } from "./sound";
import { loadSave, writeSave } from "./storage";

const EMPTY_MATS = [null, null, null, null, null];
const EMPTY_HELD = [false, false, false, false, false];

export default function Garito() {
  const [phase, setPhase] = useState("menu");
  const [diff, setDiff] = useState(DIFFICULTIES[1]);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [dice, setDice] = useState(rollAllWith(EMPTY_MATS));
  const [held, setHeld] = useState(EMPTY_HELD);
  const [plays, setPlays] = useState(BASE_PLAYS);
  const [rerolls, setRerolls] = useState(BASE_REROLLS);
  const [money, setMoney] = useState(4);
  const [jokers, setJokers] = useState([]);
  const [mats, setMats] = useState(EMPTY_MATS);
  const [levels, setLevels] = useState({});
  const [shop, setShop] = useState(null);
  const [bossMap, setBossMap] = useState({});
  const [currentBoss, setCurrentBoss] = useState(null);
  const [endless, setEndless] = useState(false);
  const [lastPlay, setLastPlay] = useState(null);
  const [payout, setPayout] = useState(null);
  const [rolling, setRolling] = useState(false);
  const [floaters, setFloaters] = useState([]);
  const [muted, setMuted] = useState(false);
  const [bestRound, setBestRound] = useState(0);
  const [bestHand, setBestHand] = useState(0);
  const [stats, setStats] = useState({ hands: 0, best: 0 });
  const [savedRun, setSavedRun] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [pendingDie, setPendingDie] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [shake, setShake] = useState(false);
  const [resolving, setResolving] = useState(false);
  const floaterId = useRef(0);

  const { gold, cream, red } = COLORS;
  const boss = currentBoss;
  const getTarget = (r) => Math.round((r < TARGETS.length ? TARGETS[r] : TARGETS[7] * Math.pow(1.5, r - 7)) * diff.mult);
  const target = getTarget(round);
  const has = (id) => jokers.some((j) => j.id === id);
  const ctx = { bossId: boss?.id, mats, levels, prevRank: lastPlay ? lastPlay.rank : null, money, round };
  const preview = scoreHand(dice, jokers, ctx, false);
  const progress = Math.min(100, (score / target) * 100);
  const roundLabel = endless ? `GARITO ${round + 1} ♾️` : `GARITO ${round + 1} / ${TARGETS.length}`;
  const snd = (...a) => { if (!muted) tone(...a); };

  useEffect(() => {
    (async () => {
      const s = await loadSave();
      if (s) {
        setBestRound(s.best || 0);
        setBestHand(s.bestHand || 0);
        if (s.run) setSavedRun(s.run);
      }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded || rolling) return;
    if (phase === "playing" || phase === "shop") {
      const run = {
        diffId: diff.id, phase, round, score, dice, held, plays, rerolls, money,
        jokerIds: jokers.map((j) => j.id),
        mats, levels, endless, stats,
        bossMapIds: Object.fromEntries(Object.entries(bossMap).map(([k, v]) => [k, v.id])),
        currentBossId: currentBoss?.id || null,
        lastPlay: lastPlay ? { name: lastPlay.name, rank: lastPlay.rank, total: lastPlay.total } : null,
        shop: shop ? { jokerIds: shop.jokers.map((j) => j.id), dieId: shop.die?.id || null, receta: shop.receta } : null,
      };
      writeSave({ best: bestRound, bestHand, run });
      queueMicrotask(() => setSavedRun(run));
    } else if (phase === "gameover" || phase === "win") {
      writeSave({ best: bestRound, bestHand, run: null });
      queueMicrotask(() => setSavedRun(null));
    }
  }, [loaded, phase, round, score, plays, rerolls, money, jokers, mats, levels, shop, dice, held, rolling, bestRound, bestHand, diff, endless, currentBoss, bossMap, stats, lastPlay]);

  const maxPlays = () => (boss?.id === "prisas" ? 3 : BASE_PLAYS + (has("manitas") ? 1 : 0));
  const maxRerolls = () => (boss?.id === "cerrojo" ? 0 : BASE_REROLLS + (has("otraronda") ? 1 : 0));

  const animateRoll = (heldMask, theMats) => {
    setRolling(true);
    snd(160, 0.04, "triangle");
    let n = 0;
    const iv = setInterval(() => {
      setDice((d) => d.map((v, i) => (heldMask[i] ? v : rollDie(theMats[i]))));
      snd(120 + Math.random() * 120, 0.03, "triangle", 0.03);
      if (++n >= 5) {
        clearInterval(iv);
        setRolling(false);
      }
    }, 75);
  };

  const startRound = (r, jk, theMats, theBossMap) => {
    const nextBoss = r < TARGETS.length ? theBossMap[r] || null : (r + 1) % 3 === 0 ? randomBoss(BOSS_POOL) : null;
    setCurrentBoss(nextBoss);
    setRound(r);
    setScore(0);
    setHeld(EMPTY_HELD);
    setPlays(nextBoss?.id === "prisas" ? 3 : BASE_PLAYS + (jk.some((j) => j.id === "manitas") ? 1 : 0));
    setRerolls(nextBoss?.id === "cerrojo" ? 0 : BASE_REROLLS + (jk.some((j) => j.id === "otraronda") ? 1 : 0));
    setLastPlay(null);
    setPayout(null);
    setShop(null);
    setPendingDie(null);
    setResolving(false);
    setPhase("playing");
    animateRoll(EMPTY_HELD, theMats);
  };

  const newGame = (d) => {
    const dd = d || diff;
    setDiff(dd);
    const pool = [...BOSS_POOL];
    const pick = () => pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    const bm = { 2: pick(), 5: pick(), 7: pick() };
    setBossMap(bm);
    setMoney(4);
    setJokers([]);
    setMats(EMPTY_MATS);
    setLevels({});
    setEndless(false);
    setStats({ hands: 0, best: 0 });
    snd(330, 0.1); snd(440, 0.1, "square", 0.045, 0.1); snd(550, 0.15, "square", 0.045, 0.2);
    startRound(0, [], EMPTY_MATS, bm);
  };

  const continueGame = () => {
    const r = savedRun;
    if (!r) return;
    const jk = (r.jokerIds || []).map((id) => JOKERS.find((j) => j.id === id)).filter(Boolean);
    const bm = {};
    Object.entries(r.bossMapIds || {}).forEach(([k, id]) => {
      const b = BOSS_POOL.find((x) => x.id === id);
      if (b) bm[k] = b;
    });
    setDiff(DIFFICULTIES.find((d) => d.id === r.diffId) || DIFFICULTIES[1]);
    setRound(r.round);
    setScore(r.score);
    setDice(r.dice);
    setHeld(r.held);
    setPlays(r.plays);
    setRerolls(r.rerolls);
    setMoney(r.money);
    setJokers(jk);
    setMats(r.mats || EMPTY_MATS);
    setLevels(r.levels || {});
    setEndless(!!r.endless);
    setStats(r.stats || { hands: 0, best: 0 });
    setBossMap(bm);
    setCurrentBoss(r.currentBossId ? BOSS_POOL.find((b) => b.id === r.currentBossId) || null : null);
    setLastPlay(r.lastPlay || null);
    setPayout(null);
    setPendingDie(null);
    setResolving(false);
    setShop(r.shop ? {
      jokers: (r.shop.jokerIds || []).map((id) => JOKERS.find((j) => j.id === id)).filter(Boolean),
      die: r.shop.dieId ? MATERIALS.find((m) => m.id === r.shop.dieId) || MATERIALS[0] : null,
      receta: r.shop.receta || { rank: 1, cost: 4 },
    } : null);
    snd(440, 0.08); snd(660, 0.1, "square", 0.045, 0.08);
    setPhase(r.phase === "shop" ? "shop" : "playing");
  };

  const exitToMenu = () => { snd(300, 0.06, "triangle"); setPendingDie(null); setShowHelp(false); setResolving(false); setPhase("menu"); };

  const toggleHold = (i) => {
    if (phase !== "playing" || rolling || resolving) return;
    if (!held[i] && boss?.id === "zurdo" && held.filter(Boolean).length >= 2) {
      snd(150, 0.1, "sawtooth", 0.05);
      return;
    }
    snd(held[i] ? 260 : 420, 0.05, "sine", 0.05);
    setHeld((h) => h.map((v, idx) => (idx === i ? !v : v)));
  };

  const doReroll = () => {
    if (phase !== "playing" || rerolls <= 0 || rolling || resolving) return;
    setRerolls((r) => r - 1);
    animateRoll(held, mats);
  };

  const doPlay = () => {
    if (phase !== "playing" || rolling || resolving || plays <= 0) return;
    setResolving(true);
    const res = scoreHand(dice, jokers, ctx, true);
    const newScore = score + res.total;
    const playsLeft = plays - 1;
    setLastPlay(res);
    setScore(newScore);
    setPlays(playsLeft);
    setStats((s) => ({ hands: s.hands + 1, best: Math.max(s.best, res.total) }));
    setBestHand((b) => Math.max(b, res.total));
    playScoreSounds(res);
    showScoreFloaters(res);

    if (newScore >= target) {
      finishRound(playsLeft);
    } else if (playsLeft <= 0) {
      setTimeout(() => {
        snd(180, 0.3, "sawtooth", 0.05); snd(120, 0.5, "sawtooth", 0.05, 0.2);
        setResolving(false);
        setPhase("gameover");
      }, 700);
    } else {
      setHeld(EMPTY_HELD);
      setTimeout(() => {
        animateRoll(EMPTY_HELD, mats);
        setResolving(false);
      }, 250);
    }
  };

  const playScoreSounds = (res) => {
    if (res.blocked) {
      snd(140, 0.2, "sawtooth", 0.05);
      return;
    }
    const f = 200 + res.rank * 40;
    snd(f, 0.09); snd(f * 1.5, 0.09, "square", 0.045, 0.09); snd(f * 2, 0.14, "square", 0.045, 0.18);
    if (res.gambleWon) { snd(1100, 0.08, "sine", 0.06, 0.25); snd(1500, 0.12, "sine", 0.06, 0.33); }
  };

  const showScoreFloaters = (res) => {
    const id = floaterId.current;
    floaterId.current += 3;
    const fl = [{ id, text: res.blocked ? "¡REPETIDA! +0" : `+${res.total}`, big: false, bad: res.blocked }];
    if (!res.blocked && res.rank >= 4) fl.push({ id: id + 1, text: res.name.toUpperCase(), big: true });
    if (res.gambleWon) fl.push({ id: id + 2, text: "🪙 ¡DOBLE!", big: true });
    setFloaters((o) => [...o, ...fl]);
    setTimeout(() => setFloaters((o) => o.filter((x) => !fl.some((f) => f.id === x.id))), 1200);
    if (!res.blocked && (res.rank >= 5 || res.total >= 200)) {
      setShake(true);
      setTimeout(() => setShake(false), 450);
    }
  };

  const finishRound = (playsLeft) => {
    const interes = Math.min(3, Math.floor(money / 5));
    const pAvaro = has("avaro") ? rerolls : 0;
    const pBote = has("bote") ? 2 : 0;
    const pBoss = boss ? 3 : 0;
    const pEsm = mats.filter((m) => m === "esmeralda").length;
    const earned = 4 + playsLeft + pAvaro + pBote + pBoss + pEsm + interes;
    setMoney((m) => m + earned);
    setPayout({ plays: playsLeft, avaro: pAvaro, bote: pBote, boss: pBoss, esm: pEsm, interes, earned });
    setBestRound((b) => Math.max(b, round + 1));
    setShop(pickShop(jokers));
    setTimeout(() => {
      snd(523, 0.12); snd(659, 0.12, "square", 0.05, 0.12); snd(784, 0.12, "square", 0.05, 0.24); snd(1047, 0.25, "square", 0.05, 0.36);
      setResolving(false);
      setPhase("shop");
    }, 700);
  };

  const buyJoker = (j) => {
    if (money < j.cost || jokers.length >= MAX_JOKERS) return;
    snd(880, 0.07, "sine", 0.06); snd(1320, 0.1, "sine", 0.06, 0.07);
    setMoney((m) => m - j.cost);
    setJokers((arr) => [...arr, j]);
    setShop((s) => ({ ...s, jokers: s.jokers.filter((x) => x.id !== j.id) }));
  };

  const sellJoker = (j) => {
    const price = Math.floor(j.cost / 2);
    snd(500, 0.06, "sine", 0.05); snd(380, 0.08, "sine", 0.05, 0.06);
    setMoney((m) => m + price);
    setJokers((arr) => arr.filter((x) => x.id !== j.id));
  };

  const buyDie = () => {
    if (!shop?.die || money < shop.die.cost) return;
    snd(880, 0.07, "sine", 0.06);
    setMoney((m) => m - shop.die.cost);
    setPendingDie(shop.die);
    setShop((s) => ({ ...s, die: null }));
  };

  const applyDie = (i) => {
    if (!pendingDie) return;
    snd(700, 0.08, "sine", 0.06); snd(1050, 0.12, "sine", 0.06, 0.08);
    setMats((m) => m.map((v, idx) => (idx === i ? pendingDie.id : v)));
    setPendingDie(null);
  };

  const cancelDie = () => {
    if (!pendingDie) return;
    setMoney((m) => m + pendingDie.cost);
    setShop((s) => ({ ...s, die: pendingDie }));
    setPendingDie(null);
  };

  const buyReceta = () => {
    if (!shop?.receta || money < shop.receta.cost) return;
    snd(600, 0.08, "sine", 0.06); snd(900, 0.12, "sine", 0.06, 0.08);
    const r = shop.receta.rank;
    setMoney((m) => m - shop.receta.cost);
    setLevels((lv) => ({ ...lv, [r]: (lv[r] || 1) + 1 }));
    setShop((s) => ({ ...s, receta: null }));
  };

  const rerollShop = () => {
    if (money < 2) return;
    snd(300, 0.05, "triangle");
    setMoney((m) => m - 2);
    setShop(pickShop(jokers));
  };

  const nextRound = () => {
    if (phase !== "shop" || resolving) return;
    if (!endless && round + 1 >= TARGETS.length) {
      snd(523, 0.15); snd(659, 0.15, "square", 0.05, 0.15); snd(784, 0.15, "square", 0.05, 0.3); snd(1047, 0.4, "square", 0.06, 0.45);
      setPhase("win");
    } else {
      startRound(round + 1, jokers, mats, bossMap);
    }
  };

  const goEndless = () => {
    if (resolving) return;
    setEndless(true);
    snd(440, 0.1); snd(660, 0.1, "square", 0.05, 0.1); snd(880, 0.2, "square", 0.05, 0.2);
    startRound(round + 1, jokers, mats, bossMap);
  };

  const controls = (
    <IconControls
      muted={muted}
      onToggleMute={() => setMuted((m) => !m)}
      onHelp={() => { snd(500, 0.05, "sine"); setShowHelp(true); }}
      onExit={exitToMenu}
      cream={cream}
      gold={gold}
    />
  );

  return (
    <div className="min-h-screen" style={felt}>
      <style>{gameCss}</style>

      {phase === "menu" && <MenuScreen bestHand={bestHand} bestRound={bestRound} cream={cream} gold={gold} newGame={newGame} savedRun={savedRun} continueGame={continueGame} />}
      {(phase === "gameover" || phase === "win") && <EndScreen cream={cream} diff={diff} endless={endless} goEndless={goEndless} gold={gold} jokers={jokers} money={money} newGame={newGame} phase={phase} red={red} round={round} score={score} setPhase={setPhase} stats={stats} target={target} />}
      {phase === "shop" && shop && <ShopScreen bossMap={bossMap} buyDie={buyDie} buyJoker={buyJoker} buyReceta={buyReceta} controls={controls} cream={cream} dice={dice} endless={endless} getTarget={getTarget} gold={gold} jokers={jokers} levels={levels} mats={mats} money={money} nextRound={nextRound} payout={payout} red={red} rerollShop={rerollShop} round={round} sellJoker={sellJoker} shop={shop} />}
      {phase === "playing" && <PlayingScreen boss={boss} controls={controls} cream={cream} dice={dice} doPlay={doPlay} doReroll={doReroll} floaters={floaters} gold={gold} held={held} jokers={jokers} lastPlay={lastPlay} mats={mats} maxPlays={maxPlays} maxRerolls={maxRerolls} money={money} plays={plays} preview={preview} progress={progress} red={red} rerolls={rerolls} resolving={resolving} rolling={rolling} roundLabel={roundLabel} score={score} shake={shake} target={target} toggleHold={toggleHold} />}
      <GameOverlays applyDie={applyDie} cancelDie={cancelDie} cream={cream} dice={dice} gold={gold} levels={levels} mats={mats} pendingDie={pendingDie} setShowHelp={setShowHelp} showHelp={showHelp} />
    </div>
  );
}
