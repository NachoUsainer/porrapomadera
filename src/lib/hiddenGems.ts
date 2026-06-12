// ============================================================
//  HIDDEN GEMS — bromas internas del grupo.
//  Cada "gem" puede tener nombres asociados: si un jugador se llama así,
//  ve SU coña destacada. Las demás van rotando para todos.
//  Añade las que quieras aquí.
// ============================================================
export type Gem = { text: string; names?: string[] };

// Cada "names" lista TODOS los apodos/nombres con los que esa persona podría
// registrarse. La comparación ignora mayúsculas y acentos. Si un amigo entra con
// un nombre nuevo que no esté aquí, añádelo a su lista y listo.
export const GEMS: Gem[] = [
  { text: "Jordi Matas, portero titular de España 🧤", names: ["jordi", "matas", "jordimatas"] },
  { text: "Si se cae el Estadio Azteca, lo ha construido Sisco 🏗️", names: ["sisco", "sicanovich", "cisco", "francisco"] },
  { text: "Kandela, abanderado de Senegal y Marruecos 🚩", names: ["kandela", "candela", "kun", "kan", "pepekan"] },
  { text: "Yisu malqueda comequeso 🧀", names: ["yisu", "jesus", "crisol"] },
  { text: "Dr. Puerta, diagnostícame esta 🩺", names: ["puerta", "periko", "perico", "pedro", "drpuerta"] },
  { text: "Dr. Martínez, el Kaiser que no fue 👑", names: ["martinez", "andres", "drmartinez", "kaiser"] },
  { text: "Jorge, viendo un Mundial sin ningún valencianista 🦇", names: ["jorge", "giorgio", "valencianista"] },
  { text: "Ramis, titular por banda ⚡", names: ["ramis", "jaume"] },
  { text: "Rubén, orihueleño hjp 🍊", names: ["ruben", "benru", "sumuki", "sumu", "orihuela", "orihueleño"] },
  { text: "Alvarín, alvarín: alvarín te quiero ❤️", names: ["alvarin", "alvaro", "alvarito", "alvar"] },
  { text: "Joan Aragonés, ese portugués 🇵🇹", names: ["joan", "aragones"] },
  { text: "Javi va a la estéreo antes que al estadio 🎶", names: ["javi", "javier", "javo", "espin", "javiespin"] },
  { text: "Vamos, vamos Yisu 📣", names: ["yisu", "jesus", "crisol"] },
  { text: "Laaa gallina Jordi Matas: co co co co co co co cooooo 🐔", names: ["jordi", "matas", "jordimatas"] },
  { text: "De la torreta al mundial 🚀" },
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
