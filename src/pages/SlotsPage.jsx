import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useGameState, useGameActions } from "../context/GameContext";
import {
  SYMBOLS,
  PAYTABLE,
  TWO_CHERRIES_PAY,
  FREE_SPINS_AWARD,
  FREE_SPIN_MULTIPLIER,
  spinReels,
  evaluate,
  randomSymbol,
} from "../engine/slots";
import * as Audio from "../engine/audio";
import { GameHelp } from "../components/casino/GameHelp";

// Botones de apuesta: suman a la apuesta actual.
const BET_STEPS = [10, 25, 50, 100, 250];
const MAX_BET = 1000;

// Cada rodillo frena más tarde que el anterior, como en las máquinas reales.
const REEL_DURATIONS = [1000, 1500, 2000];
// Cuántos símbolos de relleno recorre cada rodillo antes de pararse.
const FILLER_COUNTS = [14, 22, 30];
const FREE_SPIN_DELAY = 1500;

/**
 * Rodillo: una tira vertical que se desliza con desaceleración y un pequeño
 * rebote al clavarse (cubic-bezier con sobreimpulso). La tira termina en la
 * columna final + 1 símbolo de colchón para que el rebote no enseñe hueco.
 */
function Reel({ strip, animKey, duration, column, col, winCells, spinning }) {
  const innerRef = useRef(null);

  useEffect(() => {
    const el = innerRef.current;
    if (!el || !spinning) return;
    el.style.transition = "none";
    el.style.transform = "translateY(0)";
    // Doble rAF: fija el estado inicial antes de lanzar la transición.
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = `transform ${duration}ms cubic-bezier(0.16, 0.6, 0.22, 1.05)`;
        el.style.transform = `translateY(-${(((strip.length - 4) / strip.length) * 100).toFixed(4)}%)`;
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [animKey, spinning]); // eslint-disable-line react-hooks/exhaustive-deps

  const cellCls =
    "flex h-16 items-center justify-center text-3xl sm:h-24 sm:text-5xl";

  return (
    <div className="flex-1 overflow-hidden rounded-lg border-2 border-[#caa84a]/60 bg-gradient-to-b from-[#ddd6c4] via-white to-[#ddd6c4]">
      <div className="relative h-48 sm:h-72">
        {spinning ? (
          <div key={`s${animKey}`} ref={innerRef} className="will-change-transform">
            {strip.map((sym, i) => (
              <div key={i} className={cellCls}>
                {SYMBOLS[sym].icon}
              </div>
            ))}
          </div>
        ) : (
          <div key={`i${animKey}`}>
            {column.map((sym, row) => (
              <div
                key={row}
                className={`${cellCls} ${
                  winCells.has(`${col}-${row}`)
                    ? "animate-pulse rounded-md bg-signal-amber/70 ring-2 ring-signal-amber"
                    : ""
                }`}
              >
                {SYMBOLS[sym].icon}
              </div>
            ))}
          </div>
        )}
        {/* Sombras superior e inferior, como el cristal curvado de la máquina */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-5 bg-gradient-to-b from-black/25 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-black/25 to-transparent" />
      </div>
    </div>
  );
}

function Paytable() {
  const rows = Object.entries(PAYTABLE).sort((a, b) => b[1] - a[1]);
  return (
    <details className="mt-4 rounded-lg bg-black/30 p-3">
      <summary className="cursor-pointer font-cond font-semibold text-sodium">
        📜 Tabla de premios (por línea, sobre apuesta ÷ 5)
      </summary>
      <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 font-cond text-sm text-white sm:grid-cols-3">
        {rows.map(([id, mult]) => (
          <li key={id} className="flex items-center justify-between gap-2">
            <span>
              {SYMBOLS[id].icon} {SYMBOLS[id].icon} {SYMBOLS[id].icon}
            </span>
            <span className="text-signal-amber">×{mult}</span>
          </li>
        ))}
        <li className="flex items-center justify-between gap-2">
          <span>🍒 🍒 cualquiera</span>
          <span className="text-signal-amber">×{TWO_CHERRIES_PAY}</span>
        </li>
      </ul>
      <ul className="mt-3 space-y-1 text-xs text-white/70">
        <li>🃏 El comodín sustituye a cualquier símbolo de línea.</li>
        <li>
          🎁 3 o más Bonus en cualquier posición → {FREE_SPINS_AWARD} giros gratis
          con premios ×{FREE_SPIN_MULTIPLIER}.
        </li>
        <li>5 líneas fijas: arriba, centro, abajo y las dos diagonales.</li>
      </ul>
    </details>
  );
}

export function SlotsPage() {
  const { points } = useGameState();
  const { spendPoints, awardPoints } = useGameActions();

  const [grid, setGrid] = useState(() => spinReels());
  const [bet, setBet] = useState(0);
  const [strips, setStrips] = useState([[], [], []]);
  const [animKey, setAnimKey] = useState(0);
  const [spinningReels, setSpinningReels] = useState([false, false, false]);
  const [message, setMessage] = useState(null);
  const [winCells, setWinCells] = useState(() => new Set());
  const [freeLeft, setFreeLeft] = useState(0);

  const timersRef = useRef([]);
  const freeRef = useRef(0);
  const doSpinRef = useRef(() => {});
  const spinning = spinningReels.some(Boolean);

  useEffect(() => {
    return () => {
      for (const t of timersRef.current) clearTimeout(t);
    };
  }, []);

  function addBet(amount) {
    Audio.click();
    setBet((b) => Math.min(MAX_BET, b + amount));
  }

  function doSpin() {
    if (spinningReels.some(Boolean) || bet <= 0) return;

    const isFree = freeRef.current > 0;
    if (isFree) {
      freeRef.current -= 1;
      setFreeLeft(freeRef.current);
    } else if (!spendPoints(bet)) {
      setMessage({ kind: "lose", text: "No tienes puntos suficientes." });
      return;
    }

    Audio.click();
    setMessage(
      isFree
        ? { kind: "info", text: `🎁 Giro gratis (premios ×${FREE_SPIN_MULTIPLIER})…` }
        : null
    );
    setWinCells(new Set());

    const result = spinReels();
    const stakedBet = bet;

    // La tira arranca en lo que se ve ahora y termina en el resultado
    // (+1 símbolo de colchón para el rebote final).
    setStrips(
      grid.map((visible, i) => [
        ...visible,
        ...Array.from({ length: FILLER_COUNTS[i] }, randomSymbol),
        ...result[i],
        randomSymbol(),
      ])
    );
    setAnimKey((k) => k + 1);
    setSpinningReels([true, true, true]);

    REEL_DURATIONS.forEach((ms, col) => {
      timersRef.current.push(
        setTimeout(() => {
          Audio.tick();
          setGrid((g) => g.map((c, i) => (i === col ? result[col] : c)));
          setSpinningReels((r) => r.map((s, i) => (i === col ? false : s)));
          if (col === 2) resolveSpin(result, stakedBet, isFree);
        }, ms)
      );
    });
  }
  doSpinRef.current = doSpin;

  function resolveSpin(result, stakedBet, isFree) {
    const { totalWin, lineWins, scatters, freeSpins } = evaluate(result, stakedBet);
    const mult = isFree ? FREE_SPIN_MULTIPLIER : 1;
    const win = totalWin * mult;
    const parts = [];

    if (win > 0) {
      const cells = new Set();
      for (const w of lineWins) {
        w.line.rows.forEach((row, c) => cells.add(`${c}-${row}`));
      }
      setWinCells(cells);
      awardPoints(win, `🎰 Tragaperras: +${win} pts`);
      parts.push(
        `¡${lineWins.length} línea${lineWins.length > 1 ? "s" : ""}! +${win} pts${
          isFree ? ` (×${FREE_SPIN_MULTIPLIER})` : ""
        }`
      );
      Audio.win();
    }

    if (freeSpins > 0) {
      freeRef.current += freeSpins;
      setFreeLeft(freeRef.current);
      parts.push(`🎁 ${scatters} Bonus → +${freeSpins} giros gratis`);
      Audio.levelUp();
    }

    if (parts.length === 0) {
      setMessage({ kind: "lose", text: "Sin premio. ¡Otra vez será!" });
      if (!isFree) Audio.lose();
    } else {
      setMessage({ kind: "win", text: parts.join(" · ") });
    }

    // Encadena los giros gratis pendientes automáticamente.
    if (freeRef.current > 0) {
      timersRef.current.push(
        setTimeout(() => doSpinRef.current(), FREE_SPIN_DELAY)
      );
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-3 sm:p-5">
      <Link to="/" className="font-cond text-sm font-semibold text-dim hover:text-ink">
        ← Volver al lobby
      </Link>

      {/* Cabina de la máquina */}
      <div className="mt-2 rounded-2xl border-4 border-[#5d3a1a] bg-[radial-gradient(ellipse_at_top,#5b1530,#33091a_70%)] p-3 shadow-2xl shadow-black/60 sm:p-5">
        <div className="mb-3 flex items-center justify-between rounded-lg bg-black/30 px-3 py-2">
          <div className="font-cond text-sm font-semibold text-white sm:text-base">
            Saldo: <span className="text-sodium">{points.toLocaleString("es-ES")} pts</span>
          </div>
          <div className="font-cond text-sm font-semibold text-white sm:text-base">
            Apuesta: <span className="text-signal-amber">{bet.toLocaleString("es-ES")} pts</span>
          </div>
        </div>

        <GameHelp
          help={
            <ul className="list-disc space-y-1 pl-4">
              <li>Ajusta la apuesta y pulsa girar: los rodillos paran en símbolos al azar.</li>
              <li>Alinea símbolos iguales en una línea para ganar; cada combinación paga distinto.</li>
              <li>Algunos símbolos dan premios mayores o tiradas gratis.</li>
            </ul>
          }
        />

        <h1 className="mb-3 text-center font-display text-xl tracking-wide text-signal-amber drop-shadow-[0_0_8px_rgba(255,176,32,0.6)] sm:text-2xl">
          🎰 TRAGAPERRAS
        </h1>

        {freeLeft > 0 || spinning ? (
          freeLeft > 0 ? (
            <p
              className="mb-3 animate-pulse rounded-md bg-signal-amber/20 px-3 py-1.5 text-center font-cond font-bold uppercase tracking-widest text-signal-amber"
              role="status"
            >
              🎁 Giros gratis: quedan {freeLeft} · premios ×{FREE_SPIN_MULTIPLIER}
            </p>
          ) : null
        ) : null}

        {/* Rodillos */}
        <div
          className="flex gap-2 rounded-xl border-4 border-[#caa84a] bg-[#1a0a10] p-2 sm:gap-3 sm:p-3"
          role="img"
          aria-label="Rodillos de la tragaperras"
        >
          {grid.map((column, col) => (
            <Reel
              key={col}
              col={col}
              column={column}
              strip={strips[col]}
              animKey={animKey}
              duration={REEL_DURATIONS[col]}
              spinning={spinningReels[col]}
              winCells={winCells}
            />
          ))}
        </div>

        {message !== null ? (
          <p
            className={`mt-3 rounded-md bg-black/40 px-3 py-2 text-center font-cond font-semibold ${
              message.kind === "win"
                ? "text-signal-green"
                : message.kind === "info"
                  ? "text-signal-amber"
                  : "text-signal-red"
            }`}
            role="status"
          >
            {message.text}
          </p>
        ) : null}

        {/* Apuesta */}
        <div className="mt-4 flex flex-wrap justify-center gap-2" role="group" aria-label="Subir apuesta">
          {BET_STEPS.map((v) => (
            <button
              key={v}
              type="button"
              disabled={spinning || freeLeft > 0}
              className="min-h-11 rounded-md border border-white/30 bg-black/30 px-4 font-cond font-semibold text-white hover:bg-black/50 disabled:opacity-40"
              onClick={() => addBet(v)}
            >
              +{v}
            </button>
          ))}
          <button
            type="button"
            disabled={spinning || bet === 0 || freeLeft > 0}
            className="min-h-11 rounded-md border border-white/30 bg-black/30 px-4 font-cond font-semibold text-white hover:bg-black/50 disabled:opacity-40"
            onClick={() => setBet(0)}
          >
            ✕ Limpiar
          </button>
        </div>

        <button
          type="button"
          disabled={spinning || bet === 0 || freeLeft > 0 || bet > points}
          className="mt-3 min-h-12 w-full rounded-md bg-signal-amber px-3 font-cond text-lg font-bold text-[#1a1200] shadow-lg shadow-black/40 hover:brightness-110 disabled:opacity-40"
          onClick={doSpin}
        >
          {spinning
            ? "Girando…"
            : freeLeft > 0
              ? `🎁 Giro gratis en camino…`
              : `GIRAR · ${bet} pts`}
        </button>

        <Paytable />
      </div>
    </main>
  );
}
