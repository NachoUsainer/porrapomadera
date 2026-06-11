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
