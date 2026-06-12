import "server-only";
import { supabase } from "./supabase";

// Calcula los cierres de las predicciones especiales:
//  - cada grupo se cierra cuando empieza su PRIMER partido.
//  - el máximo goleador se cierra cuando empieza la primera eliminatoria (r32).
export async function getSpecialLockInfo() {
  const [{ data: matches }, { data: teams }] = await Promise.all([
    supabase.from("matches").select("stage, kickoff, home_team_id"),
    supabase.from("teams").select("id, group_name"),
  ]);

  const groupByTeam = new Map<number, string>();
  for (const t of teams ?? []) if (t.group_name) groupByTeam.set(t.id, t.group_name);

  const groupFirstKickoff = new Map<string, number>();
  let earliestR32: number | null = null;

  for (const m of matches ?? []) {
    const k = m.kickoff ? new Date(m.kickoff).getTime() : null;
    if (k == null) continue;
    if (m.stage === "group" && m.home_team_id != null) {
      const g = groupByTeam.get(m.home_team_id);
      if (g) {
        const cur = groupFirstKickoff.get(g);
        if (cur == null || k < cur) groupFirstKickoff.set(g, k);
      }
    } else if (m.stage === "r32") {
      if (earliestR32 == null || k < earliestR32) earliestR32 = k;
    }
  }
  return { groupFirstKickoff, earliestR32 };
}

export function isGroupLocked(firstKickoff: number | undefined, now = Date.now()) {
  return firstKickoff != null && firstKickoff <= now;
}

export function isScorerLocked(earliestR32: number | null, now = Date.now()) {
  return earliestR32 != null && earliestR32 <= now;
}
