import { Link } from "react-router-dom";

const GAMES = [
  {
    to: "/trafico",
    icon: "🚦",
    name: "Tráfico en vivo",
    desc: "Apuesta sobre el tráfico de la autopista virtual: más/menos, comparativas, predicciones exactas… con eventos sorpresa.",
    tag: "El original",
    ready: true,
  },
  {
    to: "/ruleta",
    icon: "🎡",
    name: "Ruleta",
    desc: "Ruleta europea clásica: rojo/negro, docenas, número exacto. Paga hasta ×36.",
    tag: "Casino",
    ready: true,
  },
  {
    to: "/blackjack",
    icon: "🃏",
    name: "Blackjack",
    desc: "Llega a 21 contra la banca: pide, plántate o dobla. Blackjack paga 3:2.",
    tag: "Casino",
    ready: true,
  },
  {
    to: "/tragaperras",
    icon: "🎰",
    name: "Tragaperras",
    desc: "3 rodillos, 5 líneas de pago y premios de hasta ×200 por línea.",
    tag: "Casino",
    ready: true,
  },
];

function GameCard({ game }) {
  const card = (
    <div
      className={`flex h-full flex-col rounded-xl border p-4 shadow-xl shadow-black/40 transition sm:p-5 ${
        game.ready
          ? "border-asphalt-700 bg-asphalt-900 hover:-translate-y-0.5 hover:border-signal-amber"
          : "border-asphalt-700 bg-asphalt-900 opacity-50"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-4xl sm:text-5xl">{game.icon}</span>
        <span
          className={`rounded-full px-2.5 py-0.5 font-cond text-xs font-semibold uppercase tracking-wide ${
            game.ready ? "bg-signal-amber text-[#1a1200]" : "bg-asphalt-700 text-dim"
          }`}
        >
          {game.tag}
        </span>
      </div>
      <h2 className="mt-3 font-display text-base text-ink sm:text-lg">{game.name}</h2>
      <p className="mt-1.5 flex-1 text-sm text-dim">{game.desc}</p>
      <span
        className={`mt-4 inline-block rounded-md px-4 py-2 text-center font-cond text-base font-semibold ${
          game.ready
            ? "bg-signal-green text-[#06210f]"
            : "border border-asphalt-700 text-dim"
        }`}
      >
        {game.ready ? "JUGAR" : "En construcción 🚧"}
      </span>
    </div>
  );

  return game.ready ? (
    <Link to={game.to} className="block h-full rounded-xl">
      {card}
    </Link>
  ) : (
    card
  );
}

export function Lobby() {
  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6">
      <div className="py-6 text-center sm:py-10">
        <h1 className="font-display text-2xl sm:text-4xl">
          🚦 Traffic<span className="text-signal-amber">Odds</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-dim sm:text-base">
          Tu casino virtual de puntos: sin dinero real, solo predicción, suerte y
          fanfarronería. Los puntos son compartidos entre todos los juegos.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {GAMES.map((g) => (
          <GameCard key={g.name} game={g} />
        ))}
      </div>
    </main>
  );
}
