import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useGameState, useGameActions } from "../context/GameContext";
import {
  fetchMatches,
  matchStatus,
  marketsFor,
  loadBets,
  addBet,
  settle,
  combinedOdds,
  matchLocked,
} from "../engine/football";

const STATUS_BADGE = {
  live: { t: "EN JUEGO", c: "border-signal-red bg-[#2e0d0d] text-signal-red" },
  upcoming: { t: "PRÓXIMO", c: "border-signal-green bg-[#0d2e1a] text-signal-green" },
  finished: { t: "FINAL", c: "border-asphalt-600 bg-asphalt-800 text-dim" },
};

function groupMarkets(markets) {
  const groups = {};
  for (const m of markets) (groups[m.group] = groups[m.group] || []).push(m);
  return Object.entries(groups);
}

function MatchCard({ match, status, bettable, locked, selectedIds, onToggle }) {
  const markets = useMemo(() => marketsFor(match), [match]);
  const score = match.ft ? `${match.ft[0]} - ${match.ft[1]}` : "vs";

  return (
    <div className="rounded-xl border border-asphalt-700 bg-asphalt-900 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className={`rounded-md border px-2 py-0.5 font-display text-[0.6rem] ${STATUS_BADGE[status].c}`}>
          {STATUS_BADGE[status].t}
        </span>
        <span className="font-cond text-xs text-dim">{match.group} · {match.date}</span>
      </div>

      <div className="mt-2 flex items-center justify-center gap-3 text-center font-cond">
        <span className="flex-1 text-right text-sm text-ink sm:text-base">{match.team1}</span>
        <span className="font-display text-lg text-signal-amber">{score}</span>
        <span className="flex-1 text-left text-sm text-ink sm:text-base">{match.team2}</span>
      </div>

      {locked ? (
        <p className="mt-2 text-center font-cond text-xs text-signal-amber">✓ Ya tienes una apuesta en este partido</p>
      ) : bettable ? (
        <div className="mt-3 space-y-2.5">
          {groupMarkets(markets).map(([group, list]) => (
            <div key={group}>
              <div className="mb-1 flex items-center gap-1 font-cond text-xs text-dim">
                {group}
              </div>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {list.map((m) => {
                  const isSel = selectedIds.has(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onToggle(match, m)}
                      className={`flex items-center justify-between gap-1 rounded-lg border px-2 py-1.5 font-cond text-xs transition ${
                        isSel
                          ? "border-signal-amber bg-[#2e240d] text-signal-amber"
                          : "border-asphalt-700 bg-asphalt-800 text-ink hover:border-asphalt-600"
                      }`}
                    >
                      <span className="truncate">{m.label}</span>
                      <span className="font-display text-signal-green">{m.odds.toFixed(2)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-center font-cond text-xs text-dim">
          {status === "finished" ? "Mercados cerrados" : "Mercados cerrados (partido en juego)"}
        </p>
      )}
    </div>
  );
}

/** Cupón flotante: 1 selección = simple, varias = combinada (cuotas se multiplican). */
function BetSlip({ slip, stake, setStake, points, onRemove, onClear, onPlace }) {
  if (slip.length === 0) return null;
  const odds = combinedOdds(slip);
  const payout = Math.round(stake * odds);
  const tooMuch = stake > points;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-2xl rounded-t-2xl border border-asphalt-600 bg-asphalt-950 p-3 shadow-2xl shadow-black">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-display text-sm text-signal-amber">
          🎟️ Cupón · {slip.length === 1 ? "Simple" : `Combinada x${slip.length}`}
        </span>
        <button type="button" onClick={onClear} className="font-cond text-xs text-dim hover:text-signal-red">
          Vaciar
        </button>
      </div>

      <div className="max-h-32 space-y-1 overflow-y-auto">
        {slip.map((l) => (
          <div key={l.matchKey + l.marketId} className="flex items-center justify-between gap-2 rounded-lg bg-asphalt-900 px-2 py-1 font-cond text-xs">
            <div className="min-w-0">
              <div className="truncate text-ink">{l.label}</div>
              <div className="truncate text-[0.65rem] text-dim">{l.teams}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-display text-signal-green">{l.odds.toFixed(2)}</span>
              <button type="button" onClick={() => onRemove(l)} className="text-dim hover:text-signal-red">✕</button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <input
          type="number"
          min="1"
          value={stake}
          onChange={(e) => setStake(Math.max(1, parseInt(e.target.value || "0", 10)))}
          className="w-24 rounded-lg border border-asphalt-700 bg-asphalt-900 px-2 py-2 font-display text-sm text-ink"
        />
        <div className="font-cond text-xs text-dim">
          Cuota <span className="font-display text-ink">x{odds.toFixed(2)}</span> · Ganas{" "}
          <span className="font-display text-signal-green">{payout}</span>
        </div>
        <button
          type="button"
          disabled={tooMuch}
          onClick={onPlace}
          className="ml-auto whitespace-nowrap rounded-lg border border-signal-green bg-[#0d2e1a] px-4 py-2 font-display text-sm text-signal-green disabled:opacity-40"
        >
          {tooMuch ? "Sin saldo" : "Apostar"}
        </button>
      </div>
    </div>
  );
}

export function MundialPage() {
  const { points } = useGameState();
  const { spendPoints, awardPoints } = useGameActions();

  const [matches, setMatches] = useState(null);
  const [error, setError] = useState(null);
  const [store, setStore] = useState(() => loadBets());
  const [slip, setSlip] = useState([]); // selecciones del cupón (1 por partido)
  const [stake, setStake] = useState(100);
  const [tab, setTab] = useState("upcoming");
  const [flash, setFlash] = useState(null);

  useEffect(() => {
    let alive = true;
    fetchMatches()
      .then((list) => {
        if (!alive) return;
        setMatches(list);
        const cur = loadBets();
        const { store: next, settled } = settle(cur, list, (amt) => awardPoints(amt));
        setStore(next);
        if (settled.length) {
          const won = settled.filter((s) => s.outcome === "win");
          const total = won.reduce((a, s) => a + s.payout, 0);
          setFlash(`${settled.length} boleto(s) liquidado(s) · ${won.length} ganado(s) (+${total} pts)`);
        }
      })
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleLeg(match, market) {
    setSlip((cur) => {
      // 1 selección por MERCADO (grupo) y partido: permite combinar varios
      // mercados del mismo partido y de partidos distintos.
      const same = (l) => l.matchKey === match.key && l.group === market.group;
      const existing = cur.find(same);
      if (existing && existing.marketId === market.id) {
        return cur.filter((l) => !same(l)); // tocar la misma → quitar
      }
      const leg = {
        matchKey: match.key,
        group: market.group,
        marketId: market.id,
        label: market.label,
        teams: `${match.team1} - ${match.team2}`,
        odds: market.odds,
      };
      return existing ? cur.map((l) => (same(l) ? leg : l)) : [...cur, leg]; // otra del grupo → reemplaza
    });
  }

  function placeSlip() {
    if (slip.length === 0 || !spendPoints(stake)) return;
    const bet = { legs: slip, stake, odds: combinedOdds(slip), placedAt: Date.now() };
    setStore((s) => addBet(s, bet));
    setSlip([]);
    setFlash(
      slip.length === 1
        ? `Apuesta colocada: ${stake} pts a "${slip[0].label}"`
        : `Combinada x${slip.length} colocada: ${stake} pts @ x${bet.odds.toFixed(2)}`
    );
  }

  const buckets = useMemo(() => {
    if (!matches) return { live: [], upcoming: [], finished: [] };
    const now = Date.now();
    const live = [], upcoming = [], finished = [];
    for (const m of matches) {
      const st = matchStatus(m, now);
      (st === "live" ? live : st === "upcoming" ? upcoming : finished).push(m);
    }
    upcoming.sort((a, b) => (a.kickoff?.getTime() || 0) - (b.kickoff?.getTime() || 0));
    finished.sort((a, b) => (b.kickoff?.getTime() || 0) - (a.kickoff?.getTime() || 0));
    return { live, upcoming: upcoming.slice(0, 24), finished: finished.slice(0, 20) };
  }, [matches]);

  const shown = buckets[tab] || [];

  return (
    <main className="mx-auto max-w-2xl p-4 pb-40 sm:p-6">
      <Link to="/" className="font-cond text-sm text-dim hover:text-signal-amber">← Lobby</Link>
      <header className="mt-2 text-center">
        <h1 className="font-display text-2xl sm:text-3xl">🏆 Apuestas Mundial 2026</h1>
        <p className="mx-auto mt-1 max-w-md text-sm text-dim">
          Partidos reales. Monta tu cupón: una selección (simple) o varias
          (combinada, la cuota se multiplica). Una vez apuestas, es definitiva.
        </p>
      </header>

      {flash ? (
        <div className="mt-3 rounded-lg border border-signal-amber bg-[#2e240d] px-3 py-2 text-center font-cond text-sm text-signal-amber">
          {flash}
        </div>
      ) : null}

      <div className="mt-4 flex gap-1.5">
        {[
          ["upcoming", `Próximos (${buckets.upcoming.length})`],
          ["live", `En juego (${buckets.live.length})`],
          ["finished", "Finalizados"],
          ["bets", `Mis apuestas (${store.pending.length})`],
        ].map(([id, lbl]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 rounded-lg border px-2 py-1.5 font-cond text-xs transition ${
              tab === id ? "border-signal-amber bg-[#2e240d] text-signal-amber" : "border-asphalt-700 bg-asphalt-800 text-dim"
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>

      {error ? (
        <p className="mt-6 text-center font-cond text-sm text-signal-red">⚠️ {error}</p>
      ) : matches === null ? (
        <p className="mt-6 text-center font-cond text-sm text-dim">Cargando partidos…</p>
      ) : tab === "bets" ? (
        <Bets store={store} />
      ) : (
        <div className="mt-4 space-y-3">
          {shown.length === 0 ? (
            <p className="text-center font-cond text-sm text-dim">No hay partidos aquí ahora mismo.</p>
          ) : (
            shown.map((m) => (
              <MatchCard
                key={m.key}
                match={m}
                status={tab}
                bettable={tab === "upcoming"}
                locked={matchLocked(store, m.key)}
                selectedIds={new Set(slip.filter((l) => l.matchKey === m.key).map((l) => l.marketId))}
                onToggle={toggleLeg}
              />
            ))
          )}
        </div>
      )}

      <BetSlip
        slip={slip}
        stake={stake}
        setStake={setStake}
        points={points}
        onRemove={(leg) => setSlip((cur) => cur.filter((l) => !(l.matchKey === leg.matchKey && l.marketId === leg.marketId)))}
        onClear={() => setSlip([])}
        onPlace={placeSlip}
      />
    </main>
  );
}

function BetRow({ b, settled }) {
  return (
    <div className="mb-1.5 rounded-lg border border-asphalt-700 bg-asphalt-900 px-3 py-2 font-cond text-sm">
      <div className="flex items-center justify-between">
        <span className="text-ink">
          {b.legs.length === 1 ? "Simple" : `Combinada x${b.legs.length}`} @ x{b.odds.toFixed(2)}
        </span>
        {settled ? (
          <span className={`font-display ${b.outcome === "win" ? "text-signal-green" : "text-signal-red"}`}>
            {b.outcome === "win" ? `+${b.payout}` : `−${b.stake}`}
          </span>
        ) : (
          <span className="text-signal-green">{b.stake} → {Math.round(b.stake * b.odds)}</span>
        )}
      </div>
      <ul className="mt-1 space-y-0.5">
        {b.legs.map((l, i) => (
          <li key={i} className="flex justify-between text-xs text-dim">
            <span className="truncate">{l.label}</span>
            <span>{l.teams}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Bets({ store }) {
  return (
    <div className="mt-4 space-y-4">
      <section>
        <h2 className="mb-2 font-display text-base text-signal-amber">Pendientes</h2>
        {store.pending.length === 0 ? (
          <p className="font-cond text-sm text-dim">Sin apuestas pendientes.</p>
        ) : (
          store.pending.map((b, i) => <BetRow key={i} b={b} settled={false} />)
        )}
      </section>
      <section>
        <h2 className="mb-2 font-display text-base text-signal-amber">Historial</h2>
        {store.history.length === 0 ? (
          <p className="font-cond text-sm text-dim">Aún no hay resultados.</p>
        ) : (
          store.history.map((b, i) => <BetRow key={i} b={b} settled />)
        )}
      </section>
    </div>
  );
}
