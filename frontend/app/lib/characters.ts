export interface CharacterSprites {
  idle: string[];
  attack: string[];
  dodge: string[];
  hit: string[];
  ko: string[];
}

export interface Character {
  id: string;
  name: string;
  title: string;
  color: string;
  accent: string;
  sprites: CharacterSprites;
  description: string;
}

function buildSprites(id: string): CharacterSprites {
  const base = `/characters/${id}`;
  return {
    idle: [`${base}/idle_1.png`],
    attack: [`${base}/attack_1.png`, `${base}/attack_2.png`],
    dodge: [`${base}/dodge_1.png`],
    hit: [`${base}/hit_1.png`],
    ko: [`${base}/ko_1.png`],
  };
}

export const CHARACTERS: Character[] = [
  {
    id: "raven_kaze",
    name: "Shadow Raven",
    title: "The Shadow Wind",
    color: "#c084fc",
    accent: "#e9d5ff",
    sprites: buildSprites("raven_kaze"),
    description: "Silent assassin who strikes from the void. Unpredictable and lethal.",
  },
  {
    id: "iron_vex",
    name: "Iron Monger",
    title: "The Unbreakable",
    color: "#ef4444",
    accent: "#fca5a5",
    sprites: buildSprites("iron_vex"),
    description: "A walking fortress of rage and steel. Every hit lands like a truck.",
  },
  {
    id: "nova_blitz",
    name: "Super Nova",
    title: "Lightning Incarnate",
    color: "#06b6d4",
    accent: "#67e8f9",
    sprites: buildSprites("nova_blitz"),
    description: "Faster than thought. Hits you three times before you blink once.",
  },
  {
    id: "crimson_fang",
    name: "Crimson Empress",
    title: "The Blood Empress",
    color: "#dc2626",
    accent: "#f87171",
    sprites: buildSprites("crimson_fang"),
    description: "Ancient dragon-blooded warrior. Her fury burns through any defense.",
  },
  {
    id: "phantom_dusk",
    name: "Mystic Phantom",
    title: "The Void Walker",
    color: "#e879f9",
    accent: "#f0abfc",
    sprites: buildSprites("phantom_dusk"),
    description: "Phase-shifts through attacks. You can't hit what doesn't exist.",
  },
  {
    id: "steel_mako",
    name: "Deep Steel",
    title: "The Deep Predator",
    color: "#0ea5e9",
    accent: "#7dd3fc",
    sprites: buildSprites("steel_mako"),
    description: "Armored ocean hunter. Patient, precise, and absolutely merciless.",
  },
  {
    id: "volt_fist",
    name: "Volt Fist",
    title: "The Thunder God",
    color: "#eab308",
    accent: "#fde047",
    sprites: buildSprites("volt_fist"),
    description: "Channels raw lightning through his fists. One punch shorts out your nervous system.",
  },
  {
    id: "glacier_rex",
    name: "Glacier Rex",
    title: "The Frozen Titan",
    color: "#38bdf8",
    accent: "#bae6fd",
    sprites: buildSprites("glacier_rex"),
    description: "An ancient ice beast encased in crystal armor. Unstoppable and unyielding.",
  },
  {
    id: "venom_strike",
    name: "Venom Strike",
    title: "The Toxic Shadow",
    color: "#22c55e",
    accent: "#86efac",
    sprites: buildSprites("venom_strike"),
    description: "Poison-laced daggers and shadow movement. You're dead before you feel the cut.",
  },
  {
    id: "phoenix_blaze",
    name: "Phoenix Blaze",
    title: "The Eternal Flame",
    color: "#f97316",
    accent: "#fdba74",
    sprites: buildSprites("phoenix_blaze"),
    description: "Born from fire, reborn in fury. Her flames consume everything in their path.",
  },
];

export function getCharacterById(id: string): Character | undefined {
  return CHARACTERS.find((c) => c.id === id);
}

export function getRandomCharacter(excludeId?: string): Character {
  const pool = excludeId
    ? CHARACTERS.filter((c) => c.id !== excludeId)
    : CHARACTERS;
  return pool[Math.floor(Math.random() * pool.length)];
}
