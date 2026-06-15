import { Btn } from "../components/Button";
import { CountUp } from "../components/CountUp";
import { Die } from "../components/Die";
import { Panel } from "../components/Panel";

export function PlayingScreen({ boss, controls, cream, dice, doPlay, doReroll, floaters, gold, held, jokers, mats, maxPlays, maxRerolls, money, plays, preview, progress, red, rerolls, resolving, rolling, roundLabel, score, shake, target, toggleHold, lastPlay }) {
  return (
    <div className={`p-4 flex flex-col items-center ${shake ? "screenshake" : ""}`}>
      <div className="w-full max-w-md flex flex-col gap-3 py-4">
        <div className="flex items-center justify-between">
          <h1 className="font-serif text-xl font-black" style={{ color: gold }}>{roundLabel}</h1>
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-lg" style={{ color: gold }}>{money}€</span>
            {controls}
          </div>
        </div>

        {boss && (
          <Panel className="pop" style={{ border: `1px solid ${red}88`, background: "rgba(80,10,10,0.35)" }}>
            <p className="text-sm font-bold" style={{ color: cream }}>
              {boss.icon} GARITO JEFE: {boss.name} — <span className="font-normal opacity-80">{boss.desc}</span>
            </p>
          </Panel>
        )}

        <Panel>
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-xs uppercase tracking-widest" style={{ color: cream, opacity: 0.6 }}>Objetivo</span>
            <span className="font-mono text-xl font-bold" style={{ color: cream }}>
              <CountUp value={score} /> <span style={{ opacity: 0.5 }}>/ {target}</span>
            </span>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.4)" }}>
            <div className={`h-full rounded-full transition-all duration-500 ${progress >= 100 ? "bar-pulse" : ""}`} style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${gold}, #f0c970)` }} />
          </div>
        </Panel>

        <div className="grid grid-cols-2 gap-3">
          <Panel className="text-center py-3">
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: cream, opacity: 0.6 }}>🎯 Jugadas</p>
            <p className={`font-mono text-4xl font-black leading-none ${plays === 1 ? "low-blink" : ""}`} style={{ color: plays === 1 ? "#ff8c7a" : cream }}>
              {plays}<span className="text-base font-normal" style={{ opacity: 0.45 }}> /{maxPlays()}</span>
            </p>
          </Panel>
          <Panel className="text-center py-3">
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: cream, opacity: 0.6 }}>🔄 Relanzar</p>
            <p className="font-mono text-4xl font-black leading-none" style={{ color: maxRerolls() === 0 ? "#ff8c7a" : cream }}>
              {maxRerolls() === 0 ? "🔒" : (<>{rerolls}<span className="text-base font-normal" style={{ opacity: 0.45 }}> /{maxRerolls()}</span></>)}
            </p>
          </Panel>
        </div>

        {jokers.length > 0 && (
          <div className="flex gap-3 px-1">
            {jokers.map((j) => (
              <span
                key={j.id}
                className={`text-2xl ${boss?.id !== "mudo" && preview.triggered.includes(j.id) && !rolling ? "joker-on" : "opacity-60"}`}
                title={`${j.name}: ${j.desc}`}
              >
                {j.icon}
              </span>
            ))}
          </div>
        )}

        <div className="relative flex justify-center gap-3 py-6">
          {dice.map((v, i) => (
            <Die
              key={i}
              value={v}
              held={held[i]}
              rolling={rolling}
              material={mats[i]}
              dim={boss?.id === "tuerto" && v === 1}
              onClick={() => toggleHold(i)}
            />
          ))}
          {floaters.map((f) => (
            <span
              key={f.id}
              className="floater absolute font-mono font-black pointer-events-none"
              style={{
                color: f.bad ? "#ff8c7a" : f.big ? "#ff5e4d" : gold,
                fontSize: f.big ? 26 : 30,
                top: f.big ? -18 : 0,
                textShadow: "0 2px 8px rgba(0,0,0,0.6)",
              }}
            >
              {f.text}
            </span>
          ))}
        </div>
        <p className="text-center text-xs -mt-3" style={{ color: cream, opacity: 0.5 }}>
          {boss?.id === "zurdo" ? "🫲 El Zurdo solo te deja guardar 2 dados" : "Toca un dado para guardarlo antes de relanzar"}
        </p>

        <Panel className="text-center">
          {boss?.id === "mudo" ? (
            <>
              <p className="font-serif text-xl font-bold mb-2" style={{ color: cream }}>🤐 ¿…?</p>
              <p className="text-xs" style={{ color: cream, opacity: 0.6 }}>El Mudo no te deja ver la previsión. Juega a ciegas.</p>
            </>
          ) : (
            <>
              <p key={preview.name + preview.lvl} className="font-serif text-xl font-bold mb-1 pop" style={{ color: preview.blocked ? "#ff8c7a" : cream }}>
                {rolling ? "…" : preview.name}
                {!rolling && preview.lvl > 1 && <span className="text-xs ml-1" style={{ color: "#5fa8f0" }}>Nv.{preview.lvl}</span>}
                {!rolling && preview.blocked && <span className="text-xs ml-1">(¡repetida, vale 0!)</span>}
              </p>
              <div className="flex items-center justify-center gap-2 font-mono font-black text-2xl">
                <span className="rounded-lg px-3 py-1" style={{ background: "#1f5fa8", color: "#fff" }}>{rolling ? "?" : preview.chips}</span>
                <span style={{ color: cream }}>×</span>
                <span className="rounded-lg px-3 py-1" style={{ background: red, color: "#fff" }}>{rolling ? "?" : preview.mult}{!rolling && preview.gamble ? "🪙" : ""}</span>
                <span style={{ color: cream }}>=</span>
                <span style={{ color: gold }}>{rolling ? "?" : preview.blocked ? 0 : preview.total}</span>
              </div>
              {preview.gamble && !rolling && (
                <p className="text-xs mt-1" style={{ color: cream, opacity: 0.6 }}>🪙 Doble o Nada: 50% de duplicar el mult al jugar</p>
              )}
            </>
          )}
          {lastPlay && (
            <p className="text-xs mt-2" style={{ color: cream, opacity: 0.6 }}>
              Última jugada: {lastPlay.name} · +{lastPlay.total} pts
            </p>
          )}
        </Panel>

        <div className="grid grid-cols-2 gap-3">
          <Btn variant="ghost" onClick={doReroll} disabled={rerolls <= 0 || rolling || resolving || held.every(Boolean)}>
            🔄 Relanzar ({rerolls})
          </Btn>
          <Btn onClick={doPlay} disabled={rolling || resolving || plays <= 0}>🎯 Jugar ({plays})</Btn>
        </div>
      </div>
    </div>
  );
}
