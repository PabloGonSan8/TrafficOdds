import { useEffect, useRef, useState } from "react";
import { useGameState, useGameActions } from "../context/GameContext";
import { Felt } from "../components/casino/Felt";
import { StakeBar } from "../components/casino/StakeBar";
import { Banner } from "../components/casino/Banner";
import { RACERS, RACE_ODDS } from "../engine/casino";
import * as Audio from "../engine/audio";

const W = 640, H = 220;
const START_X = 36, FINISH_X = W - 30;
const LANE_Y = RACERS.map((_, i) => 38 + i * 48);

export function RacePage() {
  const { points } = useGameState();
  const { spendPoints, awardPoints } = useGameActions();

  const [stake, setStake] = useState(50);
  const [pick, setPick] = useState("coche");
  const [racing, setRacing] = useState(false);
  const [message, setMessage] = useState(null);

  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const posRef = useRef(RACERS.map(() => START_X));
  const lastRef = useRef(0);
  const lastTickRef = useRef(0);
  const pickRef = useRef(pick);
  pickRef.current = pick;

  useEffect(() => {
    paint();
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function paint() {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#11141a";
    ctx.fillRect(0, 0, W, H);

    // Carriles
    for (let i = 0; i < RACERS.length; i++) {
      const y = LANE_Y[i];
      ctx.fillStyle = i % 2 ? "#191d23" : "#1d222a";
      ctx.fillRect(0, y - 22, W, 44);
      const highlight = RACERS[i].id === pickRef.current;
      if (highlight) {
        ctx.fillStyle = "rgba(255,176,32,0.10)";
        ctx.fillRect(0, y - 22, W, 44);
      }
    }

    // Meta a cuadros
    ctx.fillStyle = "#e8e4d8";
    for (let yy = 0; yy < H; yy += 12) {
      for (let xx = 0; xx < 12; xx += 6) {
        if (((yy / 12) + (xx / 6)) % 2 === 0) ctx.fillRect(FINISH_X + xx, yy, 6, 12);
      }
    }

    // Vehículos: los emoji miran a la izquierda, así que se voltean en
    // horizontal para que apunten hacia la meta (sentido de la marcha).
    ctx.font = "26px serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    RACERS.forEach((r, i) => {
      ctx.save();
      ctx.translate(posRef.current[i], LANE_Y[i]);
      ctx.scale(-1, 1);
      ctx.fillText(r.emoji, 0, 0);
      ctx.restore();
    });
  }

  function step(now) {
    const dt = Math.min(0.05, (now - lastRef.current) / 1000);
    lastRef.current = now;
    let winner = -1;
    for (let i = 0; i < RACERS.length; i++) {
      // Velocidad base + ráfaga aleatoria grande: el orden cambia mucho.
      const v = 45 + Math.random() * 105;
      posRef.current[i] += v * dt;
      if (posRef.current[i] >= FINISH_X && winner === -1) winner = i;
    }
    if (now - lastTickRef.current > 110) {
      Audio.tick();
      lastTickRef.current = now;
    }
    paint();
    if (winner !== -1) {
      finish(winner);
      return;
    }
    rafRef.current = requestAnimationFrame(step);
  }

  function finish(winnerIdx) {
    cancelAnimationFrame(rafRef.current);
    posRef.current[winnerIdx] = FINISH_X;
    paint();
    setRacing(false);
    const winner = RACERS[winnerIdx];
    if (winner.id === pickRef.current) {
      const payout = Math.round(stake * RACE_ODDS);
      awardPoints(payout, `🏁 Carrera: ${winner.emoji} → +${payout} pts`);
      setMessage({ kind: "win", text: `🏁 ¡Gana ${winner.name} ${winner.emoji}! Cobras ${payout} pts (×${RACE_ODDS}).` });
      Audio.win();
    } else {
      setMessage({ kind: "lose", text: `🏁 Gana ${winner.name} ${winner.emoji}. Tu ${RACERS.find((r) => r.id === pickRef.current).emoji} no llegó. Pierdes ${stake} pts.` });
      Audio.lose();
    }
  }

  function start() {
    if (racing || stake < 10) return;
    if (!spendPoints(stake)) {
      setMessage({ kind: "lose", text: "No tienes puntos suficientes." });
      return;
    }
    posRef.current = RACERS.map(() => START_X);
    setRacing(true);
    setMessage({ kind: "info", text: "🚦 ¡Y arrancan!" });
    Audio.eventAlert();
    lastRef.current = performance.now();
    lastTickRef.current = 0;
    rafRef.current = requestAnimationFrame(step);
  }

  return (
    <Felt
      title="CARRERA"
      icon="🏁"
      stake={stake}
      bg="#0f6b35,#0a3f22"
      help={
        <ul className="list-disc space-y-1 pl-4">
          <li>Elige el corredor que crees que cruzará primero la meta.</li>
          <li>Cada uno tiene su cuota (×): los menos favoritos pagan más.</li>
          <li>Apuesta y arranca. Si tu corredor gana, cobras apuesta × cuota.</li>
        </ul>
      }
    >
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="block h-auto w-full rounded-lg border border-asphalt-700"
        role="img"
        aria-label="Pista de carreras con cuatro vehículos"
      />

      <Banner message={message} />

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Elige corredor">
        {RACERS.map((r) => (
          <button
            key={r.id}
            type="button"
            role="radio"
            aria-checked={pick === r.id}
            disabled={racing}
            className={`min-h-14 rounded-md border px-2 font-cond font-bold transition disabled:opacity-40 ${
              pick === r.id
                ? "border-signal-amber bg-signal-amber/20 text-signal-amber ring-2 ring-signal-amber"
                : "border-white/30 bg-black/30 text-white hover:bg-black/50"
            }`}
            onClick={() => {
              setPick(r.id);
              Audio.click();
              if (!racing) paint();
            }}
          >
            <span className="text-2xl">{r.emoji}</span>
            <span className="block text-xs">{r.name}</span>
          </button>
        ))}
      </div>

      <StakeBar stake={stake} setStake={setStake} points={points} disabled={racing} />

      <button
        type="button"
        disabled={racing || stake < 10 || stake > points}
        className="mt-3 min-h-12 w-full rounded-md bg-signal-amber px-3 font-cond text-lg font-bold text-[#1a1200] shadow-lg shadow-black/40 hover:brightness-110 disabled:opacity-40"
        onClick={start}
      >
        {racing ? "Corriendo…" : `¡SALIDA! · ${stake} pts`}
      </button>

      <p className="mt-4 text-center font-cond text-xs text-white/60">
        Elige tu vehículo y apuesta a que gana la carrera. Cuatro corredores a la
        par: si el tuyo cruza primero la meta, cobras ×{RACE_ODDS}.
      </p>
    </Felt>
  );
}
