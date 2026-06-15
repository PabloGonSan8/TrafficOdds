export const COLORS = {
  gold: "#d9a441",
  cream: "#f5ead6",
  red: "#c0392b",
};

export const felt = { background: "radial-gradient(ellipse at 50% 20%, #16523f 0%, #0c3527 55%, #082419 100%)" };

export const gameCss = `
  @keyframes diceroll { 0%{transform:rotate(0) translateY(0)} 25%{transform:rotate(-14deg) translateY(-6px)} 50%{transform:rotate(10deg) translateY(2px)} 75%{transform:rotate(-7deg) translateY(-3px)} 100%{transform:rotate(0) translateY(0)} }
  .dice-roll { animation: diceroll 0.38s ease-in-out infinite; }
  @keyframes floatup { 0%{opacity:0; transform:translateY(8px) scale(0.7)} 15%{opacity:1; transform:translateY(0) scale(1.15)} 100%{opacity:0; transform:translateY(-52px) scale(1)} }
  .floater { animation: floatup 1.15s ease-out forwards; }
  @keyframes popin { 0%{transform:scale(0.6); opacity:0} 70%{transform:scale(1.12)} 100%{transform:scale(1); opacity:1} }
  .pop { animation: popin 0.3s ease-out; }
  @keyframes jokerbounce { 0%,100%{transform:translateY(0) rotate(0)} 30%{transform:translateY(-7px) rotate(-8deg)} 60%{transform:translateY(-2px) rotate(6deg)} }
  .joker-on { animation: jokerbounce 0.6s ease-in-out infinite; filter: drop-shadow(0 0 6px ${COLORS.gold}); }
  @keyframes confetti { 0%{transform:translateY(-20px) rotate(0); opacity:1} 100%{transform:translateY(70vh) rotate(360deg); opacity:0} }
  .confetti { animation: confetti 2.6s linear infinite; }
  @keyframes barpulse { 0%,100%{filter:brightness(1)} 50%{filter:brightness(1.5)} }
  .bar-pulse { animation: barpulse 0.8s ease-in-out infinite; }
  @keyframes fadein { from{opacity:0; transform:translateY(10px)} to{opacity:1; transform:translateY(0)} }
  .fadein { animation: fadein 0.35s ease-out both; }
  @keyframes lowblink { 0%,100%{opacity:1} 50%{opacity:0.45} }
  .low-blink { animation: lowblink 1s ease-in-out infinite; }
  @keyframes screenshake { 0%,100%{transform:translate(0,0)} 20%{transform:translate(-5px,3px)} 40%{transform:translate(5px,-3px)} 60%{transform:translate(-4px,-2px)} 80%{transform:translate(4px,2px)} }
  .screenshake { animation: screenshake 0.45s ease-in-out; }
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
`;
