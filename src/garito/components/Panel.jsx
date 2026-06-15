export function Panel({ children, className = "", style = {} }) {
  return (
    <div className={`rounded-2xl p-4 ${className}`} style={{ background: "rgba(0,0,0,0.28)", border: "1px solid rgba(217,164,65,0.25)", ...style }}>
      {children}
    </div>
  );
}
