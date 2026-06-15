import { useEffect, useRef, useState } from "react";
import { useGameState, useGameActions } from "../context/GameContext";
import { Felt } from "../components/casino/Felt";
import { StakeBar } from "../components/casino/StakeBar";
import { Banner } from "../components/casino/Banner";
import { randInt, shuffle } from "../engine/casino";
import * as Audio from "../engine/audio";

// Premio (multiplicador) → símbolo que debe salir 3 veces. EV ≈ 0,975.
const TIERS = [
  { mult: 0, p: 0.685, sym: null },
  { mult: 1.2, p: 0.15, sym: "🍒" },
  { mult: 1.5, p: 0.09, sym: "🔔" },
  { mult: 3, p: 0.04, sym: "🍀" },
  { mult: 7, p: 0.02, sym: "⭐" },
  { mult: 15, p: 0.01, sym: "💎" },
  { mult: 50, p: 0.005, sym: "7️⃣" },
];
const SYMBOLS = ["🍒", "🔔", "🍀", "⭐", "💎", "7️⃣"];

// Lienzo de rascado en px (se escala por CSS al ancho disponible).
const CV = 312;
const REVEAL_AT = 0.15; // fracción rascada que auto-revela la tarjeta
const BRUSH = 44; // radio del pincel en px

function pickTier() {
  let r = Math.random();
  for (const t of TIERS) {
    r -= t.p;
    if (r <= 0) return t;
  }
  return TIERS[0];
}

function buildGrid(winSym) {
  const cells = [];
  const counts = {};
  if (winSym) {
    for (let i = 0; i < 3; i++) cells.push(winSym);
    counts[winSym] = 3;
  }
  while (cells.length < 9) {
    const s = SYMBOLS[randInt(SYMBOLS.length)];
    if (s === winSym) continue;
    if ((counts[s] || 0) >= 2) continue;
    counts[s] = (counts[s] || 0) + 1;
    cells.push(s);
  }
  return shuffle(cells);
}

export function ScratchPage() {
  const { points } = useGameState();
  const { spendPoints, awardPoints } = useGameActions();

  const [stake, setStake] = useState(50);
  const [grid, setGrid] = useState(() => Array(9).fill("❓"));
  const [active, setActive] = useState(false);
  const [done, setDone] = useState(false); // tarjeta revelada
  const [winSym, setWinSym] = useState(null);
  const [message, setMessage] = useState(null);

  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const tierRef = useRef(null);
  const resolvedRef = useRef(true);
  const lastTickRef = useRef(0);

  // Pinta la capa metálica que cubre la tarjeta.
  function coat() {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.globalCompositeOperation = "source-over";
    const g = ctx.createLinearGradient(0, 0, CV, CV);
    g.addColorStop(0, "#b9a05a");
    g.addColorStop(0.5, "#e7d590");
    g.addColorStop(1, "#9a7f3e");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CV, CV);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.font = "bold 22px Barlow, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("RASCA AQUÍ", CV / 2, CV / 2 - 8);
    ctx.font = "26px serif";
    ctx.fillText("👆🪙", CV / 2, CV / 2 + 26);
  }

  useEffect(() => {
    coat();
  }, []);

  function buy() {
    if (active || stake < 10) return;
    if (!spendPoints(stake)) {
      setMessage({ kind: "lose", text: "No tienes puntos suficientes." });
      return;
    }
    const tier = pickTier();
    tierRef.current = tier;
    resolvedRef.current = false;
    setWinSym(null);
    setDone(false);
    setGrid(buildGrid(tier.sym));
    setActive(true);
    setMessage({ kind: "info", text: "Rasca la tarjeta con el dedo o el ratón." });
    coat();
    Audio.click();
  }

  function resolve() {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    const tier = tierRef.current;
    setActive(false);
    setDone(true);
    // Limpia del todo la capa para enseñar la tarjeta.
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, CV, CV);
    if (tier.mult > 0) {
      setWinSym(tier.sym);
      const payout = Math.round(stake * tier.mult);
      awardPoints(payout, `🎫 Rasca: ${tier.sym}×3 → +${payout} pts`);
      setMessage({ kind: "win", text: `¡Tres ${tier.sym}! Premio ×${tier.mult} = ${payout} pts. 🎉` });
      Audio.win();
    } else {
      setMessage({ kind: "lose", text: "Sin tres iguales. ¡Otra vez será!" });
      Audio.lose();
    }
  }

  // Fracción rascada: muestrea el canal alfa de la capa.
  function scratchedFraction(ctx) {
    const step = 8;
    const img = ctx.getImageData(0, 0, CV, CV).data;
    let clear = 0, total = 0;
    for (let y = 0; y < CV; y += step) {
      for (let x = 0; x < CV; x += step) {
        total++;
        if (img[(y * CV + x) * 4 + 3] < 40) clear++;
      }
    }
    return clear / total;
  }

  function eraseAt(e) {
    const cv = canvasRef.current;
    if (!cv || !active) return;
    const rect = cv.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * CV;
    const y = ((e.clientY - rect.top) / rect.height) * CV;
    const ctx = cv.getContext("2d");
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, BRUSH, 0, Math.PI * 2);
    ctx.fill();

    const now = performance.now();
    if (now - lastTickRef.current > 60) {
      Audio.tick();
      lastTickRef.current = now;
    }
    if (scratchedFraction(ctx) >= REVEAL_AT) resolve();
  }

  function onPointerDown(e) {
    if (!active) return;
    drawingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    eraseAt(e);
  }
  function onPointerMove(e) {
    if (drawingRef.current) eraseAt(e);
  }
  function onPointerUp() {
    drawingRef.current = false;
  }

  return (
    <Felt title="RASCA Y GANA" icon="🎫" stake={stake} bg="#5b1530,#33091a">
      <div className="relative mx-auto aspect-square w-full max-w-[312px]">
        {/* Símbolos debajo */}
        <div className="absolute inset-0 grid grid-cols-3 gap-2 rounded-lg bg-asphalt-950 p-2" aria-hidden={!done}>
          {grid.map((sym, i) => {
            const isWin = winSym && sym === winSym;
            return (
              <div
                key={i}
                className={`flex items-center justify-center rounded-md text-4xl ${
                  isWin ? "bg-signal-amber/30 ring-2 ring-signal-amber" : "bg-white/5"
                }`}
              >
                {sym}
              </div>
            );
          })}
        </div>
        {/* Capa rascable encima */}
        <canvas
          ref={canvasRef}
          width={CV}
          height={CV}
          className={`absolute inset-0 h-full w-full rounded-lg ${
            active ? "cursor-crosshair touch-none" : "pointer-events-none"
          }`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          aria-label="Zona de rascado"
        />
      </div>

      <Banner message={message} />

      {active ? (
        <button
          type="button"
          className="mt-3 min-h-12 w-full rounded-md border border-white/30 bg-black/30 px-3 font-cond text-base font-semibold text-white hover:bg-black/50"
          onClick={resolve}
        >
          👀 Revelar todo
        </button>
      ) : (
        <>
          <StakeBar stake={stake} setStake={setStake} points={points} />
          <button
            type="button"
            disabled={stake < 10 || stake > points}
            className="mt-3 min-h-12 w-full rounded-md bg-signal-amber px-3 font-cond text-lg font-bold text-[#1a1200] shadow-lg shadow-black/40 hover:brightness-110 disabled:opacity-40"
            onClick={buy}
          >
            COMPRAR TARJETA · {stake} pts
          </button>
        </>
      )}

      <p className="mt-4 text-center font-cond text-xs text-white/60">
        Compra el boleto y rasca con el dedo o el ratón. Al descubrir medio
        cartón se revela solo. Tres símbolos iguales pagan: 🍒×1,2 · 🔔×1,5 ·
        🍀×3 · ⭐×7 · 💎×15 · 7️⃣×50.
      </p>
    </Felt>
  );
}
