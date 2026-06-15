import { useEffect, useRef, useState } from "react";
import { useGameState, useGameActions } from "../context/GameContext";
import { Felt } from "../components/casino/Felt";
import { StakeBar } from "../components/casino/StakeBar";
import { Banner } from "../components/casino/Banner";
import { crashPoint } from "../engine/casino";
import * as Audio from "../engine/audio";

const LAMBDA = 0.28; // ritmo de crecimiento del multiplicador (×2 ≈ 2,5 s)

export function CrashPage() {
  const { points } = useGameState();
  const { spendPoints, awardPoints } = useGameActions();

  const [stake, setStake] = useState(50);
  const [auto, setAuto] = useState("");
  const [phase, setPhase] = useState("idle"); // idle | flying
  const [mult, setMult] = useState(1);
  const [cashed, setCashed] = useState(false);
  const [message, setMessage] = useState(null);

  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const startRef = useRef(0);
  const crashAtRef = useRef(1);
  const cashedRef = useRef(false);
  const stakeRef = useRef(0);
  const autoRef = useRef(0);
  const samplesRef = useRef([]);
  const lastTickRef = useRef(0);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  function draw(crashedNow) {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#0a0d16";
    ctx.fillRect(0, 0, W, H);

    const s = samplesRef.current;
    if (s.length < 2) return;
    const maxT = Math.max(0.5, s[s.length - 1].t);
    const maxM = Math.max(1.2, s[s.length - 1].m);
    const px = (p) => (p.t / maxT) * (W - 10) + 5;
    const py = (p) => H - 8 - ((p.m - 1) / (maxM - 1)) * (H - 16);

    ctx.beginPath();
    ctx.moveTo(px(s[0]), py(s[0]));
    for (const p of s) ctx.lineTo(px(p), py(p));
    ctx.strokeStyle = crashedNow ? "#ef4444" : "#2ee06f";
    ctx.lineWidth = 3;
    ctx.stroke();
    // relleno bajo la curva
    ctx.lineTo(px(s[s.length - 1]), H);
    ctx.lineTo(px(s[0]), H);
    ctx.closePath();
    ctx.fillStyle = crashedNow ? "rgba(239,68,68,0.15)" : "rgba(46,224,111,0.15)";
    ctx.fill();
    // cohete en la punta
    const tip = s[s.length - 1];
    ctx.font = "22px serif";
    ctx.fillText(crashedNow ? "💥" : "🚀", px(tip) - 11, py(tip) + 8);
  }

  function endCrash() {
    cancelAnimationFrame(rafRef.current);
    setMult(crashAtRef.current);
    setPhase("idle");
    draw(true);
    if (!cashedRef.current) {
      setMessage({ kind: "lose", text: `💥 ¡Estalló en ×${crashAtRef.current.toFixed(2)}! Pierdes ${stakeRef.current} pts.` });
      Audio.lose();
    }
  }

  function cashOut(m) {
    if (cashedRef.current || phase !== "flying") return;
    cashedRef.current = true;
    setCashed(true);
    const payout = Math.round(stakeRef.current * m);
    awardPoints(payout, `🚀 Crash: ×${m.toFixed(2)} → +${payout} pts`);
    setMessage({ kind: "win", text: `💰 Retirado en ×${m.toFixed(2)} = ${payout} pts. ¡Aún sube hasta ver dónde estalla!` });
    Audio.win();
  }

  function loop(now) {
    const t = (now - startRef.current) / 1000;
    const m = Math.exp(LAMBDA * t);
    samplesRef.current.push({ t, m: Math.min(m, crashAtRef.current) });
    if (samplesRef.current.length > 600) samplesRef.current.shift();

    if (m >= crashAtRef.current) {
      endCrash();
      return;
    }
    setMult(m);
    if (now - lastTickRef.current > 220) {
      Audio.tick();
      lastTickRef.current = now;
    }
    if (autoRef.current > 1 && !cashedRef.current && m >= autoRef.current) cashOut(m);
    draw(false);
    rafRef.current = requestAnimationFrame(loop);
  }

  function launch() {
    if (phase === "flying" || stake < 10) return;
    if (!spendPoints(stake)) {
      setMessage({ kind: "lose", text: "No tienes puntos suficientes." });
      return;
    }
    stakeRef.current = stake;
    crashAtRef.current = crashPoint();
    autoRef.current = parseFloat(auto) || 0;
    cashedRef.current = false;
    samplesRef.current = [{ t: 0, m: 1 }];
    startRef.current = performance.now();
    lastTickRef.current = 0;
    setCashed(false);
    setMult(1);
    setPhase("flying");
    setMessage({ kind: "info", text: "🚀 ¡Despega! Retírate antes de que estalle." });
    rafRef.current = requestAnimationFrame(loop);
  }

  return (
    <Felt title="CRASH" icon="🚀" stake={stake} bg="#1b2540,#0a0f20">
      <div className="text-center">
        <div
          className={`font-display text-5xl tabular-nums sm:text-6xl ${
            phase === "flying" ? "text-signal-green" : cashed ? "text-signal-green" : "text-signal-red"
          }`}
        >
          ×{mult.toFixed(2)}
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width="640"
        height="200"
        className="mt-3 block h-auto w-full rounded-lg border border-asphalt-700"
        role="img"
        aria-label="Curva del multiplicador"
      />

      <Banner message={message} />

      {phase === "flying" ? (
        <button
          type="button"
          disabled={cashed}
          className="mt-3 min-h-14 w-full rounded-md bg-signal-green px-3 font-cond text-xl font-bold text-[#06210f] shadow-lg shadow-black/40 hover:brightness-110 disabled:opacity-40"
          onClick={() => cashOut(mult)}
        >
          {cashed ? "Retirado ✓" : `💰 RETIRAR · ×${mult.toFixed(2)} = ${Math.round(stake * mult)} pts`}
        </button>
      ) : (
        <>
          <div className="mt-4 flex items-center justify-center gap-2">
            <label htmlFor="crash-auto" className="font-cond text-sm text-white/70">
              Auto-retiro en ×
            </label>
            <input
              id="crash-auto"
              type="number"
              min="1.1"
              step="0.1"
              inputMode="decimal"
              placeholder="—"
              value={auto}
              onChange={(e) => setAuto(e.target.value)}
              className="w-20 rounded-md border border-asphalt-700 bg-asphalt-950 px-2 py-1 text-center font-cond text-base text-sodium"
            />
          </div>
          <StakeBar stake={stake} setStake={setStake} points={points} />
          <button
            type="button"
            disabled={stake < 10 || stake > points}
            className="mt-3 min-h-12 w-full rounded-md bg-signal-amber px-3 font-cond text-lg font-bold text-[#1a1200] shadow-lg shadow-black/40 hover:brightness-110 disabled:opacity-40"
            onClick={launch}
          >
            LANZAR · {stake} pts
          </button>
        </>
      )}

      <p className="mt-4 text-center font-cond text-xs text-white/60">
        El multiplicador sube sin parar… hasta que estalla. Retírate a tiempo para
        cobrar apuesta × multiplicador. Fija un auto-retiro si no te fías de tu pulso.
      </p>
    </Felt>
  );
}
