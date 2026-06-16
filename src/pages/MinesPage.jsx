import { useState } from "react";
import { useGameState, useGameActions } from "../context/GameContext";
import { Felt } from "../components/casino/Felt";
import { StakeBar } from "../components/casino/StakeBar";
import { Banner } from "../components/casino/Banner";
import { minesMultiplier, shuffle } from "../engine/casino";
import * as Audio from "../engine/audio";

const TOTAL = 25;
const MINE_OPTIONS = [1, 3, 5, 8, 12];

export function MinesPage() {
  const { points } = useGameState();
  const { spendPoints, awardPoints } = useGameActions();

  const [stake, setStake] = useState(50);
  const [mines, setMines] = useState(3);
  const [phase, setPhase] = useState("bet"); // bet | playing
  const [mineSet, setMineSet] = useState(() => new Set());
  const [revealed, setRevealed] = useState(() => new Set());
  const [boom, setBoom] = useState(-1);
  const [message, setMessage] = useState(null);

  const picks = revealed.size;
  const multiplier = minesMultiplier(picks, mines);
  const nextMult = minesMultiplier(picks + 1, mines);
  const pot = Math.round(stake * multiplier);

  function start() {
    if (stake < 10) return;
    if (!spendPoints(stake)) {
      setMessage({ kind: "lose", text: "No tienes puntos suficientes." });
      return;
    }
    const idx = shuffle(Array.from({ length: TOTAL }, (_, i) => i)).slice(0, mines);
    setMineSet(new Set(idx));
    setRevealed(new Set());
    setBoom(-1);
    setPhase("playing");
    setMessage({ kind: "info", text: "Descubre gemas. Cada acierto sube el premio." });
    Audio.click();
  }

  function endLoss(hitIndex) {
    setBoom(hitIndex);
    setPhase("bet");
    setMessage({ kind: "lose", text: `💥 ¡Mina! Pierdes ${stake} pts.` });
    Audio.lose();
  }

  function cashOut() {
    if (phase !== "playing" || picks === 0) return;
    awardPoints(pot, `💣 Minas: ×${multiplier} → +${pot} pts`);
    setMessage({ kind: "win", text: `💰 Cobras ${pot} pts (×${multiplier}) con ${picks} gemas.` });
    setBoom(-2); // revela todo sin estallido
    setPhase("bet");
  }

  function click(i) {
    if (phase !== "playing" || revealed.has(i)) return;
    if (mineSet.has(i)) {
      endLoss(i);
      return;
    }
    Audio.tick();
    const next = new Set(revealed);
    next.add(i);
    setRevealed(next);
    const safe = TOTAL - mines;
    if (next.size === safe) {
      // Todas las gemas descubiertas: cobro automático.
      const finalMult = minesMultiplier(next.size, mines);
      const finalPot = Math.round(stake * finalMult);
      awardPoints(finalPot, `💣 Minas: ¡pleno! ×${finalMult} → +${finalPot} pts`);
      setMessage({ kind: "win", text: `🏆 ¡Todas las gemas! Cobras ${finalPot} pts.` });
      setBoom(-2);
      setPhase("bet");
      Audio.win();
    }
  }

  const ended = phase === "bet" && boom !== -1;

  return (
    <Felt
      title="MINAS"
      icon="💣"
      stake={phase === "bet" ? stake : pot}
      bg="#23304a,#0c1322"
      help={
        <ul className="list-disc space-y-1 pl-4">
          <li>Tablero con casillas; algunas esconden minas.</li>
          <li>Cada casilla segura que destapas sube el multiplicador del bote.</li>
          <li>Retírate cuando quieras para cobrar. Si tocas una mina, pierdes todo.</li>
        </ul>
      }
    >
      {phase === "playing" ? (
        <p className="mb-2 text-center font-cond text-sm text-white/80">
          Actual ×{multiplier} · siguiente ×{nextMult} · {mines} minas
        </p>
      ) : null}

      <div className="mx-auto grid max-w-sm grid-cols-5 gap-1.5" role="grid" aria-label="Cuadrícula de minas">
        {Array.from({ length: TOTAL }, (_, i) => {
          const isRevealed = revealed.has(i);
          const showAll = ended || boom === -2;
          const isMine = mineSet.has(i);
          let content = "";
          if (isRevealed) content = "💎";
          else if (showAll && isMine) content = i === boom ? "💥" : "💣";
          else if (showAll) content = "💎";
          return (
            <button
              key={i}
              type="button"
              disabled={phase !== "playing" || isRevealed}
              className={`flex aspect-square items-center justify-center rounded-md border text-2xl transition ${
                isRevealed
                  ? "border-signal-green/60 bg-signal-green/20"
                  : showAll
                    ? isMine
                      ? "border-signal-red/60 bg-signal-red/20"
                      : "border-white/10 bg-white/5 opacity-60"
                    : "cursor-pointer border-asphalt-600 bg-asphalt-700 hover:bg-asphalt-600"
              }`}
              onClick={() => click(i)}
              aria-label={isRevealed ? "Gema" : "Casilla oculta"}
            >
              {content}
            </button>
          );
        })}
      </div>

      <Banner message={message} />

      {phase === "playing" ? (
        <button
          type="button"
          disabled={picks === 0}
          className="mt-3 min-h-12 w-full rounded-md bg-signal-green px-3 font-cond text-lg font-bold text-[#06210f] shadow-lg shadow-black/40 hover:brightness-110 disabled:opacity-40"
          onClick={cashOut}
        >
          💰 Cobrar {pot.toLocaleString("es-ES")} pts (×{multiplier})
        </button>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2" role="radiogroup" aria-label="Número de minas">
            <span className="font-cond text-sm text-white/70">Minas:</span>
            {MINE_OPTIONS.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mines === m}
                className={`min-h-10 min-w-10 rounded-md border px-3 font-cond font-bold transition ${
                  mines === m
                    ? "border-signal-amber bg-signal-amber/20 text-signal-amber ring-2 ring-signal-amber"
                    : "border-white/30 bg-black/30 text-white hover:bg-black/50"
                }`}
                onClick={() => {
                  setMines(m);
                  Audio.click();
                }}
              >
                {m}
              </button>
            ))}
          </div>
          <StakeBar stake={stake} setStake={setStake} points={points} />
          <button
            type="button"
            disabled={stake < 10 || stake > points}
            className="mt-3 min-h-12 w-full rounded-md bg-signal-amber px-3 font-cond text-lg font-bold text-[#1a1200] shadow-lg shadow-black/40 hover:brightness-110 disabled:opacity-40"
            onClick={start}
          >
            EMPEZAR · {stake} pts
          </button>
        </>
      )}

      <p className="mt-4 text-center font-cond text-xs text-white/60">
        Destapa gemas evitando las minas. Cada gema sube el multiplicador; cobra
        cuando quieras. Una mina y pierdes la apuesta. Más minas = más premio.
      </p>
    </Felt>
  );
}
