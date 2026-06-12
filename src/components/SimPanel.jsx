import { memo } from "react";
import { PHASE_DURATIONS } from "../hooks/useGame";
import { useGameState, useGameMeta } from "../context/GameContext";

const PHASE_TEXT = {
  betting: "APUESTAS ABIERTAS",
  running: "EN CARRETERA",
  results: "RESULTADOS",
};

const PHASE_STYLES = {
  betting: "border-[#1a5c34] bg-[#0d2e1a] text-signal-green",
  running: "border-[#5c4a1a] bg-[#2e240d] text-signal-amber",
  results: "border-[#5c1a1a] bg-[#2e0d0d] text-signal-red",
};

const COUNT_CHIPS = [
  { type: "coche", icon: "🚗", label: "coches" },
  { type: "moto", icon: "🏍️", label: "motos" },
  { type: "camion", icon: "🚚", label: "camiones" },
  { type: "autobus", icon: "🚌", label: "autobuses" },
  { type: "especial", icon: "🚑", label: "especiales" },
  { type: "total", icon: "Σ", label: "total" },
];

const LiveCounts = memo(function LiveCounts({ counts }) {
  return (
    <div
      className="mt-2.5 grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap sm:gap-2"
      aria-label="Recuento de vehículos de la ronda"
    >
      {COUNT_CHIPS.map((c) => (
        <div
          key={c.type}
          className={`rounded-md border px-2 py-1.5 text-center font-cond text-sm font-semibold sm:min-w-[70px] sm:px-3.5 sm:text-lg ${
            c.type === "total"
              ? "border-[#4a3d18] bg-[#241c08]"
              : "border-asphalt-700 bg-asphalt-800"
          }`}
        >
          {c.icon}{" "}
          <span
            className={c.type === "total" ? "ml-0.5 text-sodium" : "ml-0.5 text-signal-green"}
            aria-label={c.label}
          >
            {counts[c.type]}
          </span>
        </div>
      ))}
    </div>
  );
});

const RoundSummary = memo(function RoundSummary({ summary }) {
  return (
    <div className="mt-2.5 rounded-lg border border-[#4a3d18] bg-[#241c08] px-3 py-2 text-center font-cond text-sm sm:text-base">
      <span className="text-sodium">Resumen:</span> {summary.total} vehículos · dominante{" "}
      {summary.dominantEmoji} {summary.dominantLabel}
      {summary.eventLabel !== null ? (
        <span className="text-dim"> · {summary.eventLabel}</span>
      ) : null}
    </div>
  );
});

export function SimPanel() {
  const { phase, remaining, counts, roundSummary } = useGameState();
  const { attachCanvas } = useGameMeta();
  const total = PHASE_DURATIONS[phase];
  return (
    <section
      className="rounded-xl border border-asphalt-700 bg-asphalt-900 p-2.5 shadow-xl shadow-black/50 sm:p-3.5"
      aria-label="Simulación de tráfico"
    >
      <div className="mb-2 flex items-center gap-2 sm:mb-3 sm:gap-3">
        <span
          className={`whitespace-nowrap rounded-md border px-2 py-1 font-display text-[0.65rem] sm:px-3 sm:py-1.5 sm:text-sm ${PHASE_STYLES[phase]}`}
        >
          {PHASE_TEXT[phase]}
        </span>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-asphalt-950" aria-hidden="true">
          <div
            className="h-full rounded-full bg-gradient-to-r from-signal-green to-signal-amber transition-[width] duration-1000 ease-linear"
            style={{ width: `${Math.max(0, (remaining / total) * 100)}%` }}
          />
        </div>
        <span className="min-w-9 text-right font-cond text-base font-semibold text-dim sm:min-w-11 sm:text-xl">
          {remaining}s
        </span>
      </div>

      <canvas
        ref={attachCanvas}
        width="900"
        height="260"
        className="block h-auto w-full rounded-lg border border-asphalt-700 bg-asphalt-950"
        role="img"
        aria-label="Carretera virtual con vehículos pasando"
      />

      <LiveCounts counts={counts} />

      {phase === "results" && roundSummary !== null ? (
        <RoundSummary summary={roundSummary} />
      ) : null}
    </section>
  );
}
