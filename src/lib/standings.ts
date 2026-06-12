import "server-only";
import { supabase, type Match, type Prediction } from "./supabase";
import { buildLeaderboard, bonusByPlayer, type LeaderboardRow } from "./scoring";

export type Bet = {
  id: string;
  question: string;
  is_open: boolean;
  outcome: boolean | null; // null = sin resolver
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
  const betById = new Map(bets.map((b) => [b.id, b]));

  const bonus = bonusByPlayer(
    gwPreds ?? [],
    gResults ?? [],
    scorerPreds ?? [],
    settings?.value ?? null
  );

  // Saldo de apuestas resueltas (+stake si salió SÍ, -stake si NO) y puntos en juego.
  const betNet = new Map<string, number>();
  const reserved = new Map<string, number>();
  const openStakeByKey = new Map<string, number>(); // `${player}:${bet}` -> stake (solo abiertas)
  for (const w of wagers) {
    const bet = betById.get(w.bet_id);
    if (!bet) continue;
    if (bet.outcome === null || bet.outcome === undefined) {
      reserved.set(w.player_id, (reserved.get(w.player_id) ?? 0) + w.stake);
      openStakeByKey.set(`${w.player_id}:${w.bet_id}`, w.stake);
    } else {
      const delta = bet.outcome ? w.stake : -w.stake;
      betNet.set(w.player_id, (betNet.get(w.player_id) ?? 0) + delta);
    }
  }

  const leaderboard = buildLeaderboard(
    players ?? [],
    (matches ?? []) as Match[],
    (predictions ?? []) as Prediction[],
    bonus,
    betNet
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
