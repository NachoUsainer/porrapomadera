import { supabase, type Match, type Team, type Prediction, STAGE_LABELS } from "@/lib/supabase";
import { getCurrentPlayer } from "@/lib/session";
import { isMatchLocked } from "@/lib/lock";
import { scorePrediction } from "@/lib/scoring";

export const dynamic = "force-dynamic";

const STAGE_ORDER = ["group", "r32", "r16", "qf", "sf", "third", "final"];
const KNOCKOUT = new Set(["r32", "r16", "qf", "sf", "third", "final"]);

function fmt(iso: string | null): string {
  if (!iso) return "Sin fecha";
  return new Date(iso).toLocaleString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function PartidosPage() {
  const me = await getCurrentPlayer();

  const [{ data: matches }, { data: teams }, { data: players }, { data: preds }] =
    await Promise.all([
      supabase.from("matches").select("*"),
      supabase.from("teams").select("*"),
      supabase.from("players").select("id, name"),
      supabase.from("predictions").select("*"),
    ]);

  const teamById = new Map((teams ?? []).map((t: Team) => [t.id, t]));
  const nameById = new Map((players ?? []).map((p) => [p.id, p.name as string]));
  const predsByMatch = new Map<number, Prediction[]>();
  for (const p of (preds ?? []) as Prediction[]) {
    const list = predsByMatch.get(p.match_id) ?? [];
    list.push(p);
    predsByMatch.set(p.match_id, list);
  }
  const now = Date.now();

  const allMatches = ((matches ?? []) as Match[]).sort((a, b) => {
    const so = STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage);
    if (so !== 0) return so;
    const ka = a.kickoff ? new Date(a.kickoff).getTime() : Infinity;
    const kb = b.kickoff ? new Date(b.kickoff).getTime() : Infinity;
    return ka - kb || a.id - b.id;
  });

  const teamName = (id: number | null) =>
    id ? teamById.get(id)?.name ?? "?" : "Por definir";

  // Agrupar por fase
  const groups: { stage: string; matches: Match[] }[] = [];
  for (const m of allMatches) {
    let g = groups.find((x) => x.stage === m.stage);
    if (!g) {
      g = { stage: m.stage, matches: [] };
      groups.push(g);
    }
    g.matches.push(m);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900">Partidos y predicciones</h1>
        <p className="text-sm text-slate-500">
          Las predicciones de todos se revelan cuando el partido se cierra (2 horas antes del
          inicio). Antes, permanecen ocultas.
        </p>
      </div>

      {allMatches.length === 0 ? (
        <p className="rounded border border-dashed border-slate-300 p-6 text-center text-slate-500">
          Aún no hay partidos cargados.
        </p>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.stage}>
              <h2 className="mb-3 text-lg font-bold text-slate-800">
                {STAGE_LABELS[group.stage] ?? group.stage}
              </h2>
              <div className="space-y-3">
                {group.matches.map((m) => {
                  const locked = isMatchLocked(m.kickoff, m.finished, now);
                  const pendingTeams = !m.home_team_id || !m.away_team_id;
                  const mPreds = predsByMatch.get(m.id) ?? [];
                  const isKnockout = KNOCKOUT.has(m.stage);

                  // Orden: por puntos (si finalizado) y luego por nombre.
                  const rows = mPreds
                    .map((p) => ({
                      name: nameById.get(p.player_id) ?? "—",
                      playerId: p.player_id,
                      home: p.home_score,
                      away: p.away_score,
                      advance: p.advance_team_id,
                      points: m.finished ? scorePrediction(m, p) : null,
                    }))
                    .sort(
                      (a, b) =>
                        (b.points ?? 0) - (a.points ?? 0) || a.name.localeCompare(b.name)
                    );

                  return (
                    <div key={m.id} className="rounded-lg border border-slate-200 bg-white p-4">
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                        <span>{m.label ?? fmt(m.kickoff)}</span>
                        <span>{fmt(m.kickoff)}</span>
                      </div>
                      <div className="flex items-center justify-center gap-3 text-base font-semibold">
                        <span className="flex-1 text-right">{teamName(m.home_team_id)}</span>
                        {m.finished ? (
                          <span className="rounded bg-slate-900 px-2 py-0.5 text-white">
                            {m.home_score} – {m.away_score}
                          </span>
                        ) : (
                          <span className="text-slate-400">vs</span>
                        )}
                        <span className="flex-1">{teamName(m.away_team_id)}</span>
                      </div>

                      <div className="mt-3 border-t border-slate-100 pt-3">
                        {pendingTeams ? (
                          <p className="text-center text-xs text-slate-400">
                            ⏳ Cruce por definir.
                          </p>
                        ) : !locked ? (
                          <p className="text-center text-xs text-slate-400">
                            🔒 Predicciones ocultas hasta el cierre · {mPreds.length}{" "}
                            {mPreds.length === 1 ? "pronóstico" : "pronósticos"} hasta ahora
                          </p>
                        ) : rows.length === 0 ? (
                          <p className="text-center text-xs text-slate-400">
                            Nadie predijo este partido.
                          </p>
                        ) : (
                          <table className="w-full text-sm">
                            <tbody>
                              {rows.map((r) => {
                                const mine = me?.id === r.playerId;
                                return (
                                  <tr
                                    key={r.playerId}
                                    className={`border-t border-slate-50 ${
                                      mine ? "bg-pitch-500/10 font-medium" : ""
                                    }`}
                                  >
                                    <td className="py-1">
                                      {r.name}
                                      {mine && (
                                        <span className="ml-1 text-xs text-pitch-700">(tú)</span>
                                      )}
                                    </td>
                                    <td className="py-1 text-center tabular-nums">
                                      {r.home}–{r.away}
                                    </td>
                                    {isKnockout && (
                                      <td className="py-1 text-center text-xs text-slate-500">
                                        {r.advance ? `▶ ${teamName(r.advance)}` : ""}
                                      </td>
                                    )}
                                    {m.finished && (
                                      <td className="py-1 text-right">
                                        <span
                                          className={`rounded px-1.5 py-0.5 text-xs ${
                                            (r.points ?? 0) > 0
                                              ? "bg-green-100 text-green-700"
                                              : "bg-slate-100 text-slate-400"
                                          }`}
                                        >
                                          {r.points} pts
                                        </span>
                                      </td>
                                    )}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
