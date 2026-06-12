import type { Match, Prediction } from "./supabase";

// ============================================================
//  REGLAS DE PUNTUACIÓN  (cámbialas a tu gusto)
// ============================================================
export const POINTS = {
  EXACT: 5, // acertar el resultado exacto (ej: 2-1 y fue 2-1)
  OUTCOME: 3, // acertar el ganador / empate (1-X-2) pero no el resultado exacto
  ADVANCE: 2, // (eliminatorias) predecir empate en 90' y acertar quién pasa (prórroga/penaltis)
  GROUP_WINNER: 3, // acertar el campeón de un grupo
  TOP_SCORER: 8, // acertar el máximo goleador del torneo
};

// Tope de puntos que se pueden jugar en UNA apuesta especial (aunque tengas más).
export const MAX_WAGER = 12;

// Normaliza texto para comparar nombres de goleador (sin acentos ni mayúsculas).
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function outcome(home: number, away: number): "H" | "D" | "A" {
  if (home > away) return "H";
  if (home < away) return "A";
  return "D";
}

// Puntos de UNA predicción contra UN partido ya finalizado.
export function scorePrediction(match: Match, pred: Prediction): number {
  if (!match.finished || match.home_score == null || match.away_score == null) {
    return 0;
  }
  let pts = 0;

  const realOutcome = outcome(match.home_score, match.away_score);
  const predOutcome = outcome(pred.home_score, pred.away_score);

  if (
    pred.home_score === match.home_score &&
    pred.away_score === match.away_score
  ) {
    pts += POINTS.EXACT;
  } else if (predOutcome === realOutcome) {
    pts += POINTS.OUTCOME;
  }

  // Bonus de eliminatoria: SOLO si el partido acabó en empate en los 90'
  // y el jugador predijo empate y acertó quién pasa (prórroga/penaltis).
  // Si predijo un ganador claro y acertó, ya cobró por el resultado (sin +2 redundante).
  const realDraw = match.home_score === match.away_score;
  const predDraw = pred.home_score === pred.away_score;
  if (
    realDraw &&
    predDraw &&
    match.advance_team_id != null &&
    pred.advance_team_id != null &&
    pred.advance_team_id === match.advance_team_id
  ) {
    pts += POINTS.ADVANCE;
  }

  return pts;
}

// ---- Predicciones especiales (campeón de grupo + máximo goleador) ----
export type GroupWinnerPred = { player_id: string; group_name: string; team_id: number };
export type GroupResult = { group_name: string; winner_team_id: number | null };
export type ScorerPred = { player_id: string; player_name: string };
export type Bonus = { points: number; groupHits: number; scorerHit: boolean };

// Puntos extra por jugador: campeón de grupo acertado y máximo goleador.
export function bonusByPlayer(
  groupPreds: GroupWinnerPred[],
  groupResults: GroupResult[],
  scorerPreds: ScorerPred[],
  topScorer: string | null
): Map<string, Bonus> {
  const winnerByGroup = new Map<string, number>();
  for (const r of groupResults)
    if (r.winner_team_id != null) winnerByGroup.set(r.group_name, r.winner_team_id);
  const topN = topScorer ? normalizeText(topScorer) : null;

  const map = new Map<string, Bonus>();
  const get = (id: string): Bonus => {
    let v = map.get(id);
    if (!v) {
      v = { points: 0, groupHits: 0, scorerHit: false };
      map.set(id, v);
    }
    return v;
  };

  for (const gp of groupPreds) {
    const w = winnerByGroup.get(gp.group_name);
    if (w != null && w === gp.team_id) {
      const v = get(gp.player_id);
      v.points += POINTS.GROUP_WINNER;
      v.groupHits += 1;
    }
  }
  if (topN) {
    for (const sp of scorerPreds) {
      if (normalizeText(sp.player_name) === topN) {
        const v = get(sp.player_id);
        v.points += POINTS.TOP_SCORER;
        v.scorerHit = true;
      }
    }
  }
  return map;
}

// ---- Apuestas: cálculo puro de saldo, puntos en juego y stakes abiertos ----
export type BetLike = { id: string; outcome: boolean | null };
export type WagerLike = { bet_id: string; player_id: string; stake: number };

export function computeBetEffects(bets: BetLike[], wagers: WagerLike[]) {
  const betById = new Map(bets.map((b) => [b.id, b]));
  const betNet = new Map<string, number>(); // saldo de apuestas RESUELTAS (±)
  const reserved = new Map<string, number>(); // puntos en juego en apuestas ABIERTAS
  const openStake = new Map<string, number>(); // `${player}:${bet}` -> stake (abiertas)
  for (const w of wagers) {
    const b = betById.get(w.bet_id);
    if (!b) continue;
    if (b.outcome === null || b.outcome === undefined) {
      reserved.set(w.player_id, (reserved.get(w.player_id) ?? 0) + w.stake);
      openStake.set(`${w.player_id}:${w.bet_id}`, w.stake);
    } else {
      const delta = b.outcome ? w.stake : -w.stake;
      betNet.set(w.player_id, (betNet.get(w.player_id) ?? 0) + delta);
    }
  }
  return { betNet, reserved, openStake };
}

export type LeaderboardRow = {
  playerId: string;
  name: string;
  points: number;
  bonus: number; // puntos de predicciones especiales (grupo + goleador)
  betNet: number; // saldo de apuestas resueltas (puede ser negativo)
  exact: number; // nº de resultados exactos acertados
  outcomes: number; // nº de ganadores/empates acertados (sin exacto)
  advanceHits: number; // nº de bonus de eliminatoria acertados (+2)
  groupHits: number; // nº de campeones de grupo acertados (+3)
  scorerHit: boolean; // acertó el máximo goleador (+8)
  played: number; // nº de partidos finalizados con predicción
};

// Construye el ranking a partir de jugadores, partidos y predicciones.
// `bonus` añade los puntos de predicciones especiales; `betNet` el saldo de apuestas.
export function buildLeaderboard(
  players: { id: string; name: string }[],
  matches: Match[],
  predictions: Prediction[],
  bonus?: Map<string, Bonus>,
  betNet?: Map<string, number>
): LeaderboardRow[] {
  const matchById = new Map(matches.map((m) => [m.id, m]));
  const rows = new Map<string, LeaderboardRow>();

  for (const p of players) {
    const bObj = bonus?.get(p.id);
    const b = bObj?.points ?? 0;
    const bn = betNet?.get(p.id) ?? 0;
    rows.set(p.id, {
      playerId: p.id,
      name: p.name,
      points: b + bn, // arranca con especiales + saldo de apuestas
      bonus: b,
      betNet: bn,
      exact: 0,
      outcomes: 0,
      advanceHits: 0,
      groupHits: bObj?.groupHits ?? 0,
      scorerHit: bObj?.scorerHit ?? false,
      played: 0,
    });
  }

  for (const pred of predictions) {
    const match = matchById.get(pred.match_id);
    const row = rows.get(pred.player_id);
    if (!match || !row || !match.finished) continue;
    if (match.home_score == null || match.away_score == null) continue;

    row.played += 1;
    const exactHit =
      pred.home_score === match.home_score &&
      pred.away_score === match.away_score;
    if (exactHit) row.exact += 1;
    else {
      const ro = outcome(match.home_score, match.away_score);
      const po = outcome(pred.home_score, pred.away_score);
      if (ro === po) row.outcomes += 1;
    }
    // Bonus de eliminatoria acertado (empate predicho + quién pasa)
    if (
      match.home_score === match.away_score &&
      pred.home_score === pred.away_score &&
      match.advance_team_id != null &&
      pred.advance_team_id != null &&
      pred.advance_team_id === match.advance_team_id
    ) {
      row.advanceHits += 1;
    }
    row.points += scorePrediction(match, pred);
  }

  return [...rows.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.exact - a.exact ||
      b.outcomes - a.outcomes ||
      a.name.localeCompare(b.name)
  );
}
