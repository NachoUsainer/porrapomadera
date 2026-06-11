import { redirect } from "next/navigation";
import { supabase, type Match, type Team, type Prediction } from "@/lib/supabase";
import { getCurrentPlayer } from "@/lib/session";
import { scorePrediction } from "@/lib/scoring";
import { isMatchLocked } from "@/lib/lock";
import PredictionsForm, { type MatchRow } from "@/components/PredictionsForm";

export const dynamic = "force-dynamic";

const STAGE_ORDER = ["group", "r32", "r16", "qf", "sf", "third", "final"];
const KNOCKOUT = new Set(["r32", "r16", "qf", "sf", "third", "final"]);

export default async function PredictionsPage() {
  const player = await getCurrentPlayer();
  if (!player) redirect("/login");

  const [{ data: matches }, { data: teams }, { data: preds }] = await Promise.all([
    supabase.from("matches").select("*"),
    supabase.from("teams").select("*"),
    supabase.from("predictions").select("*").eq("player_id", player.id),
  ]);

  const teamById = new Map((teams ?? []).map((t: Team) => [t.id, t]));
  const predByMatch = new Map(
    (preds ?? []).map((p: Prediction) => [p.match_id, p])
  );
  const now = Date.now();

  const allMatches = (matches ?? []) as Match[];
  allMatches.sort((a, b) => {
    const so = STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage);
    if (so !== 0) return so;
    const ka = a.kickoff ? new Date(a.kickoff).getTime() : Infinity;
    const kb = b.kickoff ? new Date(b.kickoff).getTime() : Infinity;
    return ka - kb || a.id - b.id;
  });

  const rows: MatchRow[] = allMatches.map((m) => {
    const pred = predByMatch.get(m.id);
    const pendingTeams = !m.home_team_id || !m.away_team_id;
    // Sin equipos definidos no se puede predecir todavía.
    const locked = pendingTeams || isMatchLocked(m.kickoff, m.finished, now);
    const points =
      m.finished && pred ? scorePrediction(m, pred as Prediction) : null;
    return {
      id: m.id,
      stage: m.stage,
      label: m.label,
      kickoff: m.kickoff,
      homeName: m.home_team_id ? teamById.get(m.home_team_id)?.name ?? "?" : "Por definir",
      awayName: m.away_team_id ? teamById.get(m.away_team_id)?.name ?? "?" : "Por definir",
      homeTeamId: m.home_team_id,
      awayTeamId: m.away_team_id,
      isKnockout: KNOCKOUT.has(m.stage),
      locked,
      pendingTeams,
      finished: m.finished,
      realHome: m.home_score,
      realAway: m.away_score,
      predHome: pred ? pred.home_score : null,
      predAway: pred ? pred.away_score : null,
      predAdvance: pred ? pred.advance_team_id : null,
      points,
    };
  });

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Mis predicciones</h1>
        <p className="mx-auto mt-2 max-w-md text-[15px] text-subtle">
          Rellena los resultados. Puedes cambiarlos hasta el inicio de cada partido.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="card p-10 text-center text-[15px] text-subtle">
          Todavía no hay partidos cargados. El admin tiene que añadirlos.
        </div>
      ) : (
        <PredictionsForm rows={rows} />
      )}
    </div>
  );
}
