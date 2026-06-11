import type { Match, Prediction } from "./supabase";

// ============================================================
//  REGLAS DE PUNTUACIÓN  (cámbialas a tu gusto)
// ============================================================
export const POINTS = {
  EXACT: 5, // acertar el resultado exacto (ej: 2-1 y fue 2-1)
  OUTCOME: 3, // acertar el ganador / empate (1-X-2) pero no el resultado exacto
  ADVANCE: 2, // (eliminatorias) acertar qué selección clasifica
};

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

  // Bonus de eliminatoria: acertar quién clasifica
  if (
    match.advance_team_id != null &&
    pred.advance_team_id != null &&
    pred.advance_team_id === match.advance_team_id
  ) {
    pts += POINTS.ADVANCE;
  }

  return pts;
}

export type LeaderboardRow = {
  playerId: string;
  name: string;
  points: number;
  exact: number; // nº de resultados exactos acertados
  outcomes: number; // nº de ganadores acertados (sin exacto)
  played: number; // nº de partidos finalizados con predicción
};

// Construye el ranking a partir de jugadores, partidos y predicciones.
export function buildLeaderboard(
  players: { id: string; name: string }[],
  matches: Match[],
  predictions: Prediction[]
): LeaderboardRow[] {
  const matchById = new Map(matches.map((m) => [m.id, m]));
  const rows = new Map<string, LeaderboardRow>();

  for (const p of players) {
    rows.set(p.id, {
      playerId: p.id,
      name: p.name,
      points: 0,
      exact: 0,
      outcomes: 0,
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
