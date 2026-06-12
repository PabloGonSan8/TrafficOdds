import { useState } from "react";
import { useGameState } from "../context/GameContext";
import { SimPanel } from "../components/SimPanel";
import { BetPanel } from "../components/BetPanel";
import { BottomTabs } from "../components/BottomTabs";
import { BetModal } from "../components/BetModal";
import { TutorialModal } from "../components/TutorialModal";

function EventBanner() {
  const { eventText } = useGameState();
  return eventText !== null ? (
    <div
      className="animate-banner-in border-b-2 border-signal-amber bg-[repeating-linear-gradient(45deg,#3a2c00_0_18px,#2a2000_18px_36px)] px-4 py-2 text-center font-cond text-sm font-semibold tracking-wide text-signal-amber sm:py-2.5 sm:text-lg"
      role="status"
      aria-live="assertive"
    >
      {eventText}
    </div>
  ) : null;
}

function TutorialGate() {
  const { tutorialSeen } = useGameState();
  return tutorialSeen ? null : <TutorialModal />;
}

export function TrafficPage() {
  const [modalMarket, setModalMarket] = useState(null);

  return (
    <>
      <a
        href="#bet-market"
        className="sr-only focus:not-sr-only focus:absolute focus:left-0 focus:top-0 focus:z-[100] focus:rounded-br-lg focus:bg-signal-amber focus:px-4 focus:py-2.5 focus:font-bold focus:text-[#1a1200]"
      >
        Saltar al mercado de apuestas
      </a>

      <EventBanner />

      <main className="grid grid-cols-1 items-start gap-2.5 p-2.5 sm:gap-4 sm:p-5 lg:grid-cols-[minmax(0,1.8fr)_minmax(300px,1fr)]">
        <SimPanel />
        <BetPanel onPick={setModalMarket} />
      </main>

      <BottomTabs />

      {modalMarket !== null ? (
        <BetModal market={modalMarket} onClose={() => setModalMarket(null)} />
      ) : null}

      <TutorialGate />
    </>
  );
}
