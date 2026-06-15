import { Link } from "react-router-dom";
import { useGameState, useGameActions } from "../context/GameContext";
import { WatchAdButton } from "./ads/WatchAdButton";

export function TopBar({ onOpenSettings }) {
  const { clock, points, streak, level, levelProgress, soundOn, musicOn } = useGameState();
  const { toggleSound, toggleMusic } = useGameActions();

  return (
    <header className="flex flex-wrap items-center justify-between gap-2 border-b-[3px] border-signal-amber bg-gradient-to-b from-asphalt-800 to-asphalt-900 px-3 py-2.5 shadow-lg shadow-black/50 sm:px-5 sm:py-3.5">
      <div className="flex items-center gap-3">
        <Link to="/" className="font-display text-lg tracking-wide sm:text-2xl" aria-label="Volver al lobby">
          🚦 Traffic<span className="text-signal-amber">Odds</span>
        </Link>
        <div
          className="flex items-center gap-1.5"
          title={`Nivel ${level}`}
          aria-label={`Nivel ${level}, progreso ${Math.round(levelProgress * 100)}%`}
        >
          <span className="rounded-md bg-signal-amber px-1.5 py-0.5 font-cond text-xs font-semibold text-[#1a1200] sm:text-sm">
            NIVEL {level}
          </span>
          <div className="h-1.5 w-12 overflow-hidden rounded-full bg-asphalt-950 sm:w-20" aria-hidden="true">
            <div
              className="h-full rounded-full bg-signal-amber transition-[width] duration-500"
              style={{ width: `${Math.round(levelProgress * 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div
          className="min-w-16 rounded-md border border-asphalt-700 bg-black px-2.5 py-1 text-center font-cond text-base font-semibold tracking-[2px] text-signal-green sm:min-w-20 sm:text-xl"
          aria-label="Hora virtual"
        >
          {clock}
        </div>
        <div
          className="rounded-md border border-[#4a3d18] bg-gradient-to-b from-[#2a2410] to-[#1c1808] px-3 py-1 font-cond text-lg font-semibold text-sodium sm:text-2xl"
          aria-live="polite"
        >
          {points.toLocaleString("es-ES")} <small className="text-xs text-dim">PTS</small>
        </div>
        <div
          className={`rounded-md border px-2.5 py-1 font-cond text-sm font-semibold sm:text-lg ${
            streak >= 3
              ? "border-signal-red text-signal-red"
              : "border-asphalt-700 bg-asphalt-800"
          }`}
          title="Racha de aciertos"
          aria-label="Racha de aciertos"
        >
          🔥 {streak}
        </div>
        <button
          type="button"
          className="min-h-9 min-w-9 rounded-md border border-asphalt-700 bg-asphalt-800 text-base hover:bg-asphalt-700"
          aria-label={soundOn ? "Silenciar sonido" : "Activar sonido"}
          aria-pressed={soundOn}
          onClick={toggleSound}
        >
          {soundOn ? "🔊" : "🔇"}
        </button>
        <button
          type="button"
          className={`min-h-9 min-w-9 rounded-md border text-base hover:bg-asphalt-700 ${
            musicOn ? "border-signal-amber bg-asphalt-800" : "border-asphalt-700 bg-asphalt-800 opacity-60"
          }`}
          aria-label={musicOn ? "Apagar música" : "Encender música"}
          aria-pressed={musicOn}
          onClick={toggleMusic}
        >
          🎵
        </button>
        <WatchAdButton />
        <button
          type="button"
          className="min-h-9 min-w-9 rounded-md border border-asphalt-700 bg-asphalt-800 text-base hover:bg-asphalt-700"
          aria-label="Ajustes"
          onClick={onOpenSettings}
        >
          ⚙️
        </button>
      </div>
    </header>
  );
}
