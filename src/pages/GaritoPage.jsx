import { Link } from "react-router-dom";
import Garito from "../garito/game/Garito";

/**
 * GaritoPage — monta el roguelike de dados Garito dentro de TrafficOdds.
 * El juego ocupa toda la pantalla con su propio fieltro; añadimos un enlace
 * flotante para volver al lobby sin perder el resto de la app.
 */
export function GaritoPage() {
  return (
    <div className="relative">
      <Link
        to="/"
        className="absolute left-3 top-3 z-50 rounded-lg border border-[#d9a44155] bg-black/40 px-3 py-1.5 font-cond text-sm font-semibold text-[#f5ead6] backdrop-blur transition hover:border-[#d9a441] hover:text-[#d9a441]"
      >
        ← Lobby
      </Link>
      <Garito />
    </div>
  );
}
