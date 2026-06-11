import { supabase, type Match, type Team, type Prediction, STAGE_LABELS } from "@/lib/supabase";
import { getCurrentPlayer } from "@/lib/session";
import { isMatchLocked } from "@/lib/lock";
import { scorePrediction } from "@/lib/scoring";
import { flagFor } from "@/lib/flags";

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

  const tName = (id: number | null) => (id ? teamById.get(id)?.name ?? "?" : null);

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
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Partidos</h1>
        <p className="mx-auto mt-2 max-w-md text-[15px] text-subtle">
          Las predicciones de todos se revelan cuando empieza el partido. Hasta entonces, ocultas.
        </p>
      </div>

      {allMatches.length === 0 ? (
        <div className="card p-10 text-center text-[15px] text-subtle">
          Aún no hay partidos cargados.
        </div>
      ) : (
        <div className="space-y-10">
          {groups.map((group) => (
            <section key={group.stage}>
              <h2 className="mb-3 px-1 text-sm font-semibold uppercase tracking-wide text-subtle">
                {STAGE_LABELS[group.stage] ?? group.stage}
              </h2>
              <div className="space-y-3">
                {group.matches.map((m) => {
                  const locked = isMatchLocked(m.kickoff, m.finished, now);
                  const pendingTeams = !m.home_team_id || !m.away_team_id;
                  const mPreds = predsByMatch.get(m.id) ?? [];
                  const isKnockout = KNOCKOUT.has(m.stage);
                  const homeName = tName(m.home_team_id);
                  const awayName = tName(m.away_team_id);

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
                    <div key={m.id} className="card p-5">
                      <div className="mb-2 flex items-center justify-between text-[11px] text-subtle">
                        <span className="tracking-wide">{m.label ?? fmt(m.kickoff)}</span>
                        <span>{fmt(m.kickoff)}</span>
                      </div>
                      <div className="flex items-center justify-center gap-3 text-[15px] font-medium text-ink">
                        <span className="flex flex-1 items-center justify-end gap-2">
                          <span className="truncate">{homeName ?? "Por definir"}</span>
                          <span className="text-xl leading-none">{flagFor(homeName)}</span>
                        </span>
                        {m.finished ? (
                          <span className="rounded-lg bg-ink px-2.5 py-1 text-sm font-semibold text-white tnum">
                            {m.home_score} : {m.away_score}
                          </span>
                        ) : (
                          <span className="text-subtle">vs</span>
                        )}
                        <span className="flex flex-1 items-center gap-2">
                          <span className="text-xl leading-none">{flagFor(awayName)}</span>
                          <span className="truncate">{awayName ?? "Por definir"}</span>
                        </span>
                      </div>

                      <div className="mt-4 border-t border-hair pt-3">
                        {pendingTeams ? (
                          <p className="text-center text-xs text-subtle">⏳ Cruce por definir.</p>
                        ) : !locked ? (
                          <p className="text-center text-xs text-subtle">
                            🔒 Ocultas hasta el cierre · {mPreds.length}{" "}
                            {mPreds.length === 1 ? "pronóstico" : "pronósticos"}
                          </p>
                        ) : rows.length === 0 ? (
                          <p className="text-center text-xs text-subtle">
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
                                    className={`border-t border-hair first:border-0 ${
                                      mine ? "bg-accent/[0.05]" : ""
                                    }`}
                                  >
                                    <td className="py-1.5 text-ink">
                                      {r.name}
                                      {mine && <span className="ml-1 text-xs text-accent">tú</span>}
                                    </td>
                                    <td className="py-1.5 text-center text-ink tnum">
                                      {r.home} : {r.away}
                                    </td>
                                    {isKnockout && (
                                      <td className="py-1.5 text-center text-xs text-subtle">
                                        {r.advance ? `▶ ${flagFor(tName(r.advance))}` : ""}
                                      </td>
                                    )}
                                    {m.finished && (
                                      <td className="py-1.5 text-right">
                                        <span
                                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                            (r.points ?? 0) > 0
                                              ? "bg-green-100 text-green-700"
                                              : "bg-black/[0.05] text-subtle"
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
