import { useEffect, useRef, useState } from "react";
import { useGameState, useGameActions } from "../context/GameContext";
import { Felt } from "../components/casino/Felt";
import { StakeBar } from "../components/casino/StakeBar";
import { Banner } from "../components/casino/Banner";
import { WHEEL_SEGMENTS, randInt } from "../engine/casino";
import * as Audio from "../engine/audio";

const N = WHEEL_SEGMENTS.length;
const SEG = (Math.PI * 2) / N;
const SPIN_MS = 4200;
const TURNS = 5;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

function drawWheel(canvas, rotation) {
  const ctx = canvas.getContext("2d");
  const size = canvas.width;
  const cx = size / 2, cy = size / 2, R = size / 2 - 6;
  ctx.clearRect(0, 0, size, size);

  for (let i = 0; i < N; i++) {
    const start = rotation + i * SEG - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, start, start + SEG);
    ctx.closePath();
    ctx.fillStyle = WHEEL_SEGMENTS[i].color;
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const mid = start + SEG / 2;
    ctx.save();
    ctx.translate(cx + Math.cos(mid) * R * 0.72, cy + Math.sin(mid) * R * 0.72);
    ctx.rotate(mid + Math.PI / 2);
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${Math.round(size / 22)}px Barlow, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(WHEEL_SEGMENTS[i].mult === 0 ? "✕" : `${WHEEL_SEGMENTS[i].mult}×`, 0, 0);
    ctx.restore();
  }

  // Eje central
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.14, 0, Math.PI * 2);
  ctx.fillStyle = "#14171c";
  ctx.fill();
  ctx.strokeStyle = "#caa84a";
  ctx.lineWidth = 4;
  ctx.stroke();
}

export function WheelPage() {
  const { points } = useGameState();
  const { spendPoints, awardPoints } = useGameActions();

  const [stake, setStake] = useState(50);
  const [spinning, setSpinning] = useState(false);
  const [message, setMessage] = useState(null);

  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const rotRef = useRef(0);
  const lastTickRef = useRef(0);

  useEffect(() => {
    if (canvasRef.current) drawWheel(canvasRef.current, rotRef.current);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  function spin() {
    if (spinning || stake < 10) return;
    if (!spendPoints(stake)) {
      setMessage({ kind: "lose", text: "No tienes puntos suficientes." });
      return;
    }
    const result = randInt(N);
    // Rotación final para que el centro del segmento `result` quede bajo el
    // puntero (arriba). El segmento i se dibuja desde rotación + i·SEG − π/2, su
    // centro está en rotación + i·SEG + SEG/2 − π/2; igualándolo a −π/2 (arriba)
    // queda rotación = −(i·SEG + SEG/2).
    const from = rotRef.current;
    const twoPi = Math.PI * 2;
    const base = -(result * SEG + SEG / 2);
    // Sube `base` hasta quedar por encima de `from` + TURNS vueltas completas.
    const target = base + twoPi * (TURNS + Math.ceil((from - base) / twoPi));
    const delta = target - from;

    setSpinning(true);
    setMessage({ kind: "info", text: "🎯 Girando…" });
    const start = performance.now();
    lastTickRef.current = 0;

    function loop(now) {
      const p = Math.min(1, (now - start) / SPIN_MS);
      rotRef.current = from + delta * easeOutCubic(p);
      if (canvasRef.current) drawWheel(canvasRef.current, rotRef.current);
      if (now - lastTickRef.current > 70 + p * 260) {
        Audio.tick();
        lastTickRef.current = now;
      }
      if (p < 1) {
        rafRef.current = requestAnimationFrame(loop);
      } else {
        setSpinning(false);
        const mult = WHEEL_SEGMENTS[result].mult;
        if (mult > 0) {
          const payout = Math.round(stake * mult);
          awardPoints(payout, `🎯 Rueda: ×${mult} → +${payout} pts`);
          setMessage({ kind: "win", text: `¡Cae en ×${mult}! Ganas ${payout} pts. 🎉` });
          Audio.win();
        } else {
          setMessage({ kind: "lose", text: `Cae en ✕. Pierdes ${stake} pts.` });
          Audio.lose();
        }
      }
    }
    rafRef.current = requestAnimationFrame(loop);
  }

  return (
    <Felt
      title="RUEDA DE LA FORTUNA"
      icon="🎯"
      stake={stake}
      bg="#4a1d5e,#1f0a2a"
      help={
        <ul className="list-disc space-y-1 pl-4">
          <li>Apuesta y gira la rueda dividida en sectores con distintos multiplicadores.</li>
          <li>El puntero marca dónde se detiene: cobras apuesta × el multiplicador del sector.</li>
          <li>Los sectores que más pagan son los más pequeños (más difíciles de acertar).</li>
        </ul>
      }
    >
      <div className="relative mx-auto w-fit">
        {/* Puntero */}
        <div
          className="absolute left-1/2 top-[-2px] z-10 -translate-x-1/2 text-3xl drop-shadow"
          aria-hidden="true"
        >
          🔻
        </div>
        <canvas
          ref={canvasRef}
          width="320"
          height="320"
          className="block h-auto w-full max-w-[320px]"
          role="img"
          aria-label="Rueda de la fortuna"
        />
      </div>

      <Banner message={message} />

      <StakeBar stake={stake} setStake={setStake} points={points} disabled={spinning} />

      <button
        type="button"
        disabled={spinning || stake < 10 || stake > points}
        className="mt-3 min-h-12 w-full rounded-md bg-signal-amber px-3 font-cond text-lg font-bold text-[#1a1200] shadow-lg shadow-black/40 hover:brightness-110 disabled:opacity-40"
        onClick={spin}
      >
        {spinning ? "Girando…" : `GIRAR · ${stake} pts`}
      </button>

      <p className="mt-4 text-center font-cond text-xs text-white/60">
        Gira la rueda y cobra apuesta × el multiplicador donde pare. Hay 16
        casillas: la mayoría no pagan, pero alguna llega a ×5.
      </p>
    </Felt>
  );
}
