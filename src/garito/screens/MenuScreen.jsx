import { Btn } from "../components/Button";
import { DIFFICULTIES, TARGETS } from "../game/data";

export function MenuScreen({ bestHand, bestRound, cream, gold, newGame, savedRun, continueGame }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-sm w-full fadein">
        <div className="text-7xl mb-4">🎲</div>
        <h1 className="font-serif text-6xl font-black tracking-tight mb-1" style={{ color: gold }}>GARITO</h1>
        <p className="mb-6 text-sm uppercase tracking-widest" style={{ color: cream, opacity: 0.7 }}>
          Un roguelike de dados
        </p>
        <p className="mb-6 text-sm leading-relaxed" style={{ color: cream, opacity: 0.85 }}>
          Lanza, guarda y relanza. Compra amuletos, dados especiales y recetas, y sobrevive a los garitos jefe.
          {(bestRound > 0 || bestHand > 0) && (
            <span className="block mt-2" style={{ color: gold }}>
              Récord: garito {bestRound}{bestRound > TARGETS.length ? " ♾️" : ""} · mejor jugada {bestHand} pts
            </span>
          )}
        </p>

        {savedRun && (
          <div className="mb-5">
            <Btn className="w-full" onClick={continueGame}>
              ▶ Continuar partida
              <span className="block text-xs font-normal opacity-80">
                Garito {savedRun.round + 1}{savedRun.endless ? " ♾️" : ""} · modo {(DIFFICULTIES.find((d) => d.id === savedRun.diffId) || {}).name} · {savedRun.money}€
              </span>
            </Btn>
            <p className="text-xs mt-2 uppercase tracking-widest" style={{ color: cream, opacity: 0.45 }}>
              — o empieza de nuevo —
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {DIFFICULTIES.map((d) => (
            <Btn key={d.id} variant={savedRun ? "ghost" : d.id === "clasico" ? "gold" : "ghost"} onClick={() => newGame(d)}>
              {d.icon} {d.name} <span className="font-normal text-xs opacity-70">— {d.desc}</span>
            </Btn>
          ))}
        </div>
        {savedRun && (
          <p className="text-xs mt-3" style={{ color: cream, opacity: 0.45 }}>
            Empezar una nueva partida sobrescribe la guardada
          </p>
        )}
      </div>
    </div>
  );
}
