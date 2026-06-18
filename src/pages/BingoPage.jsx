import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useGameState, useGameActions } from "../context/GameContext";
import {
  BALLS,
  CARD_COST,
  PRIZES,
  MARKETS,
  generateCard,
  generateDraws,
  completedRows,
  markedCount,
} from "../engine/bingo";
import * as Audio from "../engine/audio";
import { GameHelp } from "../components/casino/GameHelp";

const MAX_CARDS = 4;
const DRAW_MS = 850; // ritmo de canto de bolas

// Color de la bola según su decena (estilo bombo real).
function ballColor(n) {
  const c = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#ec4899", "#14b8a6", "#eab308", "#f97316"][Math.floor((n - 1) / 10)];
  return c || "#94a3b8";
}

function Ball({ n, big }) {
  const size = big ? "h-16 w-16 text-2xl sm:h-20 sm:w-20 sm:text-3xl" : "h-8 w-8 text-sm";
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-cond font-bold text-white shadow-lg shadow-black/40 ${size}`}
      style={{ background: `radial-gradient(circle at 35% 30%, #ffffffaa, ${ballColor(n)} 60%)`, border: "2px solid #ffffff66" }}
    >
      {n}
    </span>
  );
}

// Resuelve las apuestas laterales activas con el desarrollo de la partida.
function resolveBets(bets, ctx) {
  const out = [];
  for (const m of MARKETS) {
    const b = bets[m.id];
    if (!b) continue;
    let won = false;
    let detail = "";
    let mult = 0;
    if (m.kind === "pick") {
      const num = b.opt;
      mult = m.mult;
      if (m.resolve === "lucky") {
        won = ctx.drawn.slice(0, m.firstK).includes(num);
        detail = `tu nº ${num}`;
      } else if (m.resolve === "firstBall") {
        won = ctx.drawn[0] === num;
        detail = `1ª bola: ${ctx.drawn[0]}`;
      } else if (m.resolve === "exactCount") {
        won = ctx.bingoBall === num;
        detail = `bingo en ${ctx.bingoBall}`;
      }
    } else {
      // Opción: el predicado se deduce del campo presente en la opción.
      const o = m.options[b.opt];
      mult = o.mult;
      if ("target" in o) {
        won = ctx.bingoBall <= o.target;
        detail = `bingo en ${ctx.bingoBall}`;
      } else if ("lineTarget" in o) {
        won = ctx.lineBall != null && ctx.lineBall <= o.lineTarget;
        detail = `línea en ${ctx.lineBall ?? "—"}`;
      } else if ("range" in o) {
        won = ctx.bingoBall >= o.range[0] && ctx.bingoBall <= o.range[1];
        detail = `bingo bola ${ctx.bingoBall}`;
      } else if ("parity" in o) {
        won = (ctx.bingoBallNumber % 2 === 0 ? 0 : 1) === o.parity;
        detail = `bola ${ctx.bingoBallNumber}`;
      }
    }
    out.push({
      id: m.id,
      icon: m.icon,
      label: m.label,
      win: won ? Math.round(b.stake * mult) : 0,
      detail,
    });
  }
  return out;
}

function CardView({ card, drawnSet, lastBall }) {
  const rows = completedRows(card, drawnSet);
  const marks = markedCount(card, drawnSet);
  return (
    <div className="rounded-lg bg-[#fdf6e3] p-1.5 shadow-lg shadow-black/40">
      <div className="grid grid-cols-5 gap-1">
        {card.flatMap((row, r) =>
          row.map((v, c) => {
            const marked = drawnSet.has(v);
            const isLast = v === lastBall;
            return (
              <div
                key={`${r}-${c}`}
                className={`flex aspect-square items-center justify-center rounded font-cond text-[0.7rem] font-bold sm:text-sm ${
                  isLast
                    ? "anim-pop bg-signal-amber text-[#1a1200] ring-2 ring-white"
                    : marked
                      ? "bg-signal-green text-[#06210f]"
                      : "bg-white text-[#1b1f26]"
                }`}
              >
                {v}
              </div>
            );
          })
        )}
      </div>
      <div className="mt-1 flex items-center justify-between px-1 font-cond text-[0.7rem] font-semibold text-[#5d3a1a]">
        <span>{marks}/15</span>
        <span>{rows >= 1 ? "✓ Línea" : ""} {rows >= 2 ? "✓✓ Dos" : ""} {rows === 3 ? "🎉 ¡Bingo!" : ""}</span>
      </div>
    </div>
  );
}

export function BingoPage() {
  const { points } = useGameState();
  const { spendPoints, awardPoints } = useGameActions();

  const [phase, setPhase] = useState("setup"); // setup | playing | done
  const [numCards, setNumCards] = useState(1);
  const [cards, setCards] = useState([]);
  const [drawn, setDrawn] = useState([]); // bolas cantadas en orden
  const [paused, setPaused] = useState(false);
  const [log, setLog] = useState([]); // mensajes de premio
  const [final, setFinal] = useState(null);

  // Apuestas laterales: bets[id] = { opt: índice|número, stake }
  const [bets, setBets] = useState({});

  const drawsRef = useRef([]);
  const awardedRef = useRef({ line: false, twoLines: false, bingo: false, lineBall: null });
  const betsRef = useRef({});
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const betsCost = Object.values(bets).reduce((a, b) => a + (b.stake || 0), 0);
  const totalCost = numCards * CARD_COST + betsCost;

  function toggleBet(id) {
    Audio.click();
    setBets((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else {
        const m = MARKETS.find((x) => x.id === id);
        next[id] = { opt: m.pick ? m.pick.def : 0, stake: 50 };
      }
      return next;
    });
  }
  function setBet(id, patch) {
    setBets((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  function start() {
    if (!spendPoints(totalCost)) return;
    Audio.click();
    const newCards = Array.from({ length: numCards }, () => generateCard());
    drawsRef.current = generateDraws();
    awardedRef.current = { line: false, twoLines: false, bingo: false, lineBall: null };
    betsRef.current = bets;
    setCards(newCards);
    setDrawn([]);
    setLog([]);
    setFinal(null);
    setPaused(false);
    setPhase("playing");
  }

  function addLog(text) {
    setLog((l) => [text, ...l]);
  }

  // Canta la siguiente bola al ritmo marcado (timeout re-programado cada render).
  useEffect(() => {
    if (phase !== "playing" || paused) return;
    if (drawn.length >= drawsRef.current.length) return;
    timerRef.current = setTimeout(() => {
      Audio.tick();
      setDrawn((d) => [...d, drawsRef.current[d.length]]);
    }, DRAW_MS);
    return () => clearTimeout(timerRef.current);
  }, [phase, paused, drawn]);

  // Comprueba premios cada vez que sale una bola.
  useEffect(() => {
    if (phase !== "playing" || drawn.length === 0) return;
    const set = new Set(drawn);
    const a = awardedRef.current;
    const ball = drawn.length;

    let best = 0;
    for (const card of cards) best = Math.max(best, completedRows(card, set));

    if (!a.line && best >= 1) {
      a.line = true;
      a.lineBall = ball;
      const prize = CARD_COST * PRIZES.line;
      awardPoints(prize, `📏 ¡Línea! +${prize} pts`);
      addLog(`Bola ${ball}: Línea → +${prize} pts`);
    }
    if (!a.twoLines && best >= 2) {
      a.twoLines = true;
      const prize = CARD_COST * PRIZES.twoLines;
      awardPoints(prize, `📏📏 ¡Dos líneas! +${prize} pts`);
      addLog(`Bola ${ball}: Dos líneas → +${prize} pts`);
    }
    if (!a.bingo && best === 3) {
      a.bingo = true;
      const prize = CARD_COST * PRIZES.bingo;
      awardPoints(prize, `🎉 ¡BINGO! +${prize} pts`);
      addLog(`Bola ${ball}: ¡BINGO! → +${prize} pts`);
      Audio.win();

      // Resolver todas las apuestas laterales activas.
      const ctx = {
        bingoBall: ball,
        bingoBallNumber: drawn[ball - 1],
        lineBall: a.lineBall,
        drawn,
      };
      const betResults = resolveBets(betsRef.current, ctx);
      for (const br of betResults) {
        if (br.win > 0) {
          awardPoints(br.win, `${br.icon} ${br.label}: +${br.win} pts`);
          addLog(`${br.label}: GANADA → +${br.win} pts`);
        } else {
          addLog(`${br.label}: perdida (${br.detail})`);
        }
      }

      const winnerIdx = cards.findIndex((c) => completedRows(c, set) === 3);
      setFinal({ ball, winnerIdx, betResults });
      setPhase("done");
      clearTimeout(timerRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawn]);

  function finishInstantly() {
    // Canta el resto de golpe hasta el bingo.
    setDrawn(drawsRef.current.slice());
  }

  function reset() {
    clearTimeout(timerRef.current);
    setPhase("setup");
    setCards([]);
    setDrawn([]);
    setLog([]);
    setFinal(null);
  }

  const drawnSet = new Set(drawn);
  const lastBall = drawn[drawn.length - 1] ?? null;

  // ---------- SETUP ----------
  if (phase === "setup") {
    return (
      <main className="mx-auto max-w-3xl p-3 sm:p-5">
        <Link to="/" className="font-cond text-sm font-semibold text-dim hover:text-ink">← Volver al lobby</Link>
        <div className="mt-2 rounded-2xl border-4 border-[#5d3a1a] bg-[radial-gradient(ellipse_at_top,#6d28d9,#3b0a6b_70%)] p-4 shadow-2xl shadow-black/60 sm:p-6">
          <h1 className="text-center font-display text-2xl text-white sm:text-3xl">🎱 Bingo {BALLS} bolas</h1>
          <p className="mx-auto mt-2 max-w-md text-center font-cond text-white/85">
            Compra cartones, se cantan bolas al azar y se marcan solas. Premios: Línea ×{PRIZES.line}, Dos líneas ×{PRIZES.twoLines}, Bingo ×{PRIZES.bingo}.
          </p>
          <p className="mt-2 text-center font-cond text-sm text-white/70">Saldo: {points.toLocaleString("es-ES")} pts</p>

          <GameHelp
            help={
              <ul className="list-disc space-y-1 pl-4">
                <li>Cartón: 3 filas × 5 columnas, 15 números (5 por fila, sin huecos).</li>
                <li>Línea = una fila completa. Dos líneas = dos filas. Bingo = el cartón entero.</li>
                <li>Se cantan bolas hasta que haya bingo. Cuantos más cartones, más opciones.</li>
              </ul>
            }
          />

          {/* Nº de cartones */}
          <div className="mt-4">
            <div className="mb-1 font-cond text-sm font-bold text-white">Cartones ({CARD_COST} pts c/u)</div>
            <div className="flex gap-2">
              {Array.from({ length: MAX_CARDS }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => { Audio.click(); setNumCards(n); }}
                  className={`min-h-11 flex-1 rounded-md font-cond font-bold ${numCards === n ? "bg-signal-amber text-[#1a1200]" : "border border-white/30 bg-black/30 text-white hover:bg-black/50"}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Apuestas laterales (mercados) */}
          <div className="mt-4">
            <div className="mb-1 font-cond text-sm font-bold text-white">Apuestas extra (opcionales)</div>
            <div className="space-y-2">
              {MARKETS.map((m) => {
                const b = bets[m.id];
                const on = !!b;
                return (
                  <div key={m.id} className={`rounded-lg p-2.5 ${on ? "bg-black/40 ring-1 ring-signal-amber/60" : "bg-black/25"}`}>
                    <label className="flex flex-wrap items-center gap-2 font-cond font-bold text-white">
                      <input type="checkbox" checked={on} onChange={() => toggleBet(m.id)} className="h-4 w-4 accent-signal-amber" />
                      {m.icon} {m.label}
                      {m.hard ? <span className="rounded bg-signal-red/80 px-1.5 text-[0.65rem] font-bold text-white">DIFÍCIL</span> : null}
                      <span className="font-normal text-white/60">· {m.help}</span>
                    </label>
                    {on ? (
                      <div className="mt-2 space-y-2">
                        {m.kind === "option" ? (
                          <div className="flex flex-wrap gap-2">
                            {m.options.map((o, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => setBet(m.id, { opt: i })}
                                className={`min-h-9 flex-1 rounded-md px-2 font-cond text-sm font-bold ${b.opt === i ? "bg-signal-amber text-[#1a1200]" : "border border-white/30 bg-black/40 text-white"}`}
                              >
                                {o.label} ·×{o.mult}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-cond text-sm text-white/80">Tu número:</span>
                            <input
                              type="number"
                              min={m.pick.min}
                              max={m.pick.max}
                              value={b.opt}
                              onChange={(e) => setBet(m.id, { opt: Math.max(m.pick.min, Math.min(m.pick.max, Number(e.target.value) || m.pick.min)) })}
                              className="w-20 rounded-md bg-black/50 px-2 py-1 text-center font-cond font-bold text-white"
                            />
                            <span className="font-cond text-sm text-white/60">{m.pick.hint}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="font-cond text-sm text-white/80">Importe:</span>
                          <input
                            type="range"
                            min={10}
                            max={500}
                            step={10}
                            value={b.stake}
                            onChange={(e) => setBet(m.id, { stake: Number(e.target.value) })}
                            className="flex-1 accent-signal-amber"
                          />
                          <span className="w-14 text-right font-cond font-bold text-signal-amber">{b.stake}</span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            disabled={totalCost > points}
            onClick={start}
            className="mt-4 min-h-12 w-full rounded-md bg-signal-amber px-3 font-cond text-lg font-bold text-[#1a1200] shadow-lg shadow-black/40 hover:brightness-110 disabled:opacity-40"
          >
            Comprar y jugar · {totalCost} pts
          </button>
        </div>
      </main>
    );
  }

  // ---------- PLAYING / DONE ----------
  return (
    <main className="mx-auto max-w-4xl p-3 sm:p-5">
      <Link to="/" className="font-cond text-sm font-semibold text-dim hover:text-ink">← Lobby</Link>

      <div className="mt-2 rounded-2xl border-4 border-[#5d3a1a] bg-[radial-gradient(ellipse_at_top,#6d28d9,#3b0a6b_70%)] p-3 shadow-2xl shadow-black/60 sm:p-5">
        {/* Última bola + contador */}
        <div className="mb-3 flex items-center gap-3 rounded-lg bg-black/30 p-3">
          <div className="text-center">
            <div className="font-cond text-[0.7rem] uppercase tracking-wide text-white/60">Última</div>
            {lastBall ? <Ball n={lastBall} big /> : <div className="h-16 w-16 rounded-full bg-black/30 sm:h-20 sm:w-20" />}
          </div>
          <div className="flex-1">
            <div className="font-cond text-sm font-bold text-white">Bola {drawn.length} de {BALLS}</div>
            <div className="font-cond text-xs text-white/70">
              Saldo: {points.toLocaleString("es-ES")} pts
            </div>
            {final ? (
              <div className="mt-1 font-cond text-sm font-bold text-signal-amber">
                🎉 Bingo en {final.ball} bolas (cartón {final.winnerIdx + 1})
              </div>
            ) : null}
          </div>
          {phase === "playing" ? (
            <div className="flex flex-col gap-1">
              <button type="button" onClick={() => setPaused((p) => !p)} className="min-h-9 rounded-md border border-white/30 bg-black/40 px-3 font-cond text-sm font-bold text-white hover:bg-black/60">
                {paused ? "▶ Seguir" : "⏸ Pausa"}
              </button>
              <button type="button" onClick={finishInstantly} className="min-h-9 rounded-md border border-white/30 bg-black/40 px-3 font-cond text-sm font-bold text-white hover:bg-black/60">
                ⏭ Al final
              </button>
            </div>
          ) : (
            <button type="button" onClick={reset} className="min-h-11 rounded-md bg-signal-amber px-4 font-cond font-bold text-[#1a1200] hover:brightness-110">
              🔄 Jugar otra
            </button>
          )}
        </div>

        {final?.betResults?.length ? (
          <div className="mb-3 space-y-1">
            {final.betResults.map((br) => (
              <div
                key={br.id}
                className={`rounded-md px-3 py-1.5 text-center font-cond text-sm font-bold ${br.win > 0 ? "bg-signal-green/20 text-signal-green" : "bg-signal-red/20 text-signal-red"}`}
              >
                {br.icon} {br.label}: {br.win > 0 ? `GANADA +${br.win} pts` : `perdida (${br.detail})`}
              </div>
            ))}
          </div>
        ) : null}

        {/* Cartones */}
        <div className={`grid gap-3 ${cards.length === 1 ? "" : "sm:grid-cols-2"}`}>
          {cards.map((card, i) => (
            <div key={i} className={final?.winnerIdx === i ? "anim-win rounded-lg ring-2 ring-signal-amber" : ""}>
              <div className="mb-0.5 font-cond text-xs font-bold text-white/80">Cartón {i + 1}</div>
              <CardView card={card} drawnSet={drawnSet} lastBall={lastBall} />
            </div>
          ))}
        </div>

        {/* Historial de bolas */}
        <div className="mt-4">
          <div className="mb-1 font-cond text-xs font-bold uppercase tracking-wide text-white/60">Bolas cantadas ({drawn.length})</div>
          <div className="flex flex-wrap gap-1 rounded-lg bg-black/20 p-2">
            {drawn.length === 0 ? <span className="font-cond text-sm text-white/50">esperando…</span> : drawn.map((n) => <Ball key={n} n={n} />)}
          </div>
        </div>

        {/* Registro de premios */}
        {log.length > 0 ? (
          <div className="mt-3 rounded-lg bg-black/20 p-2 font-cond text-sm text-white/85">
            {log.map((l, i) => (
              <div key={i}>• {l}</div>
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}
