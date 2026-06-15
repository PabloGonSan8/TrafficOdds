import * as Audio from "../../engine/audio";

const STEPS = [10, 25, 50, 100, 250];

/**
 * StakeBar — controles de apuesta compartidos: fichas que SUMAN, MAX (todo el
 * saldo) y limpiar. Acota al saldo disponible. `setStake` recibe una función
 * actualizadora, igual que useState.
 */
export function StakeBar({ stake, setStake, points, disabled = false, min = 10 }) {
  function add(v) {
    Audio.click();
    setStake((s) => Math.min(points, s + v));
  }
  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-2" role="group" aria-label="Apuesta">
      {STEPS.map((v) => (
        <button
          key={v}
          type="button"
          disabled={disabled}
          className="min-h-11 rounded-md border border-white/30 bg-black/30 px-4 font-cond font-semibold text-white hover:bg-black/50 disabled:opacity-40"
          onClick={() => add(v)}
        >
          +{v}
        </button>
      ))}
      <button
        type="button"
        disabled={disabled || points < min}
        className="min-h-11 rounded-md border border-signal-amber/60 bg-signal-amber/15 px-4 font-cond font-semibold text-signal-amber hover:bg-signal-amber/25 disabled:opacity-40"
        onClick={() => {
          Audio.click();
          setStake(points);
        }}
      >
        MAX
      </button>
      <button
        type="button"
        disabled={disabled || stake === 0}
        className="min-h-11 rounded-md border border-white/30 bg-black/30 px-4 font-cond font-semibold text-white hover:bg-black/50 disabled:opacity-40"
        onClick={() => {
          Audio.click();
          setStake(0);
        }}
      >
        ✕
      </button>
    </div>
  );
}
