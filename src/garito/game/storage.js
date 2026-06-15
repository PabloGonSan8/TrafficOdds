import { SAVE_KEY } from "./data";

// Persistencia en localStorage del navegador. Mantiene firma async para no
// tocar los llamadores (loadSave/writeSave se usan con await en Garito.jsx).
export async function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function writeSave(data) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // Guardado best-effort: si localStorage falla, se ignora.
  }
}
