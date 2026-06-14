// Auditoría EXHAUSTIVA del sistema de puntos, usando el código REAL.
//   node --experimental-strip-types scripts/audit-scoring.ts
import {
  buildLeaderboard,
  bonusByPlayer,
  computeBetEffects,
  scorePrediction,
  POINTS,
} from "../src/lib/scoring.ts";

let failures = 0;
const assert = (cond: boolean, msg: string) => {
  if (!cond) {
    failures++;
    if (failures <= 20) console.log("  ❌ " + msg);
  }
};

const ri = (n: number) => Math.floor(Math.random() * n); // 0..n-1
const pick = <T>(a: T[]): T => a[ri(a.length)];

// ---------- Generador de escenarios aleatorios ----------
function scenario() {
  const nPlayers = 1 + ri(6);
  const players = Array.from({ length: nPlayers }, (_, i) => ({ id: "p" + i, name: "P" + i }));
  const groups = ["A", "B", "C"];

  const nMatches = 1 + ri(10);
  const matches = Array.from({ length: nMatches }, (_, i) => {
    const knockout = Math.random() < 0.5;
    const finished = Math.random() < 0.7;
    const hs = finished ? ri(4) : null;
    const as = finished ? ri(4) : null;
    // equipos 10 y 20 son los dos del cruce
    let advance: number | null = null;
    if (knockout && finished) advance = Math.random() < 0.85 ? pick([10, 20]) : null;
    return {
      id: i,
      stage: knockout ? "r16" : "group",
      finished,
      home_score: hs,
      away_score: as,
      advance_team_id: advance,
    };
  });

  // predicciones (como mucho una por jugador y partido)
  const predictions: any[] = [];
  for (const pl of players)
    for (const m of matches)
      if (Math.random() < 0.8)
        predictions.push({
          player_id: pl.id,
          match_id: m.id,
          home_score: ri(4),
          away_score: ri(4),
          advance_team_id: Math.random() < 0.7 ? pick([10, 20]) : null,
        });

  // campeones de grupo
  const gResults = groups
    .filter(() => Math.random() < 0.6)
    .map((g) => ({ group_name: g, winner_team_id: 100 + ri(4) }));
  const gwPreds: any[] = [];
  for (const pl of players)
    for (const g of groups)
      if (Math.random() < 0.6)
        gwPreds.push({ player_id: pl.id, group_name: g, team_id: 100 + ri(4) });

  // goleador
  const scorers = ["mbappe", "haaland", "lamine", "messi"];
  const topScorer = Math.random() < 0.6 ? pick(scorers) : null;
  const scorerPreds = players
    .filter(() => Math.random() < 0.7)
    .map((pl) => ({ player_id: pl.id, player_name: pick(scorers) }));

  // apuestas
  const nBets = ri(5);
  const bets = Array.from({ length: nBets }, (_, i) => ({
    id: "b" + i,
    question: "q" + i,
    outcome: pick([null, true, false]) as boolean | null,
  }));
  const wagers: any[] = [];
  for (const pl of players)
    for (const b of bets)
      if (Math.random() < 0.5)
        wagers.push({ bet_id: b.id, player_id: pl.id, stake: 1 + ri(20) });

  return { players, matches, predictions, gResults, gwPreds, topScorer, scorerPreds, bets, wagers };
}

// ---------- Recálculo independiente (referencia) ----------
function reference(s: ReturnType<typeof scenario>) {
  const mById = new Map(s.matches.map((m) => [m.id, m]));
  const winByGrp = new Map(
    s.gResults.filter((g) => g.winner_team_id != null).map((g) => [g.group_name, g.winner_team_id])
  );
  const norm = (x: string) => x.toLowerCase().trim();
  const top = s.topScorer ? norm(s.topScorer) : null;
  const ref = new Map<string, number>();
  for (const pl of s.players) {
    let pts = 0;
    for (const p of s.predictions.filter((x) => x.player_id === pl.id)) {
      const m = mById.get(p.match_id);
      if (m) pts += scorePrediction(m as any, p);
    }
    for (const g of s.gwPreds.filter((x) => x.player_id === pl.id))
      if (winByGrp.get(g.group_name) === g.team_id) pts += POINTS.GROUP_WINNER;
    for (const sc of s.scorerPreds.filter((x) => x.player_id === pl.id))
      if (top && norm(sc.player_name) === top) pts += POINTS.TOP_SCORER;
    // apuestas
    const betById = new Map(s.bets.map((b) => [b.id, b]));
    for (const w of s.wagers.filter((x) => x.player_id === pl.id)) {
      const b = betById.get(w.bet_id);
      if (b && b.outcome != null) pts += b.outcome ? w.stake * 3 : -w.stake;
    }
    ref.set(pl.id, pts);
  }
  return ref;
}

// ---------- Pruebas de propiedad ----------
const ROUNDS = 8000;
for (let r = 0; r < ROUNDS; r++) {
  const s = scenario();
  const bonus = bonusByPlayer(s.gwPreds, s.gResults, s.scorerPreds, s.topScorer);
  const { betNet, reserved } = computeBetEffects(s.bets, s.wagers);
  const lb = buildLeaderboard(s.players, s.matches as any, s.predictions, bonus, betNet);
  const ref = reference(s);

  // 1) Sorting: puntos no crecientes
  for (let i = 1; i < lb.length; i++)
    assert(lb[i - 1].points >= lb[i].points, `orden roto: ${lb[i - 1].points} < ${lb[i].points}`);

  for (const row of lb) {
    // 2) INVARIANTE CLAVE: suma de columnas == puntos totales
    const colSum =
      row.exact * POINTS.EXACT +
      row.outcomes * POINTS.OUTCOME +
      row.advanceHits * POINTS.ADVANCE +
      row.groupHits * POINTS.GROUP_WINNER +
      (row.scorerHit ? POINTS.TOP_SCORER : 0) +
      row.betNet;
    assert(colSum === row.points, `columnas≠total: ${colSum} vs ${row.points}`);

    // 3) Recálculo independiente == puntos
    assert(ref.get(row.playerId) === row.points, `ref≠total: ${ref.get(row.playerId)} vs ${row.points}`);

    // 4) Apuestas en juego (reserved) = suma de stakes en apuestas abiertas
    const openByBet = new Map(s.bets.map((b) => [b.id, b.outcome == null]));
    let manualReserved = 0;
    for (const w of s.wagers)
      if (w.player_id === row.playerId && openByBet.get(w.bet_id)) manualReserved += w.stake;
    assert((reserved.get(row.playerId) ?? 0) === manualReserved, `reserved mal: ${reserved.get(row.playerId)} vs ${manualReserved}`);
  }
}

// ---------- Casos límite explícitos ----------
function single(match: any, pred: any) {
  return scorePrediction(match, pred);
}
const KO = (hs: number, as: number, adv: number | null) => ({ id: 1, finished: true, home_score: hs, away_score: as, advance_team_id: adv });
const PR = (hs: number, as: number, adv: number | null) => ({ player_id: "a", match_id: 1, home_score: hs, away_score: as, advance_team_id: adv });
const cases: [string, number, number][] = [
  ["Elim 1-1 exacto + acierta quien pasa", single(KO(1, 1, 10), PR(1, 1, 10)), 7],
  ["Elim 0-0 pred, 1-1 real + quien pasa", single(KO(1, 1, 10), PR(0, 0, 10)), 5],
  ["Elim 2-1 exacto (gana, NO +2)", single(KO(2, 1, 10), PR(2, 1, 10)), 5],
  ["Elim 1-1 exacto pero falla quien pasa", single(KO(1, 1, 20), PR(1, 1, 10)), 5],
  ["Elim predijo victoria, fue empate -> 0", single(KO(1, 1, 10), PR(2, 1, 10)), 0],
  ["Grupo: acierta ganador no exacto", single({ id: 1, finished: true, home_score: 3, away_score: 1, advance_team_id: null }, PR(2, 0, null)), 3],
];
console.log("--- Casos límite ---");
for (const [n, got, exp] of cases) {
  assert(got === exp, `${n}: ${got} != ${exp}`);
  console.log(`  ${got === exp ? "✅" : "❌"} ${n} = ${got} (esperado ${exp})`);
}

console.log(`\n=== ${ROUNDS} escenarios aleatorios · ${failures === 0 ? "TODO OK ✅" : failures + " FALLOS ❌"} ===`);
process.exit(failures === 0 ? 0 : 1);
