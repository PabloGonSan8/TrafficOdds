import { memo } from "react";
import { useGameState } from "../context/GameContext";

function oddsDirection(current, original) {
  if (current > original + 0.01) return "up";
  if (current < original - 0.01) return "down";
  return "same";
}

const DIR_INDICATOR = {
  up: { arrow: "▲", color: "text-signal-green" },
  down: { arrow: "▼", color: "text-signal-red" },
  same: { arrow: "·", color: "text-dim" },
};

const MarketCard = memo(function MarketCard({ market, locked, liveOdds, phase, onPick }) {
  const displayOdds = phase === "running" && liveOdds !== undefined ? liveOdds : market.odds;
  const isLive = phase === "running";
  const dir = isLive ? oddsDirection(displayOdds, market.odds) : "same";
  const { arrow, color } = DIR_INDICATOR[dir];

  return (
    <div
      className={`flex items-center justify-between gap-2.5 rounded-lg border bg-asphalt-800 p-2.5 ${
        locked ? "opacity-55" : ""
      } ${isLive ? "border-signal-amber/40" : "border-asphalt-700"}`}
    >
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate sm:text-[0.95rem]">{market.title}</div>
        <div className="text-xs text-dim truncate">{market.sub}</div>
        {isLive ? (
          <span className="inline-block mt-0.5 text-[10px] font-bold uppercase tracking-wider text-signal-amber animate-pulse">
            ● En vivo
          </span>
        ) : null}
      </div>
      {locked ? (
        <span
          className="whitespace-nowrap rounded-md border border-asphalt-700 px-3 py-2 font-cond text-sm font-semibold text-dim"
          aria-label={`Bloqueado: requiere nivel ${market.minLevel}`}
        >
          🔒 Nivel {market.minLevel}
        </span>
      ) : (
        <button
          type="button"
          disabled={isLive}
          className={`min-h-11 min-w-[72px] rounded-md border px-3 font-cond text-base font-semibold transition sm:min-h-9 sm:min-w-16 sm:text-lg ${
            isLive
              ? "cursor-default border-signal-amber/30 bg-signal-amber/10 text-signal-amber"
              : "cursor-pointer border-[#1a5c34] bg-[#0d2e1a] text-signal-green hover:-translate-y-px hover:bg-[#134224]"
          }`}
          aria-label={
            isLive
              ? `Cuota en vivo: ${displayOdds.toFixed(2)}`
              : `Apostar a: ${market.title}, cuota ${displayOdds.toFixed(2)}`
          }
          onClick={() => !isLive && onPick(market)}
        >
          <span className="flex items-center gap-1">
            <span className={`text-[10px] ${color}`}>{arrow}</span>
            <span className={isLive ? "text-signal-amber" : "text-signal-green"}>
              ×{displayOdds.toFixed(2)}
            </span>
          </span>
        </button>
      )}
    </div>
  );
});

const RESULT_BORDER = {
  pending: "border-l-signal-amber",
  won: "border-l-signal-green",
  lost: "border-l-signal-red opacity-75",
};

const ActiveBet = memo(function ActiveBet({ bet, result }) {
  const kind = result === null ? "pending" : result.won ? "won" : "lost";
  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-md border-l-[3px] bg-asphalt-800 px-2.5 py-2 text-xs sm:text-sm ${RESULT_BORDER[kind]}`}
    >
      <span className="truncate">{bet.market.title}</span>
      <span className="whitespace-nowrap font-cond font-semibold shrink-0">
        {bet.stake} pts ×{bet.market.odds.toFixed(2)}
      </span>
      {result !== null ? (
        <span
          className={`whitespace-nowrap font-bold shrink-0 ${
            result.won ? "text-signal-green" : "text-signal-red"
          }`}
        >
          {result.won ? `+${result.payout}` : `−${bet.stake}`}
        </span>
      ) : null}
    </div>
  );
});

export function BetPanel({ onPick }) {
  const { phase, roundNumber, market, playerBets, results, level, liveOdds } = useGameState();
  return (
    <aside
      className="rounded-xl border border-asphalt-700 bg-asphalt-900 p-3 shadow-xl shadow-black/50 sm:p-4"
      aria-label="Mercado de apuestas"
    >
      <h2 className="mb-3 flex items-baseline justify-between font-display text-sm text-signal-amber sm:text-base">
        Mercado{" "}
        <span className="font-cond text-sm font-medium text-dim">· Ronda {roundNumber}</span>
      </h2>
      <div id="bet-market" className="flex flex-col gap-2 outline-none" tabIndex={-1}>
        {phase === "results" ? (
          <p className="py-4 text-center font-cond tracking-wide text-dim sm:text-lg">
            ⏳ Preparando próxima ronda…
          </p>
        ) : (
          market.map((m, i) => (
            <MarketCard
              key={m.id}
              market={m}
              locked={level < m.minLevel}
              liveOdds={liveOdds[i]}
              phase={phase}
              onPick={onPick}
            />
          ))
        )}
      </div>
      <h3 className="mt-4 border-t border-dashed border-asphalt-700 pt-3 font-cond text-sm font-semibold uppercase tracking-wide text-dim sm:text-base">
        Tus apuestas
      </h3>
      <div className="mt-2 flex flex-col gap-1.5" aria-live="polite">
        {playerBets.length === 0 ? (
          <p className="text-sm text-dim">Sin apuestas esta ronda.</p>
        ) : (
          playerBets.map((pb, i) => (
            <ActiveBet key={i} bet={pb} result={results ? results[i] : null} />
          ))
        )}
      </div>
    </aside>
  );
}
