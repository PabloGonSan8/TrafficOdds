import { useEffect, useRef } from "react";
import { useGameActions } from "../context/GameContext";

const STEPS = [
  {
    icon: "🚦",
    title: "Tráfico virtual",
    text: "Una simulación genera vehículos sin parar: coches, motos, camiones… La hora virtual va acelerada y hay horas punta, madrugadas tranquilas y eventos sorpresa.",
  },
  {
    icon: "🎟️",
    title: "Apuesta puntos",
    text: "Cada ronda abre un mercado: más/menos vehículos, rangos, comparativas… Apuesta tus puntos antes de que cierre. Sin dinero real, solo puntos del juego.",
  },
  {
    icon: "⭐",
    title: "Progresa",
    text: "Gana XP con cada apuesta, sube de nivel para desbloquear mercados nuevos, completa misiones diarias y caza los logros. Bonus diario al volver cada día.",
  },
];

export function TutorialModal() {
  const { dismissTutorial } = useGameActions();
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="m-auto w-[calc(100%-24px)] max-w-[440px] rounded-xl border border-asphalt-700 border-t-[3px] border-t-signal-amber bg-asphalt-900 p-0 text-ink shadow-2xl shadow-black/60 backdrop:bg-black/70"
      aria-labelledby="tutorial-title"
      onCancel={dismissTutorial}
    >
      <div className="p-5 sm:p-6">
        <h2 id="tutorial-title" className="mb-4 font-display text-lg text-signal-amber">
          ¡Bienvenido a TrafficOdds!
        </h2>
        <div className="flex flex-col gap-4">
          {STEPS.map((s) => (
            <div key={s.title} className="flex gap-3">
              <div className="text-3xl">{s.icon}</div>
              <div>
                <h3 className="font-cond text-base font-semibold text-sodium">{s.title}</h3>
                <p className="text-sm text-dim">{s.text}</p>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="mt-5 min-h-11 w-full rounded-md bg-signal-green px-4 font-cond text-lg font-semibold text-[#06210f] hover:brightness-110"
          onClick={dismissTutorial}
        >
          ¡A jugar! 🏁
        </button>
      </div>
    </dialog>
  );
}
