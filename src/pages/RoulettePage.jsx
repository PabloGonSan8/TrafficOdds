import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useGameState, useGameActions } from "../context/GameContext";
import {
  WHEEL_ORDER,
  colorOf,
  spin,
  resolveAll,
  TABLE_LIMITS,
  maxForBet,
  labelForBet,
} from "../engine/roulette";
import * as Audio from "../engine/audio";

const SECTOR = (Math.PI * 2) / WHEEL_ORDER.length;

// Fichas como en el casino: valor y color.
const CHIPS = [
  { value: 10, bg: "#e8e4d8", text: "#1a1a1a", ring: "#b8b4a8" },
  { value: 25, bg: "#2ee06f", text: "#06210f", ring: "#1a8a44" },
  { value: 50, bg: "#3b82f6", text: "#ffffff", ring: "#1d4ed8" },
  { value: 100, bg: "#1b1f26", text: "#ffffff", ring: "#4a4f58" },
  { value: 250, bg: "#f97316", text: "#1a0a00", ring: "#c2410c" },
];

const SECTOR_FILL = { green: "#0d7a3a", red: "#c0392b", black: "#1b1f26" };

// La bolita se describe con ángulo absoluto y distancia como fracción del radio.
const BALL_RIM = 0.96;    // girando por el borde
const BALL_POCKET = 0.74; // reposando en la casilla

// Física de la mesa.
const IDLE_SPEED = 0.45;     // rad/s: velocidad de crucero perpetua de la rueda
const WHEEL_FRICTION = 0.5;  // retorno suave hacia la velocidad base
const BALL_FRICTION = 0.5;
const DROP_SPEED = 1.4;      // rad/s: por debajo, la bola cae del borde
const FALL_MS = 750;         // espiral desde el borde hasta los deflectores
const FALL_FRICTION = 1.3;   // la bola pierde fuerza mientras cae
const BALL_DEFLECT = 0.8;    // radio de los deflectores (rombos)

function drawWheel(canvas, rotation, ball) {
  const ctx = canvas.getContext("2d");
  const size = canvas.width;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 8;
  ctx.clearRect(0, 0, size, size);

  // Madera exterior
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 6, 0, Math.PI * 2);
  ctx.fillStyle = "#5d3a1a";
  ctx.fill();

  for (let i = 0; i < WHEEL_ORDER.length; i++) {
    const n = WHEEL_ORDER[i];
    const start = rotation + i * SECTOR - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, start + SECTOR);
    ctx.closePath();
    ctx.fillStyle = SECTOR_FILL[colorOf(n)];
    ctx.fill();
    ctx.strokeStyle = "#caa84a";
    ctx.lineWidth = 1;
    ctx.stroke();

    const mid = start + SECTOR / 2;
    ctx.save();
    ctx.translate(cx + Math.cos(mid) * (radius - 18), cy + Math.sin(mid) * (radius - 18));
    ctx.rotate(mid + Math.PI / 2);
    ctx.fillStyle = "#eef0f3";
    ctx.font = `bold ${Math.round(size / 26)}px Barlow, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(n), 0, 0);
    ctx.restore();
  }

  // Centro dorado
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.42, 0, Math.PI * 2);
  ctx.fillStyle = "#14171c";
  ctx.fill();
  ctx.strokeStyle = "#caa84a";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.font = `${Math.round(size / 11)}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🎡", cx, cy);

  ctx.beginPath();
  ctx.arc(cx, cy, radius + 3, 0, Math.PI * 2);
  ctx.strokeStyle = "#caa84a";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Bolita de marfil
  if (ball) {
    const bx = cx + Math.cos(ball.angle) * radius * ball.f;
    const by = cy + Math.sin(ball.angle) * radius * ball.f;
    const r = Math.max(5, size / 52);
    const sheen = ctx.createRadialGradient(bx - r / 3, by - r / 3, 1, bx, by, r);
    sheen.addColorStop(0, "#ffffff");
    sheen.addColorStop(1, "#cfc9bd");
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fillStyle = sheen;
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 4;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

/** Ficha apilada sobre una casilla con la cantidad total. */
function ChipBadge({ amount }) {
  return (
    <span className="pointer-events-none absolute -right-1 -top-1 z-10 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-dashed border-white bg-signal-amber px-0.5 font-cond text-[0.65rem] font-bold text-[#1a1200] shadow-md shadow-black/50">
      {amount}
    </span>
  );
}

/** Casilla del tapete. */
function Cell({ label, betKey, bets, onPlace, className = "", style, disabled, highlight }) {
  const stake = bets[betKey]?.stake ?? 0;
  return (
    <button
      type="button"
      disabled={disabled}
      style={style}
      className={`relative flex min-h-9 items-center justify-center border border-white/40 font-cond text-sm font-bold text-white transition hover:brightness-125 disabled:cursor-default sm:min-h-10 ${
        highlight ? "ring-2 ring-signal-amber brightness-150" : ""
      } ${className}`}
      aria-label={`Apostar a ${label}${stake > 0 ? `, llevas ${stake} puntos` : ""}`}
      onClick={() => onPlace(betKey)}
    >
      {label}
      {stake > 0 ? <ChipBadge amount={stake} /> : null}
    </button>
  );
}

/** Punto de apuesta sobre una línea o esquina del tapete (interiores combinadas). */
function ZoneBtn({ betKey, label, bets, onPlace, disabled, className }) {
  const stake = bets[betKey]?.stake ?? 0;
  return (
    <button
      type="button"
      disabled={disabled}
      title={label}
      aria-label={`Apostar a ${label}${stake > 0 ? `, llevas ${stake} puntos` : ""}`}
      className={`pointer-events-auto absolute z-20 flex items-center justify-center rounded-full transition hover:bg-white/50 focus-visible:bg-white/50 disabled:cursor-default ${className}`}
      onClick={() => onPlace(betKey)}
    >
      {stake > 0 ? (
        <span className="pointer-events-none flex h-5 min-w-5 items-center justify-center rounded-full border border-dashed border-white bg-signal-amber px-0.5 font-cond text-[0.6rem] font-bold text-[#1a1200] shadow-md shadow-black/50">
          {stake}
        </span>
      ) : null}
    </button>
  );
}

/**
 * Zonas de apuesta interior alrededor de un número, sobre los bordes y
 * esquinas de la casilla como en el tapete real: caballo en las líneas,
 * cuadro en las intersecciones, calle y seisena en el borde de la fila.
 */
function InsideZones({ n, vertical, bets, onPlace, disabled }) {
  const zones = [];
  if (!vertical) {
    // Horizontal: la casilla de la derecha es n+3 y la de arriba n+1.
    if (n <= 33)
      zones.push({ key: `split:${n}-${n + 3}`, label: `Caballo ${n}-${n + 3}`, cls: "right-[-6px] top-1 bottom-1 w-[11px]" });
    if (n % 3 !== 0)
      zones.push({ key: `split:${n}-${n + 1}`, label: `Caballo ${n}-${n + 1}`, cls: "top-[-6px] left-1 right-1 h-[11px]" });
    if (n % 3 !== 0 && n <= 33)
      zones.push({ key: `corner:${n}`, label: `Cuadro ${n}-${n + 1}-${n + 3}-${n + 4}`, cls: "right-[-8px] top-[-8px] h-[15px] w-[15px]" });
    if (n % 3 === 1)
      zones.push({ key: `street:${n}`, label: `Calle ${n}-${n + 1}-${n + 2}`, cls: "bottom-[-6px] left-1 right-1 h-[11px]" });
    if (n % 3 === 1 && n <= 33)
      zones.push({ key: `six:${n}`, label: `Seisena ${n} a ${n + 5}`, cls: "right-[-8px] bottom-[-8px] h-[15px] w-[15px]" });
  } else {
    // Vertical: la casilla de la derecha es n+1 y la de abajo n+3.
    if (n % 3 !== 0)
      zones.push({ key: `split:${n}-${n + 1}`, label: `Caballo ${n}-${n + 1}`, cls: "right-[-6px] top-1 bottom-1 w-[11px]" });
    if (n <= 33)
      zones.push({ key: `split:${n}-${n + 3}`, label: `Caballo ${n}-${n + 3}`, cls: "bottom-[-6px] left-1 right-1 h-[11px]" });
    if (n % 3 !== 0 && n <= 33)
      zones.push({ key: `corner:${n}`, label: `Cuadro ${n}-${n + 1}-${n + 3}-${n + 4}`, cls: "right-[-8px] bottom-[-8px] h-[15px] w-[15px]" });
    if (n % 3 === 1)
      zones.push({ key: `street:${n}`, label: `Calle ${n}-${n + 1}-${n + 2}`, cls: "left-[-6px] top-1 bottom-1 w-[11px]" });
    if (n % 3 === 1 && n <= 33)
      zones.push({ key: `six:${n}`, label: `Seisena ${n} a ${n + 5}`, cls: "left-[-8px] bottom-[-8px] h-[15px] w-[15px]" });
  }
  const style = vertical
    ? { gridColumn: ((n - 1) % 3) + 2, gridRow: Math.floor((n - 1) / 3) + 2 }
    : { gridColumn: Math.floor((n - 1) / 3) + 2, gridRow: 3 - ((n - 1) % 3) };
  return (
    <div className="pointer-events-none relative" style={style}>
      {zones.map((z) => (
        <ZoneBtn
          key={z.key}
          betKey={z.key}
          label={z.label}
          bets={bets}
          onPlace={onPlace}
          disabled={disabled}
          className={z.cls}
        />
      ))}
    </div>
  );
}

const OUTSIDE = [
  { key: "low", label: "1–18" },
  { key: "even", label: "PAR" },
  { key: "red", label: "ROJO", bg: "bg-[#c0392b]" },
  { key: "black", label: "NEGRO", bg: "bg-[#1b1f26]" },
  { key: "odd", label: "IMPAR" },
  { key: "high", label: "19–36" },
];

/** Tapete horizontal clásico: 0 a la izquierda, 3 filas × 12 columnas. */
function TableHorizontal({ bets, onPlace, disabled, lastResult }) {
  const common = { bets, onPlace, disabled };
  return (
    <div className="hidden md:grid md:grid-cols-[40px_repeat(12,1fr)_46px] md:gap-[3px]">
      <Cell
        label="0"
        betKey="straight:0"
        {...common}
        highlight={lastResult === 0}
        className="rounded-l-lg bg-[#0d7a3a]"
        style={{ gridColumn: 1, gridRow: "1 / span 3" }}
      />
      {Array.from({ length: 36 }, (_, i) => i + 1).map((n) => (
        <Cell
          key={n}
          label={String(n)}
          betKey={`straight:${n}`}
          {...common}
          highlight={lastResult === n}
          className={colorOf(n) === "red" ? "bg-[#c0392b]" : "bg-[#1b1f26]"}
          style={{
            gridColumn: Math.floor((n - 1) / 3) + 2,
            gridRow: 3 - ((n - 1) % 3),
          }}
        />
      ))}
      {/* Columnas 2 a 1 (derecha): fila 1 = múltiplos de 3 */}
      {[
        { key: "col3", row: 1 },
        { key: "col2", row: 2 },
        { key: "col1", row: 3 },
      ].map((c) => (
        <Cell
          key={c.key}
          label="2a1"
          betKey={c.key}
          {...common}
          className="bg-[#0a4f27] text-xs"
          style={{ gridColumn: 14, gridRow: c.row }}
        />
      ))}
      {/* Docenas */}
      {[
        { key: "dozen1", label: "1ª 12", col: 2 },
        { key: "dozen2", label: "2ª 12", col: 6 },
        { key: "dozen3", label: "3ª 12", col: 10 },
      ].map((d) => (
        <Cell
          key={d.key}
          label={d.label}
          betKey={d.key}
          {...common}
          className="bg-[#0a4f27]"
          style={{ gridColumn: `${d.col} / span 4`, gridRow: 4 }}
        />
      ))}
      {/* Exteriores */}
      {OUTSIDE.map((o, i) => (
        <Cell
          key={o.key}
          label={o.label}
          betKey={o.key}
          {...common}
          className={`rounded-b-sm ${o.bg ?? "bg-[#0a4f27]"}`}
          style={{ gridColumn: `${i * 2 + 2} / span 2`, gridRow: 5 }}
        />
      ))}
      {/* Zonas de caballo/calle/cuadro/seisena sobre las líneas del tapete */}
      {Array.from({ length: 36 }, (_, i) => i + 1).map((n) => (
        <InsideZones key={`z${n}`} n={n} vertical={false} {...common} />
      ))}
    </div>
  );
}

/** Tapete vertical para pantallas pequeñas. */
function TableVertical({ bets, onPlace, disabled, lastResult }) {
  const common = { bets, onPlace, disabled };
  return (
    <div className="grid grid-cols-[34px_repeat(3,1fr)] gap-[3px] md:hidden">
      <Cell
        label="0"
        betKey="straight:0"
        {...common}
        highlight={lastResult === 0}
        className="rounded-t-lg bg-[#0d7a3a]"
        style={{ gridColumn: "1 / -1", gridRow: 1 }}
      />
      {[
        { key: "dozen1", label: "1ª 12", row: 2 },
        { key: "dozen2", label: "2ª 12", row: 6 },
        { key: "dozen3", label: "3ª 12", row: 10 },
      ].map((d) => (
        <Cell
          key={d.key}
          label={d.label}
          betKey={d.key}
          {...common}
          className="bg-[#0a4f27] [writing-mode:vertical-rl]"
          style={{ gridColumn: 1, gridRow: `${d.row} / span 4` }}
        />
      ))}
      {Array.from({ length: 36 }, (_, i) => i + 1).map((n) => (
        <Cell
          key={n}
          label={String(n)}
          betKey={`straight:${n}`}
          {...common}
          highlight={lastResult === n}
          className={colorOf(n) === "red" ? "bg-[#c0392b]" : "bg-[#1b1f26]"}
          style={{
            gridColumn: ((n - 1) % 3) + 2,
            gridRow: Math.floor((n - 1) / 3) + 2,
          }}
        />
      ))}
      {["col1", "col2", "col3"].map((k, i) => (
        <Cell
          key={k}
          label="2 a 1"
          betKey={k}
          {...common}
          className="bg-[#0a4f27] text-xs"
          style={{ gridColumn: i + 2, gridRow: 14 }}
        />
      ))}
      {OUTSIDE.map((o, i) => (
        <Cell
          key={o.key}
          label={o.label}
          betKey={o.key}
          {...common}
          className={`${o.bg ?? "bg-[#0a4f27]"} text-xs ${i >= 3 ? "rounded-b-md" : ""}`}
          style={{ gridColumn: (i % 3) + 2, gridRow: i < 3 ? 15 : 16 }}
        />
      ))}
      {/* Zonas de caballo/calle/cuadro/seisena sobre las líneas del tapete */}
      {Array.from({ length: 36 }, (_, i) => i + 1).map((n) => (
        <InsideZones key={`z${n}`} n={n} vertical {...common} />
      ))}
    </div>
  );
}

export function RoulettePage() {
  const { points } = useGameState();
  const { spendPoints, awardPoints } = useGameActions();
  const canvasRef = useRef(null);
  const rotationRef = useRef(0);
  const wheelVelRef = useRef(IDLE_SPEED);
  const ballOffsetRef = useRef(-Math.PI / 2); // casilla donde reposa la bola, relativa a la rueda
  const simRef = useRef(null); // giro en curso: null = bola encajada viajando con la rueda
  const resolveRef = useRef(() => {});
  const animRef = useRef(null);

  const [chip, setChip] = useState(50);
  const [bets, setBets] = useState({}); // { key: { type, value, stake } }
  const [undoStack, setUndoStack] = useState([]);
  const [spinning, setSpinning] = useState(false);
  const [lastNumbers, setLastNumbers] = useState([]);
  const [lastResult, setLastResult] = useState(null);
  const [message, setMessage] = useState(null);

  const totalBet = Object.values(bets).reduce((a, b) => a + b.stake, 0);

  // Bucle perpetuo: la rueda nunca se detiene, como en un casino real.
  // El crupier la mantiene a velocidad de crucero; cada giro le da impulso
  // y la fricción la devuelve suavemente a la velocidad base.
  useEffect(() => {
    let lastTime = performance.now();

    function loop(now) {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      wheelVelRef.current =
        IDLE_SPEED + (wheelVelRef.current - IDLE_SPEED) * Math.exp(-WHEEL_FRICTION * dt);
      rotationRef.current += wheelVelRef.current * dt;

      let ball;
      const sim = simRef.current;
      if (sim === null) {
        // Bola encajada: viaja con la rueda en su casilla.
        ball = { angle: rotationRef.current + ballOffsetRef.current, f: BALL_POCKET };
      } else if (sim.phase === "rim") {
        sim.ballAngle += sim.ballVel * dt;
        sim.ballVel *= Math.exp(-BALL_FRICTION * dt);
        ball = { angle: sim.ballAngle, f: BALL_RIM };

        // Tick al sobrevolar cada casilla.
        const rel = Math.floor((sim.ballAngle - rotationRef.current) / SECTOR);
        if (sim.lastSector !== null && rel !== sim.lastSector) Audio.tick();
        sim.lastSector = rel;

        if (Math.abs(sim.ballVel) < DROP_SPEED) {
          sim.phase = "fall";
          sim.fallStart = now;
        }
      } else if (sim.phase === "fall") {
        // fall: la bola abandona el borde en espiral y golpea los deflectores.
        // Conserva su propia velocidad: nada tira de ella hacia el resultado.
        const p = Math.min(1, (now - sim.fallStart) / FALL_MS);
        sim.ballVel *= Math.exp(-FALL_FRICTION * dt);
        sim.ballAngle += sim.ballVel * dt;

        // Golpes contra los rombos: roban energía y desvían un poco.
        for (const bp of [0.45, 0.7, 0.9]) {
          if (p >= bp && !sim.bouncesPlayed.has(bp)) {
            sim.bouncesPlayed.add(bp);
            sim.ballVel *= 0.6;
            sim.ballVel += (Math.random() - 0.5) * 0.5;
            Audio.tick();
          }
        }

        const bounce = Math.abs(Math.sin(p * Math.PI * 3)) * (1 - p) * 0.05;
        ball = {
          angle: sim.ballAngle,
          f: BALL_RIM + (BALL_DEFLECT - BALL_RIM) * easeOutCubic(p) + bounce,
        };

        if (p >= 1) {
          // captura: entra en la zona de casillas. El destino se alcanza
          // siguiendo la dirección del movimiento relativo actual, con la
          // duración ajustada para que la velocidad no dé un salto visible.
          const twoPi = Math.PI * 2;
          const rel0 = sim.ballAngle - rotationRef.current;
          const relVel = sim.ballVel - wheelVelRef.current;
          let dist = (((sim.targetOffset - rel0) % twoPi) + twoPi) % twoPi;
          if (relVel < 0) dist -= twoPi;
          const dur = Math.min(1.5, Math.max(0.45, (3 * dist) / (relVel || -1)));
          sim.phase = "capture";
          sim.captureStart = now;
          sim.captureDur = dur * 1000;
          sim.rel0 = rel0;
          sim.relDist = dist;
        }
      } else {
        // capture: la bola salta entre casillas, la rueda la arrastra y encaja.
        const p = Math.min(1, (now - sim.captureStart) / sim.captureDur);
        const rel = sim.rel0 + sim.relDist * easeOutCubic(p);
        const hop = Math.abs(Math.sin(p * Math.PI * 2)) * (1 - p) * 0.035;
        ball = {
          angle: rotationRef.current + rel,
          f:
            BALL_DEFLECT +
            (BALL_POCKET - BALL_DEFLECT) * easeOutCubic(Math.min(1, p * 1.6)) +
            hop,
        };

        // Tic del último saltito al encajar en la casilla.
        if (p >= 0.55 && !sim.bouncesPlayed.has("lock")) {
          sim.bouncesPlayed.add("lock");
          Audio.tick();
        }

        if (p >= 1) {
          ballOffsetRef.current = sim.targetOffset;
          simRef.current = null;
          resolveRef.current(sim);
        }
      }

      if (canvasRef.current) drawWheel(canvasRef.current, rotationRef.current, ball);
      animRef.current = requestAnimationFrame(loop);
    }

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  function placeChip(key) {
    if (spinning) return;
    if (totalBet + chip > points) {
      setMessage({ kind: "loss", text: "No te quedan puntos para esa ficha." });
      return;
    }
    const [type, valueStr] = key.split(":");
    // Límites de mesa: las apuestas con mayor premio tienen máximos más bajos.
    const max = maxForBet(type);
    if ((bets[key]?.stake ?? 0) + chip > max) {
      setMessage({
        kind: "loss",
        text: `Límite de mesa: máximo ${max.toLocaleString("es-ES")} pts en ${labelForBet(type)}.`,
      });
      return;
    }
    setBets((prev) => ({
      ...prev,
      [key]: {
        type,
        value: valueStr ?? null,
        stake: (prev[key]?.stake ?? 0) + chip,
      },
    }));
    setUndoStack((s) => [...s, { key, amount: chip }]);
    setMessage(null);
    Audio.click();
  }

  function undo() {
    if (spinning || undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    setBets((prev) => {
      const entry = prev[last.key];
      if (!entry) return prev;
      const stake = entry.stake - last.amount;
      const next = { ...prev };
      if (stake <= 0) delete next[last.key];
      else next[last.key] = { ...entry, stake };
      return next;
    });
  }

  function clearBets() {
    if (spinning) return;
    setBets({});
    setUndoStack([]);
  }

  /** Resuelve el giro cuando la bola encaja (la rueda sigue girando). */
  resolveRef.current = (sim) => {
    const payout = resolveAll(sim.placedBets, sim.result);
    const color = colorOf(sim.result) === "red" ? "🔴" : colorOf(sim.result) === "black" ? "⚫" : "🟢";
    setLastNumbers((l) => [sim.result, ...l].slice(0, 12));
    setLastResult(sim.result);
    if (payout > 0) {
      awardPoints(payout, `🎡 Ruleta: ${sim.result} ${color} → +${payout} pts`);
      const net = payout - sim.staked;
      setMessage({
        kind: "win",
        text: `Salió ${sim.result} ${color} — cobras ${payout} pts (${net >= 0 ? "+" : ""}${net} netos).`,
      });
      Audio.win();
    } else {
      setMessage({ kind: "loss", text: `Salió ${sim.result} ${color} — pierdes ${sim.staked} pts.` });
      Audio.lose();
    }
    setBets({});
    setUndoStack([]);
    setSpinning(false);
  };

  function doSpin() {
    if (spinning || totalBet === 0) return;
    if (!spendPoints(totalBet)) {
      setMessage({ kind: "loss", text: "No tienes puntos suficientes." });
      return;
    }

    setSpinning(true);
    setMessage({ kind: "info", text: "🎩 ¡No va más!" });
    setLastResult(null);
    Audio.eventAlert();

    const result = spin();
    const idx = WHEEL_ORDER.indexOf(result);

    // Impulso del crupier a la rueda + lanzamiento de la bola en contra.
    wheelVelRef.current = 2.0 + Math.random() * 0.8;
    simRef.current = {
      phase: "rim",
      ballVel: -(9 + Math.random() * 2),
      ballAngle: rotationRef.current + ballOffsetRef.current,
      dropStart: 0,
      lastSector: null,
      bouncesPlayed: new Set(),
      // Casilla ganadora relativa a la rueda: la bola encajará ahí.
      targetOffset: idx * SECTOR + SECTOR / 2 - Math.PI / 2,
      result,
      placedBets: Object.values(bets),
      staked: totalBet,
    };
  }

  const tableProps = { bets, onPlace: placeChip, disabled: spinning, lastResult };

  return (
    <main className="mx-auto max-w-6xl p-3 sm:p-5">
      <Link to="/" className="font-cond text-sm font-semibold text-dim hover:text-ink">
        ← Volver al lobby
      </Link>

      {/* Mesa de fieltro verde */}
      <div className="mt-2 rounded-2xl border-4 border-[#5d3a1a] bg-[radial-gradient(ellipse_at_top,#0f6b35,#0a4f27_70%)] p-3 shadow-2xl shadow-black/60 sm:p-5">
        {/* Marcador */}
        <div className="mb-3 flex items-center justify-between rounded-lg bg-black/30 px-3 py-2">
          <div className="font-cond text-sm font-semibold text-white sm:text-base">
            Saldo: <span className="text-sodium">{points.toLocaleString("es-ES")} pts</span>
          </div>
          <div className="font-cond text-sm font-semibold text-white sm:text-base">
            Apostado: <span className="text-signal-amber">{totalBet.toLocaleString("es-ES")} pts</span>
          </div>
        </div>

        {/* Horizontal en escritorio: rueda a la izquierda, tapete a la derecha */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          <div className="md:w-[340px] md:shrink-0">
            <canvas
              ref={canvasRef}
              width="380"
              height="380"
              className="mx-auto block h-auto w-full max-w-[340px]"
              role="img"
              aria-label="Ruleta europea girando"
            />
            {lastNumbers.length > 0 ? (
              <div className="mt-2 flex flex-wrap justify-center gap-1" aria-label="Últimos números">
                {lastNumbers.map((n, i) => (
                  <span
                    key={i}
                    className={`min-w-7 rounded px-1.5 py-0.5 text-center font-cond text-sm font-semibold text-white ${
                      colorOf(n) === "red"
                        ? "bg-[#c0392b]"
                        : colorOf(n) === "black"
                          ? "bg-[#1b1f26]"
                          : "bg-[#0d7a3a]"
                    }`}
                  >
                    {n}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="min-w-0 flex-1">
            {/* Selector de fichas */}
            <div className="mb-4 flex justify-center gap-2" role="group" aria-label="Valor de la ficha">
              {CHIPS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  disabled={spinning}
                  aria-pressed={chip === c.value}
                  aria-label={`Ficha de ${c.value} puntos`}
                  className={`flex h-12 w-12 items-center justify-center rounded-full border-4 border-dashed font-cond text-sm font-bold shadow-lg shadow-black/40 transition sm:h-14 sm:w-14 sm:text-base ${
                    chip === c.value ? "-translate-y-1.5 ring-2 ring-white" : "hover:-translate-y-0.5"
                  }`}
                  style={{ background: c.bg, color: c.text, borderColor: c.ring }}
                  onClick={() => setChip(c.value)}
                >
                  {c.value}
                </button>
              ))}
            </div>

            <TableHorizontal {...tableProps} />
            <div className="mx-auto max-w-[360px] md:max-w-none">
              <TableVertical {...tableProps} />
            </div>

            <p className="mt-2 text-center font-cond text-xs text-white/60">
              Pleno 35:1 · Caballo 17:1 · Calle 11:1 · Cuadro 8:1 · Seisena 5:1 ·
              Docena/Columna 2:1 · Sencillas 1:1 — Mesa: mín {TABLE_LIMITS.min} ·
              máx {TABLE_LIMITS.inside} interiores ·{" "}
              {TABLE_LIMITS.dozenColumn.toLocaleString("es-ES")} docena/columna ·{" "}
              {TABLE_LIMITS.even.toLocaleString("es-ES")} sencillas. Apuesta en las
              líneas y esquinas entre números para caballos, calles, cuadros y seisenas.
            </p>

            {message !== null ? (
              <p
                className={`mt-3 rounded-md bg-black/40 px-3 py-2 text-center font-cond font-semibold ${
                  message.kind === "win"
                    ? "text-signal-green"
                    : message.kind === "info"
                      ? "text-lg uppercase tracking-widest text-signal-amber"
                      : "text-signal-red"
                }`}
                role="status"
              >
                {message.text}
              </p>
            ) : null}

            {/* Controles */}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={spinning || undoStack.length === 0}
                className="min-h-11 flex-1 rounded-md border border-white/30 bg-black/30 px-3 font-cond font-semibold text-white hover:bg-black/50 disabled:opacity-40"
                onClick={undo}
              >
                ↩ Deshacer
              </button>
              <button
                type="button"
                disabled={spinning || totalBet === 0}
                className="min-h-11 flex-1 rounded-md border border-white/30 bg-black/30 px-3 font-cond font-semibold text-white hover:bg-black/50 disabled:opacity-40"
                onClick={clearBets}
              >
                ✕ Limpiar
              </button>
              <button
                type="button"
                disabled={spinning || totalBet === 0}
                className="min-h-11 flex-[2] rounded-md bg-signal-amber px-3 font-cond text-lg font-bold text-[#1a1200] shadow-lg shadow-black/40 hover:brightness-110 disabled:opacity-40"
                onClick={doSpin}
              >
                {spinning ? "Girando…" : `GIRAR · ${totalBet} pts`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
