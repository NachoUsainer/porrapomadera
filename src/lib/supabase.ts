import { createClient } from "@supabase/supabase-js";

// Cliente de Supabase para uso EXCLUSIVO en el servidor.
// Usa la clave service_role, que se salta RLS. Nunca lo importes en un
// componente de cliente ("use client").
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  // Mensaje claro si faltan variables de entorno.
  console.warn(
    "[porra] Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY. Revisa tu .env.local"
  );
}

// Usamos un placeholder válido si faltan las variables, para que `next build`
// no falle al construir. En ejecución real, con las variables puestas, se usan
// los valores correctos; si faltan, las llamadas fallarán de forma controlada.
export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  serviceKey || "placeholder-key",
  { auth: { persistSession: false } }
);

// Supabase/PostgREST corta cada consulta a 1000 filas. Para tablas que pueden
// superarlas (p.ej. predictions) hay que paginar o se pierden filas (¡y puntos!).
export async function fetchAll<T = Record<string, unknown>>(
  table: string,
  columns = "*",
  orderBy = "id"
): Promise<T[]> {
  const PAGE = 1000;
  const all: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order(orderBy, { ascending: true })
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    all.push(...(data as T[]));
    if (data.length < PAGE) break;
  }
  return all;
}

// Tipos compartidos
export type Team = {
  id: number;
  name: string;
  code: string | null;
  group_name: string | null;
};

export type Match = {
  id: number;
  stage: string;
  label: string | null;
  home_team_id: number | null;
  away_team_id: number | null;
  kickoff: string | null;
  home_score: number | null;
  away_score: number | null;
  advance_team_id: number | null;
  finished: boolean;
};

export type Prediction = {
  id: string;
  player_id: string;
  match_id: number;
  home_score: number;
  away_score: number;
  advance_team_id: number | null;
};

export type Player = {
  id: string;
  name: string;
  is_admin: boolean;
};

export const STAGE_LABELS: Record<string, string> = {
  group: "Fase de grupos",
  r32: "Dieciseisavos",
  r16: "Octavos",
  qf: "Cuartos",
  sf: "Semifinal",
  third: "3er y 4º puesto",
  final: "Final",
};
