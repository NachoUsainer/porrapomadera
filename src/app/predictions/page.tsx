import { redirect } from "next/navigation";
import { supabase, type Match, type Team, type Prediction } from "@/lib/supabase";
import { getCurrentPlayer } from "@/lib/session";
import { scorePrediction, normalizeText } from "@/lib/scoring";
import { isMatchLocked } from "@/lib/lock";
import { getSpecialLockInfo, isGroupLocked, isScorerLocked } from "@/lib/special";
import { getStandings } from "@/lib/standings";
import PredictionsForm, { type MatchRow } from "@/components/PredictionsForm";
import SpecialPredictions, {
  type GroupItem,
  type ScorerItem,
} from "@/components/SpecialPredictions";
import SpecialBets, { type BetItem, type BetsSummary } from "@/components/SpecialBets";

export const dynamic = "force-dynamic";

const STAGE_ORDER = ["group", "r32", "r16", "qf", "sf", "third", "final"];
const KNOCKOUT = new Set(["r32", "r16", "qf", "sf", "third", "final"]);

export default async function PredictionsPage() {
  const player = await getCurrentPlayer();
  if (!player) redirect("/login");

  const [
    { data: matches },
    { data: teams },
    { data: preds },
    { data: gwPreds },
    { data: gResults },
    { data: scorerPred },
    { data: settings },
    { data: allScorers },
    { data: playersList },
    lockInfo,
  ] = await Promise.all([
    supabase.from("matches").select("*"),
    supabase.from("teams").select("*"),
    supabase.from("predictions").select("*").eq("player_id", player.id),
    supabase
      .from("group_winner_predictions")
      .select("group_name, team_id")
      .eq("player_id", player.id),
    supabase.from("group_results").select("group_name, winner_team_id"),
    supabase
      .from("scorer_predictions")
      .select("player_name")
      .eq("player_id", player.id)
      .maybeSingle(),
    supabase.from("settings").select("key, value").eq("key", "top_scorer").maybeSingle(),
    supabase.from("scorer_predictions").select("player_id, player_name"),
    supabase.from("players").select("id, name"),
    getSpecialLockInfo(),
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
    // past = ya empezó o terminó (a partir de aquí va al desplegable de cerrados)
    const past = isMatchLocked(m.kickoff, m.finished, now);
    // Sin equipos definidos no se puede predecir todavía.
    const locked = pendingTeams || past;
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
      past,
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

  // ---- Predicciones especiales ----
  const pickByGroup = new Map(
    (gwPreds ?? []).map((g) => [g.group_name, g.team_id as number])
  );
  const winnerByGroup = new Map(
    (gResults ?? []).map((g) => [g.group_name, g.winner_team_id as number | null])
  );
  const groupNames = [
    ...new Set((teams ?? []).map((t: Team) => t.group_name).filter(Boolean) as string[]),
  ].sort();

  const groupItems: GroupItem[] = groupNames.map((name) => ({
    name,
    teams: (teams ?? [])
      .filter((t: Team) => t.group_name === name)
      .map((t: Team) => ({ id: t.id, name: t.name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    locked: isGroupLocked(lockInfo.groupFirstKickoff.get(name), now),
    pickedTeamId: pickByGroup.get(name) ?? null,
    winnerTeamId: winnerByGroup.get(name) ?? null,
  }));

  const scorerItem: ScorerItem = {
    value: scorerPred?.player_name ?? "",
    locked: isScorerLocked(lockInfo.earliestR32, now),
    real: settings?.value ?? null,
  };

  // Votos al máximo goleador (públicos, para generar debate): agrupados por jugador-goleador
  const playerNameById = new Map((playersList ?? []).map((p) => [p.id, p.name as string]));
  const scorerGroups = new Map<string, { display: string; voters: string[] }>();
  for (const s of allScorers ?? []) {
    const key = normalizeText(s.player_name);
    if (!key) continue;
    const g = scorerGroups.get(key) ?? { display: s.player_name, voters: [] as string[] };
    g.voters.push(playerNameById.get(s.player_id) ?? "—");
    scorerGroups.set(key, g);
  }
  const scorerPicks = [...scorerGroups.values()]
    .map((g) => ({ name: g.display, voters: g.voters.sort((a, b) => a.localeCompare(b)) }))
    .sort((a, b) => b.voters.length - a.voters.length || a.name.localeCompare(b.name));

  // ---- Apuestas especiales ----
  const standings = await getStandings();
  const myTotal = standings.total.get(player.id) ?? 0;
  const myReserved = standings.reserved.get(player.id) ?? 0;
  // Quién ha apostado a cada apuesta (público, para picarse)
  const bettorsByBet = new Map<string, { name: string; stake: number }[]>();
  for (const w of standings.wagers) {
    const arr = bettorsByBet.get(w.bet_id) ?? [];
    arr.push({ name: playerNameById.get(w.player_id) ?? "—", stake: w.stake });
    bettorsByBet.set(w.bet_id, arr);
  }
  const betItems: BetItem[] = [...standings.bets]
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .map((b) => {
      const w = standings.wagerOf(player.id, b.id);
      const autoClosed = b.closes_at != null && new Date(b.closes_at).getTime() <= now;
      const status =
        b.outcome != null ? "resolved" : b.is_open && !autoClosed ? "open" : "closed";
      return {
        id: b.id,
        question: b.question,
        status: status as BetItem["status"],
        outcome: b.outcome,
        closesAt: b.closes_at,
        myStake: w ? w.stake : null,
        available: standings.availableFor(player.id, b.id),
        bettors: (bettorsByBet.get(b.id) ?? []).sort((x, y) => y.stake - x.stake),
      };
    });
  const betsSummary: BetsSummary = {
    total: myTotal,
    reserved: myReserved,
    available: Math.max(0, myTotal - myReserved),
  };

  return (
    <div className="space-y-12">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Mis predicciones</h1>
        <p className="mx-auto mt-2 max-w-md text-[15px] text-subtle">
          Resultados, campeones de grupo y goleador. Cada partido se cierra al empezar.
        </p>
      </div>

      <SpecialBets bets={betItems} summary={betsSummary} />

      <SpecialPredictions groups={groupItems} scorer={scorerItem} scorerPicks={scorerPicks} />

      <div>
        <h2 className="mb-4 px-1 text-sm font-semibold uppercase tracking-wide text-subtle">
          Resultados de los partidos
        </h2>
        {rows.length === 0 ? (
          <div className="card p-10 text-center text-[15px] text-subtle">
            Todavía no hay partidos cargados.
          </div>
        ) : (
          <PredictionsForm rows={rows} />
        )}
      </div>
    </div>
  );
}
