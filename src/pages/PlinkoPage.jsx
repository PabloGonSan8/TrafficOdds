import { useEffect, useRef, useState } from "react";
import { useGameState, useGameActions } from "../context/GameContext";
import { Felt } from "../components/casino/Felt";
import { StakeBar } from "../components/casino/StakeBar";
import { Banner } from "../components/casino/Banner";
import { PLINKO_PAYOUTS, PLINKO_ROWS } from "../engine/casino";
import * as Audio from "../engine/audio";

const W = 360, H = 430;
const TOP = 26, ROW_H = 27, SPACING = 24, CENTER = W / 2;
const SLOT_Y = TOP + PLINKO_ROWS * ROW_H + 14;
const SEG_MS = 260; // ms por fila

function slotColor(m) {
  if (m >= 10) return "#ef4444";
  if (m >= 3) return "#f97316";
  if (m >= 1.5) return "#3b82f6";
  if (m >= 1) return "#2ee06f";
  return "#3a3f4a";
}

export function PlinkoPage() {
  const { points } = useGameState();
  const { spendPoints, awardPoints } = useGameActions();

  const [stake, setStake] = useState(50);
  const [risk, setRisk] = useState("mid");
  const [live, setLive] = useState(0); // nº de bolas en vuelo (para la UI)
  const [message, setMessage] = useState(null);

  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const ballsRef = useRef([]); // { path, slot, stake, start, landed, landedAt }
  const flashesRef = useRef([]); // { slot, at }
  const lastTickRef = useRef(0);
  const riskRef = useRef(risk);
  riskRef.current = risk;

  useEffect(() => {
    paint();
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function ballPos(ball, now) {
    const path = ball.path;
    const idxF = (now - ball.start) / SEG_MS;
    if (idxF >= path.length - 1) return { ...path[path.length - 1], done: true };
    const i = Math.floor(idxF);
    const frac = idxF - i;
    const a = path[i], b = path[i + 1];
    const hop = Math.sin(frac * Math.PI) * 5;
    return { x: a.x + (b.x - a.x) * frac, y: a.y + (b.y - a.y) * frac - hop, done: false };
  }

  function paint(now = performance.now()) {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#0c1322";
    ctx.fillRect(0, 0, W, H);

    // Pegs
    ctx.fillStyle = "#5a6273";
    for (let r = 1; r <= PLINKO_ROWS; r++) {
      for (let k = 0; k <= r; k++) {
        ctx.beginPath();
        ctx.arc(CENTER + (k - r / 2) * SPACING, TOP + r * ROW_H, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Ranuras (con destello reciente)
    const pays = PLINKO_PAYOUTS[riskRef.current];
    const n = pays.length;
    ctx.font = "bold 10px Barlow, sans-serif";
    ctx.textAlign = "center";
    for (let i = 0; i < n; i++) {
      const cx = CENTER + (i - (n - 1) / 2) * SPACING;
      const flash = flashesRef.current.find((f) => f.slot === i);
      const lit = flash ? Math.max(0, 1 - (now - flash.at) / 500) : 0;
      const base = slotColor(pays[i]);
      ctx.fillStyle = lit > 0 ? mix(base, "#ffffff", lit) : base;
      ctx.beginPath();
      ctx.roundRect(cx - SPACING / 2 + 1, SLOT_Y - lit * 3, SPACING - 2, 22 + lit * 3, 4);
      ctx.fill();
      ctx.fillStyle = pays[i] >= 1 ? "#06210f" : "#cdd2db";
      ctx.fillText(`${pays[i]}×`, cx, SLOT_Y + 15);
    }

    // Bolas
    for (const ball of ballsRef.current) {
      const p = ballPos(ball, now);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
      const g = ctx.createRadialGradient(p.x - 2, p.y - 2, 1, p.x, p.y, 7);
      g.addColorStop(0, "#fff");
      g.addColorStop(1, "#f5b301");
      ctx.fillStyle = g;
      ctx.shadowColor = "rgba(245,179,1,0.6)";
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  function mix(hex, white, t) {
    const c = parseInt(hex.slice(1), 16);
    const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
    const m = (v) => Math.round(v + (255 - v) * t);
    return `rgb(${m(r)},${m(g)},${m(b)})`;
  }

  function settle(ball) {
    const pays = PLINKO_PAYOUTS[ball.risk];
    const mult = pays[ball.slot];
    flashesRef.current.push({ slot: ball.slot, at: performance.now() });
    const payout = Math.round(ball.stake * mult);
    if (payout > 0) {
      awardPoints(payout, `🔵 Plinko: ×${mult} → +${payout} pts`);
      setMessage({ kind: mult >= 1 ? "win" : "lose", text: `Cae en ×${mult} → ${payout} pts.` });
      if (mult >= 1) Audio.win(); else Audio.lose();
    } else {
      setMessage({ kind: "lose", text: `Cae en ×0. Pierdes ${ball.stake} pts.` });
      Audio.lose();
    }
  }

  function loop(now) {
    // Avanza/limpia bolas.
    for (const ball of ballsRef.current) {
      const p = ballPos(ball, now);
      if (p.done && !ball.landed) {
        ball.landed = true;
        ball.landedAt = now;
        settle(ball);
      }
    }
    ballsRef.current = ballsRef.current.filter((b) => !b.landed || now - b.landedAt < 220);
    flashesRef.current = flashesRef.current.filter((f) => now - f.at < 500);
    setLive(ballsRef.current.filter((b) => !b.landed).length);

    if (now - lastTickRef.current > 80) {
      Audio.tick();
      lastTickRef.current = now;
    }
    paint(now);

    if (ballsRef.current.length > 0 || flashesRef.current.length > 0) {
      rafRef.current = requestAnimationFrame(loop);
    } else {
      rafRef.current = null;
      paint(now);
    }
  }

  function drop() {
    if (stake < 10) return;
    if (!spendPoints(stake)) {
      setMessage({ kind: "lose", text: "No tienes puntos suficientes." });
      return;
    }
    let col = 0;
    const path = [{ x: CENTER, y: TOP }];
    for (let r = 1; r <= PLINKO_ROWS; r++) {
      if (Math.random() < 0.5) col++;
      path.push({ x: CENTER + (col - r / 2) * SPACING, y: TOP + r * ROW_H });
    }
    const n = PLINKO_PAYOUTS[risk].length;
    path.push({ x: CENTER + (col - (n - 1) / 2) * SPACING, y: SLOT_Y + 6 });

    ballsRef.current.push({
      path,
      slot: col,
      stake,
      risk,
      start: performance.now(),
      landed: false,
      landedAt: 0,
    });
    Audio.click();
    if (!rafRef.current) {
      lastTickRef.current = 0;
      rafRef.current = requestAnimationFrame(loop);
    }
  }

  useEffect(() => {
    if (!rafRef.current) paint();
  }, [risk]);

  return (
    <Felt
      title="PLINKO"
      icon="🔵"
      stake={stake}
      bg="#23304a,#0c1322"
      help={
        <ul className="list-disc space-y-1 pl-4">
          <li>Sueltas una bola que rebota entre clavos hasta caer en una ranura de abajo.</li>
          <li>Cada ranura tiene un multiplicador; cobras apuesta × el de la ranura final.</li>
          <li>Las ranuras de los extremos pagan más, pero la bola cae ahí pocas veces. El riesgo cambia los multiplicadores.</li>
        </ul>
      }
    >
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="mx-auto block h-auto w-full max-w-[360px] rounded-lg border border-asphalt-700"
        role="img"
        aria-label="Tablero de Plinko"
      />

      <Banner message={message} />

      <div className="mt-4 flex items-center justify-center gap-2" role="radiogroup" aria-label="Riesgo">
        <span className="font-cond text-sm text-white/70">Riesgo:</span>
        {[
          ["low", "Bajo"],
          ["mid", "Medio"],
          ["high", "Alto"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={risk === id}
            className={`min-h-10 rounded-md border px-3 font-cond font-bold transition ${
              risk === id
                ? "border-signal-amber bg-signal-amber/20 text-signal-amber ring-2 ring-signal-amber"
                : "border-white/30 bg-black/30 text-white hover:bg-black/50"
            }`}
            onClick={() => {
              setRisk(id);
              Audio.click();
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <StakeBar stake={stake} setStake={setStake} points={points} />

      <button
        type="button"
        disabled={stake < 10 || stake > points}
        className="mt-3 min-h-12 w-full rounded-md bg-signal-amber px-3 font-cond text-lg font-bold text-[#1a1200] shadow-lg shadow-black/40 hover:brightness-110 disabled:opacity-40"
        onClick={drop}
      >
        SOLTAR BOLA · {stake} pts{live > 0 ? ` · ${live} en juego` : ""}
      </button>

      <p className="mt-4 text-center font-cond text-xs text-white/60">
        Suelta tantas bolas como quieras, incluso a la vez: cada una rebota por
        los clavos hasta una ranura. Bordes ×60, centro migajas. Más riesgo, más
        extremos.
      </p>
    </Felt>
  );
}
