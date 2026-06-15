import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useGameState, useGameActions } from "../context/GameContext";
import {
  SUITS,
  BAC_LIMITS,
  newShoe,
  playRound,
  settle,
} from "../engine/baccarat";
import * as Audio from "../engine/audio";

const CHIPS = [
  { value: 10, bg: "#e8e4d8", text: "#1a1a1a", ring: "#b8b4a8" },
  { value: 25, bg: "#2ee06f", text: "#06210f", ring: "#1a8a44" },
  { value: 50, bg: "#3b82f6", text: "#ffffff", ring: "#1d4ed8" },
  { value: 100, bg: "#1b1f26", text: "#ffffff", ring: "#4a4f58" },
  { value: 250, bg: "#f97316", text: "#1a0a00", ring: "#c2410c" },
];

const BETS = [
  { id: "player", label: "Player", pay: "Paga 1:1", color: "#3b82f6" },
  { id: "banker", label: "Banker", pay: "Paga 1:1 (−5%)", color: "#dc2626" },
  { id: "tie", label: "Tie", pay: "Paga 8:1", color: "#16a34a" },
];

const DEAL_MS = 600;

function suitOf(id) {
  return SUITS.find((s) => s.id === id);
}

function PlayingCard({ card }) {
  const suit = suitOf(card.suit);
  return (
    <div
      className="relative flex h-20 w-14 items-center justify-center rounded-lg border border-black/20 bg-gradient-to-br from-white to-[#e8e4d8] shadow-lg shadow-black/50 sm:h-24 sm:w-[4.2rem]"
      aria-label={`${card.rank} de ${suit.icon}`}
    >
      <span
        className={`absolute left-1 top-0.5 font-cond text-sm font-bold ${
          suit.red ? "text-[#c0392b]" : "text-[#1b1f26]"
        }`}
      >
        {card.rank}
      </span>
      <span className={`text-2xl sm:text-3xl ${suit.red ? "text-[#c0392b]" : "text-[#1b1f26]"}`}>
        {suit.icon}
      </span>
      <span
        className={`absolute bottom-0.5 right-1 rotate-180 font-cond text-sm font-bold ${
          suit.red ? "text-[#c0392b]" : "text-[#1b1f26]"
        }`}
      >
        {card.rank}
      </span>
    </div>
  );
}

function Hand({ title, cards, score, won }) {
  return (
    <section
      aria-label={title}
      className={won ? "rounded-lg bg-white/5 p-2 ring-1 ring-sodium/70" : "p-2"}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <h2 className="font-cond text-sm font-semibold uppercase tracking-wide text-white/80">
          {title}
        </h2>
        {score !== null ? (
          <span className="rounded-full bg-black/40 px-2 py-0.5 font-cond text-sm font-bold text-sodium">
            {score}
          </span>
        ) : null}
      </div>
      <div className="flex min-h-20 flex-wrap gap-2 sm:min-h-24">
        {cards.map((c, i) => (
          <PlayingCard key={i} card={c} />
        ))}
      </div>
    </section>
  );
}

const WINNER_LABEL = { player: "Player", banker: "Banker", tie: "Empate (Tie)" };

export function BaccaratPage() {
  const { points } = useGameState();
  const { spendPoints, awardPoints } = useGameActions();

  const [bet, setBet] = useState(null);
  const [stake, setStake] = useState(0);
  const [round, setRound] = useState(null); // resultado de playRound
  const [reveal, setReveal] = useState(false); // muestra cartas tras pausa
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  const shoeRef = useRef(null);
  const timersRef = useRef([]);

  useEffect(() => {
    return () => {
      for (const t of timersRef.current) clearTimeout(t);
    };
  }, []);

  function getShoe() {
    if (!shoeRef.current || shoeRef.current.length < 16) {
      shoeRef.current = newShoe();
    }
    return shoeRef.current;
  }

  function addChip(v) {
    Audio.click();
    setStake((s) => Math.min(points, BAC_LIMITS.max, s + v));
  }

  function deal() {
    if (busy) return;
    if (!bet) {
      setMessage({ kind: "lose", text: "Elige Player, Banker o Tie." });
      return;
    }
    if (stake < BAC_LIMITS.min) {
      setMessage({ kind: "lose", text: `Apuesta mínima: ${BAC_LIMITS.min} pts.` });
      return;
    }
    if (!spendPoints(stake)) {
      setMessage({ kind: "lose", text: "No tienes puntos suficientes." });
      return;
    }
    Audio.click();
    const result = playRound(getShoe());
    setRound(result);
    setReveal(false);
    setMessage(null);
    setBusy(true);

    timersRef.current.push(
      setTimeout(() => {
        Audio.tick();
        setReveal(true);
        const payout = settle(bet, result.winner, stake);
        if (payout > 0) awardPoints(payout, `🀄 Baccarat: +${payout} pts`);

        const win = bet === result.winner;
        const push = result.winner === "tie" && bet !== "tie";
        if (win) {
          Audio.win();
          setMessage({
            kind: "win",
            text: `Gana ${WINNER_LABEL[result.winner]} · +${payout - stake} pts (retorno ${payout}).`,
          });
        } else if (push) {
          setMessage({
            kind: "info",
            text: `Empate: tu apuesta a ${WINNER_LABEL[bet]} se devuelve (${payout} pts).`,
          });
        } else {
          Audio.lose();
          setMessage({
            kind: "lose",
            text: `Gana ${WINNER_LABEL[result.winner]} · pierdes ${stake} pts.`,
          });
        }
        setBusy(false);
      }, DEAL_MS)
    );
  }

  function newGame() {
    Audio.click();
    setRound(null);
    setReveal(false);
    setMessage(null);
  }

  const showCards = round && reveal;
  const playerWon = showCards && round.winner === "player";
  const bankerWon = showCards && round.winner === "banker";

  return (
    <main className="mx-auto max-w-3xl p-3 sm:p-5">
      <Link to="/" className="font-cond text-sm font-semibold text-dim hover:text-ink">
        ← Volver al lobby
      </Link>

      <div className="mt-2 rounded-2xl border-4 border-[#5d3a1a] bg-[radial-gradient(ellipse_at_top,#0f6b35,#0a4f27_70%)] p-3 shadow-2xl shadow-black/60 sm:p-5">
        <div className="mb-3 flex items-center justify-between rounded-lg bg-black/30 px-3 py-2">
          <div className="font-cond text-sm font-semibold text-white sm:text-base">
            Saldo: <span className="text-sodium">{points.toLocaleString("es-ES")} pts</span>
          </div>
          <div className="font-cond text-sm font-semibold text-white sm:text-base">
            Apuesta:{" "}
            <span className="text-signal-amber">
              {stake.toLocaleString("es-ES")} pts {bet ? `· ${WINNER_LABEL[bet]}` : ""}
            </span>
          </div>
        </div>

        <p className="mb-3 text-center font-cond text-xs uppercase tracking-widest text-white/60">
          Punto Banco · Player 1:1 · Banker 1:1 (−5%) · Tie 8:1 · Mesa {BAC_LIMITS.min}–
          {BAC_LIMITS.max} pts
        </p>

        <div className="grid grid-cols-2 gap-4">
          <Hand
            title="Player"
            cards={showCards ? round.player : []}
            score={showCards ? round.playerScore : null}
            won={playerWon}
          />
          <Hand
            title="Banker"
            cards={showCards ? round.banker : []}
            score={showCards ? round.bankerScore : null}
            won={bankerWon}
          />
        </div>

        {message !== null ? (
          <p
            className={`mt-4 rounded-md bg-black/40 px-3 py-2 text-center font-cond font-semibold ${
              message.kind === "win"
                ? "text-signal-green"
                : message.kind === "info"
                  ? "text-signal-amber"
                  : "text-signal-red"
            }`}
            role="status"
          >
            {message.text}
          </p>
        ) : null}

        {/* Selección de apuesta */}
        <div className="mt-4 grid grid-cols-3 gap-2" role="group" aria-label="Tipo de apuesta">
          {BETS.map((b) => (
            <button
              key={b.id}
              type="button"
              disabled={busy}
              onClick={() => {
                Audio.click();
                setBet(b.id);
              }}
              className={`min-h-16 rounded-lg border-2 px-2 py-2 font-cond font-bold text-white transition disabled:opacity-40 ${
                bet === b.id ? "ring-2 ring-white" : ""
              }`}
              style={{ background: `${b.color}cc`, borderColor: b.color }}
            >
              <span className="block text-base">{b.label}</span>
              <span className="block text-xs font-semibold text-white/80">{b.pay}</span>
            </button>
          ))}
        </div>

        {/* Fichas */}
        <div className="mt-4 flex flex-wrap justify-center gap-2" role="group" aria-label="Subir apuesta">
          {CHIPS.map((c) => (
            <button
              key={c.value}
              type="button"
              disabled={busy}
              aria-label={`Sumar ficha de ${c.value} puntos`}
              className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-dashed font-cond text-sm font-bold shadow-lg shadow-black/40 transition hover:-translate-y-0.5 disabled:opacity-40 sm:h-14 sm:w-14 sm:text-base"
              style={{ background: c.bg, color: c.text, borderColor: c.ring }}
              onClick={() => addChip(c.value)}
            >
              {c.value}
            </button>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={stake === 0 || busy}
            className="min-h-11 flex-1 rounded-md border border-white/30 bg-black/30 px-3 font-cond font-semibold text-white hover:bg-black/50 disabled:opacity-40"
            onClick={() => setStake(0)}
          >
            ✕ Limpiar
          </button>
          {round && !busy ? (
            <button
              type="button"
              className="min-h-11 flex-1 rounded-md border border-white/30 bg-black/30 px-3 font-cond font-semibold text-white hover:bg-black/50"
              onClick={newGame}
            >
              🔄 Otra ronda
            </button>
          ) : null}
          <button
            type="button"
            disabled={!bet || stake < BAC_LIMITS.min || stake > points || busy}
            className="min-h-11 flex-[2] rounded-md bg-signal-amber px-3 font-cond text-lg font-bold text-[#1a1200] shadow-lg shadow-black/40 hover:brightness-110 disabled:opacity-40"
            onClick={deal}
          >
            REPARTIR · {stake} pts
          </button>
        </div>
      </div>
    </main>
  );
}
