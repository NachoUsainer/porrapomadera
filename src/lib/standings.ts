import "server-only";
import { supabase, type Match, type Prediction } from "./supabase";
import {
  buildLeaderboard,
  bonusByPlayer,
  computeBetEffects,
  type LeaderboardRow,
} from "./scoring";
import { slotFromLabel, bracketScore } from "./bracket";

const KO_STAGES = ["r32", "r16", "qf", "sf", "final"];

// Quién pasó de verdad en un partido KO (el que avanza, o el de más goles).
function advancerOf(m: Match): number | null {
  if (!m.finished) return null;
  if (m.advance_team_id) return m.advance_team_id;
  if (m.home_score != null && m.away_score != null && m.home_score !== m.away_score) {
    return m.home_score > m.away_score ? m.home_team_id : m.away_team_id;
  }
  return null;
}

export type Bet = {
  id: string;
  question: string;
  is_open: boolean;
  outcome: boolean | null; // null = sin resolver
  closes_at: string | null; // si está, cierra sola a esa hora
  created_at: string;
};
export type Wager = { id: string; bet_id: string; player_id: string; stake: number };

export type Standings = {
  leaderboard: LeaderboardRow[];
  total: Map<string, number>; // puntos totales (incluye apuestas resueltas)
  reserved: Map<string, number>; // puntos en juego en apuestas abiertas
  bets: Bet[];
  wagers: Wager[];
  playerCount: number;
  finishedCount: number; // partidos finalizados
  // puntos que el jugador puede apostar en `betId` (excluye su apuesta actual en ese bet)
  availableFor: (playerId: string, betId: string) => number;
  wagerOf: (playerId: string, betId: string) => Wager | undefined;
};

// Calcula TODO el cuadro de puntos: ranking + apuestas (resueltas y en juego).
export async function getStandings(): Promise<Standings> {
  const [
    { data: players },
    { data: matches },
    { data: predictions },
    { data: gwPreds },
    { data: gResults },
    { data: scorerPreds },
    { data: settings },
    { data: betsData },
    { data: wagersData },
  ] = await Promise.all([
    supabase.from("players").select("id, name"),
    supabase.from("matches").select("*"),
    supabase.from("predictions").select("*"),
    supabase.from("group_winner_predictions").select("player_id, group_name, team_id"),
    supabase.from("group_results").select("group_name, winner_team_id"),
    supabase.from("scorer_predictions").select("player_id, player_name"),
    supabase.from("settings").select("key, value").eq("key", "top_scorer").maybeSingle(),
    supabase.from("special_bets").select("*"),
    supabase.from("bet_wagers").select("id, bet_id, player_id, stake"),
  ]);

  const bets = (betsData ?? []) as Bet[];
  const wagers = (wagersData ?? []) as Wager[];

  // ---- Puntos del cuadro (bracket) ----
  const { data: bracketRows } = await supabase
    .from("bracket_picks")
    .select("player_id, slot, team_id");
  const advancerByKey = new Map<string, number>();
  for (const m of (matches ?? []) as Match[]) {
    if (!KO_STAGES.includes(m.stage)) continue;
    const adv = advancerOf(m);
    if (adv != null) advancerByKey.set(`${m.stage}:${slotFromLabel(m.stage, m.label)}`, adv);
  }
  const picksByPlayer = new Map<string, Record<string, number>>();
  for (const r of bracketRows ?? []) {
    const rec = picksByPlayer.get(r.player_id) ?? {};
    rec[r.slot] = r.team_id;
    picksByPlayer.set(r.player_id, rec);
  }
  const bracketByPlayer = new Map<string, { points: number; hits: number }>();
  for (const [pid, picks] of picksByPlayer) {
    bracketByPlayer.set(pid, bracketScore(picks, advancerByKey));
  }

  const bonus = bonusByPlayer(
    gwPreds ?? [],
    gResults ?? [],
    scorerPreds ?? [],
    settings?.value ?? null
  );

  // Saldo de apuestas resueltas (+stake si salió SÍ, -stake si NO) y puntos en juego.
  const { betNet, reserved, openStake: openStakeByKey } = computeBetEffects(bets, wagers);

  const leaderboard = buildLeaderboard(
    players ?? [],
    (matches ?? []) as Match[],
    (predictions ?? []) as Prediction[],
    bonus,
    betNet,
    bracketByPlayer
  );
  const total = new Map(leaderboard.map((r) => [r.playerId, r.points]));

  const availableFor = (playerId: string, betId: string) => {
    const t = total.get(playerId) ?? 0;
    const res = reserved.get(playerId) ?? 0;
    const ownOpen = openStakeByKey.get(`${playerId}:${betId}`) ?? 0;
    return Math.max(0, t - res + ownOpen);
  };
  const wagerOf = (playerId: string, betId: string) =>
    wagers.find((w) => w.player_id === playerId && w.bet_id === betId);

  const finishedCount = ((matches ?? []) as Match[]).filter((m) => m.finished).length;

  return {
    leaderboard,
    total,
    reserved,
    bets,
    wagers,
    playerCount: (players ?? []).length,
    finishedCount,
    availableFor,
    wagerOf,
  };
}
