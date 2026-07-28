import { useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { AdSlot } from "../components/ads/AdSlot";
import { MON } from "../engine/monetization";

const GAMES = [
  {
    to: "/trafico",
    icon: "🚦",
    name: "Tráfico en vivo",
    desc: "Apuesta sobre el tráfico de la autopista: más/menos, comparativas y eventos sorpresa.",
    cat: "Principal",
    color: "#16a34a",
  },
  {
    to: "/mundial",
    icon: "🏆",
    name: "Apuestas Mundial 2026",
    desc: "Partidos y resultados reales del Mundial. Apuesta puntos: 1X2, goles y props de casino (córners, tarjetas, tiros).",
    cat: "Principal",
    color: "#16a34a",
  },
  {
    to: "/reto",
    icon: "🏁",
    name: "Reto Diario",
    desc: "El mismo tráfico para todos cada día. Predice cómo acaba la ronda y compite en la tabla. Sin puntos: solo honor.",
    cat: "Principal",
    color: "#f59e0b",
  },
  {
    to: "/garito",
    icon: "🎲",
    name: "Garito",
    desc: "Roguelike de dados: lanza, guarda y relanza. Compra amuletos, dados especiales y vence a los garitos jefe.",
    cat: "Principal",
    color: "#d9a441",
  },
  {
    to: "/carrera",
    icon: "🏁",
    name: "Carrera",
    desc: "Apuesta por un vehículo en una carrera a cuatro. Si gana el tuyo, cobras ×3,96.",
    cat: "Carreras",
    color: "#22c55e",
  },
  {
    to: "/caballos",
    icon: "🏇",
    name: "Hipódromo",
    desc: "Carreras de caballos como en las casas de apuestas: Ganador, Colocado, Exacta y Trifecta con cuotas reales.",
    cat: "Carreras",
    color: "#15803d",
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
    cat: "Cartas",
    color: "#0ea5e9",
  },
  {
    to: "/poker",
    icon: "♠️",
    name: "Póker IA",
    desc: "Texas Hold'em y póker de 5 cartas contra 3 rivales con IA. Faroles, subidas y showdown.",
    cat: "Cartas",
    color: "#0f766e",
  },
  {
    to: "/baccarat",
    icon: "🀄",
    name: "Baccarat",
    desc: "Punto Banco: apuesta a Player, Banker o Tie. Reglas oficiales de casino.",
    cat: "Cartas",
    color: "#dc2626",
  },
  {
    to: "/bingo",
    icon: "🎱",
    name: "Bingo 50",
    desc: "Bingo rápido de 50 bolas. Compra cartones y gana con Línea, Dos líneas o Bingo. Apuesta lateral por bingo rápido.",
    cat: "Casino",
    color: "#7c3aed",
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
    cat: "Cartas",
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
  {
    to: "https://pablogonsan.itch.io/montecaz",
    icon: "🎰",
    name: "Montecaz",
    desc: "Explora Montecaz: más juegos de casino virtual con puntos.",
    cat: "Principal",
    color: "#eab308",
    external: true,
  },
  {
    to: "https://noventa-bka.pages.dev/",
    icon: "🔢",
    name: "Noventa",
    desc: "Juego número 90: un nuevo desafío de casino virtual con puntos.",
    cat: "Principal",
    color: "#8b5cf6",
    external: true,
  },
];

const SECTIONS = [
  { cat: "Principal", title: "⭐ Principales", sub: "Los nuestros" },
  { cat: "Tráfico", title: "🚦 Tráfico", sub: "Más de carretera" },
  { cat: "Carreras", title: "🏁 Carreras", sub: "Apuesta y a correr" },
  { cat: "Cartas", title: "🃏 Cartas", sub: "Mesas de baraja" },
  { cat: "Casino", title: "🎰 Casino", sub: "Clásicos del azar" },
];

// Un juego sale en su sección principal (cat) y en las extra (cats).
function inSection(g, cat) {
  return g.cat === cat || g.cats?.includes(cat);
}

// Fisher-Yates: orden imparcial. Solo el casino se baraja en cada carga.
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function GameCard({ game }) {
  const Tag = game.external ? "a" : Link;
  const extProps = game.external ? { href: game.to, target: "_blank", rel: "noopener noreferrer" } : { to: game.to };
  return (
    <Tag
      {...extProps}
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
    </Tag>
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
          className="grid grid-cols-2 gap-3 pt-2 sm:-mx-1 sm:flex sm:snap-x sm:snap-mandatory sm:gap-3 sm:overflow-x-auto sm:overflow-y-visible sm:px-1 sm:pb-3 sm:pt-3 sm:[scrollbar-width:none] sm:[&::-webkit-scrollbar]:hidden"
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
  // Una baraja por montaje/recarga; estable mientras navegas.
  const casino = useMemo(() => shuffle(GAMES.filter((g) => inSection(g, "Casino"))), []);
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
        {/* Enlaces a contenido estático (HTML real para SEO/AdSense): <a>, no Link. */}
        <p className="mt-2 font-cond text-sm">
          <a href="/guias" className="text-signal-amber hover:underline">📚 Guías de juego</a>
          <span className="mx-2 text-dim">·</span>
          <a href="/como-funciona" className="text-signal-amber hover:underline">Cómo funciona</a>
          <span className="mx-2 text-dim">·</span>
          <a href="/faq" className="text-signal-amber hover:underline">FAQ</a>
        </p>
      </div>

      {SECTIONS.map((sec, i) => {
        const list = sec.cat === "Casino" ? casino : GAMES.filter((g) => inSection(g, sec.cat));
        if (list.length === 0) return null;
        return (
          <div key={sec.cat}>
            <CarouselSection sec={sec} list={list} />
            {/* Anuncio tras la primera sección */}
            {i === 0 ? <AdSlot slot={MON.slots.lobby} /> : null}
          </div>
        );
      })}

      <AdSlot slot={MON.slots.lobby} minHeight={90} />
    </main>
  );
}
