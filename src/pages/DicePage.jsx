import { useEffect, useRef, useState } from "react";
import { useGameState, useGameActions } from "../context/GameContext";
import { Felt } from "../components/casino/Felt";
import { StakeBar } from "../components/casino/StakeBar";
import { Banner } from "../components/casino/Banner";
import { DICE_MARKETS, randInt } from "../engine/casino";
import * as Audio from "../engine/audio";

const PIPS = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

export function DicePage() {
  const { points } = useGameState();
  const { spendPoints, awardPoints } = useGameActions();

  const [stake, setStake] = useState(50);
  const [pick, setPick] = useState("high");
  const [dice, setDice] = useState([0, 0]);
  const [rolling, setRolling] = useState(false);
  const [message, setMessage] = useState(null);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  function roll() {
    if (rolling || stake < 10) return;
    if (!spendPoints(stake)) {
      setMessage({ kind: "lose", text: "No tienes puntos suficientes." });
      return;
    }
    setRolling(true);
    setMessage({ kind: "info", text: "🎲 Rodando…" });
    const a = randInt(6), b = randInt(6); // 0..5
    let ticks = 0;
    const spin = setInterval(() => {
      setDice([randInt(6), randInt(6)]);
      Audio.tick();
      if (++ticks > 9) clearInterval(spin);
    }, 80);

    timer.current = setTimeout(() => {
      clearInterval(spin);
      setDice([a, b]);
      setRolling(false);
      const sum = a + b + 2;
      const market = DICE_MARKETS[pick];
      const won = market.test(sum, a + 1, b + 1);
      if (won) {
        const payout = Math.round(stake * market.odds);
        awardPoints(payout, `🎲 Dados: ${sum} → +${payout} pts`);
        setMessage({ kind: "win", text: `Suma ${sum}. ¡Ganas ${payout} pts! (×${market.odds})` });
        Audio.win();
      } else {
        setMessage({ kind: "lose", text: `Suma ${sum}. Pierdes ${stake} pts.` });
        Audio.lose();
      }
    }, 900);
  }

  return (
    <Felt title="DADOS" icon="🎲" stake={stake} bg="#7a1f1f,#3a0d0d">
      <div className="flex justify-center gap-4">
        {dice.map((d, i) => (
          <div
            key={i}
            className={`flex h-24 w-24 items-center justify-center rounded-2xl bg-white text-7xl text-[#1a1a1a] shadow-xl shadow-black/50 ${
              rolling ? "animate-pulse" : ""
            }`}
            aria-label={`Dado ${i + 1}: ${d + 1}`}
          >
            {PIPS[d]}
          </div>
        ))}
      </div>

      <Banner message={message} />

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Mercado">
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
        Dos dados, suma del 2 al 12. Más/Menos de 7 paga ×2,3; el 7 exacto y los
        dobles pagan ×5.
      </p>
    </Felt>
  );
}
