/** Banner — mensaje de estado bajo la mesa (gana/pierde/info).
 *  Se re-monta con cada mensaje (key) para reproducir la animación de aparición
 *  y un destello de color según el resultado. Juice común a todos los juegos. */
export function Banner({ message }) {
  if (!message) return null;
  const tone =
    message.kind === "win"
      ? "text-signal-green"
      : message.kind === "info"
        ? "text-signal-amber"
        : "text-signal-red";
  const flash =
    message.kind === "win" ? "anim-win" : message.kind === "lose" ? "anim-lose" : "";
  return (
    <p
      key={message.text}
      className={`anim-pop mt-3 rounded-md bg-black/40 px-3 py-2 text-center font-cond font-semibold ${tone} ${flash}`}
      role="status"
      aria-live="polite"
    >
      {message.text}
    </p>
  );
}
