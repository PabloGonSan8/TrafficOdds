/** Banner — mensaje de estado bajo la mesa (gana/pierde/info). */
export function Banner({ message }) {
  if (!message) return null;
  const tone =
    message.kind === "win"
      ? "text-signal-green"
      : message.kind === "info"
        ? "text-signal-amber"
        : "text-signal-red";
  return (
    <p
      className={`mt-3 rounded-md bg-black/40 px-3 py-2 text-center font-cond font-semibold ${tone}`}
      role="status"
      aria-live="polite"
    >
      {message.text}
    </p>
  );
}
