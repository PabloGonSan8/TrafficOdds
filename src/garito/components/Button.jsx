import { COLORS } from "../styles/gameStyles";

export function Btn({ children, onClick, disabled, variant = "gold", className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl px-4 py-3 font-bold tracking-wide transition-transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      style={
        variant === "gold"
          ? { background: COLORS.gold, color: "#2b2014", boxShadow: "0 4px 0 #9c7223" }
          : { background: "rgba(245,234,214,0.12)", color: COLORS.cream, border: `1px solid ${COLORS.gold}55` }
      }
    >
      {children}
    </button>
  );
}
