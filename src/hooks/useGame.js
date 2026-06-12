/**
 * useGame.js — Máquina de estados del juego y bucle rAF.
 * Los valores que cambian cada frame viven en refs (rerender-use-ref-transient-values);
 * React solo recibe estado cuando el valor visible cambia.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import * as Simulation from "../engine/simulation";
import * as Betting from "../engine/betting";
import * as Storage from "../engine/storage";
import * as Progression from "../engine/progression";
import * as Audio from "../engine/audio";
import * as Music from "../engine/music";
import { RoadRenderer } from "../engine/roadRenderer";

export const PHASE_DURATIONS = { betting: 15, running: 45, results: 8 };
const DAILY_BONUS = 200;
const RESCUE_POINTS = 100;
const EMPTY_COUNTS = { coche: 0, moto: 0, camion: 0, autobus: 0, especial: 0, total: 0 };

let toastSeq = 0;
// Guard a nivel de módulo: la inicialización por carga de app no debe
// repetirse cuando StrictMode re-ejecuta el efecto (advanced-init-once).
let didInitApp = false;

// Comando secreto de consola (estilo Cookie Clicker): peaje() o peaje(50000).
// Se registra en cuanto carga el módulo; el hook conecta el handler al montar.
let cheatAward = null;
if (typeof window !== "undefined") {
  window.peaje = (n = 10000) => {
    const amount = Math.max(1, Math.floor(Number(n) || 0));
    if (cheatAward === null) return "El juego aún está cargando, prueba en un segundo.";
    cheatAward(amount);
    return `🛣️ Peaje cobrado: +${amount.toLocaleString("es-ES")} pts`;
  };
}

export function useGame() {
  // Estado persistente: única fuente de verdad mutable en ref, React refleja copias.
  const stateRef = useRef(null);
  if (stateRef.current === null) {
    stateRef.current = Storage.load();
    Audio.setMuted(!stateRef.current.settings.sound);
  }

  const [points, setPoints] = useState(() => stateRef.current.points);
  const [streak, setStreak] = useState(() => stateRef.current.streak);
  const [bestStreak, setBestStreak] = useState(() => stateRef.current.bestStreak);
  const [stats, setStats] = useState(() => stateRef.current.stats);
  const [history, setHistory] = useState(() => stateRef.current.history);
  const [roundNumber, setRoundNumber] = useState(() => stateRef.current.round);
  const [xp, setXp] = useState(() => stateRef.current.xp);
  const [achievements, setAchievements] = useState(() => stateRef.current.achievements);
  const [missions, setMissions] = useState(() => stateRef.current.missions);
  const [soundOn, setSoundOn] = useState(() => stateRef.current.settings.sound);
  const [musicOn, setMusicOn] = useState(() => stateRef.current.settings.music);
  const [tutorialSeen, setTutorialSeen] = useState(() => stateRef.current.tutorialSeen);

  const [phase, setPhase] = useState("betting");
  const [clock, setClock] = useState("--:--");
  const [remaining, setRemaining] = useState(PHASE_DURATIONS.betting);
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [market, setMarket] = useState([]);
  const [playerBets, setPlayerBets] = useState([]);
  const [results, setResults] = useState(null);
  const [roundSummary, setRoundSummary] = useState(null);
  const [eventText, setEventText] = useState(null);
  const [toasts, setToasts] = useState([]);

  // Transitorios del bucle: nunca provocan render por sí mismos.
  const phaseRef = useRef("betting");
  const remainingRef = useRef(PHASE_DURATIONS.betting);
  const roundRef = useRef(null);
  const marketRef = useRef([]);
  const playerBetsRef = useRef([]);
  const rendererRef = useRef(null);

  // El canvas vive en la página de tráfico y puede desmontarse al navegar:
  // la simulación sigue corriendo, solo se pausa el dibujo.
  const attachCanvas = useCallback((el) => {
    if (el) {
      rendererRef.current = new RoadRenderer(
        el,
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      );
    } else {
      rendererRef.current = null;
    }
  }, []);

  const toast = useCallback((text, kind = "info") => {
    const id = ++toastSeq;
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  /** Refleja el estado persistente en React y guarda. */
  const syncState = useCallback(() => {
    const s = stateRef.current;
    Storage.save(s);
    setPoints(s.points);
    setStreak(s.streak);
    setBestStreak(s.bestStreak);
    setStats({ ...s.stats });
    setHistory([...s.history]);
    setRoundNumber(s.round);
    setXp(s.xp);
    setAchievements([...s.achievements]);
    setMissions({ date: s.missions.date, list: s.missions.list.map((m) => ({ ...m })) });
  }, []);

  const placeBet = useCallback((mkt, stake) => {
    if (phaseRef.current !== "betting") {
      toast("El mercado ya está cerrado.", "loss");
      return;
    }
    const s = stateRef.current;
    if (Progression.levelFromXp(s.xp).level < mkt.minLevel) {
      toast(`Mercado bloqueado: necesitas nivel ${mkt.minLevel}.`, "loss");
      return;
    }
    if (stake > s.points) {
      toast("No tienes puntos suficientes.", "loss");
      return;
    }
    s.points -= stake;
    playerBetsRef.current = [...playerBetsRef.current, { market: mkt, stake }];
    setPlayerBets(playerBetsRef.current);
    syncState();
    Audio.click();
    toast(`Apuesta colocada: ${stake} pts a "${mkt.title}"`, "info");
  }, [toast, syncState]);

  /** Gasta puntos (ruleta, tienda futura). Devuelve false si no alcanza. */
  const spendPoints = useCallback((amount) => {
    const s = stateRef.current;
    if (amount < 1 || amount > s.points) return false;
    s.points -= amount;
    syncState();
    return true;
  }, [syncState]);

  /** Ingresa puntos (premios de ruleta, recompensas). */
  const awardPoints = useCallback((amount, message = null) => {
    const s = stateRef.current;
    s.points += amount;
    syncState();
    if (message !== null) toast(message, "win");
  }, [syncState, toast]);

  const toggleSound = useCallback(() => {
    const s = stateRef.current;
    s.settings.sound = !s.settings.sound;
    Audio.setMuted(!s.settings.sound);
    setSoundOn(s.settings.sound);
    Storage.save(s);
    if (s.settings.sound) Audio.click();
  }, []);

  const toggleMusic = useCallback(() => {
    const s = stateRef.current;
    s.settings.music = !s.settings.music;
    setMusicOn(s.settings.music);
    Storage.save(s);
    if (s.settings.music) Music.start();
    else Music.stop();
  }, []);

  const dismissTutorial = useCallback(() => {
    const s = stateRef.current;
    s.tutorialSeen = true;
    setTutorialSeen(true);
    Storage.save(s);
  }, []);

  const resetGame = useCallback(() => {
    Storage.reset();
    window.location.reload();
  }, []);

  useEffect(() => {
    const s = stateRef.current;

    // Inicialización por carga de app (advanced-init-once).
    if (!didInitApp) {
      didInitApp = true;
      const today = new Date().toISOString().slice(0, 10);
      if (s.lastDailyBonus !== today) {
        s.lastDailyBonus = today;
        s.points += DAILY_BONUS;
        toast(`🎁 Bonus diario: +${DAILY_BONUS} pts`, "win");
      }
      if (Progression.ensureDailyMissions(s)) {
        toast("📋 Nuevas misiones diarias disponibles", "info");
      }
    }

    // La música no puede arrancar sin gesto de usuario (política de autoplay):
    // primer toque/tecla la inicia si está activada en ajustes.
    function startMusicOnGesture() {
      if (stateRef.current.settings.music) Music.start();
      window.removeEventListener("pointerdown", startMusicOnGesture);
      window.removeEventListener("keydown", startMusicOnGesture);
    }
    window.addEventListener("pointerdown", startMusicOnGesture);
    window.addEventListener("keydown", startMusicOnGesture);

    // Conecta el comando secreto de consola con la economía del juego.
    cheatAward = (amount) =>
      awardPoints(amount, `🛣️ Peaje cobrado: +${amount.toLocaleString("es-ES")} pts`);

    function startBettingPhase() {
      phaseRef.current = "betting";
      remainingRef.current = PHASE_DURATIONS.betting;
      roundRef.current = Simulation.createRound(PHASE_DURATIONS.running);
      marketRef.current = Betting.generateMarket(roundRef.current);
      playerBetsRef.current = [];

      // Rescate si el jugador no puede ni apostar el mínimo.
      if (stateRef.current.points < 10) {
        stateRef.current.points += RESCUE_POINTS;
        toast(`🛟 Rescate: +${RESCUE_POINTS} pts para seguir jugando`, "info");
      }

      setPhase("betting");
      setMarket(marketRef.current);
      setPlayerBets([]);
      setResults(null);
      setRoundSummary(null);
      setCounts(EMPTY_COUNTS);
      setEventText(null);
      syncState();
    }

    function startRunningPhase() {
      phaseRef.current = "running";
      remainingRef.current = PHASE_DURATIONS.running;
      setPhase("running");
    }

    function startResultsPhase() {
      phaseRef.current = "results";
      remainingRef.current = PHASE_DURATIONS.results;
      const st = stateRef.current;
      const round = roundRef.current;
      const bets = playerBetsRef.current;

      let resolved = null;
      if (bets.length > 0) {
        resolved = Betting.resolveBets(bets, round.counts, st.streak);
        st.stats.roundsPlayed++;

        for (const r of resolved) {
          st.stats.totalBets++;
          if (r.won) {
            st.stats.wins++;
            st.points += r.payout;
            st.stats.biggestWin = Math.max(st.stats.biggestWin, r.payout);
            toast(`✅ ${r.bet.market.title} → +${r.payout} pts`, "win");
          } else {
            st.stats.losses++;
            toast(`❌ ${r.bet.market.title} → −${r.bet.stake} pts`, "loss");
          }
          st.stats.netProfit += r.delta;
          st.streak = r.streakAfter;
          st.bestStreak = Math.max(st.bestStreak, st.streak);
          st.history.unshift({
            round: st.round,
            desc: r.bet.market.title,
            stake: r.bet.stake,
            odds: r.bet.market.odds,
            won: r.won,
            delta: r.delta,
            ts: Date.now(),
          });
        }
        st.history = st.history.slice(0, 50);

        const winCount = resolved.filter((r) => r.won).length;
        if (winCount > 0) Audio.win();
        else Audio.lose();

        // Progresión: XP, misiones y logros.
        const ev = {
          betsPlaced: bets.length,
          wins: winCount,
          kindsWon: resolved.filter((r) => r.won).map((r) => r.bet.market.kind),
          profit: resolved.reduce((a, r) => a + r.delta, 0),
          played: true,
          hour: round.startHour,
          payoutMax: Math.max(0, ...resolved.map((r) => r.payout)),
          exactWin: resolved.some((r) => r.won && r.bet.market.kind === "exact"),
        };
        const notifications = Progression.applyRoundEnd(st, ev);
        for (const n of notifications) {
          toast(n.text, n.kind === "levelup" ? "win" : "info");
          if (n.kind === "levelup") Audio.levelUp();
        }
      }

      // Resumen visible de la ronda.
      const dominant = Simulation.VEHICLE_TYPES.reduce((best, t) =>
        round.counts[t.id] > round.counts[best.id] ? t : best
      );
      setRoundSummary({
        total: round.counts.total,
        dominantEmoji: dominant.emoji,
        dominantLabel: Simulation.TYPE_LABELS[dominant.id],
        eventLabel: round.event && round.eventRevealed ? round.event.label : null,
      });

      st.round++;
      setPhase("results");
      setResults(resolved);
      syncState();
    }

    function advancePhase() {
      if (phaseRef.current === "betting") startRunningPhase();
      else if (phaseRef.current === "running") startResultsPhase();
      else startBettingPhase();
    }

    let rafId;
    let lastTs = performance.now();

    function loop(ts) {
      const dt = Math.min(0.1, (ts - lastTs) / 1000);
      lastTs = ts;

      Simulation.tickClock(dt);
      setClock(Simulation.getClockString()); // mismo string → React no re-renderiza

      remainingRef.current -= dt;
      setRemaining(Math.max(0, Math.ceil(remainingRef.current)));

      const round = roundRef.current;
      if (phaseRef.current === "running" && round && !round.finished) {
        const wasRevealed = round.eventRevealed;
        const spawned = Simulation.tickRound(round, dt);
        if (rendererRef.current) {
          for (const t of spawned) rendererRef.current.spawn(t);
        }
        if (spawned.length > 0) setCounts({ ...round.counts });
        if (!wasRevealed && round.eventRevealed) {
          setEventText(round.event.label);
          Audio.eventAlert();
        }
      }

      if (remainingRef.current <= 0) advancePhase();

      if (rendererRef.current) {
        const raining =
          phaseRef.current === "running" &&
          round?.event?.id === "lluvia" &&
          round.eventRevealed;
        rendererRef.current.draw(dt, { hour: Simulation.getVirtualHour(), raining });
      }
      rafId = requestAnimationFrame(loop);
    }

    startBettingPhase();
    rafId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("pointerdown", startMusicOnGesture);
      window.removeEventListener("keydown", startMusicOnGesture);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    points, streak, bestStreak, stats, history, roundNumber,
    xp, achievements, missions, soundOn, musicOn, tutorialSeen,
    phase, clock, remaining, counts, market, playerBets, results,
    roundSummary, eventText, toasts, attachCanvas,
    placeBet, spendPoints, awardPoints,
    toggleSound, toggleMusic, dismissTutorial, resetGame,
  };
}
