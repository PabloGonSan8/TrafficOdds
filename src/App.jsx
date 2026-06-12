import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GameProvider } from "./context/GameContext";
import { TopBar } from "./components/TopBar";
import { SettingsModal } from "./components/SettingsModal";
import { Toasts } from "./components/Toasts";
import { Lobby } from "./pages/Lobby";
import { TrafficPage } from "./pages/TrafficPage";
import { RoulettePage } from "./pages/RoulettePage";
import { SlotsPage } from "./pages/SlotsPage";
import { BlackjackPage } from "./pages/BlackjackPage";

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
        <Route path="*" element={<Lobby />} />
      </Routes>

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
