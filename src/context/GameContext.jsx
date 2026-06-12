/**
 * GameContext.jsx — Estado del juego inyectable por provider.
 * Interfaz genérica { state, actions, meta }: la UI consume el contrato,
 * no la implementación. Para la fase online bastará con un provider
 * alternativo que hable con el servidor.
 */
import { createContext, use, useMemo } from "react";
import { useGame } from "../hooks/useGame";
import { levelFromXp } from "../engine/progression";

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const game = useGame();
  const levelInfo = levelFromXp(game.xp);

  const value = useMemo(
    () => ({
      state: {
        points: game.points,
        streak: game.streak,
        bestStreak: game.bestStreak,
        stats: game.stats,
        history: game.history,
        roundNumber: game.roundNumber,
        xp: game.xp,
        level: levelInfo.level,
        levelProgress: levelInfo.into / levelInfo.need,
        achievements: game.achievements,
        missions: game.missions,
        soundOn: game.soundOn,
        musicOn: game.musicOn,
        tutorialSeen: game.tutorialSeen,
        phase: game.phase,
        clock: game.clock,
        remaining: game.remaining,
        counts: game.counts,
        market: game.market,
        playerBets: game.playerBets,
        results: game.results,
        roundSummary: game.roundSummary,
        eventText: game.eventText,
        toasts: game.toasts,
      },
      actions: {
        placeBet: game.placeBet,
        spendPoints: game.spendPoints,
        awardPoints: game.awardPoints,
        toggleSound: game.toggleSound,
        toggleMusic: game.toggleMusic,
        dismissTutorial: game.dismissTutorial,
        resetGame: game.resetGame,
      },
      meta: {
        attachCanvas: game.attachCanvas,
      },
    }),
    [
      game.points, game.streak, game.bestStreak, game.stats, game.history,
      game.roundNumber, game.xp, levelInfo.level, levelInfo.into, levelInfo.need,
      game.achievements, game.missions, game.soundOn, game.musicOn, game.tutorialSeen,
      game.phase, game.clock, game.remaining, game.counts,
      game.market, game.playerBets, game.results, game.roundSummary,
      game.eventText, game.toasts,
      game.placeBet, game.spendPoints, game.awardPoints,
      game.toggleSound, game.toggleMusic, game.dismissTutorial, game.resetGame,
      game.attachCanvas,
    ]
  );

  return <GameContext value={value}>{children}</GameContext>;
}

export function useGameState() {
  return use(GameContext).state;
}

export function useGameActions() {
  return use(GameContext).actions;
}

export function useGameMeta() {
  return use(GameContext).meta;
}
