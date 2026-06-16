import { useEffect, useRef, useState } from "react";
import { useGameState, useGameActions } from "../context/GameContext";
import { Felt } from "../components/casino/Felt";
import { StakeBar } from "../components/casino/StakeBar";
import { Banner } from "../components/casino/Banner";
import * as Audio from "../engine/audio";

const SIDES = {
  cara: { label: "CARA", face: "👑", bg: "#caa84a" },
  cruz: { label: "CRUZ", face: "⚓", bg: "#9aa0a8" },
};

export function CoinflipPage() {
  const { points } = useGameState();
  const { spendPoints, awardPoints } = useGameActions();

  const [stake, setStake] = useState(50);
  const [pot, setPot] = useState(0); // ganancia acumulada si cobras ahora
  const [phase, setPhase] = useState("bet"); // bet | playing
  const [flipping, setFlipping] = useState(false);
  const [coin, setCoin] = useState("cara"); // cara visible
  const [wins, setWins] = useState(0);
  const [message, setMessage] = useState(null);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  function flip(choice, risk) {
    setFlipping(true);
    setMessage({ kind: "info", text: "Girando la moneda…" });
    Audio.click();
    const result = Math.random() < 0.5 ? "cara" : "cruz";
    // Animación: la cara cambia rápido y se fija en el resultado.
    let ticks = 0;
    const spin = setInterval(() => {
      setCoin((c) => (c === "cara" ? "cruz" : "cara"));
      Audio.tick();
      if (++ticks > 8) clearInterval(spin);
    }, 90);

    timer.current = setTimeout(() => {
      clearInterval(spin);
      setCoin(result);
      setFlipping(false);
      if (result === choice) {
        const newPot = risk * 2;
        setPot(newPot);
        setWins((w) => w + 1);
        setPhase("playing");
        setMessage({ kind: "win", text: `¡${SIDES[result].label}! Llevas ${newPot} pts. Cobra o dobla.` });
        Audio.win();
      } else {
        setPot(0);
        setWins(0);
        setPhase("bet");
        setMessage({ kind: "lose", text: `Salió ${SIDES[result].label}. Pierdes ${risk} pts.` });
        Audio.lose();
      }
    }, 950);
  }

  function start(choice) {
    if (flipping || stake < 10) return;
    if (!spendPoints(stake)) {
      setMessage({ kind: "lose", text: "No tienes puntos suficientes." });
      return;
    }
    flip(choice, stake);
  }

  function cashOut() {
    if (flipping || pot <= 0) return;
    awardPoints(pot, `🪙 Doble o nada: +${pot} pts`);
    setMessage({ kind: "win", text: `Cobras ${pot} pts tras ${wins} acierto${wins > 1 ? "s" : ""}. 🎉` });
    setPot(0);
    setWins(0);
    setPhase("bet");
  }

  const face = SIDES[coin];

  return (
    <Felt
      title="DOBLE O NADA"
      icon="🪙"
      stake={phase === "bet" ? stake : pot}
      bg="#1d4ed8,#0a1f4f"
      help={
        <ul className="list-disc space-y-1 pl-4">
          <li>Elige cara o cruz y lanza la moneda.</li>
          <li>Si aciertas, duplicas el bote y puedes volver a lanzar o retirarte para cobrar.</li>
          <li>Si fallas, pierdes el bote.</li>
        </ul>
      }
    >
      <div className="flex flex-col items-center gap-4">
        <div
          className={`flex h-28 w-28 items-center justify-center rounded-full border-4 border-white/40 text-5xl shadow-xl shadow-black/50 transition-transform duration-150 sm:h-32 sm:w-32 ${
            flipping ? "scale-110" : ""
          }`}
          style={{ background: `radial-gradient(circle at 35% 30%, #fff8, ${face.bg})` }}
          aria-label={`Moneda: ${face.label}`}
        >
          {face.face}
        </div>

        {phase === "playing" ? (
          <p className="font-cond text-lg font-bold text-signal-green">
            🔥 Racha de {wins} · bote {pot.toLocaleString("es-ES")} pts
          </p>
        ) : null}
      </div>

      <Banner message={message} />

      {phase === "bet" ? (
        <>
          <StakeBar stake={stake} setStake={setStake} points={points} disabled={flipping} />
          <div className="mt-4 grid grid-cols-2 gap-3">
            {Object.entries(SIDES).map(([id, s]) => (
              <button
                key={id}
                type="button"
                disabled={flipping || stake < 10 || stake > points}
                className="min-h-14 rounded-md bg-signal-amber px-3 font-cond text-lg font-bold text-[#1a1200] shadow-lg shadow-black/40 hover:brightness-110 disabled:opacity-40"
                onClick={() => start(id)}
              >
                {s.face} {s.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={flipping}
            className="min-h-14 rounded-md bg-signal-green px-3 font-cond text-lg font-bold text-[#06210f] shadow-lg shadow-black/40 hover:brightness-110 disabled:opacity-40"
            onClick={cashOut}
          >
            💰 Cobrar {pot}
          </button>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(SIDES).map(([id, s]) => (
              <button
                key={id}
                type="button"
                disabled={flipping}
                className="min-h-14 rounded-md border border-white/30 bg-black/30 px-2 font-cond font-bold text-white hover:bg-black/50 disabled:opacity-40"
                onClick={() => flip(id, pot)}
                aria-label={`Doblar a ${s.label}`}
              >
                {s.face}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="mt-4 text-center font-cond text-xs text-white/60">
        Acierta cara o cruz para doblar. Sigue doblando cuanto te atrevas o cóbralo
        antes de fallar — un fallo y pierdes todo el bote.
      </p>
    </Felt>
  );
}
