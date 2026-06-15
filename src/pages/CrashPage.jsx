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
  const starsRef = useRef([]);
  const lastDrawRef = useRef(0);
  const multRef = useRef(1);
  const flyingRef = useRef(false);

  useEffect(() => {
    // Fotograma inicial en reposo: cielo estrellado.
    lastDrawRef.current = performance.now();
    draw(performance.now(), false, null);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function ensureStars(W, H) {
    if (starsRef.current.length) return;
    starsRef.current = Array.from({ length: 70 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 0.4 + Math.random() * 1.4,
      tw: Math.random() * Math.PI * 2,
    }));
  }

  // expProgress: null en vuelo; 0..1 durante la explosión.
  function draw(now, crashedNow, expProgress) {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const W = cv.width, H = cv.height;
    ensureStars(W, H);

    // Fondo espacial
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#0b1430");
    bg.addColorStop(1, "#05070f");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Estrellas que descienden (sensación de ascenso). Más rápidas a más multi.
    const dt = Math.min(0.05, (now - lastDrawRef.current) / 1000);
    lastDrawRef.current = now;
    const speed = 18 + Math.min(160, (multRef.current - 1) * 30);
    for (const st of starsRef.current) {
      st.y += speed * dt;
      if (st.y > H) {
        st.y = 0;
        st.x = Math.random() * W;
      }
      st.tw += dt * 6;
      const a = 0.35 + 0.35 * Math.sin(st.tw);
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
      ctx.fill();
    }

    const s = samplesRef.current;
    if (s.length >= 2) {
      const maxT = Math.max(0.5, s[s.length - 1].t);
      const maxM = Math.max(1.2, s[s.length - 1].m);
      const px = (p) => (p.t / maxT) * (W - 16) + 8;
      const py = (p) => H - 10 - ((p.m - 1) / (maxM - 1)) * (H - 24);

      // Relleno bajo la curva
      ctx.beginPath();
      ctx.moveTo(px(s[0]), py(s[0]));
      for (const p of s) ctx.lineTo(px(p), py(p));
      ctx.lineTo(px(s[s.length - 1]), H);
      ctx.lineTo(px(s[0]), H);
      ctx.closePath();
      const fill = ctx.createLinearGradient(0, 0, 0, H);
      if (crashedNow) {
        fill.addColorStop(0, "rgba(239,68,68,0.30)");
        fill.addColorStop(1, "rgba(239,68,68,0)");
      } else {
        fill.addColorStop(0, "rgba(46,224,111,0.30)");
        fill.addColorStop(1, "rgba(46,224,111,0)");
      }
      ctx.fillStyle = fill;
      ctx.fill();

      // Curva con degradado y brillo
      const stroke = ctx.createLinearGradient(0, H, 0, 0);
      stroke.addColorStop(0, "#2ee06f");
      stroke.addColorStop(0.6, "#caa84a");
      stroke.addColorStop(1, "#ef6a4a");
      ctx.beginPath();
      ctx.moveTo(px(s[0]), py(s[0]));
      for (const p of s) ctx.lineTo(px(p), py(p));
      ctx.strokeStyle = crashedNow ? "#ef4444" : stroke;
      ctx.lineWidth = 3.5;
      ctx.lineJoin = "round";
      ctx.shadowColor = crashedNow ? "#ef4444" : "#2ee06f";
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;

      const tip = s[s.length - 1];
      const tx = px(tip), ty = py(tip);

      if (expProgress === null) {
        // Llama del cohete: estela detrás de la punta.
        const prev = s[Math.max(0, s.length - 6)];
        const ang = Math.atan2(ty - py(prev), tx - px(prev));
        for (let i = 1; i <= 5; i++) {
          const fx = tx - Math.cos(ang) * i * 5;
          const fy = ty - Math.sin(ang) * i * 5;
          ctx.beginPath();
          ctx.arc(fx, fy, 6 - i, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,${180 - i * 20},40,${0.5 - i * 0.08})`;
          ctx.fill();
        }
        // Cohete rotado según la pendiente.
        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(ang + Math.PI / 4); // 🚀 apunta al NE por defecto
        ctx.font = "24px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🚀", 0, 0);
        ctx.restore();
      } else {
        // Explosión: anillos expansivos + destello + 💥.
        const e = expProgress;
        const R = 8 + e * 70;
        ctx.strokeStyle = `rgba(255,${120 - e * 80},40,${1 - e})`;
        ctx.lineWidth = 4 * (1 - e) + 1;
        ctx.beginPath();
        ctx.arc(tx, ty, R, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(tx, ty, R * 0.6, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,220,120,${0.8 * (1 - e)})`;
        ctx.stroke();
        // Destello inicial sobre todo el lienzo
        if (e < 0.5) {
          ctx.fillStyle = `rgba(239,68,68,${(0.5 - e) * 0.5})`;
          ctx.fillRect(0, 0, W, H);
        }
        ctx.font = `${24 + e * 16}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("💥", tx, ty);
      }
    }
  }

  function endCrash() {
    cancelAnimationFrame(rafRef.current);
    flyingRef.current = false;
    setMult(crashAtRef.current);
    multRef.current = crashAtRef.current;
    setPhase("idle");
    // Sacudida del lienzo (Web Animations API: no remonta ni borra el canvas).
    canvasRef.current?.animate(
      [
        { transform: "translate(0,0)" },
        { transform: "translate(-5px,3px)" },
        { transform: "translate(5px,-3px)" },
        { transform: "translate(-4px,-2px)" },
        { transform: "translate(0,0)" },
      ],
      { duration: 450, easing: "ease-in-out" }
    );
    if (!cashedRef.current) {
      setMessage({ kind: "lose", text: `💥 ¡Estalló en ×${crashAtRef.current.toFixed(2)}! Pierdes ${stakeRef.current} pts.` });
      Audio.lose();
    }
    // Anima la explosión durante ~700 ms.
    const t0 = performance.now();
    const boom = (now) => {
      const e = Math.min(1, (now - t0) / 700);
      draw(now, true, e);
      if (e < 1) rafRef.current = requestAnimationFrame(boom);
    };
    rafRef.current = requestAnimationFrame(boom);
  }

  function cashOut(m) {
    if (cashedRef.current || !flyingRef.current) return;
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
    multRef.current = m;
    if (now - lastTickRef.current > 220) {
      Audio.tick();
      lastTickRef.current = now;
    }
    if (autoRef.current > 1 && !cashedRef.current && m >= autoRef.current) cashOut(m);
    draw(now, false, null);
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
    lastDrawRef.current = performance.now();
    lastTickRef.current = 0;
    multRef.current = 1;
    flyingRef.current = true;
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
