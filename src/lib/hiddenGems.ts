// ============================================================
//  HIDDEN GEMS — bromas internas del grupo.
//  Cada "gem" puede tener nombres asociados: si un jugador se llama así,
//  ve SU coña destacada. Las demás van rotando para todos.
//  Añade las que quieras aquí.
// ============================================================
export type Gem = { text: string; names?: string[] };

export const GEMS: Gem[] = [
  { text: "Jordi Matas, portero titular de España 🧤", names: ["jordi"] },
  { text: "Si se cae el Estadio Azteca, lo ha construido Sisco 🏗️", names: ["sisco"] },
  { text: "Kandela, abanderado de Senegal y Marruecos 🚩", names: ["kandela"] },
  { text: "Yisu malqueda comequeso 🧀", names: ["yisu"] },
  { text: "Dr. Puerta, diagnostícame esta 🩺", names: ["puerta"] },
  { text: "Dr. Martínez, el Kaiser que no fue 👑", names: ["martinez"] },
  { text: "Jorge, viendo un Mundial sin ningún valencianista 🦇", names: ["jorge"] },
  { text: "Ramis, titular por banda ⚡", names: ["ramis"] },
  { text: "Rubén, orihueleño hjp 🍊", names: ["ruben"] },
  { text: "Alvarín, alvarín: alvarín te quiero ❤️", names: ["alvarin", "alvaro"] },
  { text: "Joan Aragonés, ese portugués 🇵🇹", names: ["joan"] },
  { text: "Javi va a la estéreo antes que al estadio 🎶", names: ["javi", "javier"] },
  { text: "Jemba Jemba 🃏" },
];

// Normaliza: minúsculas y sin acentos, para comparar nombres.
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

// Devuelve la(s) gem(s) personalizada(s) para un nombre de jugador (o []).
export function gemsForName(name: string | null | undefined): Gem[] {
  if (!name) return [];
  const tokens = new Set(norm(name).split(/\s+/));
  return GEMS.filter((g) =>
    (g.names ?? []).some((alias) => tokens.has(norm(alias)))
  );
}

// Todas las frases (para el ticker general).
export function allGemTexts(): string[] {
  return GEMS.map((g) => g.text);
}
