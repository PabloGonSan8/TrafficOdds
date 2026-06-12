import { useGameState } from "../context/GameContext";

const KIND_STYLES = {
  win: "border-l-signal-green text-signal-green",
  loss: "border-l-signal-red text-signal-red",
  info: "border-l-signal-amber text-signal-amber",
};

export function Toasts() {
  const { toasts } = useGameState();
  return (
    <div
      className="pointer-events-none fixed inset-x-2.5 bottom-2.5 z-50 flex flex-col gap-2 sm:bottom-4 sm:left-auto sm:right-4"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`animate-toast-in rounded-lg border border-asphalt-700 border-l-4 bg-asphalt-800 px-4 py-2.5 font-cond font-semibold shadow-xl shadow-black/50 sm:max-w-80 ${KIND_STYLES[t.kind]}`}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
