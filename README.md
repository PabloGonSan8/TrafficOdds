# 🚦 TrafficOdds

Juego web de apuestas con **puntos virtuales** sobre tráfico simulado. Sin dinero real:
predicción, cuotas dinámicas, eventos sorpresa y progresión en una autopista virtual.

## Ejecutar

```bash
npm install
npm run dev          # desarrollo → http://localhost:5173
npm run dev -- --host  # accesible desde el móvil en red local
npm run build        # producción → dist/
```

## Stack

- **React 19 + Vite 6** — UI
- **Tailwind CSS 4** — estilos mobile-first
- **Canvas 2D** — carretera animada (día/noche, lluvia, faros)
- **WebAudio** — efectos de sonido sintetizados (sin assets)
- **LocalStorage** — guardado versionado (`traficbet_save_v2`) con migración

## Arquitectura

```
src/
  engine/        Lógica pura sin React (portable a servidor en fase online)
    simulation.js   Reloj virtual ×30, intensidad horaria, eventos sorpresa
    betting.js      Mercados, cuotas (aprox. normal-Poisson), resolución
    progression.js  XP/niveles, logros, misiones diarias deterministas
    storage.js      Persistencia versionada con migración
    audio.js        Sonidos WebAudio
    roadRenderer.js Dibujo del canvas
  context/       GameProvider — interfaz { state, actions, meta }
  hooks/         useGame — máquina de estados + bucle rAF
  components/    UI Tailwind (TopBar, SimPanel, BetPanel, BottomTabs, modales)
```

## Mecánicas

- **Rondas**: 15s mercado abierto → 45s simulación → 8s resultados
- **Mercados**: más/menos, rangos, comparativas, recuentos, dominante, exacta
- **Niveles**: XP por apostar/ganar; desbloquean tipos de mercado (1→4)
- **Misiones diarias**: 3 al día, deterministas por fecha, con recompensa
- **Logros**: 12 insignias permanentes
- **Extras**: racha (+5%/acierto, máx +50%), bonus diario, rescate anti-quiebra,
  eventos que alteran el tráfico (lluvia, accidente, hora punta…)

La economía es 100% interna: los puntos no se compran ni se canjean por dinero.
