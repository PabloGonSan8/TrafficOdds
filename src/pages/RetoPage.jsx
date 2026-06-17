import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { RoadRenderer } from "../engine/roadRenderer";
import {
  dailyOutcome,
  dailyQuestions,
  dailyRivals,
  scoreEntry,
  rank,
  loadReto,
  todaysEntry,
  saveEntry,
  todayStr,
} from "../engine/challenge";

const MEDAL = ["🥇", "🥈", "🥉"];

/** Calcula tabla y resultado a partir de unas respuestas (deterministas). */
function buildResult(outcome, questions, answers, exactGuess) {
  const player = scoreEntry(answers, exactGuess, outcome, questions);
  const rivals = dailyRivals(outcome, questions);
  const me = { name: "Tú", ...player, exactGuess };
  return { ...rank(me, rivals), player };
}

function Records({ r }) {
  const cells = [
    { k: "🔥 Racha", v: `${r.streak || 0} días` },
    { k: "🏅 Mejor puesto", v: r.bestPosition && r.bestPosition < 99 ? `#${r.bestPosition}` : "—" },
    { k: "🎯 Mejor acierto", v: `${r.bestCorrect || 0}/3` },
    { k: "📅 Jugados", v: r.played || 0 },
  ];
  return (
    <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {cells.map((c) => (
        <div key={c.k} className="rounded-lg border border-asphalt-700 bg-asphalt-800 px-3 py-2 text-center">
          <div className="font-cond text-xs text-dim">{c.k}</div>
          <div className="font-display text-base text-ink">{c.v}</div>
        </div>
      ))}
    </div>
  );
}

/** Reproduce el guion determinista del día sobre el canvas. */
function RoundPlayback({ outcome, onDone }) {
  const canvasRef = useRef(null);
  const [counts, setCounts] = useState({ coche: 0, moto: 0, camion: 0, autobus: 0, especial: 0, total: 0 });
  const [banner, setBanner] = useState(null);
  const [secs, setSecs] = useState(outcome.duration);

  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      // Sin animación: revelar de inmediato con el recuento real.
      setCounts(outcome.actual);
      const t = setTimeout(onDone, 400);
      return () => clearTimeout(t);
    }
    const renderer = new RoadRenderer(canvasRef.current, false);
    const tally = { coche: 0, moto: 0, camion: 0, autobus: 0, especial: 0, total: 0 };
    let raf, idx = 0, elapsed = 0, last = performance.now(), eventShown = false, done = false;
    let lastSec = -1;

    function loop(now) {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      elapsed += dt;

      // El dibujo es imperativo (canvas), NO pasa por React. Solo refrescamos
      // los chips de React cuando hay un coche nuevo, y el reloj 1 vez/seg.
      let spawned = false;
      while (idx < outcome.schedule.length && outcome.schedule[idx].t <= elapsed) {
        const { type } = outcome.schedule[idx++];
        renderer.spawn(type);
        tally[type]++;
        tally.total++;
        spawned = true;
      }
      if (spawned) setCounts({ ...tally });
      const sec = Math.max(0, Math.ceil(outcome.duration - elapsed));
      if (sec !== lastSec) {
        lastSec = sec;
        setSecs(sec);
      }

      const revealed = outcome.revealAt !== null && elapsed >= outcome.revealAt;
      if (revealed && !eventShown) {
        setBanner(outcome.event.label);
        eventShown = true;
      }
      renderer.draw(dt, { hour: outcome.hour, raining: revealed && outcome.event?.id === "lluvia" });

      if (elapsed < outcome.duration + 1.6) {
        raf = requestAnimationFrame(loop);
      } else if (!done) {
        done = true;
        onDone();
      }
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chips = [
    ["🚗", counts.coche], ["🏍️", counts.moto], ["🚚", counts.camion],
    ["🚌", counts.autobus], ["🚑", counts.especial], ["Σ", counts.total],
  ];
  return (
    <div className="mt-4">
      {banner ? (
        <div className="mb-2 rounded-lg border border-signal-amber bg-[#2e240d] px-3 py-2 text-center font-cond text-sm text-signal-amber">
          {banner}
        </div>
      ) : null}
      <div className="mb-2 flex items-center justify-between font-cond text-sm">
        <span className="rounded-md border border-[#5c4a1a] bg-[#2e240d] px-2 py-1 text-signal-amber">EN CARRETERA</span>
        <span className="text-dim">{secs}s</span>
      </div>
      <canvas
        ref={canvasRef}
        width="900"
        height="260"
        className="block h-auto w-full rounded-lg border border-asphalt-700 bg-asphalt-950"
        role="img"
        aria-label="Ronda de tráfico del reto en curso"
      />
      <div className="mt-2 grid grid-cols-6 gap-1.5">
        {chips.map(([icon, n], i) => (
          <div key={i} className="rounded-md border border-asphalt-700 bg-asphalt-800 px-1 py-1.5 text-center font-cond text-sm">
            {icon} <span className="text-signal-green">{n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RetoPage() {
  const date = todayStr();
  const outcome = useMemo(() => dailyOutcome(date), [date]);
  const questions = useMemo(() => dailyQuestions(outcome), [outcome]);

  const [reto, setReto] = useState(() => loadReto());
  const existing = todaysEntry(reto, date);

  const [answers, setAnswers] = useState(() => existing?.answers ?? [null, null, null]);
  const [exact, setExact] = useState(() => existing?.exactGuess ?? outcome.expectedTotal);
  const [phase, setPhase] = useState(existing ? "done" : "form");
  const [copied, setCopied] = useState(false);

  const ready = answers.every((a) => a !== null);
  const submitted = phase === "done" ? existing : null;
  const result = useMemo(
    () => (submitted ? buildResult(outcome, questions, submitted.answers, submitted.exactGuess) : null),
    [submitted, outcome, questions]
  );

  function submit() {
    if (!ready) return;
    const res = buildResult(outcome, questions, answers, exact);
    const next = saveEntry(reto, {
      date,
      answers,
      exactGuess: exact,
      correct: res.player.correct,
      position: res.position,
    });
    setReto({ ...next });
    setPhase("running"); // se juega la ronda animada antes de ver el resultado
  }

  function share() {
    const marks = questions.list
      .map((item, i) => (submitted.answers[i] === item.answer ? "✅" : "❌"))
      .join("");
    const text =
      `🚦 Reto TrafficOdds ${date}\n` +
      `${marks}  ·  Puesto ${result.position}/${result.total}\n` +
      `Mi cifra: ${submitted.exactGuess} (real: ${outcome.actual.total})\n` +
      `${typeof location !== "undefined" ? location.origin + "/reto" : ""}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }

  const locked = phase !== "form";
  const shownAnswers = phase === "form" ? answers : (existing?.answers ?? answers);

  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-6">
      <Link to="/" className="font-cond text-sm text-dim hover:text-signal-amber">← Lobby</Link>

      <header className="mt-2 text-center">
        <h1 className="font-display text-2xl sm:text-3xl">🏁 Reto Diario</h1>
        <p className="mx-auto mt-1 max-w-md text-sm text-dim">
          La misma ronda de tráfico para todo el mundo, cada día. Predice cómo
          acabará, juégala y compite en la tabla. Sin puntos: solo honor.
        </p>
      </header>

      <div className="mt-4 rounded-xl border border-asphalt-700 bg-asphalt-900 p-3 text-center">
        <span className="font-cond text-sm text-dim">Estimación de tráfico de hoy: </span>
        <span className="font-display text-lg text-signal-amber">~{outcome.expectedTotal} vehículos</span>
        <p className="mt-1 text-xs text-dim">Ojo: un evento sorpresa puede alterarlo todo.</p>
      </div>

      {/* Preguntas */}
      <div className="mt-4 space-y-2.5">
        {questions.list.map((item, i) => {
          const reveal = phase === "done" ? item.answer : null;
          const mine = shownAnswers[i];
          return (
            <div key={i} className="rounded-xl border border-asphalt-700 bg-asphalt-900 p-3">
              <p className="font-cond text-sm text-ink sm:text-base">{item.q}</p>
              <div className="mt-2 flex gap-2">
                {[true, false].map((val) => {
                  const picked = mine === val;
                  const correct = phase === "done" && val === reveal;
                  return (
                    <button
                      key={String(val)}
                      type="button"
                      disabled={locked}
                      onClick={() => setAnswers((a) => a.map((x, j) => (j === i ? val : x)))}
                      className={`flex-1 rounded-lg border px-3 py-2 font-display text-sm transition ${
                        correct
                          ? "border-signal-green bg-[#0d2e1a] text-signal-green"
                          : picked
                          ? "border-signal-amber bg-[#2e240d] text-signal-amber"
                          : "border-asphalt-700 bg-asphalt-800 text-dim hover:border-asphalt-600"
                      } ${phase === "done" && picked && val !== reveal ? "!border-signal-red !text-signal-red" : ""}`}
                    >
                      {val ? "Sí" : "No"}
                      {correct ? " ✓" : ""}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="rounded-xl border border-asphalt-700 bg-asphalt-900 p-3">
          <label className="font-cond text-sm text-ink sm:text-base">
            Desempate: ¿cuántos vehículos exactos pasarán?
          </label>
          <input
            type="number"
            min="0"
            value={exact}
            disabled={locked}
            onChange={(e) => setExact(Math.max(0, parseInt(e.target.value || "0", 10)))}
            className="mt-2 w-full rounded-lg border border-asphalt-700 bg-asphalt-950 px-3 py-2 font-display text-lg text-ink disabled:opacity-60"
          />
          {phase === "done" ? (
            <p className="mt-1 text-xs text-dim">
              Real: <span className="text-signal-amber">{outcome.actual.total}</span> · tu cifra: {submitted.exactGuess}
            </p>
          ) : null}
        </div>
      </div>

      {phase === "form" ? (
        <button
          type="button"
          onClick={submit}
          disabled={!ready}
          className="mt-4 w-full rounded-xl border border-signal-amber bg-signal-amber/15 px-4 py-3 font-display text-lg text-signal-amber transition hover:bg-signal-amber/25 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {ready ? "Salir a carretera 🚦" : "Responde las 3 preguntas"}
        </button>
      ) : null}

      {phase === "running" ? (
        <RoundPlayback outcome={outcome} onDone={() => setPhase("done")} />
      ) : null}

      {phase === "done" ? (
        <>
          <div className="mt-4 rounded-xl border border-asphalt-700 bg-asphalt-900 p-3">
            <h2 className="mb-2 font-display text-lg text-signal-amber">
              Clasificación de hoy · {result.player.correct}/3 aciertos
            </h2>
            <ol className="space-y-1">
              {result.board.map((e, idx) => (
                <li
                  key={idx}
                  className={`flex items-center justify-between rounded-lg px-3 py-1.5 font-cond text-sm ${
                    e.you ? "border border-signal-amber bg-[#2e240d] text-signal-amber" : "text-dim"
                  }`}
                >
                  <span>
                    <span className="inline-block w-7">{MEDAL[idx] || `${idx + 1}.`}</span>
                    {e.you ? "Tú" : e.name}
                  </span>
                  <span>{e.correct}/3 · ±{e.exactDelta}</span>
                </li>
              ))}
            </ol>
          </div>

          <button
            type="button"
            onClick={share}
            className="mt-3 w-full rounded-xl border border-signal-green bg-[#0d2e1a] px-4 py-3 font-display text-base text-signal-green transition hover:bg-[#103a22]"
          >
            {copied ? "¡Copiado!" : "📋 Compartir resultado"}
          </button>
          <p className="mt-3 text-center font-cond text-sm text-dim">Vuelve mañana para un nuevo reto 🌅</p>
        </>
      ) : null}

      <Records r={reto.records || {}} />
    </main>
  );
}
