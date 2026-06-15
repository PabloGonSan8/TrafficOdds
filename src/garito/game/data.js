export const TARGETS = [40, 90, 150, 240, 360, 520, 720, 950];
export const BASE_PLAYS = 4;
export const BASE_REROLLS = 3;
export const MAX_JOKERS = 5;
export const SAVE_KEY = "garito-save";

export const DIFFICULTIES = [
  { id: "tranqui", name: "Tranqui", desc: "Para echar la tarde", mult: 0.8, icon: "☕" },
  { id: "clasico", name: "Clásico", desc: "El garito de toda la vida", mult: 1, icon: "🎲" },
  { id: "pesadilla", name: "Pesadilla", desc: "Aquí no gana ni el dueño", mult: 1.35, icon: "💀" },
];

export const RARITIES = {
  comun: { name: "Común", color: "#f5ead6" },
  raro: { name: "Raro", color: "#5fa8f0" },
  legendario: { name: "Legendario", color: "#c77df0" },
};

export const JOKERS = [
  { id: "madrugador", icon: "🐓", name: "El Madrugador", desc: "+3 mult por cada 1 jugado", cost: 5, rarity: "comun" },
  { id: "seisero", icon: "🎲", name: "El Seisero", desc: "+10 fichas por cada 6 jugado", cost: 4, rarity: "comun" },
  { id: "gemelos", icon: "👯", name: "Los Gemelos", desc: "+20 fichas con pareja o mejor", cost: 4, rarity: "comun" },
  { id: "vermutera", icon: "🍷", name: "La Vermutera", desc: "+15 fichas si la suma es impar", cost: 4, rarity: "comun" },
  { id: "gato", icon: "🐈‍⬛", name: "El Gato Negro", desc: "+30 fichas si los 5 dados son distintos", cost: 5, rarity: "comun" },
  { id: "eco", icon: "🔁", name: "El Eco", desc: "+2 mult si repites la combinación anterior", cost: 4, rarity: "comun" },
  { id: "contable", icon: "🧮", name: "El Contable", desc: "La suma de los dados cuenta doble", cost: 5, rarity: "comun" },
  { id: "avaro", icon: "🤑", name: "El Avaro", desc: "+1€ por relanzamiento sin usar", cost: 5, rarity: "comun" },
  { id: "bote", icon: "🫙", name: "El Bote", desc: "+2€ extra al superar un garito", cost: 6, rarity: "comun" },
  { id: "turbina", icon: "🌀", name: "La Turbina", desc: "×1.5 al multiplicador final", cost: 8, rarity: "raro" },
  { id: "treseran", icon: "🎩", name: "Tres Eran Tres", desc: "+2 mult con trío o mejor", cost: 6, rarity: "raro" },
  { id: "funicular", icon: "🚠", name: "El Funicular", desc: "+4 mult con escalera", cost: 7, rarity: "raro" },
  { id: "calcetines", icon: "🧦", name: "Los Calcetines", desc: "+3 mult si los 5 dados son pares", cost: 7, rarity: "raro" },
  { id: "faria", icon: "🚬", name: "La Faria", desc: "+0,5 mult por garito superado esta partida", cost: 7, rarity: "raro" },
  { id: "churrero", icon: "🥨", name: "El Churrero", desc: "+2 fichas por cada € en tu bolsillo", cost: 6, rarity: "raro" },
  { id: "castiza", icon: "💃", name: "La Castiza", desc: "+1 mult por cada amuleto que tengas", cost: 7, rarity: "raro" },
  { id: "dobleonada", icon: "🪙", name: "Doble o Nada", desc: "50% de probabilidad de ×2 mult", cost: 6, rarity: "raro" },
  { id: "otraronda", icon: "🍻", name: "Otra Ronda", desc: "+1 relanzamiento por ronda", cost: 6, rarity: "raro" },
  { id: "manitas", icon: "🔧", name: "El Manitas", desc: "+1 jugada por ronda", cost: 8, rarity: "raro" },
  { id: "dueno", icon: "👔", name: "El Dueño", desc: "×2 al multiplicador final", cost: 12, rarity: "legendario" },
];

export const MATERIALS = [
  { id: "dorado", icon: "🟡", name: "Dado Dorado", desc: "Su valor suma fichas dos veces", cost: 6 },
  { id: "trucado", icon: "🎯", name: "Dado Trucado", desc: "Solo saca 4, 5 o 6", cost: 7 },
  { id: "rubi", icon: "🔴", name: "Dado Rubí", desc: "+1 mult al jugarse", cost: 6 },
  { id: "zafiro", icon: "🔵", name: "Dado Zafiro", desc: "+8 fichas al jugarse", cost: 5 },
  { id: "esmeralda", icon: "🟢", name: "Dado Esmeralda", desc: "+1€ al superar el garito", cost: 5 },
];

export const BOSS_POOL = [
  { id: "cerrojo", icon: "🔒", name: "El Cerrojo", desc: "Sin relanzamientos en este garito" },
  { id: "tuerto", icon: "🕶️", name: "El Tuerto", desc: "Los 1 no suman fichas" },
  { id: "prisas", icon: "⏱️", name: "El Prisas", desc: "Solo tienes 3 jugadas" },
  { id: "mudo", icon: "🤐", name: "El Mudo", desc: "No verás la previsión de puntos" },
  { id: "caprichoso", icon: "🎭", name: "El Caprichoso", desc: "Las combinaciones repetidas valen 0" },
  { id: "zurdo", icon: "🫲", name: "El Zurdo", desc: "Solo puedes guardar 2 dados" },
];

export const COMBOS = [
  { rank: 0, name: "Suma corrida", chips: 0, mult: 1, upC: 5, upM: 0.5 },
  { rank: 1, name: "Pareja", chips: 5, mult: 1.5, upC: 10, upM: 0.5 },
  { rank: 2, name: "Doble pareja", chips: 10, mult: 2, upC: 10, upM: 0.5 },
  { rank: 3, name: "Trío", chips: 15, mult: 2, upC: 15, upM: 1 },
  { rank: 4, name: "Full", chips: 25, mult: 3, upC: 15, upM: 1 },
  { rank: 5, name: "Póker", chips: 35, mult: 4, upC: 20, upM: 1 },
  { rank: 6, name: "Escalera", chips: 40, mult: 4, upC: 20, upM: 1 },
  { rank: 7, name: "¡Repóker!", chips: 60, mult: 5, upC: 25, upM: 2 },
];
