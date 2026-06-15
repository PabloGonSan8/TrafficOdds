import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const KEY = "to-consent";

function setConsent(granted) {
  const value = granted ? "granted" : "denied";
  try { localStorage.setItem(KEY, JSON.stringify({ ad: value, ts: Date.now() })); } catch { /* almacenamiento no disponible */ }
  if (typeof window.gtag === "function") {
    window.gtag("consent", "update", {
      ad_storage: value,
      ad_user_data: value,
      ad_personalization: value,
      analytics_storage: value,
    });
  }
}

/**
 * CookieConsent — banner de cookies enlazado con el Modo de Consentimiento de
 * Google. Mientras el usuario no decide, los anuncios funcionan en modo no
 * personalizado (consentimiento denegado por defecto en index.html).
 */
export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let decided = false;
    try { decided = !!localStorage.getItem(KEY); } catch { decided = false; }
    if (!decided) setShow(true);
  }, []);

  if (!show) return null;

  function choose(granted) {
    setConsent(granted);
    setShow(false);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] border-t border-asphalt-700 bg-asphalt-900/95 p-3 backdrop-blur sm:p-4" role="dialog" aria-label="Aviso de cookies">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <p className="text-center font-cond text-sm text-dim sm:text-left">
          Usamos cookies propias y de terceros (Google AdSense) para mostrar anuncios y financiar el juego gratuito.{" "}
          <Link to="/privacidad" className="font-semibold text-signal-amber underline">Más información</Link>.
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => choose(false)}
            className="min-h-10 rounded-md border border-asphalt-600 bg-asphalt-800 px-4 font-cond text-sm font-bold text-ink hover:bg-asphalt-700"
          >
            Rechazar
          </button>
          <button
            type="button"
            onClick={() => choose(true)}
            className="min-h-10 rounded-md bg-signal-amber px-4 font-cond text-sm font-bold text-[#1a1200] hover:brightness-110"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
