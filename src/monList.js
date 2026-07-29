// Pokemon-Kanto-Dex: 1..151
// Quelle: PokéAPI, clientseitig gecached.
export const TOTAL_MON = 151;
export const TOTAL_COLLECTORS = 10; // später als Pokedex-Einträge/Items gedacht

export const TYPE_COLORS = {
  normal:   "#9fa19f",
  fire:     "#ff6f3c",
  water:    "#3ca7ff",
  electric: "#ffd23c",
  grass:    "#5ed94f",
  ice:      "#7fd4e8",
  fighting: "#d65a4f",
  poison:   "#a85cd6",
  ground:   "#e0b15a",
  flying:   "#8fb8f0",
  psychic:  "#ff6fa3",
  bug:      "#9bd14f",
  rock:     "#c9a86a",
  ghost:    "#7a5fd6",
  dragon:   "#5f6fff",
  dark:     "#5a5366",
  steel:    "#9fb0c0",
  fairy:    "#ff9ed6",
};

// Offizielle Pokemon-Typ-Vorteile (Attacke -> Verteidiger)
export const TYPE_ADVANTAGE = {
  normal:   { rock: 0.5, ghost: 0 },
  fire:     { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5 },
  water:    { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  grass:    { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5 },
  ice:      { water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2 },
  poison:   { grass: 2, poison: 0.5, ground: 0.5, bug: 2, rock: 0.5, ghost: 0.5 },
  ground:   { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2 },
  flying:   { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5 },
  psychic:  { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug:      { fire: 0.5, grass: 2, fighting: 0.5, poison: 2, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5 },
  rock:     { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost:    { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon:   { dragon: 2, steel: 0.5 },
  dark:     { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5 },
  steel:    { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5 },
  fairy:    { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 },
};

export function getEffectiveness(moveType, defenderTypes) {
  const table = TYPE_ADVANTAGE[moveType];
  if (!table) return 1;
  let result = 1;
  for (const t of defenderTypes) {
    const v = table[t];
    if (typeof v === "number") result *= v;
  }
  return result;
}

export function resolveMatch(a, b) {
  const aPower = a.strength || 0;
  const bPower = b.strength || 0;
  const aAdv = getEffectiveness(a.types?.[0], b.types || []);
  const bAdv = getEffectiveness(b.types?.[0], a.types || []);
  const aScore = aPower * aAdv;
  const bScore = bPower * bAdv;
  if (aScore > bScore) return { winner: "a" };
  if (bScore > aScore) return { winner: "b" };
  return { winner: "draw" };
}

export function hasAdvantage(attacker, defender) {
  return getEffectiveness(attacker.types?.[0], defender.types || []) >= 2;
}

export const BONUS = 1.25;
