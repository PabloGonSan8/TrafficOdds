import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GameProvider } from "./context/GameContext";
import { TopBar } from "./components/TopBar";
import { Footer } from "./components/Footer";
import { SettingsModal } from "./components/SettingsModal";
import { Toasts } from "./components/Toasts";
import { Lobby } from "./pages/Lobby";
import { TrafficPage } from "./pages/TrafficPage";
import { RoulettePage } from "./pages/RoulettePage";
import { SlotsPage } from "./pages/SlotsPage";
import { BlackjackPage } from "./pages/BlackjackPage";
import { CoinflipPage } from "./pages/CoinflipPage";
import { DicePage } from "./pages/DicePage";
import { HigherLowerPage } from "./pages/HigherLowerPage";
import { ScratchPage } from "./pages/ScratchPage";
import { CrashPage } from "./pages/CrashPage";
import { MinesPage } from "./pages/MinesPage";
import { PlinkoPage } from "./pages/PlinkoPage";
import { WheelPage } from "./pages/WheelPage";
import { RacePage } from "./pages/RacePage";
import { GaritoPage } from "./pages/GaritoPage";
import { HorseRacePage } from "./pages/HorseRacePage";

function AppShell() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <TopBar onOpenSettings={() => setSettingsOpen(true)} />

      <Routes>
        <Route path="/" element={<Lobby />} />
        <Route path="/trafico" element={<TrafficPage />} />
        <Route path="/ruleta" element={<RoulettePage />} />
        <Route path="/tragaperras" element={<SlotsPage />} />
        <Route path="/blackjack" element={<BlackjackPage />} />
        <Route path="/doble-o-nada" element={<CoinflipPage />} />
        <Route path="/dados" element={<DicePage />} />
        <Route path="/mayor-menor" element={<HigherLowerPage />} />
        <Route path="/rasca" element={<ScratchPage />} />
        <Route path="/crash" element={<CrashPage />} />
        <Route path="/minas" element={<MinesPage />} />
        <Route path="/plinko" element={<PlinkoPage />} />
        <Route path="/rueda-fortuna" element={<WheelPage />} />
        <Route path="/carrera" element={<RacePage />} />
        <Route path="/garito" element={<GaritoPage />} />
        <Route path="/caballos" element={<HorseRacePage />} />
        <Route path="*" element={<Lobby />} />
      </Routes>

      <Footer />

      {settingsOpen ? <SettingsModal onClose={() => setSettingsOpen(false)} /> : null}
      <Toasts />
    </>
  );
}

export default function App() {
  return (
    <GameProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </GameProvider>
  );
}
