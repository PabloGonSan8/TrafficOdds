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

function MatchCard({ match, status, bettable, selected, onSelect, onPlace, points }) {
  const markets = useMemo(() => marketsFor(match), [match]);
  const [stake, setStake] = useState(100);
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

      {bettable ? (
        <div className="mt-3 space-y-2.5">
          {groupMarkets(markets).map(([group, list]) => (
            <div key={group}>
              <div className="mb-1 flex items-center gap-1 font-cond text-xs text-dim">
                {group}
                {list[0].sim ? <span className="rounded bg-asphalt-800 px-1 text-[0.6rem]">simulada</span> : null}
              </div>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {list.map((m) => {
                  const isSel = selected?.matchKey === match.key && selected?.marketId === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onSelect({ matchKey: match.key, marketId: m.id, market: m })}
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

          {selected?.matchKey === match.key ? (
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-asphalt-700 bg-asphalt-950 p-2">
              <span className="truncate font-cond text-xs text-dim">{selected.market.label}</span>
              <input
                type="number"
                min="1"
                value={stake}
                onChange={(e) => setStake(Math.max(1, parseInt(e.target.value || "0", 10)))}
                className="w-20 rounded border border-asphalt-700 bg-asphalt-900 px-2 py-1 font-display text-sm text-ink"
              />
              <button
                type="button"
                disabled={stake > points}
                onClick={() => onPlace(match, selected.market, stake)}
                className="ml-auto whitespace-nowrap rounded-lg border border-signal-green bg-[#0d2e1a] px-3 py-1 font-display text-xs text-signal-green disabled:opacity-40"
              >
                Apostar · gana {Math.round(stake * selected.market.odds)}
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-2 text-center font-cond text-xs text-dim">
          {status === "finished" ? "Mercados cerrados" : "Mercados cerrados (partido en juego)"}
        </p>
      )}
    </div>
  );
}

export function MundialPage() {
  const { points } = useGameState();
  const { spendPoints, awardPoints } = useGameActions();

  const [matches, setMatches] = useState(null);
  const [error, setError] = useState(null);
  const [store, setStore] = useState(() => loadBets());
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("upcoming");
  const [flash, setFlash] = useState(null);

  useEffect(() => {
    let alive = true;
    fetchMatches()
      .then((list) => {
        if (!alive) return;
        setMatches(list);
        // Liquidar pendientes de partidos ya terminados.
        const cur = loadBets();
        const { store: next, settled } = settle(cur, list, (amt) => awardPoints(amt));
        setStore(next);
        if (settled.length) {
          const won = settled.filter((s) => s.outcome === "win");
          const total = won.reduce((a, s) => a + s.payout, 0);
          setFlash(`${settled.length} apuesta(s) liquidada(s) · ${won.length} ganada(s) (+${total} pts)`);
        }
      })
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function place(match, market, stake) {
    if (!spendPoints(stake)) return;
    const bet = {
      matchKey: match.key,
      marketId: market.id,
      label: market.label,
      teams: `${match.team1} - ${match.team2}`,
      odds: market.odds,
      stake,
      sim: market.sim,
      placedAt: Date.now(),
    };
    setStore((s) => addBet(s, bet));
    setSelected(null);
    setFlash(`Apuesta colocada: ${stake} pts a "${market.label}"`);
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
    <main className="mx-auto max-w-2xl p-4 sm:p-6">
      <Link to="/" className="font-cond text-sm text-dim hover:text-signal-amber">← Lobby</Link>
      <header className="mt-2 text-center">
        <h1 className="font-display text-2xl sm:text-3xl">🏆 Apuestas Mundial 2026</h1>
        <p className="mx-auto mt-1 max-w-md text-sm text-dim">
          Partidos y resultados reales del Mundial. Apuesta con tus puntos: 1X2,
          goles y props de casino (córners, tarjetas, tiros). Mercados cierran al
          empezar el partido.
        </p>
      </header>

      {flash ? (
        <div className="mt-3 rounded-lg border border-signal-amber bg-[#2e240d] px-3 py-2 text-center font-cond text-sm text-signal-amber">
          {flash}
        </div>
      ) : null}

      {/* Pestañas */}
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
                status={tab === "finished" ? "finished" : tab === "live" ? "live" : "upcoming"}
                bettable={tab === "upcoming"}
                selected={selected}
                onSelect={setSelected}
                onPlace={place}
                points={points}
              />
            ))
          )}
        </div>
      )}
    </main>
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
          store.pending.map((b, i) => (
            <div key={i} className="mb-1.5 flex items-center justify-between rounded-lg border border-asphalt-700 bg-asphalt-900 px-3 py-2 font-cond text-sm">
              <div>
                <div className="text-ink">{b.label} {b.sim ? "·sim" : ""}</div>
                <div className="text-xs text-dim">{b.teams}</div>
              </div>
              <div className="text-right">
                <div className="text-signal-green">{b.stake} → {Math.round(b.stake * b.odds)}</div>
                <div className="text-xs text-dim">@{b.odds.toFixed(2)}</div>
              </div>
            </div>
          ))
        )}
      </section>
      <section>
        <h2 className="mb-2 font-display text-base text-signal-amber">Historial</h2>
        {store.history.length === 0 ? (
          <p className="font-cond text-sm text-dim">Aún no hay resultados.</p>
        ) : (
          store.history.map((b, i) => (
            <div key={i} className="mb-1.5 flex items-center justify-between rounded-lg border border-asphalt-700 bg-asphalt-900 px-3 py-2 font-cond text-sm">
              <div>
                <div className="text-ink">{b.label}</div>
                <div className="text-xs text-dim">{b.teams}</div>
              </div>
              <div className={`font-display ${b.outcome === "win" ? "text-signal-green" : "text-signal-red"}`}>
                {b.outcome === "win" ? `+${b.payout}` : `−${b.stake}`}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
