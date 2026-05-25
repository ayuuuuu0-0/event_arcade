/** Arena background definitions and random selection. */
export interface Arena {
  id: string;
  name: string;
  image: string;
}

export const ARENAS: Arena[] = [
  { id: "neon_ring", name: "Neon Ring", image: "/arena/neon_ring.png" },
  { id: "cyber_dojo", name: "Cyber Dojo", image: "/arena/cyber_dojo.png" },
  { id: "dark_temple", name: "Dark Temple", image: "/arena/dark_temple.png" },
  { id: "steel_cage", name: "Steel Cage", image: "/arena/steel_cage.png" },
  { id: "shadow_realm", name: "Shadow Realm", image: "/arena/shadow_realm.png" },
];

export function getRandomArena(): Arena {
  return ARENAS[Math.floor(Math.random() * ARENAS.length)];
}
