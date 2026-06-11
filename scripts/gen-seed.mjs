// Genera supabase-seed-mundial.sql en ASCII PURO:
//  - IDs de equipo explícitos (sin función tid()).
//  - Nombres con acentos escritos como \uXXXX dentro de E'' (no hay bytes no-ASCII).
// Así el editor de Supabase no puede corromper nada al pegar.
import { writeFileSync } from "node:fs";

// id, nombre, grupo  (orden por grupos A..L)
const TEAMS = [
  [1, "México", "A"], [2, "Corea del Sur", "A"], [3, "República Checa", "A"], [4, "Sudáfrica", "A"],
  [5, "Canadá", "B"], [6, "Bosnia Herzegovina", "B"], [7, "Qatar", "B"], [8, "Suiza", "B"],
  [9, "Brasil", "C"], [10, "Marruecos", "C"], [11, "Haití", "C"], [12, "Escocia", "C"],
  [13, "Estados Unidos", "D"], [14, "Paraguay", "D"], [15, "Australia", "D"], [16, "Turquía", "D"],
  [17, "Alemania", "E"], [18, "Curaçao", "E"], [19, "Costa de Marfil", "E"], [20, "Ecuador", "E"],
  [21, "Países Bajos", "F"], [22, "Japón", "F"], [23, "Suecia", "F"], [24, "Túnez", "F"],
  [25, "Bélgica", "G"], [26, "Egipto", "G"], [27, "Irán", "G"], [28, "Nueva Zelanda", "G"],
  [29, "España", "H"], [30, "Cabo Verde", "H"], [31, "Arabia Saudí", "H"], [32, "Uruguay", "H"],
  [33, "Francia", "I"], [34, "Senegal", "I"], [35, "Iraq", "I"], [36, "Noruega", "I"],
  [37, "Argentina", "J"], [38, "Argelia", "J"], [39, "Austria", "J"], [40, "Jordania", "J"],
  [41, "Portugal", "K"], [42, "R.D. del Congo", "K"], [43, "Uzbekistán", "K"], [44, "Colombia", "K"],
  [45, "Inglaterra", "L"], [46, "Croacia", "L"], [47, "Ghana", "L"], [48, "Panamá", "L"],
];

// Literal de Postgres en ASCII puro (E'...\uXXXX...') si hay no-ASCII.
function lit(s) {
  let ascii = true;
  for (const ch of s) if (ch.codePointAt(0) > 0x7e || ch.codePointAt(0) < 0x20) ascii = false;
  if (ascii && !s.includes("'") && !s.includes("\\")) return `'${s}'`;
  let out = "E'";
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (ch === "'") out += "\\'";
    else if (ch === "\\") out += "\\\\";
    else if (cp >= 0x20 && cp <= 0x7e) out += ch;
    else if (cp <= 0xffff) out += "\\u" + cp.toString(16).padStart(4, "0");
    else out += "\\U" + cp.toString(16).padStart(8, "0");
  }
  return out + "'";
}

// Partidos de grupo: [home_id, away_id, "YYYY-MM-DD HH:MM", jornada, grupo, homeScore?, awayScore?]
const G = [
  // A
  [1, 4, "2026-06-11 21:00", 1, "A", 2, 0], [2, 3, "2026-06-12 04:00", 1, "A"],
  [3, 4, "2026-06-18 18:00", 2, "A"], [1, 2, "2026-06-19 03:00", 2, "A"],
  [4, 2, "2026-06-25 03:00", 3, "A"], [3, 1, "2026-06-25 03:00", 3, "A"],
  // B
  [5, 6, "2026-06-12 21:00", 1, "B"], [7, 8, "2026-06-13 21:00", 1, "B"],
  [8, 6, "2026-06-18 21:00", 2, "B"], [5, 7, "2026-06-19 00:00", 2, "B"],
  [8, 5, "2026-06-24 21:00", 3, "B"], [6, 7, "2026-06-24 21:00", 3, "B"],
  // C
  [9, 10, "2026-06-14 00:00", 1, "C"], [11, 12, "2026-06-14 03:00", 1, "C"],
  [12, 10, "2026-06-20 00:00", 2, "C"], [9, 11, "2026-06-20 02:30", 2, "C"],
  [12, 9, "2026-06-25 00:00", 3, "C"], [10, 11, "2026-06-25 00:00", 3, "C"],
  // D
  [13, 14, "2026-06-13 03:00", 1, "D"], [15, 16, "2026-06-14 06:00", 1, "D"],
  [13, 15, "2026-06-19 21:00", 2, "D"], [16, 14, "2026-06-20 05:00", 2, "D"],
  [16, 13, "2026-06-26 04:00", 3, "D"], [14, 15, "2026-06-26 04:00", 3, "D"],
  // E
  [17, 18, "2026-06-14 19:00", 1, "E"], [19, 20, "2026-06-15 01:00", 1, "E"],
  [17, 19, "2026-06-20 22:00", 2, "E"], [20, 18, "2026-06-21 02:00", 2, "E"],
  [20, 17, "2026-06-25 22:00", 3, "E"], [18, 19, "2026-06-25 22:00", 3, "E"],
  // F
  [21, 22, "2026-06-14 22:00", 1, "F"], [23, 24, "2026-06-15 04:00", 1, "F"],
  [21, 23, "2026-06-20 19:00", 2, "F"], [24, 22, "2026-06-21 06:00", 2, "F"],
  [24, 21, "2026-06-26 01:00", 3, "F"], [22, 23, "2026-06-26 01:00", 3, "F"],
  // G
  [25, 26, "2026-06-15 21:00", 1, "G"], [27, 28, "2026-06-16 03:00", 1, "G"],
  [25, 27, "2026-06-21 21:00", 2, "G"], [28, 26, "2026-06-22 03:00", 2, "G"],
  [28, 25, "2026-06-27 05:00", 3, "G"], [26, 27, "2026-06-27 05:00", 3, "G"],
  // H
  [29, 30, "2026-06-15 18:00", 1, "H"], [31, 32, "2026-06-16 00:00", 1, "H"],
  [29, 31, "2026-06-21 18:00", 2, "H"], [32, 30, "2026-06-22 00:00", 2, "H"],
  [32, 29, "2026-06-27 02:00", 3, "H"], [30, 31, "2026-06-27 02:00", 3, "H"],
  // I
  [33, 34, "2026-06-16 21:00", 1, "I"], [35, 36, "2026-06-17 00:00", 1, "I"],
  [33, 35, "2026-06-22 23:00", 2, "I"], [36, 34, "2026-06-23 02:00", 2, "I"],
  [34, 35, "2026-06-26 21:00", 3, "I"], [36, 33, "2026-06-26 21:00", 3, "I"],
  // J
  [37, 38, "2026-06-17 03:00", 1, "J"], [39, 40, "2026-06-17 06:00", 1, "J"],
  [37, 39, "2026-06-22 19:00", 2, "J"], [40, 38, "2026-06-23 05:00", 2, "J"],
  [40, 37, "2026-06-28 04:00", 3, "J"], [38, 39, "2026-06-28 04:00", 3, "J"],
  // K
  [41, 42, "2026-06-17 19:00", 1, "K"], [43, 44, "2026-06-18 04:00", 1, "K"],
  [41, 43, "2026-06-23 19:00", 2, "K"], [44, 42, "2026-06-24 04:00", 2, "K"],
  [42, 43, "2026-06-28 01:30", 3, "K"], [44, 41, "2026-06-28 01:30", 3, "K"],
  // L
  [45, 46, "2026-06-17 22:00", 1, "L"], [47, 48, "2026-06-18 01:00", 1, "L"],
  [45, 47, "2026-06-23 22:00", 2, "L"], [48, 46, "2026-06-24 01:00", 2, "L"],
  [48, 45, "2026-06-27 23:00", 3, "L"], [46, 47, "2026-06-27 23:00", 3, "L"],
];

// Eliminatorias: [stage, label, "YYYY-MM-DD HH:MM"]  (sin equipos todavía)
const KO = [
  ["r32", "1/16 #1: 2A vs 2B", "2026-06-28 21:00"],
  ["r32", "1/16 #2: 1C vs 2F", "2026-06-29 19:00"],
  ["r32", "1/16 #3: 1E vs 3(A/B/C/D/F)", "2026-06-29 22:30"],
  ["r32", "1/16 #4: 1F vs 2C", "2026-06-30 03:00"],
  ["r32", "1/16 #5: 2E vs 2I", "2026-06-30 19:00"],
  ["r32", "1/16 #6: 1I vs 3(C/D/F/G/H)", "2026-06-30 23:00"],
  ["r32", "1/16 #7: 1A vs 3(C/E/F/H/I)", "2026-07-01 03:00"],
  ["r32", "1/16 #8: 1L vs 3(E/H/I/J/K)", "2026-07-01 18:00"],
  ["r32", "1/16 #9: 1G vs 3(A/E/H/I/J)", "2026-07-01 22:00"],
  ["r32", "1/16 #10: 1D vs 3(B/E/F/I/J)", "2026-07-02 02:00"],
  ["r32", "1/16 #11: 1H vs 2J", "2026-07-02 21:00"],
  ["r32", "1/16 #12: 2K vs 2L", "2026-07-03 01:00"],
  ["r32", "1/16 #13: 1B vs 3(E/F/G/I/J)", "2026-07-03 05:00"],
  ["r32", "1/16 #14: 2D vs 2G", "2026-07-03 20:00"],
  ["r32", "1/16 #15: 1J vs 2H", "2026-07-04 00:00"],
  ["r32", "1/16 #16: 1K vs 3(D/E/I/J/L)", "2026-07-04 03:30"],
  ["r16", "Octavos #1: G.1/16-1 vs G.1/16-3", "2026-07-04 19:00"],
  ["r16", "Octavos #2: G.1/16-2 vs G.1/16-5", "2026-07-04 23:00"],
  ["r16", "Octavos #3: G.1/16-11 vs G.1/16-12", "2026-07-06 21:00"],
  ["r16", "Octavos #4: G.1/16-9 vs G.1/16-10", "2026-07-07 02:00"],
  ["r16", "Octavos #5: G.1/16-4 vs G.1/16-6", "2026-07-05 22:00"],
  ["r16", "Octavos #6: G.1/16-7 vs G.1/16-8", "2026-07-06 02:00"],
  ["r16", "Octavos #7: G.1/16-14 vs G.1/16-16", "2026-07-07 18:00"],
  ["r16", "Octavos #8: G.1/16-13 vs G.1/16-15", "2026-07-07 22:00"],
  ["qf", "Cuartos #1: G.Oct-1 vs G.Oct-2", "2026-07-09 22:00"],
  ["qf", "Cuartos #2: G.Oct-5 vs G.Oct-6", "2026-07-10 21:00"],
  ["qf", "Cuartos #3: G.Oct-3 vs G.Oct-4", "2026-07-11 23:00"],
  ["qf", "Cuartos #4: G.Oct-7 vs G.Oct-8", "2026-07-12 03:00"],
  ["sf", "Semifinal #1: G.Cuartos-1 vs G.Cuartos-2", "2026-07-14 21:00"],
  ["sf", "Semifinal #2: G.Cuartos-3 vs G.Cuartos-4", "2026-07-15 21:00"],
  ["third", "3er-4o puesto: P.Semi-1 vs P.Semi-2", "2026-07-18 23:00"],
  ["final", "Final: G.Semi-1 vs G.Semi-2", "2026-07-19 21:00"],
];

const ts = (s) => `'${s}:00+02'`;

let out = "";
out += "-- ===========================================================\n";
out += "--  CALENDARIO MUNDIAL 2026  (ASCII puro, a prueba de pegado)\n";
out += "--  Ejecutar DESPUES de supabase-schema.sql.\n";
out += "--  IDs de equipo explicitos; acentos como \\uXXXX en E''.\n";
out += "-- ===========================================================\n\n";
out += "delete from matches;\n";
out += "delete from teams;\n\n";

out += "insert into teams (id, name, group_name) values\n";
out += TEAMS.map(([id, name, g]) => `  (${id}, ${lit(name)}, '${g}')`).join(",\n") + ";\n\n";
out += "-- Reajustar la secuencia para futuras altas desde /admin\n";
out += "select setval(pg_get_serial_sequence('teams','id'), (select max(id) from teams));\n\n";

out += "insert into matches (stage, label, home_team_id, away_team_id, kickoff, home_score, away_score, finished) values\n";
const groupRows = G.map(([h, a, when, j, g, hs, as_]) => {
  const label = `Grupo ${g} - J${j}`;
  const score = hs == null ? "null, null, false" : `${hs}, ${as_}, true`;
  return `  ('group', ${lit(label)}, ${h}, ${a}, ${ts(when)}, ${score})`;
});
const koRows = KO.map(([stage, label, when]) =>
  `  ('${stage}', ${lit(label)}, null, null, ${ts(when)}, null, null, false)`
);
out += [...groupRows, ...koRows].join(",\n") + ";\n";

writeFileSync(new URL("../supabase-seed-mundial.sql", import.meta.url), out);
console.log(`OK: ${TEAMS.length} equipos, ${G.length} grupos + ${KO.length} eliminatorias = ${G.length + KO.length} partidos`);
