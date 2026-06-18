import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useGameState, useGameActions } from "../context/GameContext";
import {
  SUITS,
  newDeck,
  draw,
  evaluate5,
  bestHand,
  compareScore,
  tierName,
  handTier,
  TIER_NAMES,
  HOLDEM_MULT,
  DRAW_MULT,
} from "../engine/poker";
import * as Audio from "../engine/audio";
import { GameHelp } from "../components/casino/GameHelp";
import { PokerTable } from "./PokerTable";

const MIN_BET = 10;
const MAX_BET = 1000;
const CHIPS = [10, 25, 50, 100, 250];

function suitOf(id) {
  return SUITS.find((s) => s.id === id);
}

function Card({ card, hidden, small, className = "", style }) {
  const size = small
    ? "h-16 w-11 text-xl sm:h-20 sm:w-14 sm:text-2xl"
    : "h-20 w-14 text-2xl sm:h-24 sm:w-[4.2rem] sm:text-3xl";
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

// Tabla de pagos visible (las dos comparten categorías, distinto multiplicador).
function Paytable({ mult }) {
  return (
    <div className="rounded-lg bg-black/30 p-2 font-cond text-[0.72rem] text-white/85">
      <div className="grid grid-cols-2 gap-x-3 sm:grid-cols-2">
        {TIER_NAMES.map((name, i) => (
          <div key={name} className="flex justify-between border-b border-white/10 py-0.5">
            <span>{name}</span>
            <span className="font-bold text-signal-amber">
              {mult[i] === 0 ? "pierde" : `×${mult[i]}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const HELP = {
  holdem: (
    <ul className="list-disc space-y-1 pl-4">
      <li>Apuestas, recibes 2 cartas privadas y la banca otras 2 (ocultas).</li>
      <li>Salen 5 comunitarias: flop (3), turn (1) y river (1). En cada fase puedes seguir, subir o retirarte.</li>
      <li>Tu mejor mano de 5 (entre tus 2 + las 5 comunitarias) se compara con la banca.</li>
      <li>Si ganas, cobras tu apuesta × el multiplicador de tu mano. Empate: recuperas la apuesta.</li>
    </ul>
  ),
  draw: (
    <ul className="list-disc space-y-1 pl-4">
      <li>Apuestas y recibes 5 cartas. Toca las que quieras CONSERVAR (quedan bloqueadas).</li>
      <li>Las no bloqueadas se cambian por nuevas (una sola ronda de descarte).</li>
      <li>Cobras según la categoría final: la carta alta pierde; de pareja para arriba, paga.</li>
    </ul>
  ),
};

function SoloPoker({ onBack }) {
  const { points } = useGameState();
  const { spendPoints, awardPoints } = useGameActions();

  const [variant, setVariant] = useState(null); // null = pantalla de elección
  const [stake, setStake] = useState(0);

  // holdem: "bet"|"preflop"|"flop"|"turn"|"river"|"done" · draw: "bet"|"draw"|"done"
  const [phase, setPhase] = useState("bet");
  const [player, setPlayer] = useState([]);
  const [banca, setBanca] = useState([]);
  const [community, setCommunity] = useState([]);
  const [totalStake, setTotalStake] = useState(0); // apuesta acumulada (con subidas)
  const [result, setResult] = useState(null);
  const [raiseAdd, setRaiseAdd] = useState(0);

  // draw
  const [held, setHeld] = useState(new Set());
  const [draw5, setDraw5] = useState({ initial: [], discarded: [] });

  const deckRef = useRef(null);

  function resetTable() {
    setPhase("bet");
    setPlayer([]);
    setBanca([]);
    setCommunity([]);
    setResult(null);
    setRaiseAdd(0);
    setHeld(new Set());
    setDraw5({ initial: [], discarded: [] });
  }

  function pickVariant(v) {
    setVariant(v);
    resetTable();
    setStake(0);
  }

  function addChip(v) {
    Audio.click();
    setStake((s) => Math.min(points, MAX_BET, s + v));
  }

  // ---------------- TEXAS HOLD'EM (vs banca, tabla de pagos) ----------------
  function dealHoldem() {
    if (stake < MIN_BET) return;
    if (!spendPoints(stake)) return;
    Audio.click();
    const deck = newDeck();
    deckRef.current = deck;
    setPlayer(draw(deck, 2));
    setBanca(draw(deck, 2));
    setCommunity([]);
    setTotalStake(stake);
    setResult(null);
    setRaiseAdd(0);
    setPhase("preflop");
  }

  function continueHoldem() {
    const deck = deckRef.current;
    let total = totalStake;
    // Aplica la subida (raise) de esta fase, si la hay.
    if (raiseAdd > 0 && spendPoints(raiseAdd)) {
      total += raiseAdd;
      setTotalStake(total);
      Audio.click();
    }
    setRaiseAdd(0);

    if (phase === "preflop") {
      setCommunity(draw(deck, 3));
      setPhase("flop");
      Audio.tick();
    } else if (phase === "flop") {
      setCommunity((c) => [...c, ...draw(deck, 1)]);
      setPhase("turn");
      Audio.tick();
    } else if (phase === "turn") {
      setCommunity((c) => [...c, ...draw(deck, 1)]);
      setPhase("river");
      Audio.tick();
    } else if (phase === "river") {
      showdownHoldem(total);
    }
  }

  function showdownHoldem(total) {
    const full = community.length === 5 ? community : [...community, ...draw(deckRef.current, 5 - community.length)];
    setCommunity(full);
    const pScore = bestHand([...player, ...full]);
    const bScore = bestHand([...banca, ...full]);
    const cmp = compareScore(pScore, bScore);
    let outcome, prize;
    if (cmp > 0) {
      outcome = "win";
      prize = Math.round(total * HOLDEM_MULT[handTier(pScore)]);
      awardPoints(prize, `♠ Ganas con ${tierName(pScore)}: +${prize} pts`);
      Audio.win();
    } else if (cmp === 0) {
      outcome = "push";
      prize = total;
      awardPoints(prize, `Empate: recuperas ${prize} pts`);
    } else {
      outcome = "lose";
      prize = 0;
      Audio.lose();
    }
    setResult({ outcome, prize, pScore, bScore, total });
    setPhase("done");
  }

  function foldHoldem() {
    Audio.lose();
    const bScore = bestHand([...banca, ...community, ...draw(deckRef.current, Math.max(0, 5 - community.length))]);
    setResult({ outcome: "fold", prize: 0, pScore: null, bScore, total: totalStake });
    setPhase("done");
  }

  // ---------------- FIVE CARD DRAW (solo, tabla de pagos) ----------------
  function dealDraw() {
    if (stake < MIN_BET) return;
    if (!spendPoints(stake)) return;
    Audio.click();
    const deck = newDeck();
    deckRef.current = deck;
    const hand = draw(deck, 5);
    setPlayer(hand);
    setDraw5({ initial: [...hand], discarded: [] });
    setHeld(new Set());
    setResult(null);
    setPhase("draw");
  }

  function toggleHold(i) {
    if (phase !== "draw") return;
    Audio.tick();
    setHeld((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  function confirmDraw() {
    const deck = deckRef.current;
    const discarded = [];
    const finalHand = player.map((c, i) => {
      if (held.has(i)) return c;
      discarded.push(c);
      return draw(deck, 1)[0];
    });
    const score = evaluate5(finalHand);
    const tier = handTier(score);
    const prize = Math.round(stake * DRAW_MULT[tier]);
    if (prize > 0) {
      awardPoints(prize, `🃏 ${tierName(score)}: +${prize} pts`);
      Audio.win();
    } else {
      Audio.lose();
    }
    setPlayer(finalHand);
    setDraw5((d) => ({ ...d, discarded }));
    setResult({ outcome: prize > 0 ? "win" : "lose", prize, pScore: score });
    setPhase("done");
  }

  // ---------------- Render ----------------
  if (!variant) {
    return (
      <main className="mx-auto max-w-3xl p-3 sm:p-5">
        <button type="button" onClick={onBack} className="font-cond text-sm font-semibold text-dim hover:text-ink">← Cambiar modo</button>
        <div className="mt-2 rounded-2xl border-4 border-[#5d3a1a] bg-[radial-gradient(ellipse_at_top,#0f6b35,#0a4f27_70%)] p-6 text-center shadow-2xl shadow-black/60">
          <h1 className="font-display text-2xl text-white sm:text-3xl">♠ Póker en solitario (vs Banca)</h1>
          <p className="mx-auto mt-2 max-w-md font-cond text-white/85">Elige la variante. Apuestas puntos y cobras según la mano.</p>
          <p className="mt-2 font-cond text-sm text-white/70">Saldo: {points.toLocaleString("es-ES")} pts</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => pickVariant("holdem")}
              className="rounded-xl border border-white/20 bg-black/30 p-4 text-left transition hover:-translate-y-1 hover:border-signal-amber"
            >
              <div className="font-display text-lg text-signal-amber">Texas Hold'em</div>
              <p className="mt-1 font-cond text-sm text-white/80">2 cartas + 5 comunitarias. Compites contra la banca. Hasta ×100.</p>
            </button>
            <button
              type="button"
              onClick={() => pickVariant("draw")}
              className="rounded-xl border border-white/20 bg-black/30 p-4 text-left transition hover:-translate-y-1 hover:border-signal-amber"
            >
              <div className="font-display text-lg text-signal-amber">5 Cartas (Draw)</div>
              <p className="mt-1 font-cond text-sm text-white/80">5 cartas, cambias las que quieras una vez. Cobras por la mano final.</p>
            </button>
          </div>
        </div>
      </main>
    );
  }

  const mult = variant === "holdem" ? HOLDEM_MULT : DRAW_MULT;
  const myBest =
    variant === "holdem"
      ? player.length === 2 && community.length >= 3
        ? bestHand([...player, ...community])
        : null
      : player.length === 5 && phase !== "done"
        ? evaluate5(player)
        : null;

  const inBet = phase === "bet";
  const isDrawPhase = variant === "draw" && phase === "draw";

  return (
    <main className="mx-auto max-w-3xl p-3 sm:p-5">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setVariant(null)} className="font-cond text-sm font-semibold text-dim hover:text-ink">
          ← Cambiar variante
        </button>
        <span className="font-cond text-sm text-dim">{variant === "holdem" ? "Texas Hold'em" : "5 Cartas"}</span>
      </div>

      <div className="mt-2 rounded-2xl border-4 border-[#5d3a1a] bg-[radial-gradient(ellipse_at_top,#0f6b35,#0a4f27_70%)] p-3 shadow-2xl shadow-black/60 sm:p-5">
        <div className="mb-3 flex items-center justify-between rounded-lg bg-black/30 px-3 py-2">
          <div className="font-cond text-sm font-semibold text-white">Saldo: <span className="text-sodium">{points.toLocaleString("es-ES")}</span></div>
          <div className="font-cond text-sm font-semibold text-white">
            Apuesta: <span className="text-signal-amber">{(phase === "bet" ? stake : totalStake || stake).toLocaleString("es-ES")}</span>
          </div>
        </div>

        <GameHelp help={HELP[variant]} />

        {/* ---------- HOLD'EM: banca + comunitarias ---------- */}
        {variant === "holdem" ? (
          <>
            <section aria-label="Banca" className="mb-2 text-center">
              <div className="font-cond text-xs font-bold uppercase tracking-wide text-white/70">Banca</div>
              <div className="mt-1 flex justify-center gap-2">
                {banca.length === 0 ? (
                  <Card hidden />
                ) : (
                  banca.map((c, i) => (
                    <Card
                      key={`${c.rank}${c.suit}-${phase === "done"}`}
                      card={c}
                      hidden={phase !== "done"}
                      small
                      className={phase === "done" ? "anim-flip" : "anim-deal"}
                      style={{ animationDelay: `${i * 0.1}s` }}
                    />
                  ))
                )}
              </div>
            </section>

            <div className="my-3 flex min-h-20 items-center justify-center gap-2 rounded-lg bg-black/20 py-2 sm:min-h-24">
              {community.length === 0 ? (
                <span className="font-cond text-sm text-white/50">cartas comunitarias</span>
              ) : (
                community.map((c, i) => (
                  <Card key={`${c.rank}${c.suit}`} card={c} className="anim-deal" style={{ animationDelay: `${(i % 3) * 0.13}s` }} />
                ))
              )}
            </div>
          </>
        ) : null}

        {/* ---------- Resultado ---------- */}
        {result ? (
          <div
            className={`my-3 rounded-md px-3 py-2 text-center font-cond font-bold anim-pop ${
              result.outcome === "win"
                ? "bg-signal-green/20 text-lg text-signal-green ring-1 ring-signal-green/60 sm:text-xl"
                : result.outcome === "push"
                  ? "bg-signal-amber/20 text-signal-amber ring-1 ring-signal-amber/50"
                  : "bg-signal-red/20 text-signal-red ring-1 ring-signal-red/50"
            }`}
            role="status"
          >
            {result.outcome === "win" && `🏆 ¡Ganas ${result.prize} pts! · `}
            {result.outcome === "push" && `🤝 Empate, recuperas ${result.prize} pts · `}
            {result.outcome === "lose" && "❌ Pierdes la apuesta · "}
            {result.outcome === "fold" && "🏳 Te retiras, pierdes la apuesta · "}
            {result.pScore ? `Tu mano: ${tierName(result.pScore)}` : ""}
            {variant === "holdem" && result.bScore ? ` · Banca: ${tierName(result.bScore)}` : ""}
          </div>
        ) : null}

        {/* ---------- Tu mano ---------- */}
        <section aria-label="Tu mano" className="rounded-lg p-2">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-cond text-sm font-bold text-white">Tú</span>
            {myBest ? <span className="font-cond text-xs text-sodium">{tierName(myBest)}</span> : null}
          </div>
          <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
            {player.length === 0 ? (
              <span className="font-cond text-sm text-white/50">apuesta para repartir</span>
            ) : (
              player.map((c, i) => {
                const isHeld = held.has(i);
                return (
                  <button
                    key={`${c.rank}${c.suit}`}
                    type="button"
                    disabled={!isDrawPhase}
                    onClick={() => toggleHold(i)}
                    className={`anim-deal rounded-lg transition ${isDrawPhase ? "cursor-pointer hover:-translate-y-1" : "cursor-default"} ${
                      isDrawPhase && isHeld ? "-translate-y-2 ring-2 ring-signal-green" : ""
                    }`}
                    style={{ animationDelay: `${i * 0.09}s` }}
                  >
                    <Card card={c} />
                    {isDrawPhase ? (
                      <span className={`mt-0.5 block text-center font-cond text-[0.65rem] font-bold ${isHeld ? "text-signal-green" : "text-white/50"}`}>
                        {isHeld ? "🔒 FIJA" : "cambiar"}
                      </span>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* ---------- Resultado detallado del DRAW ---------- */}
        {variant === "draw" && phase === "done" ? (
          <div className="mt-2 rounded-lg bg-black/30 p-2 font-cond text-sm text-white/85">
            <div>Mano inicial: {draw5.initial.map((c) => c.rank + suitOf(c.suit).icon).join(" ")}</div>
            <div>Cambiadas: {draw5.discarded.length === 0 ? "ninguna" : draw5.discarded.map((c) => c.rank + suitOf(c.suit).icon).join(" ")}</div>
            <div className="font-bold text-sodium">Mano final: {tierName(result.pScore)}</div>
          </div>
        ) : null}

        {/* ---------- Controles ---------- */}
        <div className="mt-4">
          {inBet ? (
            <>
              <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Subir apuesta">
                {CHIPS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    disabled={stake + v > points}
                    onClick={() => addChip(v)}
                    className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-dashed border-white/40 bg-asphalt-800 font-cond text-sm font-bold text-white shadow-lg shadow-black/40 transition hover:-translate-y-0.5 disabled:opacity-30 sm:h-14 sm:w-14"
                  >
                    {v}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <button type="button" disabled={stake === 0} onClick={() => setStake(0)} className="min-h-11 flex-1 rounded-md border border-white/30 bg-black/30 px-3 font-cond font-semibold text-white hover:bg-black/50 disabled:opacity-40">
                  ✕ Limpiar
                </button>
                <button
                  type="button"
                  disabled={stake < MIN_BET || stake > points}
                  onClick={variant === "holdem" ? dealHoldem : dealDraw}
                  className="min-h-11 flex-[2] rounded-md bg-signal-amber px-3 font-cond text-lg font-bold text-[#1a1200] shadow-lg shadow-black/40 hover:brightness-110 disabled:opacity-40"
                >
                  REPARTIR · {stake} pts
                </button>
              </div>
              <p className="mt-2 text-center font-cond text-xs text-white/60">Apuesta {MIN_BET}–{MAX_BET} pts</p>
            </>
          ) : phase === "done" ? (
            <button
              type="button"
              onClick={resetTable}
              className="min-h-12 w-full rounded-md bg-signal-amber px-3 font-cond text-lg font-bold text-[#1a1200] shadow-lg shadow-black/40 hover:brightness-110"
            >
              🔄 Nueva mano
            </button>
          ) : isDrawPhase ? (
            <button type="button" onClick={confirmDraw} className="min-h-12 w-full rounded-md bg-signal-green px-3 font-cond text-lg font-bold text-[#06210f] shadow-lg shadow-black/40 hover:brightness-110">
              🔄 Cambiar {5 - held.size} carta{5 - held.size === 1 ? "" : "s"} y mostrar mano
            </button>
          ) : (
            // Hold'em: decisión de la fase (preflop/flop/turn/river)
            <div className="space-y-2">
              {/* Subir apuesta (opcional) */}
              {points > 0 ? (
                <div className="flex items-center gap-2 rounded-lg bg-black/30 p-2">
                  <span className="font-cond text-xs text-white/70">Subir:</span>
                  <input
                    type="range"
                    min={0}
                    max={Math.min(points, totalStake)}
                    step={MIN_BET}
                    value={raiseAdd}
                    onChange={(e) => setRaiseAdd(Number(e.target.value))}
                    className="flex-1 accent-signal-amber"
                  />
                  <span className="w-14 text-right font-cond text-sm font-bold text-signal-amber">+{raiseAdd}</span>
                </div>
              ) : null}
              <div className="flex gap-2">
                <button type="button" onClick={foldHoldem} className="min-h-12 flex-1 rounded-md bg-signal-red px-3 font-cond font-bold text-white shadow-lg shadow-black/40 hover:brightness-110">
                  🏳 Retirarse
                </button>
                <button type="button" onClick={continueHoldem} className="min-h-12 flex-[2] rounded-md bg-signal-green px-3 font-cond text-lg font-bold text-[#06210f] shadow-lg shadow-black/40 hover:brightness-110">
                  {raiseAdd > 0 ? `Subir +${raiseAdd} y ` : ""}
                  {phase === "river" ? "Ver manos" : "Continuar"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tabla de pagos */}
        <div className="mt-4">
          <div className="mb-1 font-cond text-xs font-bold uppercase tracking-wide text-white/60">Tabla de pagos</div>
          <Paytable mult={mult} />
        </div>
      </div>
    </main>
  );
}

// Selector de modo: en solitario (vs banca, tabla de pagos) o mesa con bots IA.
export function PokerPage() {
  const [mode, setMode] = useState(null);

  if (mode === "solo") return <SoloPoker onBack={() => setMode(null)} />;
  if (mode === "table") return <PokerTable onBack={() => setMode(null)} />;

  return (
    <main className="mx-auto max-w-3xl p-3 sm:p-5">
      <Link to="/" className="font-cond text-sm font-semibold text-dim hover:text-ink">← Volver al lobby</Link>
      <div className="mt-2 rounded-2xl border-4 border-[#5d3a1a] bg-[radial-gradient(ellipse_at_top,#0f6b35,#0a4f27_70%)] p-6 text-center shadow-2xl shadow-black/60">
        <h1 className="font-display text-2xl text-white sm:text-3xl">♠ Póker</h1>
        <p className="mx-auto mt-2 max-w-md font-cond text-white/85">¿Cómo quieres jugar?</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setMode("solo")}
            className="rounded-xl border border-white/20 bg-black/30 p-4 text-left transition hover:-translate-y-1 hover:border-signal-amber"
          >
            <div className="font-display text-lg text-signal-amber">🂠 En solitario</div>
            <p className="mt-1 font-cond text-sm text-white/80">Contra la banca con tabla de pagos por mano (×1 … ×100). Texas Hold'em o 5 Cartas.</p>
          </button>
          <button
            type="button"
            onClick={() => setMode("table")}
            className="rounded-xl border border-white/20 bg-black/30 p-4 text-left transition hover:-translate-y-1 hover:border-signal-amber"
          >
            <div className="font-display text-lg text-signal-amber">🤖 Contra la IA</div>
            <p className="mt-1 font-cond text-sm text-white/80">Mesa de 4 con 3 rivales IA: bote, ciegas, igualar/subir/retirarse. Texas Hold'em o 5 Cartas.</p>
          </button>
        </div>
      </div>
    </main>
  );
}
