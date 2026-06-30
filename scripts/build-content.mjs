// Genera páginas de contenido ESTÁTICO (HTML real, sin JS) para que el
// rastreador de Google/AdSense vea texto original e indexable. La SPA solo
// enlaza a estas páginas con <a href>. El contenido vive UNA sola vez aquí.
//
// Se ejecuta tras `vite build`:  node scripts/build-content.mjs
// Netlify sirve estos ficheros reales antes de aplicar el rewrite /* de _redirects.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = resolve(ROOT, "dist");
const SITE = "https://trafficodds.netlify.app";
const EMAIL = "pablitocebre9@gmail.com";
const UPDATED = "25 de junio de 2026";

// ── Utilidades ──────────────────────────────────────────────────────────────
const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Permite **negrita** dentro de los párrafos sin meter HTML a mano.
const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

const paras = (arr) => arr.map((p) => `<p>${rich(p)}</p>`).join("\n");

// ── Contenido: guías de juego (texto original) ───────────────────────────────
const GUIDES = [
  {
    slug: "trafico",
    icon: "🚦",
    title: "Apuestas de tráfico virtual: cómo se juega",
    play: "/trafico",
    lead:
      "El modo principal de TrafficOdds: una autopista simulada por la que pasan vehículos y sobre la que apuestas puntos. Aquí explicamos cómo leer la simulación y qué mercados existen.",
    sections: [
      {
        h: "Qué es el tráfico simulado",
        p: [
          "La autopista de TrafficOdds genera vehículos de forma aleatoria pero controlada: coches, motos, camiones, autobuses y vehículos especiales aparecen siguiendo patrones de intensidad que cambian a lo largo de la ronda. No hay datos reales de ninguna carretera; todo se calcula en tu navegador.",
          "El tiempo está acelerado a propósito. En lugar de esperar cinco minutos reales, una ronda se resuelve en segundos, así puedes ver el resultado de tu predicción casi al instante y encadenar varias apuestas seguidas.",
        ],
      },
      {
        h: "Tipos de apuesta disponibles",
        p: [
          "**Más / Menos:** predices si pasarán más o menos vehículos que una cifra de referencia durante la ronda. Es el mercado más sencillo para empezar.",
          "**Comparativas:** enfrentas dos categorías, por ejemplo «¿habrá más motos que camiones?». La cuota depende de lo igualada que esté la comparación.",
          "**Predicción de rango:** aciertas si el total cae dentro de una franja de valores. Cuanto más estrecha es la franja, mayor es el pago.",
          "**Eventos sorpresa:** accidentes, lluvia, hora punta u obras alteran temporalmente el flujo de vehículos y abren mercados puntuales con cuotas más altas.",
        ],
      },
      {
        h: "Cómo se calculan las cuotas",
        p: [
          "Cada cuota refleja la probabilidad estimada del resultado. Un desenlace muy probable paga poco; uno improbable paga mucho. Las cuotas se ajustan de forma dinámica según la intensidad del tráfico en ese momento, así que el mismo mercado no siempre vale lo mismo.",
          "El pago de una apuesta acertada es tu puesta multiplicada por la cuota. Si fallas, pierdes los puntos arriesgados. Recuerda: son puntos virtuales sin valor económico.",
        ],
      },
    ],
    tips: [
      "Observa unos segundos antes de apostar: la intensidad de la ronda te dice si conviene «más» o «menos».",
      "Los eventos sorpresa pagan más porque son menos predecibles; arriésgalos con puestas pequeñas.",
      "Reparte tus puntos: una sola apuesta grande puede vaciarte la banca en una ronda.",
    ],
  },
  {
    slug: "ruleta",
    icon: "🎡",
    title: "Ruleta europea: reglas, apuestas y pagos",
    play: "/ruleta",
    lead:
      "La ruleta de TrafficOdds usa el formato europeo (un solo cero) y reglas de casino reales. Te contamos cada tipo de apuesta y cuánto paga.",
    sections: [
      {
        h: "El tablero europeo",
        p: [
          "La ruleta europea tiene 37 casillas: los números del 1 al 36 más un único cero verde. Tener un solo cero (en lugar de los dos de la americana) reduce la ventaja de la banca y mejora tus probabilidades, por eso es la versión que usamos.",
          "Cada giro es independiente del anterior. Que haya salido rojo cinco veces seguidas no cambia la probabilidad del siguiente giro: sigue siendo la misma. Desconfía de cualquier «sistema» que prometa lo contrario.",
        ],
      },
      {
        h: "Apuestas exteriores (pagan poco, ganan a menudo)",
        p: [
          "**Rojo / Negro, Par / Impar, Falta / Pasa:** cubres casi la mitad del tablero y pagas ×2. Son la base para sesiones largas.",
          "**Docenas y columnas:** cubres 12 números y pagas ×3. Buen equilibrio entre riesgo y recompensa.",
        ],
      },
      {
        h: "Apuestas interiores (pagan mucho, ganan poco)",
        p: [
          "**Pleno (un número):** la apuesta estrella, paga ×36. Es la de mayor riesgo: solo 1 de 37 casillas gana.",
          "**Caballo, calle, cuadro y línea:** cubren entre 2 y 6 números con pagos intermedios (de ×18 a ×6). Sirven para combinar varios números cercanos en una sola ficha.",
        ],
      },
    ],
    tips: [
      "Para que la banca dure, prioriza apuestas exteriores ×2 y reserva los plenos para momentos puntuales.",
      "No existe sistema infalible: la martingala (doblar tras cada fallo) se come la banca rapidísimo.",
      "Fija un objetivo de puntos y retírate al alcanzarlo; la ruleta premia la disciplina, no la cabezonería.",
    ],
  },
  {
    slug: "blackjack",
    icon: "🃏",
    title: "Blackjack: cómo llegar a 21 contra la banca",
    play: "/blackjack",
    lead:
      "El blackjack es el juego de casino con mayor componente de decisión. Aquí tienes las reglas de TrafficOdds y una estrategia básica para no regalar puntos.",
    sections: [
      {
        h: "Objetivo y valor de las cartas",
        p: [
          "Buscas sumar más que la banca sin pasarte de 21. Las figuras (J, Q, K) valen 10, los números su cifra y el as vale 1 u 11, lo que más te convenga en cada mano.",
          "Un **blackjack** es as + carta de 10 en las dos primeras cartas: paga 3:2, mejor que una victoria normal. Si te pasas de 21 (te «plantas» tarde), pierdes automáticamente aunque la banca también se pase después.",
        ],
      },
      {
        h: "Tus opciones en cada turno",
        p: [
          "**Pedir (hit):** sumas otra carta. **Plantarte (stand):** te quedas con tu total y pasa el turno a la banca.",
          "**Doblar (double):** duplicas la apuesta a cambio de recibir exactamente una carta más. Es muy rentable cuando tu mano suma 10 u 11.",
          "La banca juega con reglas fijas: pide hasta llegar a 17 y entonces se planta. Saber esto es la base de toda la estrategia.",
        ],
      },
      {
        h: "Estrategia básica resumida",
        p: [
          "Si tu mano suma 11 o menos, pide siempre: es imposible pasarse. Con 17 o más, plántate casi siempre.",
          "La zona delicada es de 12 a 16: aquí mira la carta visible de la banca. Si la banca enseña entre 2 y 6 (cartas «malas» para ella, porque es probable que se pase), plántate. Si enseña 7 o más, arriésgate a pedir.",
          "Dobla con 10 u 11 cuando la banca enseñe una carta más baja que tu total. Es la jugada que más puntos extra genera a largo plazo.",
        ],
      },
    ],
    tips: [
      "Memoriza la regla 12-16: plántate contra carta baja de la banca (2-6), pide contra carta alta (7-A).",
      "El blackjack natural paga 3:2; no lo «protejas» con seguros, a la larga el seguro pierde puntos.",
      "Doblar con 11 es casi siempre correcto: aprovéchalo.",
    ],
  },
  {
    slug: "poker",
    icon: "♠️",
    title: "Póker contra la IA: Texas Hold'em y 5 cartas",
    play: "/poker",
    lead:
      "Juega Texas Hold'em o póker de cinco cartas contra tres rivales con inteligencia artificial que farolean, suben y se retiran. Te explicamos el orden de manos y cómo no arruinarte en el flop.",
    sections: [
      {
        h: "Orden de las manos",
        p: [
          "De mayor a menor: escalera de color, póker, full, color, escalera, trío, doble pareja, pareja y carta alta. Si nadie liga nada, gana quien tenga la carta más alta.",
          "En Texas Hold'em combinas tus dos cartas con las cinco comunitarias de la mesa para formar la mejor mano de cinco cartas posible.",
        ],
      },
      {
        h: "Las fases de una mano de Hold'em",
        p: [
          "**Preflop:** recibes dos cartas y decides si pagas la ciega, subes o te retiras. **Flop:** se descubren tres cartas comunitarias. **Turn** y **river:** se descubre una carta más en cada una, con su ronda de apuestas.",
          "En el showdown final, quien quede en juego enseña sus cartas y se lleva el bote la mejor mano.",
        ],
      },
      {
        h: "Leer a la IA",
        p: [
          "Los rivales de TrafficOdds farolean: una subida fuerte no siempre significa una gran mano. Observa cuándo apuestan agresivo y cuándo solo igualan.",
          "Tu posición importa: actuar el último te da información, porque ves lo que hacen los demás antes de decidir. Aprovecha para jugar más manos cuando hablas tarde.",
        ],
      },
    ],
    tips: [
      "Retírate sin pena con manos malas preflop: ahorrar puntos es ganar puntos.",
      "No persigas escaleras o colores incompletos si te cuesta muchos puntos verlas; calcula si la recompensa compensa.",
      "Un farol bien medido gana botes, pero farolear cada mano te hace previsible para la IA.",
    ],
  },
  {
    slug: "baccarat",
    icon: "🀄",
    title: "Baccarat (Punto Banco): la apuesta más sencilla del casino",
    play: "/baccarat",
    lead:
      "El baccarat parece misterioso pero es de los juegos más fáciles: solo eliges entre tres apuestas y las cartas se reparten solas con reglas fijas.",
    sections: [
      {
        h: "Cómo funciona Punto Banco",
        p: [
          "Hay dos manos, Player (Punto) y Banker (Banca). No controlas las cartas: tú solo decides a cuál apuestas. Gana la mano que más se acerque a 9.",
          "Las cartas suman su valor; las figuras y el 10 valen 0 y el as vale 1. Si la suma pasa de 9, se cuenta solo la última cifra: un 7 + un 8 (15) cuentan como 5.",
        ],
      },
      {
        h: "Las tres apuestas",
        p: [
          "**Banker (Banca):** la de mayor probabilidad de ganar. Suele llevar una pequeña comisión precisamente por eso.",
          "**Player (Punto):** paga limpio ×2, ligeramente menos probable que la banca.",
          "**Tie (Empate):** paga mucho más, pero es rara; es la apuesta de mayor riesgo y peor a largo plazo.",
        ],
      },
    ],
    tips: [
      "Estadísticamente, apostar a Banker es la opción más segura mantenida en el tiempo.",
      "El empate paga alto pero salta poco: úsalo solo como apuesta ocasional de capricho.",
      "No busques patrones en el historial de manos: cada reparto es independiente.",
    ],
  },
  {
    slug: "tragaperras",
    icon: "🎰",
    title: "Tragaperras: líneas de pago y multiplicadores",
    play: "/tragaperras",
    lead:
      "Tres rodillos, cinco líneas de pago y premios de hasta ×200 por línea. La tragaperras es puro azar, pero conviene entender cómo se forman los premios.",
    sections: [
      {
        h: "Rodillos y líneas",
        p: [
          "Al girar, cada rodillo se detiene en un símbolo. Ganas cuando se alinean símbolos iguales a lo largo de una de las cinco líneas de pago activas.",
          "Apostar a las cinco líneas multiplica tu puesta total, pero también tus opciones de premio: una sola línea premiada en cualquiera de ellas ya paga.",
        ],
      },
      {
        h: "Premios y volatilidad",
        p: [
          "Los símbolos más raros pagan más: alinear tres de los grandes puede llegar a ×200 por línea. Los comunes pagan poco pero salen a menudo.",
          "La tragaperras es de azar total: no hay memoria entre giros ni racha que «toque». Cada giro parte de cero.",
        ],
      },
    ],
    tips: [
      "Ajusta la puesta a tu banca: girar barato muchas veces aguanta más que pocas tiradas caras.",
      "Los grandes multiplicadores son raros por diseño; juega por diversión, no esperando el premio gordo.",
      "Fija un tope de puntos por sesión y respétalo.",
    ],
  },
  {
    slug: "crash",
    icon: "🚀",
    title: "Crash: retírate antes de que estalle el cohete",
    play: "/crash",
    lead:
      "Un multiplicador que sube sin parar y puede estallar en cualquier momento. Todo el juego consiste en una decisión: ¿cuándo cobras?",
    sections: [
      {
        h: "La mecánica",
        p: [
          "Apuestas tus puntos y el multiplicador arranca en ×1 y crece. Mientras no estalle, tu premio potencial es la puesta por el multiplicador actual. Si cobras a tiempo, te lo llevas.",
          "Pero el cohete estalla en un instante aleatorio. Si todavía no has retirado cuando estalla, pierdes la apuesta entera. Cuanto más esperas, más ganas... y más riesgo corres.",
        ],
      },
      {
        h: "Gestionar la avaricia",
        p: [
          "El error clásico es esperar siempre «un poco más». Los multiplicadores bajos (×1,3–×2) salen con muchísima frecuencia; los altos son cada vez más raros.",
          "Una táctica sólida es fijar de antemano el multiplicador al que cobras y respetarlo, en lugar de decidir en caliente viendo subir el número.",
        ],
      },
    ],
    tips: [
      "Decide tu salida ANTES de empezar la ronda, no mientras sube la tensión.",
      "Cobrar pronto y a menudo (×1,5) suele rendir más que cazar el ×10 ocasional.",
      "Divide la sesión en muchas apuestas pequeñas para sobrevivir a los estallidos tempranos.",
    ],
  },
  {
    slug: "minas",
    icon: "💣",
    title: "Minas: destapa gemas esquivando las bombas",
    play: "/minas",
    lead:
      "Una cuadrícula con gemas y minas escondidas. Cada gema que destapas sube el premio; una mina lo pierde todo. Tú decides cuándo plantarte.",
    sections: [
      {
        h: "Cómo se juega",
        p: [
          "Eliges cuántas minas hay escondidas en la cuadrícula. Cuantas más minas, mayor es el riesgo y más sube el multiplicador con cada gema que descubres.",
          "Vas destapando casillas. Si sale gema, tu premio crece; puedes cobrar en cualquier momento. Si pulsas una mina, pierdes la apuesta.",
        ],
      },
      {
        h: "Riesgo y recompensa",
        p: [
          "Con pocas minas, cada gema sube poco el premio pero es bastante seguro avanzar. Con muchas minas, el premio se dispara, pero cada clic es una ruleta rusa.",
          "El multiplicador crece más rápido cuantas más casillas seguras has destapado ya, porque quedan menos casillas y la siguiente es más arriesgada.",
        ],
      },
    ],
    tips: [
      "Plántate tras unas pocas gemas: la avaricia es lo que más puntos cuesta en Minas.",
      "Empieza con pocas minas para entender el ritmo del multiplicador.",
      "Si subes el número de minas para premios gordos, baja la puesta para compensar.",
    ],
  },
  {
    slug: "plinko",
    icon: "🔵",
    title: "Plinko: deja caer la bola y reza por los bordes",
    play: "/plinko",
    lead:
      "Sueltas una bola que rebota entre clavos hasta caer en una ranura. Las ranuras del centro pagan poco; las de los bordes, hasta ×60.",
    sections: [
      {
        h: "La física del rebote",
        p: [
          "Cada vez que la bola golpea un clavo, va a izquierda o derecha. Tras muchos rebotes, lo más probable es que acabe cerca del centro: por eso las ranuras centrales pagan poco, salen casi siempre.",
          "Llegar a los extremos exige que la bola caiga muchas veces hacia el mismo lado seguidas, algo raro. Por eso esos bordes pagan ×60: son los resultados más improbables.",
        ],
      },
      {
        h: "Filas y riesgo",
        p: [
          "Más filas de clavos significan más rebotes y una distribución más extrema: los bordes pagan más, pero el centro paga aún menos. Ajusta según cuánto riesgo quieras.",
        ],
      },
    ],
    tips: [
      "Plinko es 100% azar: ningún punto de salida garantiza un borde.",
      "Si buscas sesiones largas, las configuraciones de bajo riesgo aguantan más.",
      "Los ×60 son un golpe de suerte ocasional, no un plan; apuesta en consecuencia.",
    ],
  },
  {
    slug: "dados",
    icon: "🎲",
    title: "Dados: más/menos de 7, exacto y dobles",
    play: "/dados",
    lead:
      "Se lanzan dos dados y apuestas a la suma. Es rápido, intuitivo y un buen ejemplo de cómo la probabilidad decide las cuotas.",
    sections: [
      {
        h: "Las apuestas",
        p: [
          "**Más / Menos de 7:** apuestas a si la suma de los dos dados será mayor o menor que 7. Son las apuestas más equilibradas.",
          "**7 exacto:** el 7 es la suma más probable con dos dados (sale de seis maneras distintas), por eso acertar el 7 exacto paga bastante más que un más/menos.",
          "**Dobles:** los dos dados muestran el mismo número. Es poco frecuente, así que el pago es alto, hasta ×5.",
        ],
      },
      {
        h: "Por qué el 7 manda",
        p: [
          "Con dos dados hay 36 combinaciones. El 7 aparece en 6 de ellas (1-6, 2-5, 3-4...), mientras que el 2 o el 12 solo en una cada uno. Entender esto te dice de un vistazo qué apuestas son seguras y cuáles arriesgadas.",
        ],
      },
    ],
    tips: [
      "Más/menos de 7 es la opción para jugar tranquilo; exacto y dobles para arriesgar.",
      "El 2 y el 12 son los resultados más raros: pagan mucho pero salen poquísimo.",
      "Combina apuestas seguras frecuentes con algún tiro arriesgado de vez en cuando.",
    ],
  },
  {
    slug: "mayor-menor",
    icon: "🔼",
    title: "Mayor o Menor: encadena aciertos con las cartas",
    play: "/mayor-menor",
    lead:
      "¿La siguiente carta será mayor o menor que la actual? Sencillo de aprender, adictivo de encadenar. La clave está en la carta que tienes delante.",
    sections: [
      {
        h: "La mecánica",
        p: [
          "Ves una carta y predices si la próxima será mayor o menor. Cada acierto encadena y multiplica el premio; un fallo corta la racha.",
          "Puedes cobrar la racha acumulada antes de arriesgar la siguiente predicción. Ahí está la decisión: ¿cobras lo seguro o vas a por una carta más?",
        ],
      },
      {
        h: "Jugar con la carta visible",
        p: [
          "La probabilidad depende de la carta que ves. Si tienes un 2, casi cualquier carta es mayor: apostar «mayor» es casi seguro. Con un rey, lo lógico es «menor».",
          "El peligro está en las cartas centrales (7, 8): ahí mayor y menor están muy igualados y conviene cobrar antes que arriesgar.",
        ],
      },
    ],
    tips: [
      "Con cartas extremas (muy bajas o muy altas) arriésgate; con cartas centrales, cobra.",
      "Las rachas largas pagan muchísimo, pero la probabilidad de mantenerlas cae rápido.",
      "Fija cuántos aciertos quieres encadenar antes de empezar y cobra al llegar.",
    ],
  },
  {
    slug: "bingo",
    icon: "🎱",
    title: "Bingo 50: cartones, líneas y bingo",
    play: "/bingo",
    lead:
      "Un bingo rápido de 50 bolas. Compras cartones y ganas marcando Línea, Dos líneas o Bingo completo. Incluye apuesta lateral por bingo rápido.",
    sections: [
      {
        h: "Cómo se juega",
        p: [
          "Compras uno o varios cartones con números. Van saliendo bolas del 1 al 50 y se marcan automáticamente en tus cartones.",
          "Premias por fases: **Línea** (una fila completa), **Dos líneas** y **Bingo** (cartón entero). Cuantos más cartones juegas, más opciones tienes, pero más puntos arriesgas por ronda.",
        ],
      },
      {
        h: "La apuesta lateral",
        p: [
          "Además del bingo normal, puedes apostar a que el Bingo caerá en pocas bolas («bingo rápido»). Es una apuesta de riesgo: paga bien si el cartón se completa pronto, pero es poco frecuente.",
        ],
      },
    ],
    tips: [
      "Más cartones = más probabilidad de premio, pero vigila el gasto total por ronda.",
      "La apuesta lateral de bingo rápido es un extra arriesgado: puestas pequeñas.",
      "El bingo es azar puro; disfruta el ritmo sin perseguir pérdidas.",
    ],
  },
  {
    slug: "caballos",
    icon: "🏇",
    title: "Hipódromo: Ganador, Colocado, Exacta y Trifecta",
    play: "/caballos",
    lead:
      "Carreras de caballos con los mismos tipos de apuesta que una casa real y cuotas según el favoritismo de cada caballo.",
    sections: [
      {
        h: "Tipos de apuesta",
        p: [
          "**Ganador:** aciertas el caballo que llega primero. Sencillo y la base del hipódromo.",
          "**Colocado:** cobras si tu caballo entra entre los primeros puestos. Paga menos que Ganador, pero acierta más a menudo.",
          "**Exacta:** predices los dos primeros en el orden exacto. **Trifecta:** los tres primeros en orden. Son difíciles, así que pagan mucho.",
        ],
      },
      {
        h: "Leer las cuotas",
        p: [
          "Cada caballo tiene una cuota según sus probabilidades. El favorito paga poco porque se espera que gane; un caballo poco probable paga mucho si da la sorpresa.",
          "Las apuestas combinadas (Exacta, Trifecta) multiplican el riesgo y la recompensa: aciertas varios resultados a la vez o no cobras nada.",
        ],
      },
    ],
    tips: [
      "Empieza por Ganador y Colocado hasta cogerle el punto a las cuotas.",
      "Reserva Exacta y Trifecta para puestas pequeñas: el pago es grande pero acertar es difícil.",
      "Un favorito no siempre gana: por eso paga poco, no porque sea seguro.",
    ],
  },
  {
    slug: "mundial",
    icon: "🏆",
    title: "Apuestas del Mundial 2026 con puntos",
    play: "/mundial",
    lead:
      "Apuesta puntos sobre partidos del Mundial con mercados estilo casa de apuestas real: 1X2, goles y props. Solo entretenimiento, sin dinero real.",
    sections: [
      {
        h: "Mercados principales",
        p: [
          "**1X2:** apuestas a victoria local (1), empate (X) o victoria visitante (2). Es el mercado clásico del fútbol.",
          "**Goles (Más/Menos):** predices si el partido tendrá más o menos goles que una línea, normalmente 2,5. No importa quién gane, solo el total de goles.",
          "**Props:** mercados de casino sobre el partido como córners, tarjetas o tiros, con cuotas propias.",
        ],
      },
      {
        h: "Simple y combinada",
        p: [
          "Una apuesta **simple** juega un solo mercado. Una **combinada** une varias selecciones en un solo cupón: las cuotas se multiplican entre sí, así que el pago potencial es mucho mayor... pero basta fallar una selección para perder todo el cupón.",
          "Solo puedes apostar a partidos que aún no han empezado. Los resultados 1X2 y de goles se basan en datos reales; las props son simuladas.",
        ],
      },
    ],
    tips: [
      "Las combinadas son tentadoras por el pago, pero cada selección extra reduce mucho tu probabilidad de acierto.",
      "El mercado de goles 2,5 es bueno para empezar: solo decides si el partido será movido o cerrado.",
      "No apuestes por corazón: la cuota del favorito ya descuenta que es favorito.",
    ],
  },
];

// ── Plantilla HTML común ─────────────────────────────────────────────────────
function page({ path, title, description, body, jsonld }) {
  const url = `${SITE}${path}`;
  const ld = jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : "";
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)} · TrafficOdds</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="theme-color" content="#14171c">
<meta property="og:type" content="article">
<meta property="og:site_name" content="TrafficOdds">
<meta property="og:locale" content="es_ES">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🚦</text></svg>">
${ld}
<style>
:root{--bg:#14171c;--card:#1b1f26;--border:#2a2f37;--ink:#e9ecf1;--dim:#9aa0a6;--amber:#f59e0b}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.65}
a{color:var(--amber)}
.wrap{max-width:780px;margin:0 auto;padding:20px 18px 64px}
header.site{border-bottom:1px solid var(--border)}
header.site .wrap{padding:14px 18px;display:flex;align-items:center;justify-content:space-between}
.logo{font-weight:800;font-size:1.15rem;text-decoration:none;color:var(--ink)}
.logo span{color:var(--amber)}
nav.top a{color:var(--dim);text-decoration:none;font-size:.9rem;margin-left:16px}
nav.top a:hover{color:var(--amber)}
.crumb{font-size:.85rem;color:var(--dim);margin:0 0 6px}
.crumb a{color:var(--dim);text-decoration:none}
.crumb a:hover{color:var(--amber)}
h1{font-size:1.8rem;line-height:1.2;margin:.2em 0 .3em}
h2{font-size:1.25rem;color:var(--amber);margin:1.6em 0 .4em}
.lead{font-size:1.08rem;color:var(--ink)}
p{margin:.6em 0;color:#dfe3e9}
ul{padding-left:1.2em}
li{margin:.35em 0;color:#dfe3e9}
.cta{display:inline-block;margin:18px 0;background:var(--amber);color:#1a1207;font-weight:700;text-decoration:none;padding:11px 20px;border-radius:10px}
.card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px 18px;margin:16px 0}
.tips{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:8px 18px;margin:20px 0}
.tips h2{margin-top:.6em}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin:18px 0}
.tile{display:block;background:var(--card);border:1px solid var(--border);border-radius:14px;padding:14px;text-decoration:none;color:var(--ink)}
.tile:hover{border-color:var(--amber)}
.tile .i{font-size:1.6rem}
.tile .t{font-weight:700;margin:6px 0 2px}
.tile .d{font-size:.85rem;color:var(--dim)}
footer.site{border-top:1px solid var(--border);color:var(--dim);font-size:.85rem}
footer.site .wrap{padding:18px;text-align:center}
footer.site a{color:var(--dim);text-decoration:none;margin:0 8px}
footer.site a:hover{color:var(--amber)}
.note{font-size:.85rem;color:var(--dim);border-top:1px solid var(--border);margin-top:32px;padding-top:14px}
</style>
</head>
<body>
<header class="site"><div class="wrap">
<a class="logo" href="/">🚦 Traffic<span>Odds</span></a>
<nav class="top"><a href="/">Jugar</a><a href="/guias">Guías</a><a href="/faq">FAQ</a></nav>
</div></header>
<main class="wrap">
${body}
<p class="note">TrafficOdds es un juego de entretenimiento con <strong>puntos virtuales</strong>: no se usa dinero real, no se compran ni venden puntos y no tienen valor económico. Juega con responsabilidad. Contacto: <a href="mailto:${EMAIL}">${EMAIL}</a>.</p>
</main>
<footer class="site"><div class="wrap">
🚦 TrafficOdds · casino virtual de puntos, sin dinero real · gratis<br>
<a href="/guias">Guías</a><a href="/como-funciona">Cómo funciona</a><a href="/faq">FAQ</a><a href="/privacidad">Privacidad</a><a href="/contacto">Contacto</a>
</div></footer>
</body>
</html>`;
}

function write(path, html) {
  const out = resolve(DIST, path.replace(/^\//, ""), "index.html");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html, "utf8");
  console.log("·", path);
}

// ── Render de cada guía ──────────────────────────────────────────────────────
function renderGuide(g) {
  const related = GUIDES.filter((x) => x.slug !== g.slug)
    .slice(0, 6)
    .map(
      (x) =>
        `<a class="tile" href="/guia/${x.slug}"><div class="i">${x.icon}</div><div class="t">${esc(
          x.title.split(":")[0]
        )}</div></a>`
    )
    .join("\n");

  const body = `
<p class="crumb"><a href="/">Inicio</a> › <a href="/guias">Guías</a> › ${esc(g.icon)} ${esc(
    g.title.split(":")[0]
  )}</p>
<h1>${esc(g.icon)} ${esc(g.title)}</h1>
<p class="lead">${rich(g.lead)}</p>
<a class="cta" href="${g.play}">▶ Jugar ahora</a>
${g.sections.map((s) => `<h2>${esc(s.h)}</h2>\n${paras(s.p)}`).join("\n")}
<div class="tips"><h2>Consejos rápidos</h2><ul>${g.tips
    .map((t) => `<li>${rich(t)}</li>`)
    .join("")}</ul></div>
<a class="cta" href="${g.play}">▶ Probar ${esc(g.title.split(":")[0])}</a>
<h2>Otras guías</h2>
<div class="grid">${related}</div>`;

  const jsonld = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: g.title,
    inLanguage: "es",
    author: { "@type": "Organization", name: "TrafficOdds" },
    publisher: { "@type": "Organization", name: "TrafficOdds" },
    mainEntityOfPage: `${SITE}/guia/${g.slug}`,
    description: g.lead,
  };

  return page({
    path: `/guia/${g.slug}`,
    title: g.title,
    description: g.lead,
    body,
    jsonld,
  });
}

// ── Hub de guías ─────────────────────────────────────────────────────────────
function renderHub() {
  const tiles = GUIDES.map(
    (g) =>
      `<a class="tile" href="/guia/${g.slug}"><div class="i">${g.icon}</div><div class="t">${esc(
        g.title.split(":")[0]
      )}</div><div class="d">${esc(g.lead.slice(0, 90))}…</div></a>`
  ).join("\n");

  const body = `
<p class="crumb"><a href="/">Inicio</a> › Guías</p>
<h1>📚 Guías de juego de TrafficOdds</h1>
<p class="lead">Aprende a jugar cada modo de TrafficOdds: reglas, tipos de apuesta, cómo se calculan las cuotas y consejos para que tus puntos virtuales duren más. Todo el contenido es original y está pensado para que entiendas la probabilidad detrás de cada juego antes de apostar.</p>
<p>TrafficOdds es un casino virtual de puntos sin dinero real. Estas guías explican la mecánica de cada juego, desde el modo principal de tráfico simulado hasta los clásicos del casino como la ruleta o el blackjack. Elige una guía para empezar:</p>
<div class="grid">${tiles}</div>
<h2>Empieza por aquí</h2>
<p>Si es tu primera vez, lee primero <a href="/como-funciona">cómo funciona TrafficOdds</a> para entender el sistema de puntos y la simulación. Después, la <a href="/guia/trafico">guía del tráfico</a> te enseña el modo estrella. ¿Dudas generales? Mira las <a href="/faq">preguntas frecuentes</a>.</p>`;

  return page({
    path: "/guias",
    title: "Guías de juego",
    description:
      "Guías originales de todos los juegos de TrafficOdds: reglas, apuestas, cuotas y consejos. Casino virtual de puntos sin dinero real.",
    body,
  });
}

// ── Cómo funciona ────────────────────────────────────────────────────────────
function renderAbout() {
  const body = `
<p class="crumb"><a href="/">Inicio</a> › Cómo funciona</p>
<h1>Cómo funciona TrafficOdds</h1>
<p class="lead">TrafficOdds es un simulador de apuestas con puntos virtuales. No hay dinero real en ninguna parte: empiezas con una cantidad de puntos y los usas para predecir resultados en una autopista simulada y en una colección de juegos de casino clásicos.</p>

<h2>La idea</h2>
<p>El corazón del juego es una autopista virtual por la que pasan coches, motos, camiones, autobuses y vehículos especiales generados de forma aleatoria pero creíble. Sobre ese tráfico apuestas puntos: cuántos vehículos pasarán, qué tipo será el más frecuente, si habrá más motos que camiones, o cómo afectará un evento sorpresa como la lluvia o la hora punta.</p>
<p>El tiempo está acelerado para que no tengas que esperar. Una ronda que en la vida real duraría minutos se resuelve en segundos, así puedes ver el resultado de tus predicciones casi al instante.</p>

<h2>El sistema de puntos</h2>
<p>Todos los juegos comparten la misma banca de puntos. Ganas puntos acertando apuestas y los pierdes al fallar. Los puntos <strong>no se compran con dinero real, no se venden y no tienen ningún valor económico</strong>: sirven solo para progresar y competir dentro del juego. Si te quedas sin puntos, hay bonificaciones diarias y retos para recuperar saldo.</p>

<h2>Cómo se calculan las cuotas</h2>
<p>Cada apuesta tiene una cuota que refleja su probabilidad. Un resultado muy probable paga poco; uno improbable paga mucho. El pago de una apuesta acertada es tu puesta multiplicada por la cuota. Este principio es el mismo en todos los juegos: en la ruleta, un pleno paga ×36 porque solo 1 de 37 casillas gana; en los dados, el 7 exacto paga más que un más/menos porque es un resultado concreto.</p>

<h2>Los juegos</h2>
<p>Además del tráfico, TrafficOdds incluye ruleta europea, blackjack, póker contra IA, baccarat, bingo, tragaperras, crash, minas, plinko, dados, mayor o menor, carreras, hipódromo y apuestas deportivas del Mundial. Cada uno tiene su propia <a href="/guias">guía detallada</a> con reglas y consejos.</p>

<h2>¿Es justo? ¿Hay trampa?</h2>
<p>Los resultados se generan de forma aleatoria en tu navegador. Cada giro, tirada o reparto es independiente del anterior: no hay rachas que «toquen» ni sistemas infalibles. Los juegos de casino tienen, por diseño, una ligera ventaja para la banca, igual que en la realidad; por eso la gestión de tus puntos importa tanto como la suerte.</p>

<h2>Privacidad y datos</h2>
<p>No necesitas registrarte. Tu progreso (puntos, historial y ajustes) se guarda <strong>únicamente en tu navegador</strong> mediante almacenamiento local; no se envía a ningún servidor. Puedes consultar los detalles en la <a href="/privacidad">política de privacidad</a>.</p>

<h2>Juego responsable</h2>
<p>TrafficOdds es entretenimiento. Como no hay dinero real, no puedes perder nada de valor, pero el objetivo es pasarlo bien: fija objetivos de puntos, no «persigas» las pérdidas y juega por diversión. Si quieres profundizar, empieza por las <a href="/guias">guías</a> o resuelve dudas en las <a href="/faq">preguntas frecuentes</a>.</p>

<a class="cta" href="/">▶ Empezar a jugar</a>`;

  return page({
    path: "/como-funciona",
    title: "Cómo funciona",
    description:
      "Qué es TrafficOdds, cómo funcionan los puntos virtuales, las cuotas y la simulación de tráfico. Casino virtual sin dinero real.",
    body,
  });
}

// ── FAQ ──────────────────────────────────────────────────────────────────────
const FAQ = [
  [
    "¿TrafficOdds usa dinero real?",
    "No. TrafficOdds funciona exclusivamente con puntos virtuales. No se puede ingresar, comprar ni retirar dinero, y los puntos no tienen ningún valor económico. Es un juego de entretenimiento.",
  ],
  [
    "¿Necesito registrarme o crear una cuenta?",
    "No hace falta registro. Puedes jugar directamente; tu progreso se guarda en el almacenamiento local de tu navegador.",
  ],
  [
    "¿Dónde se guardan mis puntos y mi historial?",
    "Solo en tu navegador, mediante localStorage. No se envían a ningún servidor. Si borras los datos del navegador o juegas en otro dispositivo, empezarás de cero.",
  ],
  [
    "¿Cómo gano más puntos si me quedo sin saldo?",
    "Acertando apuestas, y mediante bonificaciones diarias y retos. Como los puntos no tienen valor real, recuperar saldo es parte del juego.",
  ],
  [
    "¿Están amañados los juegos?",
    "No. Los resultados se generan aleatoriamente y cada jugada es independiente. Los juegos de casino tienen una pequeña ventaja para la banca por diseño, igual que en la realidad, pero no hay manipulación contra el jugador.",
  ],
  [
    "¿Hay algún sistema para ganar siempre?",
    "No existe. Estrategias como doblar tras cada fallo (martingala) acaban vaciando la banca. Lo que sí ayuda es entender las probabilidades y gestionar bien los puntos; para eso están nuestras guías.",
  ],
  [
    "¿Qué juegos hay disponibles?",
    "Tráfico simulado (el modo principal), ruleta, blackjack, póker, baccarat, bingo, tragaperras, crash, minas, plinko, dados, mayor o menor, carreras, hipódromo y apuestas del Mundial.",
  ],
  [
    "¿Puedo jugar desde el móvil?",
    "Sí. TrafficOdds funciona en el navegador del móvil, la tablet o el ordenador, sin instalar nada.",
  ],
  [
    "¿Es apto para menores?",
    "El juego no está dirigido a menores de 14 años. Aunque no hay dinero real, trata temáticas de apuestas y recomendamos un uso adecuado a la edad.",
  ],
];

function renderFaq() {
  const items = FAQ.map(
    ([q, a]) => `<div class="card"><h2 style="margin-top:.2em">${esc(q)}</h2><p>${rich(a)}</p></div>`
  ).join("\n");

  const body = `
<p class="crumb"><a href="/">Inicio</a> › FAQ</p>
<h1>Preguntas frecuentes</h1>
<p class="lead">Resolvemos las dudas más habituales sobre TrafficOdds: puntos virtuales, datos, juegos y publicidad. ¿No encuentras tu respuesta? Escríbenos a <a href="mailto:${EMAIL}">${EMAIL}</a>.</p>
${items}
<p>Para aprender a jugar cada modo, visita las <a href="/guias">guías</a> o lee <a href="/como-funciona">cómo funciona TrafficOdds</a>.</p>`;

  const jsonld = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(([q, a]) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  return page({ path: "/faq", title: "Preguntas frecuentes", description: "Dudas frecuentes sobre TrafficOdds: puntos virtuales, sin dinero real, juegos, privacidad y publicidad.", body, jsonld });
}

// ── Ejecutar ─────────────────────────────────────────────────────────────────
write("/guias", renderHub());
write("/como-funciona", renderAbout());
write("/faq", renderFaq());
for (const g of GUIDES) write(`/guia/${g.slug}`, renderGuide(g));

// ── Sitemap completo (app + contenido) ───────────────────────────────────────
const APP_PATHS = [
  "/",
  "/trafico",
  "/mundial",
  "/ruleta",
  "/blackjack",
  "/poker",
  "/baccarat",
  "/bingo",
  "/tragaperras",
  "/crash",
  "/minas",
  "/plinko",
  "/dados",
  "/mayor-menor",
  "/caballos",
  "/carrera",
  "/privacidad",
  "/contacto",
];
const CONTENT_PATHS = ["/guias", "/como-funciona", "/faq", ...GUIDES.map((g) => `/guia/${g.slug}`)];
const today = new Date().toISOString().slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...APP_PATHS, ...CONTENT_PATHS]
  .map(
    (p) =>
      `  <url><loc>${SITE}${p}</loc><lastmod>${today}</lastmod><priority>${
        p === "/" ? "1.0" : p.startsWith("/guia") || CONTENT_PATHS.includes(p) ? "0.7" : "0.6"
      }</priority></url>`
  )
  .join("\n")}
</urlset>
`;
writeFileSync(resolve(DIST, "sitemap.xml"), sitemap, "utf8");
console.log("· /sitemap.xml");

console.log(`\n✓ ${CONTENT_PATHS.length} páginas de contenido + sitemap generados en dist/`);
