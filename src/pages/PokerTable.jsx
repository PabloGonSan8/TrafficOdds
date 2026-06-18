import { useEffect, useReducer, useRef, useState } from "react";
import { useGameState, useGameActions } from "../context/GameContext";
import {
  SUITS,
  newDeck,
  draw,
  bestHand,
  compareScore,
  handName,
  aiDecision,
  aiDiscard,
} from "../engine/poker";
import * as Audio from "../engine/audio";
import { GameHelp } from "../components/casino/GameHelp";

// Mesa de 4: tú + 3 bots. Fichas locales compradas con puntos.
const SEATS = 4;
const SB = 10;
const BB = 20;
const START_STACK = 1000;
const BOT_DELAY = 350;
const BOT_NAMES = ["El Tiburón", "La Reina", "Comodín"];

function suitOf(id) {
  return SUITS.find((s) => s.id === id);
}

function actionInfo(p, isActing) {
  if (p.folded) return { text: "🚫 Retirado", cls: "bg-signal-red text-white" };
  if (isActing) return { text: "🤔 Pensando…", cls: "bg-white/25 text-white animate-pulse" };
  if (!p.lastAction) return { text: "—", cls: "bg-black/40 text-white/50" };
  if (/Sube|All-in/.test(p.lastAction)) return { text: "⬆ " + p.lastAction, cls: "bg-signal-amber text-[#1a1200]" };
  if (/Iguala/.test(p.lastAction)) return { text: "✓ " + p.lastAction, cls: "bg-signal-green text-[#06210f]" };
  if (/Pasa/.test(p.lastAction)) return { text: "👋 Pasa", cls: "bg-sky-500 text-white" };
  if (/Cambia|planta/.test(p.lastAction)) return { text: "🔄 " + p.lastAction, cls: "bg-signal-amber text-[#1a1200]" };
  return { text: p.lastAction, cls: "bg-black/50 text-white" };
}

function Card({ card, hidden, small, className = "", style }) {
  const size = small ? "h-14 w-10 text-lg sm:h-16 sm:w-11" : "h-20 w-14 text-2xl sm:h-24 sm:w-[4.2rem] sm:text-3xl";
  if (!card || hidden) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border-2 border-white/60 bg-[repeating-linear-gradient(45deg,#1d3a8f_0_6px,#142a6b_6px_12px)] shadow-lg shadow-black/50 ${size} ${className}`}
        style={style}
        aria-label="Carta oculta"
      >
        🂠
      </div>
    );
  }
  const suit = suitOf(card.suit);
  const color = suit.red ? "text-[#c0392b]" : "text-[#1b1f26]";
  return (
    <div
      className={`relative flex items-center justify-center rounded-lg border border-black/20 bg-gradient-to-br from-white to-[#e8e4d8] shadow-lg shadow-black/50 ${size} ${className}`}
      style={style}
      aria-label={`${card.rank} de ${suit.icon}`}
    >
      <span className={`absolute left-1 top-0.5 font-cond text-xs font-bold ${color}`}>{card.rank}</span>
      <span className={color}>{suit.icon}</span>
      <span className={`absolute bottom-0.5 right-1 rotate-180 font-cond text-xs font-bold ${color}`}>{card.rank}</span>
    </div>
  );
}

const HELP = {
  holdem: (
    <ul className="list-disc space-y-1 pl-4">
      <li>Recibes 2 cartas tapadas. Se reparten 5 comunitarias (flop 3, turn 1, river 1).</li>
      <li>Forma la mejor mano de 5 con tus 2 + las comunitarias. Hay 4 rondas de apuestas.</li>
      <li>En cada turno: pasa, iguala, sube o retírate. Gana la mejor mano (o el último en pie).</li>
    </ul>
  ),
  draw: (
    <ul className="list-disc space-y-1 pl-4">
      <li>Recibes 5 cartas. Apuestas, descartas las que quieras y robas nuevas.</li>
      <li>Tras el cambio hay otra ronda de apuestas y se enseñan las manos.</li>
      <li>Ranking: pareja &lt; dobles &lt; trío &lt; escalera &lt; color &lt; full &lt; póker &lt; escalera de color.</li>
    </ul>
  ),
};

function freshPlayers(stacks) {
  return Array.from({ length: SEATS }, (_, i) => ({
    id: i,
    name: i === 0 ? "Tú" : BOT_NAMES[i - 1],
    human: i === 0,
    chips: stacks[i],
    hole: [],
    bet: 0,
    acted: false,
    folded: false,
    allIn: false,
    lastAction: null,
  }));
}

export function PokerTable({ onBack }) {
  const { points } = useGameState();
  const { spendPoints, awardPoints } = useGameActions();

  const [variant, setVariant] = useState("holdem");
  const [, render] = useReducer((x) => x + 1, 0);
  const tRef = useRef(null);
  const timersRef = useRef([]);
  const [seated, setSeated] = useState(false);
  const [discards, setDiscards] = useState(new Set());
  const [raiseTo, setRaiseTo] = useState(0);

  useEffect(() => () => clearTimers(), []);

  function clearTimers() {
    for (const t of timersRef.current) clearTimeout(t);
    timersRef.current = [];
  }
  function later(fn, ms) {
    timersRef.current.push(setTimeout(fn, ms));
  }

  function sitDown() {
    if (!spendPoints(START_STACK)) {
      msg("Necesitas " + START_STACK + " puntos para sentarte.");
      return;
    }
    const stacks = Array(SEATS).fill(START_STACK);
    tRef.current = {
      players: freshPlayers(stacks),
      deck: [],
      community: [],
      pot: 0,
      currentBet: 0,
      minRaise: BB,
      button: Math.floor(Math.random() * SEATS),
      stage: "idle",
      lastActor: 0,
      acting: null,
      message: "Te sientas con " + START_STACK + " fichas. ¡Reparte!",
      revealed: false,
      winners: [],
    };
    setSeated(true);
    render();
  }

  function cashOut() {
    const t = tRef.current;
    const chips = t.players[0].chips;
    clearTimers();
    if (chips > 0) awardPoints(chips, `🪙 Te retiras con ${chips} fichas → +${chips} pts`);
    tRef.current = null;
    setSeated(false);
    render();
  }

  function msg(text) {
    if (tRef.current) tRef.current.message = text;
  }

  function startHand() {
    const t = tRef.current;
    for (const p of t.players) {
      if (!p.human && p.chips <= 0) p.chips = START_STACK;
      p.hole = [];
      p.bet = 0;
      p.acted = false;
      p.folded = false;
      p.allIn = false;
      p.lastAction = null;
    }
    if (t.players[0].chips <= 0) {
      msg("Sin fichas. Recompra o cobra lo que quede.");
      render();
      return;
    }
    t.deck = newDeck();
    t.community = [];
    t.pot = 0;
    t.currentBet = 0;
    t.minRaise = BB;
    t.revealed = false;
    t.winners = [];
    t.button = (t.button + 1) % SEATS;
    setDiscards(new Set());

    const n = variant === "holdem" ? 2 : 5;
    for (const p of t.players) p.hole = draw(t.deck, n);

    const sb = (t.button + 1) % SEATS;
    const bb = (t.button + 2) % SEATS;
    postBlind(sb, SB);
    postBlind(bb, BB);
    t.currentBet = BB;
    t.stage = variant === "holdem" ? "preflop" : "bet1";
    t.lastActor = bb;
    Audio.click();
    msg(`Mano repartida. Ciegas ${SB}/${BB}.`);
    proceed();
  }

  function postBlind(i, amt) {
    const t = tRef.current;
    const p = t.players[i];
    const pay = Math.min(amt, p.chips);
    p.chips -= pay;
    p.bet += pay;
    t.pot += pay;
    if (p.chips === 0) p.allIn = true;
  }

  function needsAction(p, t) {
    return !p.folded && !p.allIn && (!p.acted || p.bet < t.currentBet);
  }
  function aliveCount(t) {
    return t.players.filter((p) => !p.folded).length;
  }

  function proceed() {
    const t = tRef.current;
    if (aliveCount(t) === 1) return endHand();
    const anyToAct = t.players.some((p) => needsAction(p, t));
    if (!anyToAct) return nextStreet();

    let idx = -1;
    for (let k = 1; k <= SEATS; k++) {
      const j = (t.lastActor + k) % SEATS;
      if (needsAction(t.players[j], t)) {
        idx = j;
        break;
      }
    }
    if (idx === -1) return nextStreet();

    t.acting = idx;
    render();
    if (t.players[idx].human) {
      setRaiseTo(Math.min(t.players[0].chips + t.players[0].bet, t.currentBet + t.minRaise));
    } else {
      later(() => botTurn(idx), BOT_DELAY);
    }
  }

  function botTurn(idx) {
    const t = tRef.current;
    if (!t || t.acting !== idx) return;
    const p = t.players[idx];
    const toCall = t.currentBet - p.bet;
    const d = aiDecision({
      toCall,
      minRaise: t.minRaise,
      chips: p.chips,
      pot: t.pot,
      variant,
      stage: t.stage,
      hole: p.hole,
      community: t.community,
    });
    applyAction(idx, d.action, d.amount);
  }

  function applyAction(idx, action, amount) {
    const t = tRef.current;
    const p = t.players[idx];
    const toCall = t.currentBet - p.bet;

    if (action === "fold") {
      p.folded = true;
      p.lastAction = "Se retira";
      Audio.tick();
    } else if (action === "check" && toCall <= 0) {
      p.lastAction = "Pasa";
      Audio.tick();
    } else if (action === "call" || (action === "check" && toCall > 0)) {
      const pay = Math.min(toCall, p.chips);
      p.chips -= pay;
      p.bet += pay;
      t.pot += pay;
      if (p.chips === 0) p.allIn = true;
      p.lastAction = pay > 0 ? `Iguala ${p.bet}` : "Pasa";
      Audio.click();
    } else if (action === "raise") {
      const minTarget = t.currentBet + t.minRaise;
      const maxTarget = p.bet + p.chips;
      let target = Math.max(minTarget, Math.min(amount, maxTarget));
      if (maxTarget < minTarget) target = maxTarget;
      const pay = target - p.bet;
      p.chips -= pay;
      p.bet = target;
      t.pot += pay;
      t.minRaise = Math.max(t.minRaise, target - t.currentBet);
      t.currentBet = target;
      if (p.chips === 0) p.allIn = true;
      p.lastAction = p.allIn ? `All-in ${target}` : `Sube a ${target}`;
      for (const o of t.players) if (o !== p && !o.folded && !o.allIn) o.acted = false;
      Audio.win();
    }

    p.acted = true;
    t.lastActor = idx;
    t.acting = null;
    render();
    if (action === "fold" && p.human) {
      later(fastForward, 300);
    } else {
      later(proceed, p.human ? 200 : 220);
    }
  }

  function fastForward() {
    const t = tRef.current;
    if (aliveCount(t) === 1) return endHand();
    if (variant === "holdem") {
      while (t.community.length < 5) t.community.push(...draw(t.deck, 1));
      return showdown();
    }
    if (t.stage === "bet1") {
      for (const p of t.players) {
        if (p.human || p.folded) continue;
        const idxs = aiDiscard(p.hole);
        const keep = p.hole.filter((_, i) => !idxs.includes(i));
        p.hole = [...keep, ...draw(t.deck, idxs.length)];
      }
    }
    return showdown();
  }

  function resetStreet(firstActorBefore) {
    const t = tRef.current;
    for (const p of t.players) {
      p.bet = 0;
      if (!p.folded && !p.allIn) p.acted = false;
    }
    t.currentBet = 0;
    t.minRaise = BB;
    t.lastActor = firstActorBefore;
  }

  function nextStreet() {
    const t = tRef.current;
    if (variant === "holdem") {
      if (t.stage === "preflop") {
        t.community.push(...draw(t.deck, 3));
        t.stage = "flop";
      } else if (t.stage === "flop") {
        t.community.push(...draw(t.deck, 1));
        t.stage = "turn";
      } else if (t.stage === "turn") {
        t.community.push(...draw(t.deck, 1));
        t.stage = "river";
      } else {
        return showdown();
      }
      resetStreet(t.button);
      Audio.tick();
      render();
      later(proceed, 350);
      return;
    }

    if (t.stage === "bet1") {
      t.stage = "draw";
      t.acting = null;
      for (const p of t.players) {
        if (p.human || p.folded) continue;
        const idxs = aiDiscard(p.hole);
        const keep = p.hole.filter((_, i) => !idxs.includes(i));
        p.hole = [...keep, ...draw(t.deck, idxs.length)];
        p.lastAction = idxs.length ? `Cambia ${idxs.length}` : "Se planta";
      }
      msg("Cambio de cartas: elige cuáles descartar.");
      render();
      return;
    }
    if (t.stage === "bet2") return showdown();
  }

  function confirmDraw() {
    const t = tRef.current;
    const me = t.players[0];
    if (!me.folded) {
      const idxs = [...discards];
      const keep = me.hole.filter((_, i) => !idxs.includes(i));
      me.hole = [...keep, ...draw(t.deck, idxs.length)];
      me.lastAction = idxs.length ? `Cambia ${idxs.length}` : "Se planta";
    }
    setDiscards(new Set());
    t.stage = "bet2";
    resetStreet(t.button);
    Audio.click();
    msg("Segunda ronda de apuestas.");
    render();
    later(proceed, 300);
  }

  function showdown() {
    const t = tRef.current;
    t.revealed = true;
    const contenders = t.players.filter((p) => !p.folded);
    const scored = contenders.map((p) => ({
      p,
      score: bestHand(variant === "holdem" ? [...p.hole, ...t.community] : p.hole),
    }));
    let best = scored[0];
    for (const s of scored) if (compareScore(s.score, best.score) > 0) best = s;
    const winners = scored.filter((s) => compareScore(s.score, best.score) === 0);

    const share = Math.floor(t.pot / winners.length);
    for (const w of winners) w.p.chips += share;
    t.acting = null;
    t.winners = winners.map((w) => w.p.id);
    const names = winners.map((w) => w.p.name).join(" y ");
    const youWon = winners.some((w) => w.p.human);
    t.message = `🏆 ${youWon ? "¡GANAS" : "Gana " + names} ${t.pot} fichas${youWon ? "!" : ""} con ${handName(best.score)}.`;
    t.stage = "payout";
    Audio.win();
    render();
  }

  function endHand() {
    const t = tRef.current;
    const winner = t.players.find((p) => !p.folded);
    winner.chips += t.pot;
    t.winners = [winner.id];
    t.message = winner.human
      ? `🏆 ¡GANAS ${t.pot} fichas! (todos se retiraron)`
      : `🏆 ${winner.name} se lleva ${t.pot} (todos se retiraron).`;
    t.stage = "payout";
    t.acting = null;
    Audio.win();
    render();
  }

  const t = tRef.current;
  const me = t?.players[0];
  const myTurn =
    t && t.acting === 0 &&
    ["preflop", "flop", "turn", "river", "bet1", "bet2"].includes(t.stage);
  const toCall = t ? t.currentBet - (me?.bet || 0) : 0;
  const canCheck = toCall <= 0;
  const maxRaiseTo = me ? me.chips + me.bet : 0;
  const canRaise = me && me.chips > toCall;

  function toggleDiscard(i) {
    setDiscards((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  if (!seated) {
    return (
      <main className="mx-auto max-w-3xl p-3 sm:p-5">
        <button type="button" onClick={onBack} className="font-cond text-sm font-semibold text-dim hover:text-ink">← Cambiar modo</button>
        <div className="mt-2 rounded-2xl border-4 border-[#5d3a1a] bg-[radial-gradient(ellipse_at_top,#0f6b35,#0a4f27_70%)] p-6 text-center shadow-2xl shadow-black/60">
          <h1 className="font-display text-2xl text-white sm:text-3xl">♠ Póker contra la IA</h1>
          <p className="mx-auto mt-2 max-w-md font-cond text-white/85">
            Mesa de 4: tú y 3 rivales con IA. Elige variante, siéntate con {START_STACK} fichas
            (cuestan {START_STACK} puntos) y cobra lo que te quede al levantarte.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            {[["holdem", "Texas Hold'em"], ["draw", "5 Cartas (Draw)"]].map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => setVariant(v)}
                className={`min-h-11 rounded-md px-4 font-cond font-bold ${variant === v ? "bg-signal-amber text-[#1a1200]" : "border border-white/30 bg-black/30 text-white hover:bg-black/50"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-3 font-cond text-sm text-white/70">Saldo: {points.toLocaleString("es-ES")} pts</p>
          <button
            type="button"
            disabled={points < START_STACK}
            onClick={sitDown}
            className="mt-4 min-h-12 rounded-md bg-signal-amber px-6 font-cond text-lg font-bold text-[#1a1200] shadow-lg shadow-black/40 hover:brightness-110 disabled:opacity-40"
          >
            Sentarse · {START_STACK} pts
          </button>
        </div>
      </main>
    );
  }

  const isDrawChoice = t.stage === "draw" && !me.folded;
  const showStart = t.stage === "idle" || t.stage === "payout";

  return (
    <main className="mx-auto max-w-3xl p-3 sm:p-5">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="font-cond text-sm font-semibold text-dim hover:text-ink">← Modo</button>
        <span className="font-cond text-sm text-dim">{variant === "holdem" ? "Texas Hold'em" : "5 Cartas"}</span>
      </div>

      <div className="mt-2 rounded-2xl border-4 border-[#5d3a1a] bg-[radial-gradient(ellipse_at_top,#0f6b35,#0a4f27_70%)] p-3 shadow-2xl shadow-black/60 sm:p-5">
        <div className="mb-3 flex items-center justify-between rounded-lg bg-black/30 px-3 py-2">
          <div className="font-cond text-sm font-semibold text-white">Bote: <span className="text-sodium">{t.pot}</span></div>
          <div className="font-cond text-sm font-semibold text-white">Tus fichas: <span className="text-signal-amber">{me.chips}</span></div>
        </div>

        <GameHelp help={HELP[variant]} />

        {/* Rivales */}
        <div className="grid grid-cols-3 gap-2">
          {t.players.slice(1).map((p, i) => {
            const seat = i + 1;
            const act = actionInfo(p, t.acting === seat);
            const isWinner = t.winners?.includes(p.id);
            return (
              <div key={p.id} className={`rounded-lg p-2 text-center transition ${isWinner ? "anim-win bg-signal-green/25 ring-2 ring-signal-green" : t.acting === seat ? "bg-white/10 ring-2 ring-signal-amber" : "bg-black/20"} ${p.folded && !isWinner ? "opacity-50" : ""}`}>
                <div className="font-cond text-xs font-bold text-white">
                  {p.name} {t.button === seat ? "🔘" : ""}
                </div>
                <div className="font-cond text-[0.7rem] text-white/70">{p.chips} fichas</div>
                <div className="mt-1 flex justify-center gap-1">
                  {p.hole.map((c, j) => (
                    <Card
                      key={`${c.rank}${c.suit}-${t.revealed}`}
                      card={c}
                      hidden={!t.revealed}
                      small
                      className={t.revealed ? "anim-flip" : "anim-deal"}
                      style={{ animationDelay: `${j * 0.12}s` }}
                    />
                  ))}
                </div>
                <div className={`mt-1.5 rounded-full px-1.5 py-0.5 font-cond text-[0.7rem] font-bold leading-tight ${isWinner ? "bg-signal-green text-[#06210f]" : act.cls}`}>
                  {isWinner ? "🏆 GANA" : act.text}
                </div>
                {p.bet > 0 ? <div className="mt-0.5 font-cond text-[0.7rem] text-sodium">🪙 {p.bet}</div> : null}
              </div>
            );
          })}
        </div>

        {variant === "holdem" ? (
          <div className="my-4 flex min-h-20 items-center justify-center gap-2 rounded-lg bg-black/20 py-2 sm:min-h-24">
            {t.community.length === 0 ? (
              <span className="font-cond text-sm text-white/50">cartas comunitarias</span>
            ) : (
              t.community.map((c, i) => (
                <Card key={`${c.rank}${c.suit}`} card={c} className="anim-deal" style={{ animationDelay: `${(i % 3) * 0.13}s` }} />
              ))
            )}
          </div>
        ) : null}

        {t.message ? (
          <p
            className={`my-3 rounded-md px-3 py-2 text-center font-cond font-bold ${
              t.stage === "payout" ? "anim-pop bg-signal-green/20 text-lg text-signal-green ring-1 ring-signal-green/60 sm:text-xl" : "bg-black/40 text-white"
            }`}
            role="status"
          >
            {t.message}
          </p>
        ) : null}

        {/* Tu mano */}
        <div className={`rounded-lg p-2 ${t.winners?.includes(0) ? "anim-win bg-signal-green/25 ring-2 ring-signal-green" : t.acting === 0 ? "ring-1 ring-signal-amber" : ""} ${me.folded && !t.winners?.includes(0) ? "opacity-40" : ""}`}>
          <div className="mb-1 flex items-center justify-between">
            <span className="font-cond text-sm font-bold text-white">
              Tú {t.button === 0 ? "🔘" : ""} {t.winners?.includes(0) ? "🏆" : ""} {me.bet > 0 ? `· apuesta ${me.bet}` : ""}
            </span>
            {!me.folded && me.hole.length ? (
              <span className="font-cond text-xs text-sodium">
                {handName(bestHand(variant === "holdem" ? [...me.hole, ...t.community] : me.hole))}
              </span>
            ) : null}
          </div>
          <div className="flex gap-2">
            {me.hole.map((c, i) => (
              <button
                key={`${c.rank}${c.suit}`}
                type="button"
                disabled={!isDrawChoice}
                onClick={() => toggleDiscard(i)}
                className={`anim-deal transition ${isDrawChoice ? "cursor-pointer hover:-translate-y-1" : "cursor-default"} ${discards.has(i) ? "-translate-y-2 opacity-60 ring-2 ring-signal-red rounded-lg" : ""}`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <Card card={c} />
              </button>
            ))}
          </div>
        </div>

        {/* Controles */}
        <div className="mt-4">
          {showStart ? (
            <div className="flex gap-2">
              <button type="button" onClick={cashOut} className="min-h-12 flex-1 rounded-md border border-white/30 bg-black/30 px-3 font-cond font-semibold text-white hover:bg-black/50">
                🪙 Cobrar y salir
              </button>
              <button type="button" onClick={startHand} className="min-h-12 flex-[2] rounded-md bg-signal-amber px-3 font-cond text-lg font-bold text-[#1a1200] shadow-lg shadow-black/40 hover:brightness-110">
                🂠 Repartir mano
              </button>
            </div>
          ) : isDrawChoice ? (
            <button type="button" onClick={confirmDraw} className="min-h-12 w-full rounded-md bg-signal-amber px-3 font-cond text-lg font-bold text-[#1a1200] shadow-lg shadow-black/40 hover:brightness-110">
              🔄 Cambiar {discards.size} carta{discards.size === 1 ? "" : "s"}
            </button>
          ) : myTurn ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <button type="button" onClick={() => applyAction(0, "fold")} className="min-h-12 flex-1 rounded-md bg-signal-red px-3 font-cond font-bold text-white shadow-lg shadow-black/40 hover:brightness-110">
                  Retirarse
                </button>
                <button type="button" onClick={() => applyAction(0, canCheck ? "check" : "call")} className="min-h-12 flex-1 rounded-md bg-signal-green px-3 font-cond font-bold text-[#06210f] shadow-lg shadow-black/40 hover:brightness-110">
                  {canCheck ? "Pasar" : `Igualar ${Math.min(toCall, me.chips)}`}
                </button>
              </div>
              {canRaise ? (
                <div className="flex items-center gap-2 rounded-lg bg-black/30 p-2">
                  <input
                    type="range"
                    min={Math.min(maxRaiseTo, t.currentBet + t.minRaise)}
                    max={maxRaiseTo}
                    value={Math.min(raiseTo, maxRaiseTo)}
                    onChange={(e) => setRaiseTo(Number(e.target.value))}
                    className="flex-1 accent-signal-amber"
                  />
                  <button type="button" onClick={() => applyAction(0, "raise", raiseTo)} className="min-h-11 shrink-0 rounded-md bg-signal-amber px-4 font-cond font-bold text-[#1a1200] hover:brightness-110">
                    {raiseTo >= maxRaiseTo ? "All-in" : "Subir a"} {Math.min(raiseTo, maxRaiseTo)}
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-center font-cond text-sm text-white/60">
              {me.folded ? "Te has retirado de esta mano." : "Turno de los rivales…"}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
