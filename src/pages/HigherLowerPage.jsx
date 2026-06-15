import { useState } from "react";
import { useGameState, useGameActions } from "../context/GameContext";
import { Felt } from "../components/casino/Felt";
import { StakeBar } from "../components/casino/StakeBar";
import { Banner } from "../components/casino/Banner";
import { higherLowerOdds, randInt } from "../engine/casino";
import * as Audio from "../engine/audio";

const SUITS = ["♠", "♥", "♦", "♣"];
function rankLabel(v) {
  return { 11: "J", 12: "Q", 13: "K", 14: "A" }[v] || String(v);
}
function freshDeck() {
  // counts[2..14] = 4 cartas de cada valor.
  const counts = Array(15).fill(0);
  for (let v = 2; v <= 14; v++) counts[v] = 4;
  return counts;
}
function drawFrom(counts) {
  const remaining = counts.reduce((a, b) => a + b, 0);
  let r = randInt(remaining);
  for (let v = 2; v <= 14; v++) {
    r -= counts[v];
    if (r < 0) {
      counts[v]--;
      return v;
    }
  }
  return 14;
}

function Card({ value, suit, hidden }) {
  const red = suit === "♥" || suit === "♦";
  return (
    <div
      className={`flex h-36 w-26 flex-col items-center justify-center rounded-xl border-2 border-[#caa84a]/70 bg-white shadow-xl shadow-black/50 ${
        hidden ? "text-5xl" : ""
      }`}
      style={{ width: "6.5rem" }}
      aria-label={hidden ? "Carta oculta" : `${rankLabel(value)} de ${suit}`}
    >
      {hidden ? (
        <span className="text-5xl">🂠</span>
      ) : (
        <span className={`font-display text-4xl ${red ? "text-[#c0392b]" : "text-[#1a1a1a]"}`}>
          {rankLabel(value)}
          <span className="block text-center text-3xl">{suit}</span>
        </span>
      )}
    </div>
  );
}

export function HigherLowerPage() {
  const { points } = useGameState();
  const { spendPoints, awardPoints } = useGameActions();

  const [stake, setStake] = useState(50);
  const [phase, setPhase] = useState("bet"); // bet | playing
  const [counts, setCounts] = useState(freshDeck);
  const [current, setCurrent] = useState(7);
  const [suit, setSuit] = useState("♠");
  const [pot, setPot] = useState(0);
  const [streak, setStreak] = useState(0);
  const [message, setMessage] = useState(null);

  const remaining = counts.reduce((a, b) => a + b, 0);
  const oddsHi = higherLowerOdds(current, "higher", counts, remaining);
  const oddsLo = higherLowerOdds(current, "lower", counts, remaining);

  function deal() {
    if (stake < 10) return;
    if (!spendPoints(stake)) {
      setMessage({ kind: "lose", text: "No tienes puntos suficientes." });
      return;
    }
    const deck = freshDeck();
    const first = drawFrom(deck);
    setCounts(deck);
    setCurrent(first);
    setSuit(SUITS[randInt(4)]);
    setPot(stake);
    setStreak(0);
    setPhase("playing");
    setMessage({ kind: "info", text: "¿La siguiente será mayor o menor?" });
    Audio.click();
  }

  function guess(dir) {
    const odds = dir === "higher" ? oddsHi : oddsLo;
    if (odds <= 0) return;
    const deck = [...counts];
    const next = drawFrom(deck);
    Audio.tick();
    const correct = dir === "higher" ? next > current : next < current;
    setCurrent(next);
    setSuit(SUITS[randInt(4)]);
    setCounts(deck);

    if (correct) {
      const newPot = Math.round(pot * odds);
      setPot(newPot);
      setStreak((s) => s + 1);
      Audio.win();
      if (deck.reduce((a, b) => a + b, 0) === 0) {
        awardPoints(newPot, `🔼 Mayor/Menor: +${newPot} pts`);
        setMessage({ kind: "win", text: `¡Mazo agotado! Cobras ${newPot} pts.` });
        setPhase("bet");
      } else {
        setMessage({ kind: "win", text: `¡${rankLabel(next)}! Bote ${newPot} pts. Sigue o cobra.` });
      }
    } else {
      setPot(0);
      setStreak(0);
      setPhase("bet");
      setMessage({ kind: "lose", text: `Salió ${rankLabel(next)}. Pierdes el bote.` });
      Audio.lose();
    }
  }

  function cashOut() {
    if (pot <= 0) return;
    awardPoints(pot, `🔼 Mayor/Menor: +${pot} pts`);
    setMessage({ kind: "win", text: `Cobras ${pot} pts tras ${streak} acierto${streak !== 1 ? "s" : ""}. 🎉` });
    setPot(0);
    setStreak(0);
    setPhase("bet");
  }

  return (
    <Felt title="MAYOR / MENOR" icon="🔼" stake={phase === "bet" ? stake : pot} bg="#0f6b35,#0a3f22">
      <div className="flex flex-col items-center gap-3">
        <Card value={current} suit={suit} />
        {phase === "playing" ? (
          <p className="font-cond text-sm text-white/70">
            Quedan {remaining} cartas · racha {streak}
          </p>
        ) : null}
      </div>

      <Banner message={message} />

      {phase === "bet" ? (
        <>
          <StakeBar stake={stake} setStake={setStake} points={points} />
          <button
            type="button"
            disabled={stake < 10 || stake > points}
            className="mt-3 min-h-12 w-full rounded-md bg-signal-amber px-3 font-cond text-lg font-bold text-[#1a1200] shadow-lg shadow-black/40 hover:brightness-110 disabled:opacity-40"
            onClick={deal}
          >
            REPARTIR · {stake} pts
          </button>
        </>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={oddsHi <= 0}
            className="min-h-16 rounded-md bg-signal-green px-3 font-cond text-base font-bold text-[#06210f] shadow-lg shadow-black/40 hover:brightness-110 disabled:opacity-30"
            onClick={() => guess("higher")}
          >
            🔼 Mayor
            <span className="block text-sm">×{oddsHi || "—"}</span>
          </button>
          <button
            type="button"
            disabled={oddsLo <= 0}
            className="min-h-16 rounded-md bg-signal-red px-3 font-cond text-base font-bold text-white shadow-lg shadow-black/40 hover:brightness-110 disabled:opacity-30"
            onClick={() => guess("lower")}
          >
            🔽 Menor
            <span className="block text-sm">×{oddsLo || "—"}</span>
          </button>
          <button
            type="button"
            className="col-span-2 min-h-12 rounded-md border border-signal-amber/60 bg-signal-amber/15 px-3 font-cond text-lg font-bold text-signal-amber hover:bg-signal-amber/25"
            onClick={cashOut}
          >
            💰 Cobrar {pot.toLocaleString("es-ES")} pts
          </button>
        </div>
      )}

      <p className="mt-4 text-center font-cond text-xs text-white/60">
        Adivina si la próxima carta es mayor o menor. Cada acierto multiplica el
        bote según las cartas que quedan. Empate cuenta como fallo.
      </p>
    </Felt>
  );
}
