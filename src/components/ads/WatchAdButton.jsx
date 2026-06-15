import { useEffect, useRef, useState } from "react";
import { useGameActions } from "../../context/GameContext";
import { MON, adsEnabled, showRewardedAd, rewardStatus, markRewardClaimed } from "../../engine/monetization";

const SIM_SECONDS = 5; // duración del anuncio simulado cuando AdSense no está configurado

function fmt(ms) {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * WatchAdButton — botón "ver anuncio y ganar puntos". Usa el anuncio
 * recompensado real de AdSense si está configurado; si no, simula uno para que
 * el flujo funcione y se vea desde ya. Respeta enfriamiento y tope diario.
 */
export function WatchAdButton() {
  const { awardPoints } = useGameActions();
  const [status, setStatus] = useState(() => rewardStatus());
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState("idle"); // idle | playing | done
  const [count, setCount] = useState(SIM_SECONDS);
  const grantedRef = useRef(false);
  const timerRef = useRef(null);

  // Refresca el enfriamiento cada segundo.
  useEffect(() => {
    const iv = setInterval(() => setStatus(rewardStatus()), 1000);
    return () => clearInterval(iv);
  }, []);
  useEffect(() => () => clearTimeout(timerRef.current), []);

  function grant() {
    if (grantedRef.current) return;
    grantedRef.current = true;
    markRewardClaimed();
    awardPoints(MON.reward.amount, `🎬 Anuncio visto: +${MON.reward.amount.toLocaleString("es-ES")} pts`);
    setStatus(rewardStatus());
    setPhase("done");
  }

  function start() {
    const st = rewardStatus();
    if (!st.ready) return;
    grantedRef.current = false;
    setPhase("playing");
    setOpen(true);

    // 1) Anuncio recompensado real (si hay cuenta configurada).
    const real = showRewardedAd({
      onReward: () => grant(),
      onDone: () => { if (!grantedRef.current) setOpen(false); setPhase("idle"); },
    });
    if (real) return;

    // 2) Fallback: anuncio simulado con cuenta atrás.
    setCount(SIM_SECONDS);
    let n = SIM_SECONDS;
    timerRef.current = setInterval(() => {
      n -= 1;
      setCount(n);
      if (n <= 0) {
        clearInterval(timerRef.current);
        grant();
      }
    }, 1000);
  }

  function close() {
    clearInterval(timerRef.current);
    setOpen(false);
    setPhase("idle");
  }

  const label = status.capped
    ? "Tope diario"
    : status.ready
      ? `+${MON.reward.amount.toLocaleString("es-ES")}`
      : fmt(status.waitMs);

  return (
    <>
      <button
        type="button"
        disabled={!status.ready}
        onClick={start}
        title={
          status.capped
            ? `Has alcanzado el máximo de ${MON.reward.dailyCap} anuncios hoy`
            : status.ready
              ? `Ver un anuncio y ganar ${MON.reward.amount} pts`
              : `Disponible en ${fmt(status.waitMs)}`
        }
        className="flex min-h-9 items-center gap-1 rounded-md border border-signal-green/60 bg-signal-green/15 px-2 font-cond text-sm font-bold text-signal-green hover:bg-signal-green/25 disabled:opacity-50"
      >
        🎬 <span className="hidden sm:inline">{label}</span><span className="sm:hidden">{status.ready ? "+pts" : label}</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl border border-asphalt-700 bg-asphalt-900 p-5 text-center shadow-2xl">
            {phase === "done" ? (
              <>
                <div className="text-5xl">🎉</div>
                <h2 className="mt-2 font-display text-xl text-signal-green">¡+{MON.reward.amount.toLocaleString("es-ES")} pts!</h2>
                <p className="mt-1 font-cond text-sm text-dim">Gracias por apoyar el juego viendo un anuncio.</p>
                <button
                  type="button"
                  onClick={close}
                  className="mt-4 min-h-11 w-full rounded-md bg-signal-amber px-3 font-cond text-base font-bold text-[#1a1200] hover:brightness-110"
                >
                  Cobrar y seguir
                </button>
              </>
            ) : (
              <>
                <p className="font-cond text-xs uppercase tracking-widest text-dim">
                  {adsEnabled() ? "Cargando anuncio…" : "Anuncio (demo)"}
                </p>
                <div className="mt-3 flex h-36 items-center justify-center rounded-xl border border-dashed border-asphalt-600 bg-asphalt-950 text-4xl">
                  📺
                </div>
                {!adsEnabled() ? (
                  <>
                    <p className="mt-3 font-cond text-sm text-ink">Tu recompensa llega en {count}s…</p>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-asphalt-800">
                      <div
                        className="h-full rounded-full bg-signal-green transition-[width] duration-1000 ease-linear"
                        style={{ width: `${((SIM_SECONDS - count) / SIM_SECONDS) * 100}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <p className="mt-3 font-cond text-sm text-dim">Sigue las instrucciones del anuncio para recibir tus puntos.</p>
                )}
                <button
                  type="button"
                  onClick={close}
                  className="mt-4 font-cond text-xs text-dim underline hover:text-ink"
                >
                  Cancelar
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
