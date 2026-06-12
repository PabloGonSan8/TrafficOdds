import { memo, useRef, useState } from "react";
import { useGameState } from "../context/GameContext";
import { ACHIEVEMENTS } from "../engine/progression";

const TABS = [
  { id: "missions", label: "📋 Misiones" },
  { id: "achievements", label: "🏆 Logros" },
  { id: "history", label: "📜 Historial" },
  { id: "stats", label: "📊 Estadísticas" },
];

const MissionsPanel = memo(function MissionsPanel({ missions }) {
  if (missions.list.length === 0) {
    return <p className="text-sm text-dim">Las misiones se generan al empezar el día.</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      {missions.list.map((m) => (
        <div
          key={m.id}
          className={`rounded-lg border p-2.5 ${
            m.done
              ? "border-[#1a5c34] bg-[#0d2e1a]"
              : "border-asphalt-700 bg-asphalt-800"
          }`}
        >
          <div className="flex items-center justify-between gap-2 text-sm sm:text-base">
            <span className={m.done ? "text-signal-green" : ""}>
              {m.done ? "✅ " : ""}{m.label}
            </span>
            <span className="whitespace-nowrap font-cond font-semibold text-sodium">
              +{m.reward} pts
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-asphalt-950">
              <div
                className={`h-full rounded-full ${m.done ? "bg-signal-green" : "bg-signal-amber"}`}
                style={{ width: `${Math.min(100, (m.progress / m.goal) * 100)}%` }}
              />
            </div>
            <span className="font-cond text-xs font-semibold text-dim">
              {Math.min(m.progress, m.goal)}/{m.goal}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
});

const AchievementsPanel = memo(function AchievementsPanel({ unlocked }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {ACHIEVEMENTS.map((a) => {
        const has = unlocked.includes(a.id);
        return (
          <div
            key={a.id}
            className={`rounded-lg border p-2.5 text-center ${
              has
                ? "border-[#4a3d18] bg-[#241c08]"
                : "border-asphalt-700 bg-asphalt-800 opacity-50"
            }`}
            title={a.desc}
          >
            <div className="text-2xl">{has ? a.icon : "🔒"}</div>
            <div className={`mt-1 font-cond text-sm font-semibold ${has ? "text-sodium" : "text-dim"}`}>
              {a.name}
            </div>
            <div className="text-[0.7rem] text-dim">{a.desc}</div>
          </div>
        );
      })}
    </div>
  );
});

const HistoryPanel = memo(function HistoryPanel({ history }) {
  return (
    <div className="flex max-h-60 flex-col gap-1 overflow-y-auto">
      {history.length === 0 ? (
        <p className="text-sm text-dim">Aún no has apostado.</p>
      ) : (
        history.map((h) => (
          <div
            className="flex justify-between gap-2.5 rounded bg-asphalt-800 px-2 py-1.5 text-xs sm:text-sm"
            key={h.ts + h.desc}
          >
            <span>{h.desc}</span>
            <span className="whitespace-nowrap text-dim">R{h.round}</span>
            <span
              className={`whitespace-nowrap font-cond font-semibold ${
                h.won ? "text-signal-green" : "text-signal-red"
              }`}
            >
              {h.won ? `+${h.delta}` : h.delta}
            </span>
          </div>
        ))
      )}
    </div>
  );
});

const StatsPanel = memo(function StatsPanel({ stats, bestStreak, level, xp }) {
  const winRate = stats.totalBets > 0 ? Math.round((stats.wins / stats.totalBets) * 100) : 0;
  const items = [
    { name: "Apuestas", value: stats.totalBets },
    { name: "Aciertos", value: stats.wins },
    { name: "% acierto", value: `${winRate}%` },
    { name: "Beneficio neto", value: stats.netProfit.toLocaleString("es-ES") },
    { name: "Mayor premio", value: stats.biggestWin.toLocaleString("es-ES") },
    { name: "Mejor racha", value: bestStreak },
    { name: "Rondas jugadas", value: stats.roundsPlayed },
    { name: "Nivel", value: level },
    { name: "XP total", value: xp.toLocaleString("es-ES") },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 min-[400px]:grid-cols-3">
      {items.map((it) => (
        <div className="rounded-md bg-asphalt-800 p-2.5 text-center" key={it.name}>
          <div className="font-cond text-lg font-semibold text-sodium sm:text-2xl">
            {it.value}
          </div>
          <div className="text-[0.7rem] uppercase tracking-wide text-dim">{it.name}</div>
        </div>
      ))}
    </div>
  );
});

export function BottomTabs() {
  const { history, stats, bestStreak, level, xp, missions, achievements } = useGameState();
  const [selected, setSelected] = useState("missions");
  const tabRefs = useRef({});

  const pendingMissions = missions.list.filter((m) => !m.done).length;

  // Patrón ARIA tabs: flechas mueven el foco, tab activo tabindex=0.
  function onKeyDown(e) {
    const idx = TABS.findIndex((t) => t.id === selected);
    let next = null;
    if (e.key === "ArrowRight") next = TABS[(idx + 1) % TABS.length].id;
    if (e.key === "ArrowLeft") next = TABS[(idx - 1 + TABS.length) % TABS.length].id;
    if (next !== null) {
      e.preventDefault();
      setSelected(next);
      tabRefs.current[next]?.focus();
    }
  }

  return (
    <section className="px-2.5 pb-4 sm:px-5 sm:pb-6">
      <div className="rounded-xl border border-asphalt-700 bg-asphalt-900 p-3 sm:p-4">
        <div
          role="tablist"
          aria-label="Información del jugador"
          className="mb-3 flex gap-1 overflow-x-auto border-b border-asphalt-700 pb-2"
          onKeyDown={onKeyDown}
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              ref={(el) => { tabRefs.current[t.id] = el; }}
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={selected === t.id}
              aria-controls={`panel-${t.id}`}
              tabIndex={selected === t.id ? 0 : -1}
              type="button"
              className={`whitespace-nowrap rounded-md px-3 py-2 font-cond text-sm font-semibold sm:text-base ${
                selected === t.id
                  ? "bg-signal-amber text-[#1a1200]"
                  : "text-dim hover:bg-asphalt-800 hover:text-ink"
              }`}
              onClick={() => setSelected(t.id)}
            >
              {t.label}
              {t.id === "missions" && pendingMissions > 0 ? (
                <span className="ml-1.5 rounded-full bg-signal-red px-1.5 text-xs text-white">
                  {pendingMissions}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <div
          role="tabpanel"
          id={`panel-${selected}`}
          aria-labelledby={`tab-${selected}`}
        >
          {selected === "missions" ? <MissionsPanel missions={missions} /> : null}
          {selected === "achievements" ? <AchievementsPanel unlocked={achievements} /> : null}
          {selected === "history" ? <HistoryPanel history={history} /> : null}
          {selected === "stats" ? (
            <StatsPanel stats={stats} bestStreak={bestStreak} level={level} xp={xp} />
          ) : null}
        </div>
      </div>
    </section>
  );
}
