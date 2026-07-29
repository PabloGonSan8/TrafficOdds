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
    icon: "⚔️",
    name: "MonteCaz",
    desc: "Action RPG roguelike: explora un mundo procedural, mejora a tu cazador y derrota a los 12 jefes.",
    cat: "Itch",
    color: "#b45309",
    external: true,
  },
  {
    to: "https://noventa-bka.pages.dev/",
    icon: "⚽",
    name: "Noventa",
    desc: "Simulador de carrera futbolística: toma decisiones partido a partido y lleva a tu jugador a lo más alto.",
    cat: "Itch",
    color: "#16a34a",
    external: true,
  },
  {
    to: "https://pablogonsan.itch.io/transito",
    icon: "🔎",
    name: "Tránsito",
    desc: "Investigación criminal narrativa: examina pruebas, interroga sospechosos y solo tienes una acusación.",
    cat: "Itch",
    color: "#7e22ce",
    external: true,
  },
];

// Marca de itch.io (logo oficial simplificado) para la cabecera de la sección.
function ItchIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" className={className}>
      <path d="M3.13 1.34C2.08 1.96.02 4.33 0 4.95v1.03c0 1.3 1.22 2.45 2.33 2.45 1.33 0 2.43-1.1 2.43-2.41 0 1.31 1.07 2.41 2.4 2.41 1.33 0 2.37-1.1 2.37-2.41 0 1.31 1.13 2.41 2.46 2.41h.03c1.33 0 2.46-1.1 2.46-2.41 0 1.31 1.04 2.41 2.36 2.41 1.33 0 2.4-1.1 2.4-2.41 0 1.31 1.11 2.41 2.44 2.41C22.78 8.43 24 7.28 24 5.98V4.95c-.02-.62-2.08-2.99-3.13-3.61-3.25-.11-5.51-.13-8.87-.13-3.36 0-7.55.05-8.87.13zm6.38 6.48c-.12.22-.28.42-.47.6-.5.49-1.19.8-1.95.8-.76 0-1.45-.31-1.95-.8-.18-.18-.32-.37-.45-.59-.13.22-.3.41-.49.59-.5.49-1.19.8-1.95.8-.09 0-.19-.03-.26-.05-.11 1.11-.15 2.18-.17 2.95v.01l-.01 1.16c.02 2.34-.23 7.57 1.03 8.85 1.95.46 5.55.66 9.15.66 3.61 0 7.2-.21 9.15-.66 1.26-1.28 1.01-6.51 1.03-8.85l-.01-1.16v-.01c-.02-.77-.06-1.84-.17-2.95-.08.03-.17.05-.26.05-.76 0-1.45-.31-1.95-.8-.19-.18-.36-.37-.49-.59-.13.22-.27.41-.45.59-.5.49-1.19.8-1.95.8-.76 0-1.45-.31-1.95-.8-.19-.18-.35-.38-.47-.6-.12.22-.28.42-.46.6-.5.49-1.19.8-1.95.8h-.16c-.76 0-1.45-.31-1.95-.8-.19-.18-.34-.38-.46-.6zM7.5 10.87c.8 0 1.5 0 2.37.95.7-.07 1.42-.11 2.13-.11.71 0 1.44.04 2.13.11.88-.95 1.58-.95 2.37-.95.38 0 1.89 0 2.94 2.95l1.13 4.05c.84 3.02-.27 3.09-1.65 3.1-2.05-.08-3.19-1.57-3.19-3.05-1.14.19-2.47.28-3.73.28-1.26 0-2.59-.09-3.73-.28 0 1.48-1.14 2.97-3.19 3.05-1.38-.01-2.49-.08-1.65-3.1l1.13-4.05c1.05-2.95 2.56-2.95 2.94-2.95zm4.5 2.3s-2.06 1.9-2.43 2.57l1.34-.05v1.17c0 .06.54.03 1.09.03.55 0 1.09.03 1.09-.03v-1.17l1.34.05c-.37-.67-2.43-2.57-2.43-2.57z" />
    </svg>
  );
}

const SECTIONS = [
  { cat: "Principal", title: "⭐ Principales", sub: "Los nuestros" },
  {
    cat: "Itch",
    title: (
      <span className="inline-flex items-center gap-2">
        <ItchIcon className="h-5 w-5 sm:h-6 sm:w-6" />
        Juegos en itch.io
      </span>
    ),
    sub: "Se abren en otra pestaña",
    note: (
      <>
        Otros juegos hechos por{" "}
        <a
          href="https://github.com/PabloGonSan8"
          target="_blank"
          rel="noopener noreferrer"
          className="text-signal-amber hover:underline"
        >
          mí
        </a>
        , el autor de TrafficOdds, publicados en mi perfil de{" "}
        <a
          href="https://pablogonsan.itch.io"
          target="_blank"
          rel="noopener noreferrer"
          className="text-signal-amber hover:underline"
        >
          itch.io
        </a>
        . Son gratis y no tienen nada que ver con dinero real.
      </>
    ),
  },
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

      {sec.note ? <p className="-mt-1 mb-1 text-xs leading-snug text-dim sm:text-sm">{sec.note}</p> : null}

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
