import { useEffect, useRef, useState } from "react";
import { useGameState, useGameActions } from "../context/GameContext";
import { Felt } from "../components/casino/Felt";
import { StakeBar } from "../components/casino/StakeBar";
import { Banner } from "../components/casino/Banner";
import { DICE_MARKETS, randInt } from "../engine/casino";
import * as Audio from "../engine/audio";

// Posiciones de los puntos (rejilla 3×3) para cada cara del dado.
const PIP_LAYOUT = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

const diceCss = `
  @keyframes dietumble {
    0%   { transform: rotate(0) translateY(0) scale(1); }
    25%  { transform: rotate(-18deg) translateY(-10px) scale(1.06); }
    50%  { transform: rotate(14deg) translateY(4px) scale(0.97); }
    75%  { transform: rotate(-9deg) translateY(-5px) scale(1.03); }
    100% { transform: rotate(0) translateY(0) scale(1); }
  }
  .die-tumble { animation: dietumble 0.36s ease-in-out infinite; }
  @keyframes diepop { 0%{transform:scale(0.7)} 60%{transform:scale(1.12)} 100%{transform:scale(1)} }
  .die-pop { animation: diepop 0.32s ease-out; }
  @keyframes diewin { 0%,100%{box-shadow:0 0 0 0 rgba(46,224,111,0)} 50%{box-shadow:0 0 26px 4px rgba(46,224,111,0.75)} }
  .die-win { animation: diewin 0.9s ease-in-out infinite; }
`;

function Die({ value, rolling, win }) {
  const pips = PIP_LAYOUT[value] || [];
  return (
    <div
      className={`relative grid h-24 w-24 grid-cols-3 grid-rows-3 gap-0.5 rounded-2xl bg-gradient-to-br from-white to-[#e3e3e3] p-3 shadow-xl shadow-black/50 ${
        rolling ? "die-tumble" : "die-pop"
      } ${win && !rolling ? "die-win" : ""}`}
      style={{ border: "1px solid rgba(0,0,0,0.12)" }}
      aria-label={`Dado: ${value}`}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className="flex items-center justify-center">
          {pips.includes(i) ? (
            <span className="block h-3.5 w-3.5 rounded-full bg-[#c0392b] shadow-[inset_0_-1px_2px_rgba(0,0,0,0.45)]" />
          ) : null}
        </span>
      ))}
    </div>
  );
}

export function DicePage() {
  const { points } = useGameState();
  const { spendPoints, awardPoints } = useGameActions();

  const [stake, setStake] = useState(50);
  const [pick, setPick] = useState("high");
  const [dice, setDice] = useState([1, 1]);
  const [rolling, setRolling] = useState(false);
  const [won, setWon] = useState(false);
  const [message, setMessage] = useState(null);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const sum = dice[0] + dice[1];

  function roll() {
    if (rolling || stake < 10) return;
    if (!spendPoints(stake)) {
      setMessage({ kind: "lose", text: "No tienes puntos suficientes." });
      return;
    }
    setRolling(true);
    setWon(false);
    setMessage({ kind: "info", text: "🎲 Rodando…" });
    const a = randInt(6) + 1, b = randInt(6) + 1; // 1..6
    let ticks = 0;
    const spin = setInterval(() => {
      setDice([randInt(6) + 1, randInt(6) + 1]);
      Audio.tick();
      if (++ticks > 9) clearInterval(spin);
    }, 80);

    timer.current = setTimeout(() => {
      clearInterval(spin);
      setDice([a, b]);
      setRolling(false);
      const total = a + b;
      const market = DICE_MARKETS[pick];
      const isWin = market.test(total, a, b);
      if (isWin) {
        const payout = Math.round(stake * market.odds);
        setWon(true);
        awardPoints(payout, `🎲 Dados: ${total} → +${payout} pts`);
        setMessage({ kind: "win", text: `Suma ${total}. ¡Ganas ${payout} pts! (×${market.odds})` });
        Audio.win();
      } else {
        setMessage({ kind: "lose", text: `Suma ${total}. Pierdes ${stake} pts.` });
        Audio.lose();
      }
    }, 900);
  }

  return (
    <Felt title="DADOS" icon="🎲" stake={stake} bg="#7a1f1f,#3a0d0d">
      <style>{diceCss}</style>

      <div className="flex items-center justify-center gap-5">
        <Die value={dice[0]} rolling={rolling} win={won} />
        <Die value={dice[1]} rolling={rolling} win={won} />
      </div>

      <div className="mt-3 text-center">
        <span className="font-cond text-sm text-white/60">Suma</span>
        <div
          className={`font-display text-4xl tabular-nums ${
            rolling ? "text-white/70" : won ? "text-signal-green" : "text-signal-amber"
          }`}
        >
          {rolling ? "…" : sum}
        </div>
      </div>

      <Banner message={message} />

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Mercado">
        {Object.entries(DICE_MARKETS).map(([id, m]) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={pick === id}
            disabled={rolling}
            className={`min-h-14 rounded-md border px-2 font-cond text-sm font-bold transition disabled:opacity-40 ${
              pick === id
                ? "border-signal-amber bg-signal-amber/20 text-signal-amber ring-2 ring-signal-amber"
                : "border-white/30 bg-black/30 text-white hover:bg-black/50"
            }`}
            onClick={() => {
              setPick(id);
              Audio.click();
            }}
          >
            {m.label}
            <span className="block text-xs text-white/60">×{m.odds}</span>
          </button>
        ))}
      </div>

      <StakeBar stake={stake} setStake={setStake} points={points} disabled={rolling} />

      <button
        type="button"
        disabled={rolling || stake < 10 || stake > points}
        className="mt-3 min-h-12 w-full rounded-md bg-signal-amber px-3 font-cond text-lg font-bold text-[#1a1200] shadow-lg shadow-black/40 hover:brightness-110 disabled:opacity-40"
        onClick={roll}
      >
        {rolling ? "Rodando…" : `TIRAR · ${stake} pts`}
      </button>

      <p className="mt-4 text-center font-cond text-xs text-white/60">
        Dos dados, suma del 2 al 12. Más/Menos de 7 y par/impar pagan cerca de ×2;
        el 7, los dobles y el campo pagan más; los extremos (menos de 4 o más de 10)
        pagan ×11.
      </p>
    </Felt>
  );
}
