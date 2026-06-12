import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useGameState, useGameActions } from "../context/GameContext";
import {
  SUITS,
  BJ_LIMITS,
  INSURANCE_PAYOUT,
  newShoe,
  draw,
  handValue,
  isBlackjack,
  isBust,
  canSplit,
  dealerShouldHit,
  settle,
} from "../engine/blackjack";
import * as Audio from "../engine/audio";

// Fichas para subir la apuesta (suman a la actual).
const CHIPS = [
  { value: 10, bg: "#e8e4d8", text: "#1a1a1a", ring: "#b8b4a8" },
  { value: 25, bg: "#2ee06f", text: "#06210f", ring: "#1a8a44" },
  { value: 50, bg: "#3b82f6", text: "#ffffff", ring: "#1d4ed8" },
  { value: 100, bg: "#1b1f26", text: "#ffffff", ring: "#4a4f58" },
  { value: 250, bg: "#f97316", text: "#1a0a00", ring: "#c2410c" },
];

const DEALER_CARD_MS = 650;

const OUTCOME_TEXT = {
  blackjack: (p) => `♠ ¡BLACKJACK! 3:2 → +${p} pts`,
  win: (p) => `ganas +${p} pts`,
  push: () => "empate, apuesta devuelta",
  lose: () => "gana la banca",
};

function suitOf(id) {
  return SUITS.find((s) => s.id === id);
}

function PlayingCard({ card, hidden }) {
  if (hidden) {
    return (
      <div
        className="flex h-20 w-14 items-center justify-center rounded-lg border-2 border-white/60 bg-[repeating-linear-gradient(45deg,#1d3a8f_0_6px,#142a6b_6px_12px)] text-2xl shadow-lg shadow-black/50 sm:h-24 sm:w-[4.2rem]"
        aria-label="Carta oculta"
      >
        🂠
      </div>
    );
  }
  const suit = suitOf(card.suit);
  return (
    <div
      className="relative flex h-20 w-14 items-center justify-center rounded-lg border border-black/20 bg-gradient-to-br from-white to-[#e8e4d8] shadow-lg shadow-black/50 sm:h-24 sm:w-[4.2rem]"
      aria-label={`${card.rank} de ${suit.icon}`}
    >
      <span
        className={`absolute left-1 top-0.5 font-cond text-sm font-bold ${
          suit.red ? "text-[#c0392b]" : "text-[#1b1f26]"
        }`}
      >
        {card.rank}
      </span>
      <span className={`text-2xl sm:text-3xl ${suit.red ? "text-[#c0392b]" : "text-[#1b1f26]"}`}>
        {suit.icon}
      </span>
      <span
        className={`absolute bottom-0.5 right-1 rotate-180 font-cond text-sm font-bold ${
          suit.red ? "text-[#c0392b]" : "text-[#1b1f26]"
        }`}
      >
        {card.rank}
      </span>
    </div>
  );
}

function Hand({ title, cards, hideHole, badges = [], active }) {
  const value =
    cards.length === 0 ? null : hideHole ? handValue([cards[0]]) : handValue(cards);
  return (
    <section
      aria-label={title}
      className={active ? "rounded-lg bg-white/5 p-2 ring-1 ring-signal-amber/70" : "p-2"}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <h2 className="font-cond text-sm font-semibold uppercase tracking-wide text-white/80">
          {title}
        </h2>
        {value !== null ? (
          <span className="rounded-full bg-black/40 px-2 py-0.5 font-cond text-sm font-bold text-sodium">
            {value}
            {hideHole ? " + ?" : ""}
          </span>
        ) : null}
        {badges.map((b) => (
          <span
            key={b}
            className="rounded-full bg-signal-amber px-2 py-0.5 font-cond text-xs font-bold text-[#1a1200]"
          >
            {b}
          </span>
        ))}
      </div>
      <div className="flex min-h-20 flex-wrap gap-2 sm:min-h-24">
        {cards.map((c, i) => (
          <PlayingCard key={i} card={c} hidden={hideHole && i === 1} />
        ))}
      </div>
    </section>
  );
}

export function BlackjackPage() {
  const { points } = useGameState();
  const { spendPoints, awardPoints } = useGameActions();

  // "bet" → ("insurance") → "play" → "dealer" → "done"
  const [phase, setPhase] = useState("bet");
  const [stake, setStake] = useState(0);
  const [hands, setHands] = useState([]); // [{ cards, stake, doubled }]
  const [active, setActive] = useState(0);
  const [dealerCards, setDealerCards] = useState([]);
  const [message, setMessage] = useState(null);

  const shoeRef = useRef(null);
  const timersRef = useRef([]);

  useEffect(() => {
    return () => {
      for (const t of timersRef.current) clearTimeout(t);
    };
  }, []);

  function getShoe() {
    // Se rebaraja cuando queda menos de una baraja.
    if (!shoeRef.current || shoeRef.current.length < 52) {
      shoeRef.current = newShoe();
    }
    return shoeRef.current;
  }

  function addChip(v) {
    Audio.click();
    setStake((s) => Math.min(points, BJ_LIMITS.max, s + v));
  }

  /** Liquida todas las manos contra la mano final de la banca. */
  function finishRound(handsFinal, dealerFinal) {
    const split = handsFinal.length > 1;
    let total = 0;
    let staked = 0;
    const parts = [];
    handsFinal.forEach((h, i) => {
      const st = h.doubled ? h.stake * 2 : h.stake;
      staked += st;
      const { payout, outcome } = settle(h.cards, dealerFinal, st, split);
      total += payout;
      parts.push((split ? `Mano ${i + 1}: ` : "") + OUTCOME_TEXT[outcome](payout));
    });
    if (total > 0) awardPoints(total, `🃏 Blackjack: +${total} pts`);
    setMessage({
      kind: total > staked ? "win" : total > 0 ? "info" : "lose",
      text: parts.join(" · "),
    });
    if (total > staked) Audio.win();
    else if (total === 0) Audio.lose();
    setPhase("done");
  }

  /** Turno de la banca: revela y pide hasta 17, carta a carta con pausa. */
  function dealerTurn(handsNow) {
    setPhase("dealer");
    const shoe = getShoe();
    const startCards = [...dealerCards];
    const drawn = [];
    // Si todas las manos se pasaron, la banca solo revela.
    if (!handsNow.every((h) => isBust(h.cards))) {
      while (dealerShouldHit([...startCards, ...drawn])) {
        drawn.push(draw(shoe));
      }
    }
    drawn.forEach((card, i) => {
      timersRef.current.push(
        setTimeout(() => {
          Audio.tick();
          setDealerCards((d) => [...d, card]);
        }, DEALER_CARD_MS * (i + 1))
      );
    });
    timersRef.current.push(
      setTimeout(
        () => finishRound(handsNow, [...startCards, ...drawn]),
        DEALER_CARD_MS * (drawn.length + 1)
      )
    );
  }

  /** Pasa a la siguiente mano dividida o, si no quedan, al turno de la banca. */
  function advance(handsNow) {
    if (active + 1 < handsNow.length) {
      setActive(active + 1);
    } else {
      dealerTurn(handsNow);
    }
  }

  function deal() {
    if (phase === "play" || phase === "dealer" || phase === "insurance") return;
    if (stake < BJ_LIMITS.min) {
      setMessage({ kind: "lose", text: `Apuesta mínima: ${BJ_LIMITS.min} pts.` });
      return;
    }
    if (!spendPoints(stake)) {
      setMessage({ kind: "lose", text: "No tienes puntos suficientes." });
      return;
    }
    Audio.click();
    const shoe = getShoe();
    const player = [draw(shoe), draw(shoe)];
    const dealer = [draw(shoe), draw(shoe)];
    const handsNow = [{ cards: player, stake, doubled: false }];
    setHands(handsNow);
    setActive(0);
    setDealerCards(dealer);
    setMessage(null);

    if (dealer[0].rank === "A") {
      // La banca enseña un As: se ofrece el seguro antes de mirar la oculta.
      setPhase("insurance");
    } else if (isBlackjack(player) || isBlackjack(dealer)) {
      setPhase("dealer");
      timersRef.current.push(
        setTimeout(() => finishRound(handsNow, dealer), DEALER_CARD_MS)
      );
    } else {
      setPhase("play");
    }
  }

  /** Resuelve la oferta de seguro (la banca enseña un As). */
  function resolveInsurance(taken) {
    Audio.click();
    let ins = 0;
    if (taken) {
      ins = Math.floor(stake / 2);
      if (!spendPoints(ins)) {
        setMessage({ kind: "lose", text: "No te llega para el seguro." });
        return;
      }
    }
    const player = hands[0].cards;
    if (isBlackjack(dealerCards)) {
      if (ins > 0) {
        awardPoints(ins * (INSURANCE_PAYOUT + 1), `🛡️ Seguro: +${ins * (INSURANCE_PAYOUT + 1)} pts`);
      }
      setPhase("dealer");
      timersRef.current.push(
        setTimeout(() => finishRound(hands, dealerCards), DEALER_CARD_MS)
      );
    } else {
      if (ins > 0) {
        setMessage({ kind: "lose", text: "La banca no tiene Blackjack: seguro perdido." });
      }
      if (isBlackjack(player)) {
        setPhase("dealer");
        timersRef.current.push(
          setTimeout(() => finishRound(hands, dealerCards), DEALER_CARD_MS)
        );
      } else {
        setPhase("play");
      }
    }
  }

  function hit() {
    Audio.click();
    const card = draw(getShoe());
    const next = hands.map((h, i) =>
      i === active ? { ...h, cards: [...h.cards, card] } : h
    );
    setHands(next);
    const cards = next[active].cards;
    if (isBust(cards)) {
      Audio.lose();
      advance(next);
    } else if (handValue(cards) === 21) {
      advance(next);
    }
  }

  function stand() {
    Audio.click();
    advance(hands);
  }

  function doubleDown() {
    const hand = hands[active];
    if (!spendPoints(hand.stake)) {
      setMessage({ kind: "lose", text: "No te llega para doblar." });
      return;
    }
    Audio.click();
    const card = draw(getShoe());
    const next = hands.map((h, i) =>
      i === active ? { ...h, cards: [...h.cards, card], doubled: true } : h
    );
    setHands(next);
    if (isBust(next[active].cards)) Audio.lose();
    advance(next);
  }

  function splitHand() {
    if (!spendPoints(stake)) {
      setMessage({ kind: "lose", text: "No te llega para dividir." });
      return;
    }
    Audio.click();
    const shoe = getShoe();
    const [c1, c2] = hands[0].cards;
    const next = [
      { cards: [c1, draw(shoe)], stake, doubled: false },
      { cards: [c2, draw(shoe)], stake, doubled: false },
    ];
    setHands(next);
    setActive(0);
    if (c1.rank === "A") {
      // Ases divididos: una sola carta por mano, como en el casino.
      setMessage({ kind: "info", text: "Ases divididos: una carta por mano." });
      dealerTurn(next);
    }
  }

  function newHand() {
    Audio.click();
    setPhase("bet");
    setHands([]);
    setActive(0);
    setDealerCards([]);
    setMessage(null);
  }

  const hideHole = phase === "play" || phase === "insurance";
  const activeHand = hands[active] ?? null;
  const canDouble =
    phase === "play" && activeHand?.cards.length === 2 && points >= activeHand.stake;
  const canSplitNow =
    phase === "play" &&
    hands.length === 1 &&
    canSplit(hands[0].cards) &&
    points >= stake;
  const totalStaked = hands.reduce(
    (a, h) => a + (h.doubled ? h.stake * 2 : h.stake),
    0
  );

  return (
    <main className="mx-auto max-w-3xl p-3 sm:p-5">
      <Link to="/" className="font-cond text-sm font-semibold text-dim hover:text-ink">
        ← Volver al lobby
      </Link>

      {/* Tapete */}
      <div className="mt-2 rounded-2xl border-4 border-[#5d3a1a] bg-[radial-gradient(ellipse_at_top,#0f6b35,#0a4f27_70%)] p-3 shadow-2xl shadow-black/60 sm:p-5">
        <div className="mb-3 flex items-center justify-between rounded-lg bg-black/30 px-3 py-2">
          <div className="font-cond text-sm font-semibold text-white sm:text-base">
            Saldo: <span className="text-sodium">{points.toLocaleString("es-ES")} pts</span>
          </div>
          <div className="font-cond text-sm font-semibold text-white sm:text-base">
            Apuesta:{" "}
            <span className="text-signal-amber">
              {(hands.length > 0 ? totalStaked : stake).toLocaleString("es-ES")} pts
            </span>
          </div>
        </div>

        <p className="mb-3 text-center font-cond text-xs uppercase tracking-widest text-white/60">
          Blackjack paga 3 a 2 · Seguro paga 2 a 1 · La banca se planta en 17 · Mesa{" "}
          {BJ_LIMITS.min}–{BJ_LIMITS.max} pts
        </p>

        <div className="space-y-4">
          <Hand title="Banca" cards={dealerCards} hideHole={hideHole} />
          {hands.length > 1 ? (
            hands.map((h, i) => (
              <Hand
                key={i}
                title={`Mano ${i + 1}`}
                cards={h.cards}
                active={phase === "play" && i === active}
                badges={h.doubled ? ["DOBLADA"] : []}
              />
            ))
          ) : (
            <Hand
              title="Tu mano"
              cards={hands[0]?.cards ?? []}
              badges={hands[0]?.doubled ? ["DOBLADA"] : []}
            />
          )}
        </div>

        {message !== null ? (
          <p
            className={`mt-4 rounded-md bg-black/40 px-3 py-2 text-center font-cond font-semibold ${
              message.kind === "win"
                ? "text-signal-green"
                : message.kind === "info"
                  ? "text-signal-amber"
                  : "text-signal-red"
            }`}
            role="status"
          >
            {message.text}
          </p>
        ) : null}

        {/* Controles según fase */}
        {phase === "insurance" ? (
          <div className="mt-4 rounded-lg bg-black/30 p-3">
            <p className="mb-3 text-center font-cond font-semibold text-signal-amber">
              🛡️ La banca enseña un As. ¿Quieres seguro por{" "}
              {Math.floor(stake / 2)} pts? (paga 2:1 si tiene Blackjack)
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={points < Math.floor(stake / 2)}
                className="min-h-11 flex-1 rounded-md bg-signal-amber px-3 font-cond font-bold text-[#1a1200] hover:brightness-110 disabled:opacity-40"
                onClick={() => resolveInsurance(true)}
              >
                Sí, asegurar ({Math.floor(stake / 2)} pts)
              </button>
              <button
                type="button"
                className="min-h-11 flex-1 rounded-md border border-white/30 bg-black/30 px-3 font-cond font-semibold text-white hover:bg-black/50"
                onClick={() => resolveInsurance(false)}
              >
                No, gracias
              </button>
            </div>
          </div>
        ) : phase === "bet" || phase === "done" ? (
          <>
            <div
              className="mt-4 flex flex-wrap justify-center gap-2"
              role="group"
              aria-label="Subir apuesta"
            >
              {CHIPS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  aria-label={`Sumar ficha de ${c.value} puntos`}
                  className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-dashed font-cond text-sm font-bold shadow-lg shadow-black/40 transition hover:-translate-y-0.5 sm:h-14 sm:w-14 sm:text-base"
                  style={{ background: c.bg, color: c.text, borderColor: c.ring }}
                  onClick={() => addChip(c.value)}
                >
                  {c.value}
                </button>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={stake === 0}
                className="min-h-11 flex-1 rounded-md border border-white/30 bg-black/30 px-3 font-cond font-semibold text-white hover:bg-black/50 disabled:opacity-40"
                onClick={() => setStake(0)}
              >
                ✕ Limpiar
              </button>
              {phase === "done" ? (
                <button
                  type="button"
                  className="min-h-11 flex-1 rounded-md border border-white/30 bg-black/30 px-3 font-cond font-semibold text-white hover:bg-black/50"
                  onClick={newHand}
                >
                  🔄 Nueva mano
                </button>
              ) : null}
              <button
                type="button"
                disabled={stake < BJ_LIMITS.min || stake > points}
                className="min-h-11 flex-[2] rounded-md bg-signal-amber px-3 font-cond text-lg font-bold text-[#1a1200] shadow-lg shadow-black/40 hover:brightness-110 disabled:opacity-40"
                onClick={deal}
              >
                REPARTIR · {stake} pts
              </button>
            </div>
          </>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={phase !== "play"}
              className="min-h-12 flex-1 basis-[28%] rounded-md bg-signal-green px-3 font-cond text-lg font-bold text-[#06210f] shadow-lg shadow-black/40 hover:brightness-110 disabled:opacity-40"
              onClick={hit}
            >
              🃏 Pedir
            </button>
            <button
              type="button"
              disabled={phase !== "play"}
              className="min-h-12 flex-1 basis-[28%] rounded-md bg-signal-amber px-3 font-cond text-lg font-bold text-[#1a1200] shadow-lg shadow-black/40 hover:brightness-110 disabled:opacity-40"
              onClick={stand}
            >
              ✋ Plantarse
            </button>
            <button
              type="button"
              disabled={!canDouble}
              className="min-h-12 flex-1 basis-[28%] rounded-md border border-white/30 bg-black/30 px-3 font-cond text-lg font-bold text-white hover:bg-black/50 disabled:opacity-40"
              onClick={doubleDown}
            >
              ×2 Doblar
            </button>
            {canSplitNow ? (
              <button
                type="button"
                className="min-h-12 flex-1 basis-[28%] rounded-md border border-white/30 bg-black/30 px-3 font-cond text-lg font-bold text-white hover:bg-black/50"
                onClick={splitHand}
              >
                ✂️ Dividir
              </button>
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}
