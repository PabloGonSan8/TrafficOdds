import { useRef } from "react";
import { Link } from "react-router-dom";

const GAMES = [
  {
    to: "/trafico",
    icon: "🚦",
    name: "Tráfico en vivo",
    desc: "Apuesta sobre el tráfico de la autopista: más/menos, comparativas y eventos sorpresa.",
    cat: "Tráfico",
    color: "#16a34a",
  },
  {
    to: "/carrera",
    icon: "🏁",
    name: "Carrera",
    desc: "Apuesta por un vehículo en una carrera a cuatro. Si gana el tuyo, cobras ×3,96.",
    cat: "Tráfico",
    color: "#22c55e",
  },
  {
    to: "/ruleta",
    icon: "🎡",
    name: "Ruleta",
    desc: "Ruleta europea: rojo/negro, docenas, número exacto. Paga hasta ×36.",
    cat: "Casino",
    color: "#dc2626",
  },
  {
    to: "/blackjack",
    icon: "🃏",
    name: "Blackjack",
    desc: "Llega a 21 contra la banca: pide, plántate o dobla. Paga 3:2.",
    cat: "Casino",
    color: "#0ea5e9",
  },
  {
    to: "/tragaperras",
    icon: "🎰",
    name: "Tragaperras",
    desc: "3 rodillos, 5 líneas de pago y premios de hasta ×200 por línea.",
    cat: "Casino",
    color: "#db2777",
  },
  {
    to: "/crash",
    icon: "🚀",
    name: "Crash",
    desc: "El multiplicador sube sin parar. Retírate antes de que el cohete estalle.",
    cat: "Casino",
    color: "#f97316",
  },
  {
    to: "/minas",
    icon: "💣",
    name: "Minas",
    desc: "Destapa gemas esquivando minas. Cada acierto sube el premio.",
    cat: "Casino",
    color: "#94a3b8",
  },
  {
    to: "/plinko",
    icon: "🔵",
    name: "Plinko",
    desc: "Suelta la bola y deja que rebote hasta una ranura. Bordes ×60.",
    cat: "Casino",
    color: "#3b82f6",
  },
  {
    to: "/rueda-fortuna",
    icon: "🎯",
    name: "Rueda de la fortuna",
    desc: "Gira la rueda de 16 casillas y cobra el multiplicador donde pare.",
    cat: "Casino",
    color: "#a855f7",
  },
  {
    to: "/doble-o-nada",
    icon: "🪙",
    name: "Doble o nada",
    desc: "Cara o cruz. Acierta y dobla; sigue doblando o cobra antes de fallar.",
    cat: "Casino",
    color: "#eab308",
  },
  {
    to: "/dados",
    icon: "🎲",
    name: "Dados",
    desc: "Dos dados: más/menos de 7, 7 exacto o dobles. Hasta ×5.",
    cat: "Casino",
    color: "#ef4444",
  },
  {
    to: "/mayor-menor",
    icon: "🔼",
    name: "Mayor / Menor",
    desc: "¿La siguiente carta será mayor o menor? Encadena aciertos.",
    cat: "Casino",
    color: "#14b8a6",
  },
  {
    to: "/rasca",
    icon: "🎫",
    name: "Rasca y gana",
    desc: "Rasca 9 casillas con el dedo o el ratón. Tres iguales pagan hasta ×50.",
    cat: "Casino",
    color: "#f59e0b",
  },
];

const SECTIONS = [
  { cat: "Tráfico", title: "🚦 Tráfico", sub: "Lo nuestro" },
  { cat: "Casino", title: "🎰 Casino", sub: "Clásicos del azar" },
];

function GameCard({ game }) {
  return (
    <Link
      to={game.to}
      style={{ "--c": game.color }}
      className="group relative flex w-full flex-col overflow-hidden rounded-2xl border border-asphalt-700 bg-asphalt-900 shadow-lg shadow-black/40 transition duration-200 hover:-translate-y-1 hover:border-[color:var(--c)] hover:shadow-[0_14px_34px_-14px_var(--c)] sm:w-48 sm:shrink-0 sm:snap-start"
    >
      {/* Cabecera con halo de color y el icono */}
      <div
        className="flex h-[4.5rem] items-center justify-center sm:h-20"
        style={{ background: "radial-gradient(120% 130% at 50% -10%, var(--c), transparent 72%)" }}
      >
        <span className="text-4xl drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)] transition-transform duration-200 group-hover:scale-110 sm:text-5xl">
          {game.icon}
        </span>
      </div>

      <div className="flex flex-1 flex-col px-3 pb-3">
        <h3 className="font-display text-sm leading-tight text-ink sm:text-base">{game.name}</h3>
        <p className="mt-1 line-clamp-2 flex-1 text-[0.7rem] leading-snug text-dim sm:text-xs">
          {game.desc}
        </p>
        <span className="mt-2 inline-flex items-center gap-1 font-cond text-xs font-bold text-[color:var(--c)] sm:text-sm">
          <span className="transition-transform group-hover:translate-x-0.5">▶</span> Jugar
        </span>
      </div>
    </Link>
  );
}

function ArrowBtn({ dir, onClick }) {
  return (
    <button
      type="button"
      aria-label={dir === "left" ? "Anterior" : "Siguiente"}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-asphalt-600 bg-asphalt-800 font-display text-lg text-ink transition hover:border-signal-amber hover:text-signal-amber"
    >
      {dir === "left" ? "‹" : "›"}
    </button>
  );
}

function CarouselSection({ sec, list }) {
  const scrollRef = useRef(null);
  function nudge(sign) {
    const el = scrollRef.current;
    if (el) el.scrollBy({ left: sign * Math.min(el.clientWidth * 0.8, 420), behavior: "smooth" });
  }
  return (
    <section className="mb-7">
      <div className="mb-3 flex items-center justify-between gap-2 border-b border-asphalt-700 pb-1.5">
        <div className="flex items-baseline gap-2">
          <h2 className="font-display text-lg text-signal-amber sm:text-xl">{sec.title}</h2>
          <span className="font-cond text-xs text-dim sm:text-sm">· {sec.sub}</span>
        </div>
        {/* Flechas solo en PC; en móvil es rejilla vertical */}
        <div className="hidden gap-1.5 sm:flex">
          <ArrowBtn dir="left" onClick={() => nudge(-1)} />
          <ArrowBtn dir="right" onClick={() => nudge(1)} />
        </div>
      </div>

      {/* Móvil: rejilla 2 columnas (scroll vertical). PC: carrusel horizontal. */}
      <div className="relative">
        <div
          ref={scrollRef}
          className="grid grid-cols-2 gap-3 sm:-mx-1 sm:flex sm:snap-x sm:snap-mandatory sm:gap-3 sm:overflow-x-auto sm:px-1 sm:pb-2 sm:[scrollbar-width:none] sm:[&::-webkit-scrollbar]:hidden"
        >
          {list.map((g) => (
            <GameCard key={g.name} game={g} />
          ))}
        </div>
        {/* Degradado derecho solo en el carrusel de PC */}
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-12 bg-gradient-to-l from-asphalt-950 to-transparent sm:block" />
      </div>
    </section>
  );
}

export function Lobby() {
  return (
    <main className="mx-auto max-w-6xl p-4 sm:p-6">
      <div className="py-5 text-center sm:py-8">
        <h1 className="font-display text-2xl sm:text-4xl">
          🚦 Traffic<span className="text-signal-amber">Odds</span>
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-dim sm:text-base">
          Tu casino virtual de puntos: sin dinero real, solo predicción, suerte y
          fanfarronería. Los puntos son compartidos entre todos los juegos.
        </p>
      </div>

      {SECTIONS.map((sec) => {
        const list = GAMES.filter((g) => g.cat === sec.cat);
        if (list.length === 0) return null;
        return <CarouselSection key={sec.cat} sec={sec} list={list} />;
      })}
    </main>
  );
}
