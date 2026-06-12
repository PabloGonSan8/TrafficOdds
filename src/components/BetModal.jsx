import { useEffect, useRef, useState } from "react";
import { useGameState, useGameActions } from "../context/GameContext";

const QUICK_AMOUNTS = ["+50", "+100", "+250", "MAX", "C"];

/**
 * Modal de apuesta sobre <dialog> nativo: focus trap y cierre con
 * Escape los gestiona el navegador (patrón a11y "modal focus trap").
 */
export function BetModal({ market, onClose }) {
  const { points } = useGameState();
  const { placeBet } = useGameActions();
  const dialogRef = useRef(null);
  const [amount, setAmount] = useState(() => String(Math.min(50, points)));
  const [error, setError] = useState(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  const amt = parseInt(amount, 10) || 0;
  const payout = Math.round(amt * market.odds);

  function onSubmit(e) {
    e.preventDefault();
    if (amt < 10) {
      setError("La apuesta mínima es de 10 puntos.");
      return;
    }
    if (amt > points) {
      setError("No tienes puntos suficientes.");
      return;
    }
    placeBet(market, amt);
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      className="m-auto w-[calc(100%-24px)] max-w-[400px] rounded-xl border border-asphalt-700 border-t-[3px] border-t-signal-amber bg-asphalt-900 p-0 text-ink shadow-2xl shadow-black/60 backdrop:bg-black/65"
      aria-labelledby="bet-modal-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form className="m-0 p-5" onSubmit={onSubmit}>
        <h3 id="bet-modal-title" className="mb-2 font-display text-base text-signal-amber">
          {market.title}
        </h3>
        <p className="mb-3.5 text-sm text-dim">
          {market.sub} · Cuota ×{market.odds.toFixed(2)}
        </p>
        <div className="flex flex-col gap-2">
          <label htmlFor="bet-amount" className="text-sm text-dim">
            Puntos a apostar
          </label>
          <input
            type="number"
            id="bet-amount"
            min="10"
            step="10"
            max={points}
            inputMode="numeric"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-invalid={error !== null}
            aria-describedby={error !== null ? "bet-amount-error" : undefined}
            className="w-full rounded-md border border-asphalt-700 bg-asphalt-950 px-3 py-2 font-cond text-xl font-semibold text-sodium"
          />
          <div className="flex gap-1.5" role="group" aria-label="Cantidades rápidas">
            {QUICK_AMOUNTS.map((q) => (
              <button
                key={q}
                type="button"
                className="min-h-11 flex-1 rounded-md border border-asphalt-700 bg-asphalt-800 font-cond font-semibold hover:bg-asphalt-700 sm:min-h-9"
                aria-label={
                  q === "MAX" ? "Apostar todo" : q === "C" ? "Borrar cantidad" : `Sumar ${q.slice(1)} puntos`
                }
                onClick={() => {
                  // Los botones SUMAN a la cifra actual; MAX pone el total y C limpia.
                  if (q === "MAX") setAmount(String(points));
                  else if (q === "C") setAmount("0");
                  else setAmount(String(Math.min(points, amt + parseInt(q.slice(1), 10))));
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
        <p className="mb-1 mt-3.5 text-sm">
          Ganancia potencial:{" "}
          <strong className="font-cond text-lg text-signal-green">
            {payout.toLocaleString("es-ES")}
          </strong>{" "}
          pts
        </p>
        {error !== null ? (
          <p id="bet-amount-error" className="mt-1 text-sm text-signal-red" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-4 flex justify-end gap-2.5">
          <button
            type="button"
            className="min-h-11 rounded-md border border-asphalt-700 px-4 font-cond text-base font-semibold text-dim hover:text-ink sm:min-h-10"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="min-h-11 rounded-md bg-signal-green px-4 font-cond text-base font-semibold text-[#06210f] hover:brightness-110 sm:min-h-10"
          >
            Confirmar
          </button>
        </div>
      </form>
    </dialog>
  );
}
