import { Btn } from "../components/Button";
import { Die } from "../components/Die";
import { Panel } from "../components/Panel";
import { COMBOS, MAX_JOKERS, RARITIES, TARGETS } from "../game/data";
import { comboChips, comboMult, levelOf } from "../game/logic";

export function ShopScreen({ bossMap, buyDie, buyJoker, buyReceta, controls, cream, dice, endless, getTarget, gold, jokers, levels, mats, money, nextRound, payout, red, rerollShop, round, sellJoker, shop }) {
  return (
    <div className="p-4 flex flex-col items-center">
      <div className="w-full max-w-md flex flex-col gap-4 py-6 fadein">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl font-black pop" style={{ color: gold }}>
            Garito {round + 1} superado
          </h2>
          <div className="flex items-center gap-3">{controls}</div>
        </div>

        {payout && (
          <div className="text-xs font-mono text-center" style={{ color: cream, opacity: 0.85 }}>
            <div className="inline-block text-left">
              <div>Pago base ............ 4€</div>
              {payout.plays > 0 && <div>Jugadas sobrantes ..... +{payout.plays}€</div>}
              {payout.boss > 0 && <div>Prima de jefe ......... +{payout.boss}€</div>}
              {payout.avaro > 0 && <div>🤑 El Avaro ........... +{payout.avaro}€</div>}
              {payout.bote > 0 && <div>🫙 El Bote ............ +{payout.bote}€</div>}
              {payout.esm > 0 && <div>🟢 Esmeraldas ......... +{payout.esm}€</div>}
              {payout.interes > 0 && <div>Intereses (1€/5€) ..... +{payout.interes}€</div>}
              <div style={{ color: gold }}>Total ................. +{payout.earned}€</div>
            </div>
          </div>
        )}

        <Panel>
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs uppercase tracking-widest" style={{ color: cream, opacity: 0.6 }}>Trastienda</span>
            <span className="font-mono font-bold" style={{ color: gold }}>{money}€</span>
          </div>

          <div className="flex flex-col gap-2">
            {shop.jokers.map((j, i) => {
              const cant = money < j.cost || jokers.length >= MAX_JOKERS;
              const rc = RARITIES[j.rarity].color;
              return (
                <div key={j.id} className="flex items-center gap-3 rounded-xl p-3 fadein" style={{ background: "rgba(245,234,214,0.07)", border: `1px solid ${rc}55`, animationDelay: `${i * 0.08}s` }}>
                  <span className="text-3xl">{j.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm" style={{ color: cream }}>
                      {j.name} <span className="text-xs font-normal" style={{ color: rc }}>· {RARITIES[j.rarity].name}</span>
                    </p>
                    <p className="text-xs" style={{ color: cream, opacity: 0.7 }}>{j.desc}</p>
                  </div>
                  <Btn onClick={() => buyJoker(j)} disabled={cant}>{j.cost}€</Btn>
                </div>
              );
            })}
            {shop.jokers.length === 0 && (
              <p className="text-xs text-center py-2" style={{ color: cream, opacity: 0.5 }}>Sin amuletos a la venta</p>
            )}

            {shop.die && (
              <div className="flex items-center gap-3 rounded-xl p-3 fadein" style={{ background: "rgba(245,234,214,0.07)", border: `1px dashed ${gold}66` }}>
                <span className="text-3xl">{shop.die.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm" style={{ color: cream }}>{shop.die.name} <span className="text-xs font-normal" style={{ color: gold }}>· Dado especial</span></p>
                  <p className="text-xs" style={{ color: cream, opacity: 0.7 }}>{shop.die.desc}</p>
                </div>
                <Btn onClick={buyDie} disabled={money < shop.die.cost}>{shop.die.cost}€</Btn>
              </div>
            )}

            {shop.receta && (() => {
              const c = COMBOS[shop.receta.rank];
              const lvl = levelOf(levels, c.rank);
              return (
                <div className="flex items-center gap-3 rounded-xl p-3 fadein" style={{ background: "rgba(245,234,214,0.07)", border: `1px dashed #5fa8f066` }}>
                  <span className="text-3xl">📜</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm" style={{ color: cream }}>
                      Receta: {c.name} <span className="text-xs font-normal" style={{ color: "#5fa8f0" }}>· Nv.{lvl} → Nv.{lvl + 1}</span>
                    </p>
                    <p className="text-xs" style={{ color: cream, opacity: 0.7 }}>
                      {comboChips(c, lvl)}×{comboMult(c, lvl)} → {comboChips(c, lvl + 1)}×{comboMult(c, lvl + 1)}
                    </p>
                  </div>
                  <Btn onClick={buyReceta} disabled={money < shop.receta.cost}>{shop.receta.cost}€</Btn>
                </div>
              );
            })()}
          </div>

          <div className="flex justify-between items-center mt-3">
            <button type="button" onClick={rerollShop} disabled={money < 2} className="text-xs underline disabled:opacity-40" style={{ color: cream, opacity: 0.7 }}>
              Cambiar género (2€)
            </button>
            <span className="text-xs" style={{ color: cream, opacity: 0.5 }}>Amuletos: {jokers.length}/{MAX_JOKERS}</span>
          </div>
        </Panel>

        {jokers.length > 0 && (
          <Panel>
            <p className="text-xs uppercase tracking-widest mb-2" style={{ color: cream, opacity: 0.6 }}>Tus amuletos · toca vender</p>
            <div className="flex flex-col gap-2">
              {jokers.map((j) => (
                <div key={j.id} className="flex items-center gap-3">
                  <span className="text-2xl">{j.icon}</span>
                  <span className="flex-1 text-xs" style={{ color: cream, opacity: 0.85 }}>{j.name}</span>
                  <button type="button" onClick={() => sellJoker(j)} className="text-xs rounded-lg px-2 py-1" style={{ background: "rgba(192,57,43,0.25)", color: "#f0a0a0", border: "1px solid #c0392b66" }}>
                    Vender +{Math.floor(j.cost / 2)}€
                  </button>
                </div>
              ))}
            </div>
          </Panel>
        )}

        <Panel>
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: cream, opacity: 0.6 }}>Tus dados</p>
          <div className="flex justify-center gap-2">
            {mats.map((m, i) => (
              <Die key={i} value={dice[i]} material={m} size={44} disabled />
            ))}
          </div>
        </Panel>

        {!endless && bossMap[round + 1] && round + 1 < TARGETS.length && (
          <Panel style={{ border: `1px solid ${red}88`, background: "rgba(80,10,10,0.35)" }}>
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#f0a0a0" }}>⚠️ Próximo: garito jefe</p>
            <p className="text-sm font-bold" style={{ color: cream }}>
              {bossMap[round + 1].icon} {bossMap[round + 1].name} — <span className="font-normal opacity-80">{bossMap[round + 1].desc}</span>
            </p>
          </Panel>
        )}

        <Btn onClick={nextRound}>
          Siguiente garito → objetivo {getTarget(round + 1)}
        </Btn>
      </div>
    </div>
  );
}
