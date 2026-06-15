import { Btn } from "../components/Button";
import { Die } from "../components/Die";
import { COMBOS, MATERIALS } from "../game/data";
import { comboChips, comboMult, levelOf } from "../game/logic";

export function GameOverlays({ applyDie, cancelDie, cream, dice, gold, levels, mats, pendingDie, setShowHelp, showHelp }) {
  return (
    <>
      {pendingDie && (
        <div className="fixed inset-0 flex items-center justify-center p-6 z-50" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="rounded-2xl p-5 max-w-sm w-full fadein" style={{ background: "#0c3527", border: `1px solid ${gold}66` }}>
            <p className="font-serif text-lg font-bold mb-1 text-center" style={{ color: gold }}>
              {pendingDie.icon} {pendingDie.name}
            </p>
            <p className="text-xs text-center mb-4" style={{ color: cream, opacity: 0.7 }}>
              {pendingDie.desc}. Elige el dado a mejorar (sustituye el material que tuviera):
            </p>
            <div className="flex justify-center gap-2 mb-4">
              {mats.map((m, i) => (
                <Die key={i} value={dice[i]} material={m} size={48} onClick={() => applyDie(i)} />
              ))}
            </div>
            <div className="flex justify-center">
              <button type="button" onClick={cancelDie} className="text-xs underline" style={{ color: cream, opacity: 0.7 }}>
                Cancelar y devolver {pendingDie.cost}€
              </button>
            </div>
          </div>
        </div>
      )}

      {showHelp && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ background: "rgba(0,0,0,0.75)" }} onClick={() => setShowHelp(false)}>
          <div className="rounded-2xl p-5 max-w-sm w-full max-h-full overflow-y-auto fadein" style={{ background: "#0c3527", border: `1px solid ${gold}66` }} onClick={(e) => e.stopPropagation()}>
            <p className="font-serif text-xl font-bold mb-3 text-center" style={{ color: gold }}>📖 Tabla del garito</p>
            <p className="text-xs uppercase tracking-widest mb-2" style={{ color: cream, opacity: 0.6 }}>Combinaciones (fichas × mult)</p>
            <div className="text-sm font-mono mb-4" style={{ color: cream }}>
              {[...COMBOS].reverse().map((c) => {
                const lvl = levelOf(levels, c.rank);
                return (
                  <div key={c.rank} className="flex justify-between py-0.5" style={{ borderBottom: "1px solid rgba(245,234,214,0.08)" }}>
                    <span>{c.name}{lvl > 1 && <span style={{ color: "#5fa8f0" }}> Nv.{lvl}</span>}</span>
                    <span style={{ opacity: 0.8 }}>{comboChips(c, lvl)} × {comboMult(c, lvl)}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs mb-3" style={{ color: cream, opacity: 0.7 }}>
              A las fichas se les suma el valor de los 5 dados. Las recetas 📜 suben de nivel una combinación para siempre.
            </p>
            <p className="text-xs uppercase tracking-widest mb-2" style={{ color: cream, opacity: 0.6 }}>Dados especiales</p>
            <div className="text-xs mb-4 flex flex-col gap-1" style={{ color: cream, opacity: 0.85 }}>
              {MATERIALS.map((m) => (
                <span key={m.id}>{m.icon} <b>{m.name}</b>: {m.desc}</span>
              ))}
            </div>
            <Btn className="w-full" onClick={() => setShowHelp(false)}>Cerrar</Btn>
          </div>
        </div>
      )}
    </>
  );
}
