/**
 * monetization.js — Capa de monetización del juego.
 *
 * El juego es y sigue siendo tuyo: esto NO lo vende. Solo añade tres vías de
 * ingresos pasivos sobre la versión gratuita:
 *   1) Anuncios display (AdSense) en huecos del lobby/footer.
 *   2) Anuncio recompensado: el jugador ve un anuncio y recibe puntos extra
 *      (Google H5 Games Ads / Ad Placement API, vía adBreak).
 *   3) Donaciones voluntarias (Ko-fi / Buy Me a Coffee), enlace externo.
 *
 * ▼▼▼  RELLENA ESTO CON TUS CUENTAS Y EMPIEZA A INGRESAR  ▼▼▼
 *   - adsenseClient: tu ID de editor de AdSense, p.ej. "ca-pub-1234567890123456".
 *   - slots: los ID numéricos de cada bloque de anuncio que crees en AdSense.
 *   - supportUrl: tu página de donaciones (https://ko-fi.com/tuusuario, etc.).
 * Mientras estén vacíos, se muestran marcadores y la recompensa se simula,
 * así ves el sistema funcionando sin configurar nada.
 */
export const MON = {
  // Vacío a propósito: AdSense desactivado mientras se resuelve la acción manual
  // de spam de Google. Sin ID, no se inyecta el SDK ni se muestran anuncios.
  adsenseClient: "",
  slots: {
    lobby: "",                  // ID del bloque del lobby
    footer: "",                 // ID del bloque del pie
  },
  supportUrl: "",               // "https://ko-fi.com/tuusuario"
  // Recompensa por ver un anuncio:
  reward: { amount: 1000, cooldownMin: 15, dailyCap: 12 },
};

export const adsEnabled = () => /^ca-pub-\d{6,}/.test(MON.adsenseClient);
export const supportEnabled = () => /^https?:\/\//.test(MON.supportUrl);

// Inyecta el SDK de AdSense una sola vez (display + H5 Ads). Sin ID no hace nada.
let scriptLoaded = false;
export function loadAds() {
  if (scriptLoaded || typeof document === "undefined" || !adsEnabled()) return;
  scriptLoaded = true;
  window.adsbygoogle = window.adsbygoogle || [];
  // Precarga de anuncios recompensados (Ad Placement API).
  window.adsbygoogle.push({ preloadAdBreaks: "on" });
  // El loader de AdSense ya va en el <head> de index.html (lo pide AdSense para
  // aprobar el sitio). Solo lo inyectamos si por lo que sea no estuviera.
  const already = document.querySelector('script[src*="adsbygoogle.js"]');
  if (!already) {
    const s = document.createElement("script");
    s.async = true;
    s.crossOrigin = "anonymous";
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${MON.adsenseClient}`;
    document.head.appendChild(s);
  }
}

const adBreak = (o) => {
  window.adsbygoogle = window.adsbygoogle || [];
  window.adsbygoogle.push(o);
};

/**
 * Lanza un anuncio recompensado real (si AdSense está configurado y disponible).
 * Devuelve true si delega en la red real; false si el llamador debe simularlo.
 */
export function showRewardedAd({ onReward, onDone }) {
  if (!adsEnabled() || typeof window === "undefined" || !window.adsbygoogle) return false;
  let rewarded = false;
  adBreak({
    type: "reward",
    name: "bonus_puntos",
    beforeReward: (showAdFn) => showAdFn(),
    adViewed: () => { rewarded = true; onReward && onReward(); },
    adDismissed: () => onDone && onDone(rewarded),
    adBreakDone: () => onDone && onDone(rewarded),
  });
  return true;
}

// —— Control de frecuencia de la recompensa (localStorage propio) ——
const RKEY = "to-reward";
const today = () => new Date().toISOString().slice(0, 10);
function rstate() {
  try { return JSON.parse(localStorage.getItem(RKEY)) || {}; } catch { return {}; }
}

export function rewardStatus() {
  const s = rstate();
  const count = s.date === today() ? s.count || 0 : 0;
  const waitMs = Math.max(0, MON.reward.cooldownMin * 60000 - (Date.now() - (s.last || 0)));
  const capped = count >= MON.reward.dailyCap;
  return { ready: waitMs <= 0 && !capped, capped, waitMs, used: count, remaining: MON.reward.dailyCap - count };
}

export function markRewardClaimed() {
  const s = rstate();
  const count = (s.date === today() ? s.count || 0 : 0) + 1;
  localStorage.setItem(RKEY, JSON.stringify({ date: today(), count, last: Date.now() }));
}
