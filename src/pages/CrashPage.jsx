import { useEffect, useRef, useState } from "react";
import { useGameState, useGameActions } from "../context/GameContext";
import { Felt } from "../components/casino/Felt";
import { StakeBar } from "../components/casino/StakeBar";
import { Banner } from "../components/casino/Banner";
import { crashPoint } from "../engine/casino";
import * as Audio from "../engine/audio";

const LAMBDA = 0.28; // ritmo de crecimiento del multiplicador (×2 ≈ 2,5 s)

function histColor(m) {
  if (m < 1.3) return "#ef4444";
  if (m < 2) return "#f59e0b";
  if (m < 5) return "#2ee06f";
  return "#a855f7";
}

export function CrashPage() {
  const { points } = useGameState();
  const { spendPoints, awardPoints } = useGameActions();

  const [stake, setStake] = useState(50);
  const [auto, setAuto] = useState("");
  const [phase, setPhase] = useState("idle"); // idle | flying
  const [mult, setMult] = useState(1);
  const [cashed, setCashed] = useState(false);
  const [message, setMessage] = useState(null);
  const [history, setHistory] = useState([]);

  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const startRef = useRef(0);
  const crashAtRef = useRef(1);
  const cashedRef = useRef(false);
  const stakeRef = useRef(0);
  const autoRef = useRef(0);
  const samplesRef = useRef([]);
  const lastTickRef = useRef(0);
  const starsFarRef = useRef([]);
  const starsNearRef = useRef([]);
  const debrisRef = useRef([]);
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
    if (starsFarRef.current.length) return;
    starsFarRef.current = Array.from({ length: 55 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 0.3 + Math.random() * 0.9,
      tw: Math.random() * Math.PI * 2,
    }));
    starsNearRef.current = Array.from({ length: 35 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 0.9 + Math.random() * 1.6,
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

    // Fondo espacial profundo.
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#0b1430");
    bg.addColorStop(0.55, "#0a0f24");
    bg.addColorStop(1, "#04060e");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Nebulosa que se enciende según sube el multiplicador.
    const heat = Math.min(1, (multRef.current - 1) / 8);
    if (heat > 0.01) {
      const neb = ctx.createRadialGradient(W * 0.5, H * 0.78, 10, W * 0.5, H * 0.78, W * 0.7);
      neb.addColorStop(0, `rgba(${crashedNow ? "239,68,68" : "120,80,220"},${0.18 * heat})`);
      neb.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = neb;
      ctx.fillRect(0, 0, W, H);
    }

    const dt = Math.min(0.05, (now - lastDrawRef.current) / 1000);
    lastDrawRef.current = now;
    const base = 14 + Math.min(150, (multRef.current - 1) * 28);

    // Capa lejana (lenta) + capa cercana (rápida) → parallax de ascenso.
    for (const st of starsFarRef.current) {
      st.y += base * 0.4 * dt;
      if (st.y > H) { st.y = 0; st.x = Math.random() * W; }
      st.tw += dt * 5;
      ctx.fillStyle = `rgba(180,200,255,${0.25 + 0.25 * Math.sin(st.tw)})`;
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const st of starsNearRef.current) {
      st.y += base * dt;
      if (st.y > H) { st.y = 0; st.x = Math.random() * W; }
      st.tw += dt * 7;
      const a = 0.4 + 0.4 * Math.sin(st.tw);
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
      ctx.fill();
    }

    const s = samplesRef.current;
    if (s.length >= 2) {
      const maxT = Math.max(0.5, s[s.length - 1].t);
      const maxM = Math.max(1.2, s[s.length - 1].m);
      const px = (p) => (p.t / maxT) * (W - 20) + 10;
      const py = (p) => H - 12 - ((p.m - 1) / (maxM - 1)) * (H - 30);

      // Relleno bajo la curva.
      ctx.beginPath();
      ctx.moveTo(px(s[0]), py(s[0]));
      for (const p of s) ctx.lineTo(px(p), py(p));
      ctx.lineTo(px(s[s.length - 1]), H);
      ctx.lineTo(px(s[0]), H);
      ctx.closePath();
      const fill = ctx.createLinearGradient(0, 0, 0, H);
      if (crashedNow) {
        fill.addColorStop(0, "rgba(239,68,68,0.34)");
        fill.addColorStop(1, "rgba(239,68,68,0)");
      } else {
        fill.addColorStop(0, "rgba(46,224,111,0.34)");
        fill.addColorStop(1, "rgba(46,224,111,0)");
      }
      ctx.fillStyle = fill;
      ctx.fill();

      // Curva con degradado y brillo.
      const stroke = ctx.createLinearGradient(0, H, 0, 0);
      stroke.addColorStop(0, "#2ee06f");
      stroke.addColorStop(0.55, "#caa84a");
      stroke.addColorStop(1, "#ef6a4a");
      ctx.beginPath();
      ctx.moveTo(px(s[0]), py(s[0]));
      for (const p of s) ctx.lineTo(px(p), py(p));
      ctx.strokeStyle = crashedNow ? "#ef4444" : stroke;
      ctx.lineWidth = 4;
      ctx.lineJoin = "round";
      ctx.shadowColor = crashedNow ? "#ef4444" : "#2ee06f";
      ctx.shadowBlur = 16;
      ctx.stroke();
      ctx.shadowBlur = 0;

      const tip = s[s.length - 1];
      const tx = px(tip), ty = py(tip);

      if (expProgress === null) {
        // Estela de llama: partículas en degradado tras la punta.
        const prev = s[Math.max(0, s.length - 6)];
        const ang = Math.atan2(ty - py(prev), tx - px(prev));
        for (let i = 1; i <= 8; i++) {
          const fx = tx - Math.cos(ang) * i * 5.5 + (Math.random() - 0.5) * 3;
          const fy = ty - Math.sin(ang) * i * 5.5 + (Math.random() - 0.5) * 3;
          const t = i / 8;
          ctx.beginPath();
          ctx.arc(fx, fy, 7 - i * 0.7, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,${200 - i * 18},${60 - i * 6},${0.6 * (1 - t)})`;
          ctx.fill();
        }
        // Halo del cohete.
        ctx.beginPath();
        ctx.arc(tx, ty, 14, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,200,90,0.18)";
        ctx.fill();
        // Cohete rotado según la pendiente.
        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(ang + Math.PI / 4); // 🚀 apunta al NE por defecto
        ctx.font = "30px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🚀", 0, 0);
        ctx.restore();
      } else {
        // Explosión: destello, anillos y metralla.
        const e = expProgress;
        if (e < 0.02) {
          // Lanza la metralla una sola vez al inicio.
          debrisRef.current = Array.from({ length: 18 }, () => {
            const a = Math.random() * Math.PI * 2;
            const v = 60 + Math.random() * 160;
            return { x: tx, y: ty, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 1.5 + Math.random() * 2.5 };
          });
        }
        const R = 8 + e * 90;
        ctx.strokeStyle = `rgba(255,${120 - e * 80},40,${1 - e})`;
        ctx.lineWidth = 5 * (1 - e) + 1;
        ctx.beginPath();
        ctx.arc(tx, ty, R, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(tx, ty, R * 0.6, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,220,120,${0.8 * (1 - e)})`;
        ctx.stroke();
        // Metralla.
        for (const d of debrisRef.current) {
          const dx = tx + d.vx * e;
          const dy = ty + d.vy * e + 60 * e * e;
          ctx.fillStyle = `rgba(255,${160 - e * 100},70,${1 - e})`;
          ctx.beginPath();
          ctx.arc(dx, dy, d.r * (1 - e * 0.5), 0, Math.PI * 2);
          ctx.fill();
        }
        // Destello inicial sobre todo el lienzo.
        if (e < 0.5) {
          ctx.fillStyle = `rgba(239,68,68,${(0.5 - e) * 0.55})`;
          ctx.fillRect(0, 0, W, H);
        }
        ctx.font = `${26 + e * 18}px serif`;
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
    setHistory((h) => [crashAtRef.current, ...h].slice(0, 10));
    // Sacudida del lienzo (Web Animations API: no remonta ni borra el canvas).
    canvasRef.current?.animate(
      [
        { transform: "translate(0,0)" },
        { transform: "translate(-6px,4px)" },
        { transform: "translate(6px,-4px)" },
        { transform: "translate(-5px,-2px)" },
        { transform: "translate(0,0)" },
      ],
      { duration: 450, easing: "ease-in-out" }
    );
    if (!cashedRef.current) {
      setMessage({ kind: "lose", text: `💥 ¡Estalló en ×${crashAtRef.current.toFixed(2)}! Pierdes ${stakeRef.current} pts.` });
      Audio.lose();
    }
    // Anima la explosión durante ~800 ms.
    const t0 = performance.now();
    const boom = (now) => {
      const e = Math.min(1, (now - t0) / 800);
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

  const live = phase === "flying";
  const multColor = live || cashed ? "text-signal-green" : "text-signal-red";
  const glow = live
    ? "0 0 24px rgba(46,224,111,0.65)"
    : cashed
    ? "0 0 24px rgba(46,224,111,0.5)"
    : "0 0 24px rgba(239,68,68,0.5)";

  return (
    <Felt title="CRASH" icon="🚀" stake={stake} bg="#1b2540,#0a0f20">
      {/* Historial de estallidos recientes */}
      {history.length > 0 ? (
        <div className="mb-2 flex flex-wrap justify-center gap-1.5">
          {history.map((h, i) => (
            <span
              key={i}
              className="rounded-md px-2 py-0.5 font-cond text-xs font-bold tabular-nums"
              style={{ background: `${histColor(h)}22`, color: histColor(h), border: `1px solid ${histColor(h)}55` }}
            >
              ×{h.toFixed(2)}
            </span>
          ))}
        </div>
      ) : null}

      <div className="text-center">
        <div
          className={`font-display text-6xl tabular-nums transition-transform sm:text-7xl ${multColor} ${live ? "scale-105" : ""}`}
          style={{ textShadow: glow }}
        >
          ×{mult.toFixed(2)}
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width="640"
        height="260"
        className="mt-3 block h-auto w-full rounded-xl border border-asphalt-700 shadow-inner shadow-black/60"
        role="img"
        aria-label="Curva del multiplicador"
      />

      <Banner message={message} />

      {live ? (
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
