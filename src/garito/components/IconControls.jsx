export function IconControls({ muted, onToggleMute, onHelp, onExit, cream, gold }) {
  return (
    <>
      <button type="button" onClick={onHelp} className="text-lg opacity-70 hover:opacity-100" aria-label="Ayuda">
        ❓
      </button>
      <button type="button" onClick={onToggleMute} className="text-lg opacity-70 hover:opacity-100" aria-label={muted ? "Activar sonido" : "Silenciar"}>
        {muted ? "🔇" : "🔊"}
      </button>
      <button type="button" onClick={onExit} className="text-xs rounded-lg px-3 py-1.5 font-bold" style={{ background: "rgba(245,234,214,0.1)", color: cream, border: `1px solid ${gold}44` }}>
        ⏏ Salir
      </button>
    </>
  );
}
