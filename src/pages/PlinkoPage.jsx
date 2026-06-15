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
const SEG_MS = 260; // ms por fila (caída total ≈ 3,4 s)

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
  const [dropping, setDropping] = useState(false);
  const [hot, setHot] = useState(-1); // ranura iluminada
  const [message, setMessage] = useState(null);

  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const pathRef = useRef([]);
  const startRef = useRef(0);
  const lastTickRef = useRef(0);
  const riskRef = useRef(risk);
  const hotRef = useRef(-1);
  riskRef.current = risk;

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  function paint(ball) {
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
        const x = CENTER + (k - r / 2) * SPACING;
        const y = TOP + r * ROW_H;
        ctx.beginPath();
        ctx.arc(x, y, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Ranuras de premio
    const pays = PLINKO_PAYOUTS[riskRef.current];
    const n = pays.length;
    const slotW = SPACING;
    ctx.font = "bold 10px Barlow, sans-serif";
    ctx.textAlign = "center";
    for (let i = 0; i < n; i++) {
      const cx = CENTER + (i - (n - 1) / 2) * slotW;
      const m = pays[i];
      ctx.fillStyle = i === hotRef.current ? "#ffffff" : slotColor(m);
      ctx.beginPath();
      ctx.roundRect(cx - slotW / 2 + 1, SLOT_Y, slotW - 2, 22, 4);
      ctx.fill();
      ctx.fillStyle = m >= 1 ? "#06210f" : "#cdd2db";
      ctx.fillText(`${m}×`, cx, SLOT_Y + 15);
    }

    // Bola
    if (ball) {
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, 7, 0, Math.PI * 2);
      const g = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 1, ball.x, ball.y, 7);
      g.addColorStop(0, "#fff");
      g.addColorStop(1, "#f5b301");
      ctx.fillStyle = g;
      ctx.fill();
    }
  }

  function loop(now) {
    const idxF = (now - startRef.current) / SEG_MS;
    const path = pathRef.current;
    if (idxF >= path.length - 1) {
      land();
      return;
    }
    const i = Math.floor(idxF);
    const frac = idxF - i;
    const a = path[i], b = path[i + 1];
    const x = a.x + (b.x - a.x) * frac;
    const hop = Math.sin(frac * Math.PI) * 5;
    const y = a.y + (b.y - a.y) * frac - hop;
    if (now - lastTickRef.current > 90) {
      Audio.tick();
      lastTickRef.current = now;
    }
    paint({ x, y });
    rafRef.current = requestAnimationFrame(loop);
  }

  function land() {
    cancelAnimationFrame(rafRef.current);
    const path = pathRef.current;
    const slot = path.slotIndex;
    hotRef.current = slot;
    setHot(slot);
    const pays = PLINKO_PAYOUTS[riskRef.current];
    const mult = pays[slot];
    paint(null);
    setDropping(false);
    const payout = Math.round(stake * mult);
    if (payout > 0) {
      awardPoints(payout, `🔵 Plinko: ×${mult} → +${payout} pts`);
      setMessage({
        kind: mult >= 1 ? "win" : "lose",
        text: `Cae en ×${mult} → ${payout} pts${mult < 1 ? " (recuperas parte)" : ""}.`,
      });
      if (mult >= 1) Audio.win(); else Audio.lose();
    } else {
      setMessage({ kind: "lose", text: `Cae en ×0. Pierdes ${stake} pts.` });
      Audio.lose();
    }
  }

  function drop() {
    if (dropping || stake < 10) return;
    if (!spendPoints(stake)) {
      setMessage({ kind: "lose", text: "No tienes puntos suficientes." });
      return;
    }
    // Camino: 12 decisiones izq/der. slot = nº de derechas.
    let col = 0;
    const path = [{ x: CENTER, y: TOP }];
    for (let r = 1; r <= PLINKO_ROWS; r++) {
      if (Math.random() < 0.5) col++;
      path.push({ x: CENTER + (col - r / 2) * SPACING, y: TOP + r * ROW_H });
    }
    // Último punto: centro de la ranura.
    const n = PLINKO_PAYOUTS[risk].length;
    path.slotIndex = col;
    path.push({ x: CENTER + (col - (n - 1) / 2) * SPACING, y: SLOT_Y + 6 });

    pathRef.current = path;
    hotRef.current = -1;
    setHot(-1);
    setDropping(true);
    setMessage({ kind: "info", text: "🔵 Cayendo…" });
    startRef.current = performance.now();
    lastTickRef.current = 0;
    rafRef.current = requestAnimationFrame(loop);
  }

  // Redibuja al cambiar de riesgo en reposo.
  useEffect(() => {
    if (!dropping) paint(null);
  }, [risk, dropping]);

  return (
    <Felt title="PLINKO" icon="🔵" stake={stake} bg="#23304a,#0c1322">
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
            disabled={dropping}
            className={`min-h-10 rounded-md border px-3 font-cond font-bold transition disabled:opacity-40 ${
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

      <StakeBar stake={stake} setStake={setStake} points={points} disabled={dropping} />

      <button
        type="button"
        disabled={dropping || stake < 10 || stake > points}
        className="mt-3 min-h-12 w-full rounded-md bg-signal-amber px-3 font-cond text-lg font-bold text-[#1a1200] shadow-lg shadow-black/40 hover:brightness-110 disabled:opacity-40"
        onClick={drop}
      >
        {dropping ? "Cayendo…" : `SOLTAR BOLA · ${stake} pts`}
      </button>

      <p className="mt-4 text-center font-cond text-xs text-white/60">
        Suelta la bola: rebota por los clavos hasta una ranura. Los bordes pagan
        mucho pero rara vez caen ahí; el centro paga poco. Más riesgo, más extremos.
      </p>
    </Felt>
  );
}
