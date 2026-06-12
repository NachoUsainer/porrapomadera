"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "./supabase";
import { isMatchLocked } from "./lock";
import { getSpecialLockInfo } from "./special";
import { getStandings } from "./standings";
import {
  markRead,
  genMatchNotifications,
  genBetNotifications,
  genGroupNotifications,
  genScorerNotifications,
  regenerateAllNotifications,
} from "./notifications";
import { MAX_WAGER } from "./scoring";
import {
  hashPin,
  verifyPin,
  setSession,
  clearSession,
  getCurrentPlayer,
  setAdminSession,
  isAdmin,
  checkAdminPassword,
} from "./session";

function normalizeName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

type ActionResult = { error?: string; saved?: boolean };

// ============================================================
//  REGISTRO / LOGIN DE JUGADORES
// ============================================================
export async function registerPlayer(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const pin = String(formData.get("pin") ?? "").trim();

  if (name.length < 2) return { error: "Pon un nombre de al menos 2 letras." };
  if (!/^\d{4}$/.test(pin)) return { error: "El PIN debe ser de 4 dígitos." };

  const nameKey = normalizeName(name);

  const { data: existing } = await supabase
    .from("players")
    .select("id")
    .eq("name_key", nameKey)
    .maybeSingle();

  if (existing) {
    return { error: "Ya existe alguien con ese nombre. Usa 'Entrar' o cambia el nombre." };
  }

  const { data, error } = await supabase
    .from("players")
    .insert({ name, name_key: nameKey, pin_hash: hashPin(pin) })
    .select("id")
    .single();

  if (error || !data) return { error: "No se pudo crear el usuario. Inténtalo de nuevo." };

  await setSession(data.id);
  redirect("/predictions");
}

export async function loginPlayer(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const pin = String(formData.get("pin") ?? "").trim();
  const nameKey = normalizeName(name);

  const { data: player } = await supabase
    .from("players")
    .select("id, pin_hash")
    .eq("name_key", nameKey)
    .maybeSingle();

  if (!player || !verifyPin(pin, player.pin_hash)) {
    return { error: "Nombre o PIN incorrectos." };
  }

  await setSession(player.id);
  redirect("/predictions");
}

export async function logout() {
  await clearSession();
  redirect("/");
}

// Marca las notificaciones del jugador como leídas.
export async function markNotificationsSeen() {
  const player = await getCurrentPlayer();
  if (!player) return;
  await markRead(player.id);
  revalidatePath("/");
}

// ============================================================
//  GUARDAR PREDICCIONES DE UN JUGADOR
// ============================================================
export async function savePredictions(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const player = await getCurrentPlayer();
  if (!player) return { error: "Tienes que iniciar sesión." };

  // Cargamos partidos para validar fechas de cierre y existencia.
  const { data: matches } = await supabase
    .from("matches")
    .select("id, kickoff, finished");

  const now = Date.now();
  const matchById = new Map((matches ?? []).map((m) => [m.id, m]));

  const rows: {
    player_id: string;
    match_id: number;
    home_score: number;
    away_score: number;
    advance_team_id: number | null;
  }[] = [];

  // Las entradas vienen como home_<id>, away_<id>, advance_<id>
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("home_")) continue;
    const matchId = Number(key.slice(5));
    const match = matchById.get(matchId);
    if (!match) continue;

    // No se aceptan predicciones a menos de 2h del inicio (o ya terminados).
    if (isMatchLocked(match.kickoff, match.finished, now)) continue;

    const home = Number(value);
    const away = Number(formData.get(`away_${matchId}`));
    if (!Number.isInteger(home) || !Number.isInteger(away)) continue;
    if (home < 0 || away < 0 || home > 99 || away > 99) continue;

    const advRaw = formData.get(`advance_${matchId}`);
    const advance_team_id = advRaw ? Number(advRaw) : null;

    rows.push({
      player_id: player.id,
      match_id: matchId,
      home_score: home,
      away_score: away,
      advance_team_id: advance_team_id || null,
    });
  }

  if (rows.length > 0) {
    const { error } = await supabase
      .from("predictions")
      .upsert(rows, { onConflict: "player_id,match_id" });
    if (error) return { error: "No se pudieron guardar las predicciones." };
  }

  revalidatePath("/predictions");
  revalidatePath("/");
  return { saved: true };
}

// ============================================================
//  PREDICCIONES ESPECIALES (campeón de grupo + máximo goleador)
// ============================================================
export async function saveGroupWinners(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const player = await getCurrentPlayer();
  if (!player) return { error: "Tienes que iniciar sesión." };

  const { groupFirstKickoff } = await getSpecialLockInfo();
  const now = Date.now();

  const rows: { player_id: string; group_name: string; team_id: number }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("group_")) continue;
    const group = key.slice(6);
    const teamId = Number(value);
    if (!teamId) continue;
    const k = groupFirstKickoff.get(group);
    if (k != null && k <= now) continue; // grupo ya empezado: bloqueado
    rows.push({ player_id: player.id, group_name: group, team_id: teamId });
  }

  if (rows.length) {
    const { error } = await supabase
      .from("group_winner_predictions")
      .upsert(rows, { onConflict: "player_id,group_name" });
    if (error) return { error: "No se pudieron guardar los campeones de grupo." };
  }
  revalidatePath("/predictions");
  revalidatePath("/");
  return { saved: true };
}

export async function saveScorer(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const player = await getCurrentPlayer();
  if (!player) return { error: "Tienes que iniciar sesión." };

  const { earliestR32 } = await getSpecialLockInfo();
  if (earliestR32 != null && earliestR32 <= Date.now()) {
    return { error: "El plazo para elegir goleador ya se cerró." };
  }
  const name = String(formData.get("scorer") ?? "").trim();
  if (name.length < 2) return { error: "Escribe el nombre del goleador." };

  const { error } = await supabase
    .from("scorer_predictions")
    .upsert({ player_id: player.id, player_name: name }, { onConflict: "player_id" });
  if (error) return { error: "No se pudo guardar el goleador." };

  revalidatePath("/predictions");
  revalidatePath("/");
  return { saved: true };
}

// ============================================================
//  APUESTAS ESPECIALES (binarias: apuestas a que SÍ ocurre)
// ============================================================
export async function placeWager(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const player = await getCurrentPlayer();
  if (!player) return { error: "Tienes que iniciar sesión." };

  const betId = String(formData.get("bet_id") ?? "");
  const stake = Number(formData.get("stake"));
  if (!betId) return { error: "Apuesta no válida." };
  if (!Number.isInteger(stake) || stake < 1) {
    return { error: "La apuesta debe ser de al menos 1 punto." };
  }
  if (stake > MAX_WAGER) {
    return { error: `Máximo ${MAX_WAGER} puntos por apuesta.` };
  }

  const { data: bet } = await supabase
    .from("special_bets")
    .select("is_open, outcome, closes_at")
    .eq("id", betId)
    .maybeSingle();
  if (!bet) return { error: "Esa apuesta ya no existe." };
  if (!bet.is_open || bet.outcome != null) {
    return { error: "Esta apuesta ya está cerrada." };
  }
  // Cierre automático por hora (p.ej. inicio del partido).
  if (bet.closes_at && new Date(bet.closes_at).getTime() <= Date.now()) {
    return { error: "Esta apuesta ya se ha cerrado (empezó el partido)." };
  }

  const standings = await getStandings();
  const available = standings.availableFor(player.id, betId);
  if (available < 1) {
    return { error: "No tienes puntos disponibles para apostar todavía." };
  }
  if (stake > available) {
    return { error: `Solo puedes apostar hasta ${available} puntos.` };
  }

  const { error } = await supabase.from("bet_wagers").upsert(
    { bet_id: betId, player_id: player.id, stake, updated_at: new Date().toISOString() },
    { onConflict: "bet_id,player_id" }
  );
  if (error) return { error: "No se pudo registrar la apuesta." };

  revalidatePath("/predictions");
  revalidatePath("/");
  return { saved: true };
}

export async function removeWager(formData: FormData) {
  const player = await getCurrentPlayer();
  if (!player) return;
  const betId = String(formData.get("bet_id") ?? "");
  if (!betId) return;
  // Solo se puede retirar mientras la apuesta siga abierta.
  const { data: bet } = await supabase
    .from("special_bets")
    .select("is_open, outcome")
    .eq("id", betId)
    .maybeSingle();
  if (!bet || !bet.is_open || bet.outcome != null) return;
  await supabase.from("bet_wagers").delete().eq("bet_id", betId).eq("player_id", player.id);
  revalidatePath("/predictions");
  revalidatePath("/");
}

// ============================================================
//  ADMINISTRACIÓN
// ============================================================
export async function adminLogin(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const pw = String(formData.get("password") ?? "");
  if (!checkAdminPassword(pw)) return { error: "Contraseña de admin incorrecta." };
  await setAdminSession();
  redirect("/admin");
}

async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("No autorizado");
}

export async function adminAddTeam(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim().toUpperCase() || null;
  const group_name = String(formData.get("group_name") ?? "").trim().toUpperCase() || null;
  if (name.length < 2) return { error: "Nombre de selección demasiado corto." };

  const { error } = await supabase.from("teams").insert({ name, code, group_name });
  if (error) return { error: "No se pudo añadir la selección." };
  revalidatePath("/admin");
  return {};
}

export async function adminAddMatch(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();
  const stage = String(formData.get("stage") ?? "group");
  const label = String(formData.get("label") ?? "").trim() || null;
  const home_team_id = Number(formData.get("home_team_id")) || null;
  const away_team_id = Number(formData.get("away_team_id")) || null;
  const kickoffRaw = String(formData.get("kickoff") ?? "").trim();
  const kickoff = kickoffRaw ? new Date(kickoffRaw).toISOString() : null;

  if (!home_team_id || !away_team_id) return { error: "Elige las dos selecciones." };
  if (home_team_id === away_team_id) return { error: "Las dos selecciones no pueden ser la misma." };

  const { error } = await supabase
    .from("matches")
    .insert({ stage, label, home_team_id, away_team_id, kickoff });
  if (error) return { error: "No se pudo crear el partido." };
  revalidatePath("/admin");
  revalidatePath("/predictions");
  return {};
}

export async function adminSetResult(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();
  const matchId = Number(formData.get("match_id"));
  const homeRaw = String(formData.get("home_score") ?? "").trim();
  const awayRaw = String(formData.get("away_score") ?? "").trim();
  const advRaw = formData.get("advance_team_id");
  const finished = formData.get("finished") != null;

  if (!matchId) return { error: "Partido no válido." };

  // Si se marca como NO finalizado, borramos el resultado.
  if (!finished) {
    const { error } = await supabase
      .from("matches")
      .update({ home_score: null, away_score: null, advance_team_id: null, finished: false })
      .eq("id", matchId);
    if (error) return { error: "No se pudo actualizar." };
  } else {
    const home_score = Number(homeRaw);
    const away_score = Number(awayRaw);
    if (!Number.isInteger(home_score) || !Number.isInteger(away_score)) {
      return { error: "Pon un resultado válido (números)." };
    }
    const advance_team_id = advRaw ? Number(advRaw) : null;
    const { error } = await supabase
      .from("matches")
      .update({ home_score, away_score, advance_team_id, finished: true })
      .eq("id", matchId);
    if (error) return { error: "No se pudo guardar el resultado." };
  }

  await genMatchNotifications(matchId);
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/predictions");
  return {};
}

// Asignar / cambiar las selecciones de un partido (útil en eliminatorias,
// cuando ya se sabe quién juega el cruce).
export async function adminSetMatchTeams(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();
  const matchId = Number(formData.get("match_id"));
  const home_team_id = Number(formData.get("home_team_id")) || null;
  const away_team_id = Number(formData.get("away_team_id")) || null;
  if (!matchId) return { error: "Partido no válido." };
  if (home_team_id && away_team_id && home_team_id === away_team_id) {
    return { error: "No pueden ser la misma selección." };
  }
  const { error } = await supabase
    .from("matches")
    .update({ home_team_id, away_team_id })
    .eq("id", matchId);
  if (error) return { error: "No se pudo actualizar el cruce." };
  revalidatePath("/admin");
  revalidatePath("/predictions");
  return {};
}

export async function adminDeleteMatch(formData: FormData) {
  await requireAdmin();
  const matchId = Number(formData.get("match_id"));
  if (matchId) await supabase.from("matches").delete().eq("id", matchId);
  revalidatePath("/admin");
  revalidatePath("/predictions");
}

// ------------------------------------------------------------
//  IMPORTACIÓN MASIVA DEL CALENDARIO
//  Pega un partido por línea, separado por ";":
//    fase ; local ; visitante ; AAAA-MM-DD HH:MM ; etiqueta
//  - fase: group | r32 | r16 | qf | sf | third | final
//  - local/visitante: nombre de la selección (se crean solas si no existen).
//      Déjalos vacíos en eliminatorias aún sin equipo (usa la etiqueta, ej "1A-2B").
//  - hora: en CET/CEST (la del calendario). El Mundial cae en CEST = UTC+2.
//  - etiqueta: opcional (ej "Jornada 1", "Octavos 1").
//  Las líneas vacías o que empiezan por # se ignoran.
// ------------------------------------------------------------
const VALID_STAGES = new Set(["group", "r32", "r16", "qf", "sf", "third", "final"]);

export async function adminBulkImport(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult & { imported?: number }> {
  await requireAdmin();
  const raw = String(formData.get("data") ?? "");
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));

  if (lines.length === 0) return { error: "No has pegado ninguna línea." };

  // 1) Cargar selecciones existentes (mapa nombre normalizado -> id)
  const { data: existingTeams } = await supabase.from("teams").select("id, name");
  const teamKey = (n: string) => n.trim().toLowerCase();
  const teamIdByName = new Map<string, number>();
  for (const t of existingTeams ?? []) teamIdByName.set(teamKey(t.name), t.id);

  type ParsedMatch = {
    stage: string;
    homeName: string | null;
    awayName: string | null;
    kickoff: string | null;
    label: string | null;
  };
  const parsed: ParsedMatch[] = [];
  const newTeamNames = new Set<string>();

  for (const [i, line] of lines.entries()) {
    const parts = line.split(";").map((p) => p.trim());
    const [stageRaw, home, away, when, ...labelParts] = parts;
    const stage = (stageRaw ?? "").toLowerCase();
    if (!VALID_STAGES.has(stage)) {
      return { error: `Línea ${i + 1}: fase desconocida "${stageRaw}".` };
    }

    let kickoff: string | null = null;
    if (when) {
      // Interpretamos la hora como CEST (UTC+2), que es la del Mundial.
      const iso = when.replace(" ", "T");
      const d = new Date(`${iso}:00+02:00`);
      if (isNaN(d.getTime())) {
        return { error: `Línea ${i + 1}: fecha/hora no válida "${when}". Usa AAAA-MM-DD HH:MM.` };
      }
      kickoff = d.toISOString();
    }

    const homeName = home || null;
    const awayName = away || null;
    if (homeName) newTeamNames.add(homeName);
    if (awayName) newTeamNames.add(awayName);

    parsed.push({
      stage,
      homeName,
      awayName,
      kickoff,
      label: labelParts.join(";").trim() || null,
    });
  }

  // 2) Crear las selecciones que falten
  const toCreate = [...newTeamNames].filter((n) => !teamIdByName.has(teamKey(n)));
  if (toCreate.length > 0) {
    const { data: created, error } = await supabase
      .from("teams")
      .insert(toCreate.map((name) => ({ name })))
      .select("id, name");
    if (error) return { error: "No se pudieron crear las selecciones nuevas." };
    for (const t of created ?? []) teamIdByName.set(teamKey(t.name), t.id);
  }

  // 3) Insertar los partidos
  const rows = parsed.map((m) => ({
    stage: m.stage,
    label: m.label,
    home_team_id: m.homeName ? teamIdByName.get(teamKey(m.homeName)) ?? null : null,
    away_team_id: m.awayName ? teamIdByName.get(teamKey(m.awayName)) ?? null : null,
    kickoff: m.kickoff,
  }));

  const { error: matchError } = await supabase.from("matches").insert(rows);
  if (matchError) return { error: "No se pudieron crear los partidos." };

  revalidatePath("/admin");
  revalidatePath("/predictions");
  return { imported: rows.length };
}

// Fijar el campeón REAL de cada grupo (lo usa el ranking para los bonus).
export async function adminSetGroupResults(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();
  const rows: { group_name: string; winner_team_id: number | null }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("gr_")) continue;
    const group = key.slice(3);
    rows.push({ group_name: group, winner_team_id: value ? Number(value) : null });
  }
  if (rows.length) {
    const { error } = await supabase
      .from("group_results")
      .upsert(rows, { onConflict: "group_name" });
    if (error) return { error: "No se pudieron guardar los campeones de grupo." };
  }
  await genGroupNotifications();
  revalidatePath("/admin");
  revalidatePath("/");
  return { saved: true };
}

// Fijar el máximo goleador REAL del torneo.
export async function adminSetTopScorer(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();
  const name = String(formData.get("top_scorer") ?? "").trim();
  const { error } = await supabase
    .from("settings")
    .upsert({ key: "top_scorer", value: name || null }, { onConflict: "key" });
  if (error) return { error: "No se pudo guardar el goleador." };
  await genScorerNotifications();
  revalidatePath("/admin");
  revalidatePath("/");
  return { saved: true };
}

// ---- Apuestas especiales (admin) ----
export async function adminCreateBet(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();
  const question = String(formData.get("question") ?? "").trim();
  if (question.length < 4) return { error: "Escribe el enunciado de la apuesta." };

  // Cierre automático: si se elige un partido, la apuesta cierra a su inicio.
  let closes_at: string | null = null;
  const matchId = Number(formData.get("match_id"));
  if (matchId) {
    const { data: m } = await supabase
      .from("matches")
      .select("kickoff")
      .eq("id", matchId)
      .maybeSingle();
    if (m?.kickoff) closes_at = m.kickoff;
  }

  const { error } = await supabase.from("special_bets").insert({ question, closes_at });
  if (error) return { error: "No se pudo crear la apuesta." };
  revalidatePath("/admin");
  revalidatePath("/predictions");
  return { saved: true };
}

// Abrir / cerrar la admisión de apuestas (solo si no está resuelta).
export async function adminToggleBet(formData: FormData) {
  await requireAdmin();
  const betId = String(formData.get("bet_id") ?? "");
  if (!betId) return;
  const { data: bet } = await supabase
    .from("special_bets")
    .select("is_open, outcome")
    .eq("id", betId)
    .maybeSingle();
  if (!bet || bet.outcome != null) return;
  await supabase.from("special_bets").update({ is_open: !bet.is_open }).eq("id", betId);
  revalidatePath("/admin");
  revalidatePath("/predictions");
  revalidatePath("/");
}

// Resolver: outcome 'yes' | 'no' | 'pending'. Cierra la admisión.
export async function adminResolveBet(formData: FormData) {
  await requireAdmin();
  const betId = String(formData.get("bet_id") ?? "");
  const result = String(formData.get("result") ?? "");
  if (!betId) return;
  const outcome = result === "yes" ? true : result === "no" ? false : null;
  await supabase
    .from("special_bets")
    .update({ outcome, is_open: outcome == null })
    .eq("id", betId);
  await genBetNotifications(betId);
  revalidatePath("/admin");
  revalidatePath("/predictions");
  revalidatePath("/");
}

// Regenera todo el historial de notificaciones (backfill puntual).
export async function adminRegenNotifications() {
  await requireAdmin();
  await regenerateAllNotifications();
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function adminDeleteBet(formData: FormData) {
  await requireAdmin();
  const betId = String(formData.get("bet_id") ?? "");
  if (betId) await supabase.from("special_bets").delete().eq("id", betId);
  revalidatePath("/admin");
  revalidatePath("/predictions");
  revalidatePath("/");
}

// Expulsar a un jugador (p.ej. duplicados). Borra también sus predicciones
// gracias al "on delete cascade" del esquema.
export async function adminDeletePlayer(formData: FormData) {
  await requireAdmin();
  const playerId = String(formData.get("player_id") ?? "");
  if (playerId) await supabase.from("players").delete().eq("id", playerId);
  revalidatePath("/admin");
  revalidatePath("/");
}
