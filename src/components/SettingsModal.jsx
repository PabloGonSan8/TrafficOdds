import { useEffect, useRef, useState } from "react";
import { useGameState, useGameActions } from "../context/GameContext";

export function SettingsModal({ onClose }) {
  const { soundOn, musicOn } = useGameState();
  const { toggleSound, toggleMusic, resetGame } = useGameActions();
  const dialogRef = useRef(null);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="m-auto w-[calc(100%-24px)] max-w-[400px] rounded-xl border border-asphalt-700 border-t-[3px] border-t-signal-amber bg-asphalt-900 p-0 text-ink shadow-2xl shadow-black/60 backdrop:bg-black/65"
      aria-labelledby="settings-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="p-5">
        <h2 id="settings-title" className="mb-4 font-display text-base text-signal-amber">
          ⚙️ Ajustes
        </h2>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-asphalt-700 bg-asphalt-800 p-3">
          <span className="text-sm font-semibold">Efectos de sonido</span>
          <button
            type="button"
            role="switch"
            aria-checked={soundOn}
            className={`min-h-9 rounded-md px-4 font-cond font-semibold ${
              soundOn
                ? "bg-signal-green text-[#06210f]"
                : "border border-asphalt-700 text-dim"
            }`}
            onClick={toggleSound}
          >
            {soundOn ? "Activado" : "Apagado"}
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-asphalt-700 bg-asphalt-800 p-3">
          <span className="text-sm font-semibold">Música de fondo</span>
          <button
            type="button"
            role="switch"
            aria-checked={musicOn}
            className={`min-h-9 rounded-md px-4 font-cond font-semibold ${
              musicOn
                ? "bg-signal-green text-[#06210f]"
                : "border border-asphalt-700 text-dim"
            }`}
            onClick={toggleMusic}
          >
            {musicOn ? "Activada" : "Apagada"}
          </button>
        </div>

        <div className="mt-3 rounded-lg border border-[#5c1a1a] bg-[#2e0d0d] p-3">
          <p className="mb-2 text-sm">
            <strong className="text-signal-red">Zona de peligro:</strong> reiniciar borra
            puntos, historial, misiones y logros. No se puede deshacer.
          </p>
          {confirmReset ? (
            <div className="flex gap-2">
              <button
                type="button"
                className="min-h-10 flex-1 rounded-md bg-signal-red px-3 font-cond font-semibold text-white hover:brightness-110"
                onClick={resetGame}
              >
                Sí, borrar todo
              </button>
              <button
                type="button"
                className="min-h-10 flex-1 rounded-md border border-asphalt-700 px-3 font-cond font-semibold text-dim hover:text-ink"
                onClick={() => setConfirmReset(false)}
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="min-h-10 w-full rounded-md border border-signal-red px-3 font-cond font-semibold text-signal-red hover:bg-signal-red/10"
              onClick={() => setConfirmReset(true)}
            >
              Reiniciar partida…
            </button>
          )}
        </div>

        <button
          type="button"
          className="mt-4 min-h-11 w-full rounded-md border border-asphalt-700 px-4 font-cond text-base font-semibold text-dim hover:text-ink"
          onClick={onClose}
        >
          Cerrar
        </button>
      </div>
    </dialog>
  );
}
