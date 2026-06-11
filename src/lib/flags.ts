// Bandera (emoji) por nombre de selección. Se renderiza nativo en Apple.
// Inglaterra y Escocia usan los emojis de subdivisión.
const FLAGS: Record<string, string> = {
  "México": "🇲🇽",
  "Corea del Sur": "🇰🇷",
  "República Checa": "🇨🇿",
  "Sudáfrica": "🇿🇦",
  "Canadá": "🇨🇦",
  "Bosnia Herzegovina": "🇧🇦",
  "Qatar": "🇶🇦",
  "Suiza": "🇨🇭",
  "Brasil": "🇧🇷",
  "Marruecos": "🇲🇦",
  "Haití": "🇭🇹",
  "Escocia": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "Estados Unidos": "🇺🇸",
  "Paraguay": "🇵🇾",
  "Australia": "🇦🇺",
  "Turquía": "🇹🇷",
  "Alemania": "🇩🇪",
  "Curaçao": "🇨🇼",
  "Costa de Marfil": "🇨🇮",
  "Ecuador": "🇪🇨",
  "Países Bajos": "🇳🇱",
  "Japón": "🇯🇵",
  "Suecia": "🇸🇪",
  "Túnez": "🇹🇳",
  "Bélgica": "🇧🇪",
  "Egipto": "🇪🇬",
  "Irán": "🇮🇷",
  "Nueva Zelanda": "🇳🇿",
  "España": "🇪🇸",
  "Cabo Verde": "🇨🇻",
  "Arabia Saudí": "🇸🇦",
  "Uruguay": "🇺🇾",
  "Francia": "🇫🇷",
  "Senegal": "🇸🇳",
  "Iraq": "🇮🇶",
  "Noruega": "🇳🇴",
  "Argentina": "🇦🇷",
  "Argelia": "🇩🇿",
  "Austria": "🇦🇹",
  "Jordania": "🇯🇴",
  "Portugal": "🇵🇹",
  "R.D. del Congo": "🇨🇩",
  "Uzbekistán": "🇺🇿",
  "Colombia": "🇨🇴",
  "Inglaterra": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "Croacia": "🇭🇷",
  "Ghana": "🇬🇭",
  "Panamá": "🇵🇦",
};

export function flagFor(name: string | null | undefined): string {
  if (!name) return "";
  return FLAGS[name] ?? "";
}

// "🇪🇸 España" (con bandera si la hay).
export function withFlag(name: string | null | undefined): string {
  if (!name) return "";
  const f = FLAGS[name];
  return f ? `${f} ${name}` : name;
}
