import "server-only";
import { supabase } from "./supabase";
import { scorePrediction, POINTS, normalizeText } from "./scoring";

export type NotifItem = {
  id: string;
  text: string;
  positive: boolean;
  points: number;
  read: boolean;
  createdAt: string;
};

// ---------- Lectura (campana) ----------
export async function getNotifications(
  playerId: string
): Promise<{ items: NotifItem[]; unseen: number }> {
  const { data } = await supabase
    .from("notifications")
    .select("id, text, positive, points, read, created_at")
    .eq("player_id", playerId)
    .order("created_at", { ascending: false })
    .limit(40);
  const items: NotifItem[] = (data ?? []).map((n) => ({
    id: n.id,
    text: n.text,
    positive: n.positive,
    points: n.points,
    read: n.read,
    createdAt: n.created_at,
  }));
  return { items, unseen: items.filter((i) => !i.read).length };
}

export async function markRead(playerId: string) {
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("player_id", playerId)
    .eq("read", false);
}

// ---------- Generadores (se llaman desde las acciones del admin) ----------
type Row = {
  player_id: string;
  ref: string;
  text: string;
  kind: string;
  positive: boolean;
  points: number;
};

async function replace(ref: string | { like: string }, rows: Row[]) {
  // Borra las notificaciones previas de ese evento y mete las nuevas.
  if (typeof ref === "string") await supabase.from("notifications").delete().eq("ref", ref);
  else await supabase.from("notifications").delete().like("ref", ref.like);
  if (rows.length) await supabase.from("notifications").insert(rows);
}

// Notificaciones de un partido al ponerle resultado.
export async function genMatchNotifications(matchId: number) {
  const ref = `match:${matchId}`;
  const { data: m } = await supabase.from("matches").select("*").eq("id", matchId).maybeSingle();
  if (!m || !m.finished || m.home_score == null || m.away_score == null) {
    await replace(ref, []);
    return;
  }
  const [{ data: teams }, { data: preds }] = await Promise.all([
    supabase.from("teams").select("id, name").in("id", [m.home_team_id, m.away_team_id]),
    supabase.from("predictions").select("*").eq("match_id", matchId),
  ]);
  const nameById = new Map((teams ?? []).map((t) => [t.id, t.name]));
  const home = nameById.get(m.home_team_id) ?? "?";
  const away = nameById.get(m.away_team_id) ?? "?";

  const rows: Row[] = [];
  for (const p of preds ?? []) {
    const pts = scorePrediction(m as any, p as any);
    if (pts <= 0) continue;
    const exact = p.home_score === m.home_score && p.away_score === m.away_score;
    const realDraw = m.home_score === m.away_score;
    const predDraw = p.home_score === p.away_score;
    const advance =
      realDraw &&
      predDraw &&
      m.advance_team_id != null &&
      p.advance_team_id === m.advance_team_id;
    let label: string;
    let emoji: string;
    if (exact) {
      emoji = "🎯";
      label = "Resultado exacto";
    } else if (realDraw) {
      emoji = "✅";
      label = "Empate acertado";
    } else {
      emoji = "✅";
      label = "Ganador acertado";
    }
    if (advance) label += " + quién pasa";
    rows.push({
      player_id: p.player_id,
      ref,
      kind: "match",
      positive: true,
      points: pts,
      text: `${emoji} ${label}: ${home}–${away} (+${pts})`,
    });
  }
  await replace(ref, rows);
}

// Notificaciones de una apuesta al resolverla (gane o pierda).
export async function genBetNotifications(betId: string) {
  const ref = `bet:${betId}`;
  const { data: bet } = await supabase
    .from("special_bets")
    .select("question, outcome")
    .eq("id", betId)
    .maybeSingle();
  if (!bet || bet.outcome == null) {
    await replace(ref, []);
    return;
  }
  const { data: wagers } = await supabase
    .from("bet_wagers")
    .select("player_id, stake")
    .eq("bet_id", betId);
  const rows: Row[] = (wagers ?? []).map((w) => {
    const won = bet.outcome === true;
    return {
      player_id: w.player_id,
      ref,
      kind: "bet",
      positive: won,
      points: won ? w.stake : -w.stake,
      text: won
        ? `🎰 "${bet.question}" · ¡ganaste +${w.stake} pts!`
        : `🎰 "${bet.question}" · perdiste -${w.stake} pts`,
    };
  });
  await replace(ref, rows);
}

// Notificaciones de campeones de grupo (recalcula todas).
export async function genGroupNotifications() {
  const [{ data: results }, { data: teams }, { data: preds }] = await Promise.all([
    supabase.from("group_results").select("group_name, winner_team_id"),
    supabase.from("teams").select("id, name"),
    supabase.from("group_winner_predictions").select("player_id, group_name, team_id"),
  ]);
  const nameById = new Map((teams ?? []).map((t) => [t.id, t.name]));
  const winnerByGroup = new Map(
    (results ?? []).filter((r) => r.winner_team_id != null).map((r) => [r.group_name, r.winner_team_id])
  );
  const rows: Row[] = [];
  for (const p of preds ?? []) {
    const w = winnerByGroup.get(p.group_name);
    if (w != null && w === p.team_id) {
      rows.push({
        player_id: p.player_id,
        ref: `group:${p.group_name}`,
        kind: "group",
        positive: true,
        points: POINTS.GROUP_WINNER,
        text: `🏆 Campeón del Grupo ${p.group_name}: ${nameById.get(w) ?? "?"} (+${POINTS.GROUP_WINNER})`,
      });
    }
  }
  await replace({ like: "group:%" }, rows);
}

// Notificaciones del máximo goleador.
export async function genScorerNotifications() {
  const [{ data: settings }, { data: preds }] = await Promise.all([
    supabase.from("settings").select("value").eq("key", "top_scorer").maybeSingle(),
    supabase.from("scorer_predictions").select("player_id, player_name"),
  ]);
  const top = settings?.value ? normalizeText(settings.value) : null;
  const rows: Row[] = [];
  if (top) {
    for (const p of preds ?? []) {
      if (normalizeText(p.player_name) === top) {
        rows.push({
          player_id: p.player_id,
          ref: "scorer",
          kind: "scorer",
          positive: true,
          points: POINTS.TOP_SCORER,
          text: `🥇 Máximo goleador acertado: ${settings!.value} (+${POINTS.TOP_SCORER})`,
        });
      }
    }
  }
  await replace("scorer", rows);
}

// Regenera TODO (para backfill puntual).
export async function regenerateAllNotifications() {
  const { data: matches } = await supabase.from("matches").select("id").eq("finished", true);
  for (const m of matches ?? []) await genMatchNotifications(m.id);
  const { data: bets } = await supabase.from("special_bets").select("id").not("outcome", "is", null);
  for (const b of bets ?? []) await genBetNotifications(b.id);
  await genGroupNotifications();
  await genScorerNotifications();
}
