import { Btn } from "../components/Button";
import { TARGETS } from "../game/data";

export function EndScreen({ cream, diff, endless, goEndless, gold, jokers, money, newGame, phase, red, round, score, setPhase, stats, target }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {phase === "win" &&
        Array.from({ length: 14 }).map((_, i) => (
          <span key={i} className="confetti absolute text-2xl" style={{ left: `${(i * 7.3) % 100}%`, top: -30, animationDelay: `${(i * 0.37) % 2.2}s` }}>
            {["🎉", "🎲", "💶", "🍻"][i % 4]}
          </span>
        ))}
      <div className="text-center max-w-sm fadein">
        <div className="text-7xl mb-4">{phase === "win" ? "🏆" : "💀"}</div>
        <h1 className="font-serif text-4xl font-black mb-3" style={{ color: phase === "win" ? gold : red }}>
          {phase === "win" ? "¡Has limpiado los 8 garitos!" : "Te han echado del garito"}
        </h1>
        <p className="mb-3 text-sm" style={{ color: cream, opacity: 0.85 }}>
          {phase === "win"
            ? `Modo ${diff.name} completado con ${jokers.length} amuletos y ${money}€. ¿Te atreves con el modo infinito?`
            : `Llegaste al garito ${round + 1}${endless ? " ♾️" : ` de ${TARGETS.length}`} con ${score} de ${target} puntos en modo ${diff.name}.`}
        </p>
        <p className="mb-6 text-xs font-mono" style={{ color: cream, opacity: 0.6 }}>
          Jugadas: {stats.hands} · Mejor jugada: {stats.best} pts
        </p>
        <div className="flex flex-col gap-3">
          {phase === "win" && <Btn onClick={goEndless}>♾️ Modo infinito — sigue hasta caer</Btn>}
          <Btn variant={phase === "win" ? "ghost" : "gold"} onClick={() => newGame()}>
            {phase === "win" ? "Otra partida" : "Volver a intentarlo"}
          </Btn>
          <Btn variant="ghost" onClick={() => setPhase("menu")}>Volver al menú</Btn>
        </div>
      </div>
    </div>
  );
}
