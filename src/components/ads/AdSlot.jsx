import { useEffect, useRef } from "react";
import { MON, adsEnabled } from "../../engine/monetization";

/**
 * AdSlot — bloque de anuncio display de AdSense. Sin configurar muestra un
 * marcador con el mismo tamaño, así el maquetado es real y solo tienes que
 * pegar tu ID de editor y de bloque en monetization.js.
 */
export function AdSlot({ slot, format = "auto", className = "", minHeight = 100 }) {
  // Solo hay un bloque real cuando hay editor configurado Y un ID de slot.
  const liveAd = adsEnabled() && !!slot;
  const pushed = useRef(false);
  useEffect(() => {
    if (!liveAd || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // El SDK aún no ha cargado: se reintentará en el siguiente montaje.
    }
  }, [liveAd]);

  // Ads desactivados: no renderizar ni placeholder (sin señal "made for ads").
  if (!adsEnabled()) return null;

  return (
    <div className={`my-4 ${className}`}>
      <p className="mb-1 text-center font-cond text-[0.6rem] uppercase tracking-widest text-dim/70">Publicidad</p>
      {liveAd ? (
        <ins
          className="adsbygoogle block"
          style={{ display: "block", minHeight }}
          data-ad-client={MON.adsenseClient}
          data-ad-slot={slot}
          data-ad-format={format}
          data-full-width-responsive="true"
        />
      ) : (
        <div
          className="flex items-center justify-center rounded-xl border border-dashed border-asphalt-600 bg-asphalt-900/60 font-cond text-xs text-dim"
          style={{ minHeight }}
        >
          Espacio publicitario
        </div>
      )}
    </div>
  );
}
