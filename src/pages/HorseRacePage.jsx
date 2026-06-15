import { useEffect, useMemo, useRef, useState } from "react";
import { useGameState, useGameActions } from "../context/GameContext";
import { Felt } from "../components/casino/Felt";
import { StakeBar } from "../components/casino/StakeBar";
import { Banner } from "../components/casino/Banner";
import {
  buildRaceCard, sampleOrder, exactaOdds, trifectaOdds, PLACES, FIELD,
} from "../engine/horses";
import * as Audio from "../engine/audio";

// Geometría del óvalo (viewBox 720×460).
const VW = 720, VH = 460;
const CX = 360, CY = 232;
const RX0 = 330, RATIO = 0.52, LANE_GAP = 12;
const laneRx = (i) => RX0 - i * LANE_GAP;
const laneRy = (i) => laneRx(i) * RATIO;
// Posición sobre la pista: progress 0→1 da una vuelta en sentido antihorario.
function lanePoint(i, progress) {
  const t = -2 * Math.PI * progress; // arranca a la derecha (meta) y sube
  return { x: CX + laneRx(i) * Math.cos(t), y: CY + laneRy(i) * Math.sin(t) };
}
// Sentido de avance horizontal (>0 derecha, <0 izquierda) para orientar el caballo.
function laneDirX(progress) {
  const t = -2 * Math.PI * progress;
  return laneRx(0) * Math.sin(t); // vx ∝ rx·sin(t) tras invertir el signo de dt
}

const MODES = [
  { id: "ganador", label: "Ganador", n: 1, hint: "Tu caballo llega 1º" },
  { id: "colocado", label: "Colocado", n: 1, hint: `Tu caballo entra en el podio (top ${PLACES})` },
  { id: "exacta", label: "Exacta", n: 2, hint: "1º y 2º en el orden exacto" },
  { id: "trifecta", label: "Trifecta", n: 3, hint: "1º, 2º y 3º en el orden exacto" },
];
const SLOT_LABELS = ["1º", "2º", "3º"];

export function HorseRacePage() {
  const { points } = useGameState();
  const { spendPoints, awardPoints } = useGameActions();

  const [card, setCard] = useState(() => buildRaceCard());
  const [stake, setStake] = useState(50);
  const [mode, setMode] = useState("ganador");
  const [sel, setSel] = useState([]); // índices de caballo, en orden
  const [racing, setRacing] = useState(false);
  const [message, setMessage] = useState(null);
  const [result, setResult] = useState(null); // orden de llegada tras correr
  const [live, setLive] = useState(null); // dorsales en orden durante la carrera

  const horseRefs = useRef([]);
  const emojiRefs = useRef([]);
  const progressRef = useRef([]);
  const lastFrameRef = useRef(0);
  const omegaRef = useRef([]);
  const rafRef = useRef(null);
  const startRef = useRef(0);
  const tParamRef = useRef([]); // duración de cada caballo (decide el orden)
  const phaseRef = useRef([]);
  const orderRef = useRef([]);
  const lockedRef = useRef(null);
  const lastTickRef = useRef(0);
  const lastLiveRef = useRef(0);

  const modeDef = MODES.find((m) => m.id === mode);
  const need = modeDef.n;
  const ready = sel.length === need;

  // Cuota y premio potencial de la selección actual.
  const odds = useMemo(() => {
    if (!ready) return 0;
    if (mode === "ganador") return card.horses[sel[0]].winOdds;
    if (mode === "colocado") return card.horses[sel[0]].placeOdds;
    if (mode === "exacta") return exactaOdds(card.winP, sel[0], sel[1]);
    if (mode === "trifecta") return trifectaOdds(card.winP, sel[0], sel[1], sel[2]);
    return 0;
  }, [ready, mode, sel, card]);
  const potential = Math.round(stake * odds);

  const favorite = useMemo(
    () => card.horses.reduce((a, b) => (b.winOdds < a.winOdds ? b : a)).idx,
    [card]
  );

  useEffect(() => { paintStatic(); /* eslint-disable-next-line */ }, [card]);
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // Sitúa un caballo en la pista y lo orienta hacia su sentido de avance.
  function placeHorse(i, progress) {
    const g = horseRefs.current[i];
    if (g) {
      const pt = lanePoint(i, progress);
      g.setAttribute("transform", `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`);
    }
    const em = emojiRefs.current[i];
    if (em) {
      // 🐎 mira a la izquierda por defecto: se voltea cuando avanza a la derecha.
      const flip = laneDirX(progress) > 0 ? -1 : 1;
      em.setAttribute("transform", `scale(${flip} 1)`);
    }
  }

  // Coloca todos los caballos en la línea de meta (reposo).
  function paintStatic() {
    card.horses.forEach((_, i) => placeHorse(i, 0));
  }

  function changeMode(id) {
    if (racing) return;
    Audio.click();
    setMode(id);
    setSel([]);
    setResult(null);
  }

  function tapHorse(i) {
    if (racing) return;
    Audio.click();
    setResult(null);
    setSel((cur) => {
      const at = cur.indexOf(i);
      if (at !== -1) return cur.filter((x) => x !== i); // quita si ya estaba
      if (cur.length >= need) return need === 1 ? [i] : cur; // lleno (salvo simples)
      return [...cur, i];
    });
  }

  function newCard() {
    if (racing) return;
    Audio.click();
    setCard(buildRaceCard());
    setSel([]);
    setResult(null);
    setMessage(null);
  }

  function frame(now) {
    const elapsed = (now - startRef.current) / 1000;
    const dt = Math.min(0.05, (now - lastFrameRef.current) / 1000);
    lastFrameRef.current = now;
    const durs = tParamRef.current;
    // Velocidad SIEMPRE positiva: avance constante con sprints y bajones suaves.
    // v = (1/duración)·(1 + 0,4·sin) → nunca para ni retrocede.
    const prog = card.horses.map((_, i) => {
      const v = (1 / durs[i]) * (1 + 0.4 * Math.sin(phaseRef.current[i] + elapsed * omegaRef.current[i]));
      const p = Math.min(1, progressRef.current[i] + v * dt);
      progressRef.current[i] = p;
      placeHorse(i, p);
      return p;
    });
    const leaderDone = progressRef.current[orderRef.current[0]] >= 1;

    if (now - lastTickRef.current > 200) { Audio.tick(); lastTickRef.current = now; }
    if (now - lastLiveRef.current > 140) {
      const ord = [...prog.keys()].sort((a, b) => prog[b] - prog[a]);
      setLive(ord.map((i) => card.horses[i].num));
      lastLiveRef.current = now;
    }

    if (leaderDone) { finishRace(); return; }
    rafRef.current = requestAnimationFrame(frame);
  }

  function finishRace() {
    cancelAnimationFrame(rafRef.current);
    const order = orderRef.current;
    // Coloca el podio en meta y el resto algo retrasado, en su orden.
    order.forEach((idx, rank) => placeHorse(idx, rank === 0 ? 1 : 1 - rank * 0.012));
    setRacing(false);
    setLive(null);
    setResult(order);

    const lb = lockedRef.current;
    const podium = order.slice(0, PLACES).map((i) => card.horses[i].num).join("-");
    let won = false;
    if (lb.mode === "ganador") won = order[0] === lb.sel[0];
    else if (lb.mode === "colocado") won = order.indexOf(lb.sel[0]) < PLACES;
    else if (lb.mode === "exacta") won = order[0] === lb.sel[0] && order[1] === lb.sel[1];
    else if (lb.mode === "trifecta") won = order[0] === lb.sel[0] && order[1] === lb.sel[1] && order[2] === lb.sel[2];

    const winName = card.horses[order[0]].name;
    if (won) {
      const payout = Math.round(lb.stake * lb.odds);
      awardPoints(payout, `🏇 Hípica: ${winName} → +${payout} pts`);
      setMessage({ kind: "win", text: `🏁 Llegada ${podium}. ¡Apuesta acertada! Cobras ${payout} pts (×${lb.odds}).` });
      Audio.win();
    } else {
      setMessage({ kind: "lose", text: `🏁 Gana el ${card.horses[order[0]].num} ${winName}. Llegada ${podium}. Pierdes ${lb.stake} pts.` });
      Audio.lose();
    }
  }

  function launch() {
    if (racing || !ready || stake < 10) return;
    if (!spendPoints(stake)) {
      setMessage({ kind: "lose", text: "No tienes puntos suficientes." });
      return;
    }
    lockedRef.current = { mode, sel: [...sel], odds, stake };
    const order = sampleOrder(card.strengths); // orden de llegada de ESTA carrera
    orderRef.current = order;
    // Duración por caballo creciente según el puesto → el 1º cruza antes.
    // Vuelta lenta (~12-16 s) para un trote realista, no una exhibición rápida.
    const durs = new Array(FIELD);
    order.forEach((idx, rank) => { durs[idx] = 12 + rank * 0.55; });
    tParamRef.current = durs;
    phaseRef.current = card.horses.map(() => Math.random() * Math.PI * 2);
    omegaRef.current = card.horses.map(() => 0.7 + Math.random() * 0.6); // ritmo del sprint
    progressRef.current = new Array(FIELD).fill(0);
    setResult(null);
    setRacing(true);
    setMessage({ kind: "info", text: "🚦 ¡Se abren los cajones!" });
    Audio.eventAlert();
    startRef.current = performance.now();
    lastFrameRef.current = startRef.current;
    lastTickRef.current = 0;
    lastLiveRef.current = 0;
    rafRef.current = requestAnimationFrame(frame);
  }

  return (
    <Felt title="HIPÓDROMO" icon="🏇" stake={stake} bg="#14532d,#06270f">
      {/* Pista ovalada */}
      <svg viewBox={`0 0 ${VW} ${VH}`} className="block w-full rounded-xl border border-asphalt-700 shadow-inner shadow-black/60" role="img" aria-label="Pista ovalada de carreras de caballos">
        <defs>
          <radialGradient id="grass" cx="50%" cy="45%" r="70%">
            <stop offset="0%" stopColor="#1f7a43" />
            <stop offset="100%" stopColor="#0d4023" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width={VW} height={VH} fill="#0a2e18" />
        {/* Tierra (pista) */}
        <ellipse cx={CX} cy={CY} rx={RX0 + 26} ry={(RX0 + 26) * RATIO + 8} fill="#7a5a31" />
        <ellipse cx={CX} cy={CY} rx={RX0 + 26} ry={(RX0 + 26) * RATIO + 8} fill="none" stroke="#5d4424" strokeWidth="3" />
        {/* Surcos de los carriles */}
        {Array.from({ length: 3 }, (_, k) => {
          const r = RX0 - (k + 2) * LANE_GAP * 2;
          return <ellipse key={k} cx={CX} cy={CY} rx={r} ry={r * RATIO} fill="none" stroke="#ffffff" strokeOpacity="0.06" strokeWidth="1" />;
        })}
        {/* Césped interior */}
        <ellipse cx={CX} cy={CY} rx={laneRx(FIELD) - 14} ry={laneRy(FIELD) - 10} fill="url(#grass)" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="2" />
        {/* Línea de meta a cuadros (recta derecha) */}
        <g>
          {Array.from({ length: 12 }, (_, k) => {
            const x0 = laneRx(FIELD) - 14, x1 = RX0 + 26;
            const seg = (x1 - x0) / 12;
            return (
              <rect key={k} x={CX + x0 + k * seg} y={CY - 9} width={seg} height="18" fill={k % 2 ? "#111" : "#fff"} />
            );
          })}
        </g>
        <text x={CX + (RX0 + 40)} y={CY + 5} fontSize="13" fill="#f5ead6" textAnchor="start" transform={`rotate(90 ${CX + (RX0 + 40)} ${CY})`} opacity="0.85">META</text>
        <text x={CX} y={CY + 6} fontSize="20" fill="#ffffff" fillOpacity="0.5" textAnchor="middle" fontWeight="bold" letterSpacing="3">HIPÓDROMO</text>

        {/* Caballos: emoji orientado + casaca con dorsal */}
        {card.horses.map((h, i) => {
          const picked = sel.includes(i);
          return (
            <g key={h.num} ref={(el) => (horseRefs.current[i] = el)}>
              <ellipse cx="0" cy="11" rx="15" ry="4.5" fill="#000" opacity="0.25" />
              {picked ? <circle r="22" fill="#ffb020" fillOpacity="0.18" stroke="#ffb020" strokeWidth="2" /> : null}
              <g ref={(el) => (emojiRefs.current[i] = el)}>
                <text x="0" y="0" fontSize="34" textAnchor="middle" dominantBaseline="central">🐎</text>
              </g>
              {/* Casaca: círculo de color con el dorsal */}
              <circle cx="9" cy="-12" r="8.5" fill={h.color} stroke="#ffffff" strokeWidth="1.5" />
              <text x="9" y="-12" fontSize="11" fontWeight="bold" fill="#0c0c0c" textAnchor="middle" dominantBaseline="central">{h.num}</text>
            </g>
          );
        })}
      </svg>

      {/* Marcador en carrera */}
      {live ? (
        <div className="mt-2 flex items-center justify-center gap-1.5 font-cond text-xs text-white/80">
          <span className="text-white/50">En carrera:</span>
          {live.map((num, k) => (
            <span key={num} className={`rounded px-1.5 py-0.5 font-bold ${k === 0 ? "bg-signal-amber/30 text-signal-amber" : "bg-black/30"}`}>
              {k + 1}º·{num}
            </span>
          ))}
        </div>
      ) : null}

      <Banner message={message} />

      {/* Selector de tipo de apuesta */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Tipo de apuesta">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={mode === m.id}
            disabled={racing}
            className={`min-h-12 rounded-md border px-2 font-cond text-sm font-bold transition disabled:opacity-40 ${
              mode === m.id
                ? "border-signal-amber bg-signal-amber/20 text-signal-amber ring-2 ring-signal-amber"
                : "border-white/30 bg-black/30 text-white hover:bg-black/50"
            }`}
            onClick={() => changeMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>
      <p className="mt-1 text-center font-cond text-xs text-white/60">{modeDef.hint}</p>

      {/* Boletín: ranuras ordenadas para exacta/trifecta */}
      {need > 1 ? (
        <div className="mt-2 flex items-center justify-center gap-2">
          {Array.from({ length: need }, (_, k) => {
            const idx = sel[k];
            const h = idx != null ? card.horses[idx] : null;
            return (
              <button
                key={k}
                type="button"
                disabled={racing || !h}
                onClick={() => { Audio.click(); setSel((c) => c.filter((_, j) => j !== k)); }}
                className="flex min-h-11 min-w-[4.5rem] items-center justify-center gap-1.5 rounded-md border border-white/30 bg-black/30 px-2 font-cond text-sm font-bold text-white disabled:opacity-60"
              >
                <span className="text-white/50">{SLOT_LABELS[k]}</span>
                {h ? (
                  <>
                    <span className="inline-block h-3 w-3 rounded-full" style={{ background: h.color }} />
                    {h.num}
                  </>
                ) : (
                  <span className="text-white/30">—</span>
                )}
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Tablero de cuotas */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Caballos y cuotas">
        {card.horses.map((h, i) => {
          const picked = sel.includes(i);
          const order = picked ? sel.indexOf(i) + 1 : 0;
          return (
            <button
              key={h.num}
              type="button"
              disabled={racing}
              onClick={() => tapHorse(i)}
              className={`relative flex items-center gap-2 rounded-md border px-2 py-2 text-left font-cond transition disabled:opacity-40 ${
                picked ? "border-signal-amber bg-signal-amber/15 ring-2 ring-signal-amber" : "border-white/20 bg-black/30 hover:bg-black/50"
              }`}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold text-black" style={{ background: h.color }}>
                {h.num}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-white">
                  {h.name}{i === favorite ? " ★" : ""}
                </span>
                <span className="block text-xs text-white/60">
                  Gana ×{h.winOdds} · Col ×{h.placeOdds}
                </span>
              </span>
              {need > 1 && order ? (
                <span className="absolute right-1 top-1 rounded bg-signal-amber px-1 text-[0.6rem] font-bold text-black">{SLOT_LABELS[order - 1]}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Cuota / premio de la selección */}
      <div className="mt-3 flex items-center justify-between rounded-md bg-black/40 px-3 py-2 font-cond text-sm">
        <span className="text-white/70">
          {ready ? <>Cuota <span className="font-bold text-signal-amber">×{odds}</span></> : `Elige ${need} caballo${need > 1 ? "s" : ""}`}
        </span>
        {ready ? <span className="text-white/70">Premio <span className="font-bold text-signal-green">{potential} pts</span></span> : null}
      </div>

      <StakeBar stake={stake} setStake={setStake} points={points} disabled={racing} />

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={racing}
          onClick={newCard}
          className="min-h-12 rounded-md border border-white/30 bg-black/30 px-4 font-cond font-bold text-white hover:bg-black/50 disabled:opacity-40"
        >
          🔄
        </button>
        <button
          type="button"
          disabled={racing || !ready || stake < 10 || stake > points}
          className="min-h-12 flex-1 rounded-md bg-signal-amber px-3 font-cond text-lg font-bold text-[#1a1200] shadow-lg shadow-black/40 hover:brightness-110 disabled:opacity-40"
          onClick={launch}
        >
          {racing ? "Corriendo…" : ready ? `APOSTAR Y CORRER · ${stake} pts` : "ELIGE TU APUESTA"}
        </button>
      </div>

      <p className="mt-4 text-center font-cond text-xs text-white/60">
        {FIELD} caballos, cuotas reales: el favorito (★) paga poco y los outsiders mucho.
        Ganador (1º), Colocado (podio top {PLACES}), Exacta (1º-2º en orden) y Trifecta
        (1º-2º-3º en orden). Pulsa 🔄 para una parrilla nueva.
      </p>
    </Felt>
  );
}
