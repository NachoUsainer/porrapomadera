import "server-only";
import { supabase, type Match, type Prediction } from "./supabase";
import { scorePrediction, POINTS, normalizeText } from "./scoring";

export type NotifItem = { id: string; text: string; positive: boolean };
type PlayerState = { base: number; bets: Record<string, boolean> };

// Calcula el "estado" actual de un jugador: puntos por aciertos (base) y
// las apuestas resueltas en las que participó.
async function computePlayerState(playerId: string): Promise<{
  base: number;
  resolvedBets: { betId: string; won: boolean; stake: number; question: string }[];
  state: PlayerState;
}> {
  const [
    { data: preds },
    { data: matches },
    { data: gwPreds },
    { data: gResults },
    { data: scorerPred },
    { data: settings },
    { data: wagers },
    { data: bets },
  ] = await Promise.all([
    supabase.from("predictions").select("*").eq("player_id", playerId),
    supabase.from("matches").select("*"),
    supabase
      .from("group_winner_predictions")
      .select("group_name, team_id")
      .eq("player_id", playerId),
    supabase.from("group_results").select("group_name, winner_team_id"),
    supabase
      .from("scorer_predictions")
      .select("player_name")
      .eq("player_id", playerId)
      .maybeSingle(),
    supabase.from("settings").select("value").eq("key", "top_scorer").maybeSingle(),
    supabase.from("bet_wagers").select("bet_id, stake").eq("player_id", playerId),
    supabase.from("special_bets").select("id, question, outcome"),
  ]);

  const matchById = new Map(((matches ?? []) as Match[]).map((m) => [m.id, m]));
  let base = 0;
  for (const p of (preds ?? []) as Prediction[]) {
    const m = matchById.get(p.match_id);
    if (m) base += scorePrediction(m, p);
  }
  const winByGroup = new Map(
    (gResults ?? []).filter((g) => g.winner_team_id != null).map((g) => [g.group_name, g.winner_team_id])
  );
  for (const g of gwPreds ?? []) {
    if (winByGroup.get(g.group_name) === g.team_id) base += POINTS.GROUP_WINNER;
  }
  const top = settings?.value ? normalizeText(settings.value) : null;
  if (top && scorerPred?.player_name && normalizeText(scorerPred.player_name) === top) {
    base += POINTS.TOP_SCORER;
  }

  const betById = new Map((bets ?? []).map((b) => [b.id, b]));
  const resolvedBets: { betId: string; won: boolean; stake: number; question: string }[] = [];
  const stateBets: Record<string, boolean> = {};
  for (const w of wagers ?? []) {
    const b = betById.get(w.bet_id);
    if (!b || b.outcome == null) continue;
    resolvedBets.push({
      betId: w.bet_id,
      won: b.outcome === true,
      stake: w.stake,
      question: b.question,
    });
    stateBets[w.bet_id] = b.outcome === true;
  }

  return { base, resolvedBets, state: { base, bets: stateBets } };
}

// Devuelve las novedades sin ver para un jugador.
export async function getNotifications(
  playerId: string
): Promise<{ items: NotifItem[]; unseen: number }> {
  const [{ data: playerRow }, computed] = await Promise.all([
    supabase.from("players").select("seen_state").eq("id", playerId).maybeSingle(),
    computePlayerState(playerId),
  ]);

  let seen: PlayerState = { base: 0, bets: {} };
  if (playerRow?.seen_state) {
    try {
      seen = JSON.parse(playerRow.seen_state);
    } catch {
      seen = { base: 0, bets: {} };
    }
  }

  const items: NotifItem[] = [];

  // Apuestas resueltas que aún no había visto (gane o pierda)
  for (const b of computed.resolvedBets) {
    if (seen.bets?.[b.betId] === undefined) {
      items.push({
        id: `bet-${b.betId}`,
        text: b.won
          ? `🎰 "${b.question}" · ¡ganaste +${b.stake} pts!`
          : `🎰 "${b.question}" · perdiste -${b.stake} pts`,
        positive: b.won,
      });
    }
  }

  // Puntos ganados por aciertos (predicciones, campeón de grupo, goleador)
  const gained = computed.base - (seen.base ?? 0);
  if (gained > 0) {
    items.push({
      id: `base-${computed.base}`,
      text: `🎉 +${gained} pts por tus aciertos`,
      positive: true,
    });
  }

  return { items, unseen: items.length };
}

// Marca todo como visto (guarda el estado actual).
export async function persistSeenState(playerId: string) {
  const { state } = await computePlayerState(playerId);
  await supabase.from("players").update({ seen_state: JSON.stringify(state) }).eq("id", playerId);
}
