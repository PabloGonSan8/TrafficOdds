import { MATERIALS } from "../game/data";

const PIPS = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 1], [0, 2], [2, 0], [2, 1], [2, 2]],
};

const MATERIAL_STYLE = {
  dorado: { bg: "#f3d57e", pip: "#5a4310", ring: "#d9a441" },
  trucado: { bg: "#33302c", pip: "#f5ead6", ring: "#666" },
  rubi: { bg: "#f5ead6", pip: "#2b2420", ring: "#e05555" },
  zafiro: { bg: "#f5ead6", pip: "#2b2420", ring: "#5fa8f0" },
  esmeralda: { bg: "#f5ead6", pip: "#2b2420", ring: "#52c47a" },
};

export function Die({ value, held, rolling, onClick, dim, material, size = 56, disabled = false }) {
  const materialStyle = material ? MATERIAL_STYLE[material] : null;
  const bg = held ? (materialStyle?.bg === "#33302c" ? "#4a4438" : "#f7e3b0") : materialStyle ? materialStyle.bg : "#f5ead6";
  const pip = materialStyle ? materialStyle.pip : "#2b2420";
  const ring = held ? "#d9a441" : materialStyle?.ring;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative rounded-xl transition-all duration-150 ${rolling && !held ? "dice-roll" : ""}`}
      style={{
        width: size,
        height: size,
        background: bg,
        opacity: dim ? 0.45 : 1,
        boxShadow: `${ring ? `0 0 0 3px ${ring}, ` : ""}${held ? "0 6px 0 #b78a35" : "0 4px 0 #00000055, 0 6px 10px rgba(0,0,0,0.4)"}`,
        transform: held ? "translateY(-8px)" : "none",
        cursor: disabled ? "default" : undefined,
      }}
      aria-label={`Dado ${value}${held ? " (guardado)" : ""}${material ? ` (${material})` : ""}`}
    >
      <div className="absolute inset-2 grid" style={{ gridTemplateColumns: "repeat(3,1fr)", gridTemplateRows: "repeat(3,1fr)" }}>
        {PIPS[value].map(([r, c], i) => (
          <span
            key={i}
            className="rounded-full self-center justify-self-center"
            style={{ gridRow: r + 1, gridColumn: c + 1, width: size / 6.2, height: size / 6.2, background: pip }}
          />
        ))}
      </div>
      {material && (
        <span className="absolute -top-2 -right-2 text-xs" aria-hidden>
          {MATERIALS.find((m) => m.id === material)?.icon}
        </span>
      )}
    </button>
  );
}
