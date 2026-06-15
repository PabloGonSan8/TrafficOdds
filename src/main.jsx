import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import { loadAds } from "./engine/monetization";

// Carga el SDK de anuncios (no hace nada hasta que configures tu ID en monetization.js).
loadAds();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
