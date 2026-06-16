import { useState } from "react";

/**
 * GameHelp — botón "?" con panel de reglas, para las mesas que no usan el
 * armazón <Felt> (ruleta, slots, blackjack, bacará). Colócalo justo debajo del
 * marcador: muestra un botón "Cómo jugar" alineado a la derecha y, al pulsarlo,
 * despliega las reglas.
 */
export function GameHelp({ help }) {
  const [open, setOpen] = useState(false);
  if (!help) return null;
  return (
    <div className="mb-3">
      <div className="flex justify-end">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 rounded-full border border-white/30 bg-black/40 px-3 py-1 font-cond text-sm font-semibold text-white hover:bg-black/60"
        >
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-xs font-bold">?</span>
          Cómo jugar
        </button>
      </div>
      {open ? (
        <div className="mt-2 rounded-lg border border-white/20 bg-black/40 p-3 font-cond text-sm leading-relaxed text-white/85">
          {help}
        </div>
      ) : null}
    </div>
  );
}
