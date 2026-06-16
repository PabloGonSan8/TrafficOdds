import { useState } from "react";
import { Link } from "react-router-dom";
import { useGameState } from "../../context/GameContext";

/**
 * Felt — armazón común de las mesas de casino: enlace al lobby, marcador de
 * saldo/apuesta y el cajón de fieltro con borde de madera. Cada juego mete
 * dentro sus propios controles.
 *
 * `help`: reglas para quien no sepa jugar. Botón "?" junto al título las
 * despliega. Puede ser texto u JSX.
 */
export function Felt({ title, icon, stake = null, bg = "#0f6b35,#0a4f27", help = null, children }) {
  const { points } = useGameState();
  const [showHelp, setShowHelp] = useState(false);
  const [from, to] = bg.split(",");
  return (
    <main className="mx-auto max-w-3xl p-3 sm:p-5">
      <Link to="/" className="font-cond text-sm font-semibold text-dim hover:text-ink">
        ← Volver al lobby
      </Link>

      <div
        className="mt-2 rounded-2xl border-4 border-[#5d3a1a] p-3 shadow-2xl shadow-black/60 sm:p-5"
        style={{ background: `radial-gradient(ellipse at top, ${from}, ${to} 70%)` }}
      >
        <div className="mb-3 flex items-center justify-between rounded-lg bg-black/30 px-3 py-2">
          <div className="font-cond text-sm font-semibold text-white sm:text-base">
            Saldo: <span className="text-sodium">{points.toLocaleString("es-ES")} pts</span>
          </div>
          {stake !== null ? (
            <div className="font-cond text-sm font-semibold text-white sm:text-base">
              Apuesta: <span className="text-signal-amber">{stake.toLocaleString("es-ES")} pts</span>
            </div>
          ) : null}
        </div>

        <div className="relative mb-3 flex items-center justify-center">
          <h1 className="text-center font-display text-xl tracking-wide text-signal-amber drop-shadow-[0_0_8px_rgba(255,176,32,0.5)] sm:text-2xl">
            {icon} {title}
          </h1>
          {help ? (
            <button
              type="button"
              aria-expanded={showHelp}
              aria-label="Cómo jugar"
              onClick={() => setShowHelp((v) => !v)}
              className="absolute right-0 flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-black/40 font-cond text-base font-bold text-white hover:bg-black/60"
            >
              ?
            </button>
          ) : null}
        </div>

        {help && showHelp ? (
          <div className="mb-3 rounded-lg border border-white/20 bg-black/40 p-3 font-cond text-sm leading-relaxed text-white/85">
            <div className="mb-1 font-bold text-signal-amber">Cómo jugar</div>
            {help}
          </div>
        ) : null}

        {children}
      </div>
    </main>
  );
}
