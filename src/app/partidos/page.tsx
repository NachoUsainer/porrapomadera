import { supabase, type Match, type Team, type Prediction } from "@/lib/supabase";
import { getCurrentPlayer } from "@/lib/session";
import { isMatchLocked } from "@/lib/lock";
import { scorePrediction } from "@/lib/scoring";
import { flagFor } from "@/lib/flags";
import PastMatches, { type PastMatch } from "@/components/PastMatches";

export const dynamic = "force-dynamic";

const KNOCKOUT = new Set(["r32", "r16", "qf", "sf", "third", "final"]);

function fmt(iso: string | null): string {
  if (!iso) return "Sin fecha";
  return new Date(iso).toLocaleString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
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
  const tName = (id: number | null) => (id ? teamById.get(id)?.name ?? "?" : null);
  const ms = (matches ?? []) as Match[];

  const k = (m: Match) => (m.kickoff ? new Date(m.kickoff).getTime() : Infinity);

  // Próximos (aún sin empezar): por orden cronológico
  const upcoming = ms
    .filter((m) => !isMatchLocked(m.kickoff, m.finished, now))
    .sort((a, b) => k(a) - k(b) || a.id - b.id);

  // Jugados / empezados: más reciente primero, para el desplegable
  const past = ms
    .filter((m) => isMatchLocked(m.kickoff, m.finished, now))
    .sort((a, b) => k(b) - k(a) || b.id - a.id);

  const pastData: PastMatch[] = past.map((m) => {
    const rows = (predsByMatch.get(m.id) ?? [])
      .map((p) => ({
        name: nameById.get(p.player_id) ?? "—",
        mine: me?.id === p.player_id,
        home: p.home_score,
        away: p.away_score,
        advanceName: p.advance_team_id ? tName(p.advance_team_id) : null,
        points: m.finished ? scorePrediction(m, p) : null,
      }))
      .sort((a, b) => (b.points ?? 0) - (a.points ?? 0) || a.name.localeCompare(b.name));
    return {
      id: m.id,
      when: fmt(m.kickoff),
      homeName: tName(m.home_team_id),
      awayName: tName(m.away_team_id),
      finished: m.finished,
      homeScore: m.home_score,
      awayScore: m.away_score,
      isKnockout: KNOCKOUT.has(m.stage),
      rows,
    };
  });

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Partidos</h1>
        <p className="mx-auto mt-2 max-w-md text-[15px] text-subtle">
          Las predicciones de todos se revelan cuando empieza el partido. Los ya jugados están
          plegados abajo.
        </p>
      </div>

      {ms.length === 0 ? (
        <div className="card p-10 text-center text-[15px] text-subtle">
          Aún no hay partidos cargados.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Próximos */}
          <section>
            <h2 className="mb-3 px-1 text-sm font-semibold uppercase tracking-wide text-subtle">
              Próximos
            </h2>
            {upcoming.length === 0 ? (
              <div className="card p-6 text-center text-sm text-subtle">
                No quedan partidos por jugar.
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.map((m) => {
                  const pendingTeams = !m.home_team_id || !m.away_team_id;
                  const mPreds = predsByMatch.get(m.id) ?? [];
                  const homeName = tName(m.home_team_id);
                  const awayName = tName(m.away_team_id);
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
                        <span className="text-subtle">vs</span>
                        <span className="flex flex-1 items-center gap-2">
                          <span className="text-xl leading-none">{flagFor(awayName)}</span>
                          <span className="truncate">{awayName ?? "Por definir"}</span>
                        </span>
                      </div>
                      <div className="mt-4 border-t border-hair pt-3 text-center text-xs text-subtle">
                        {pendingTeams
                          ? "Cruce por definir."
                          : `Ocultas hasta el cierre · ${mPreds.length} ${
                              mPreds.length === 1 ? "pronóstico" : "pronósticos"
                            }`}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Jugados (desplegable, con predicciones al hacer click) */}
          {pastData.length > 0 && <PastMatches matches={pastData} />}
        </div>
      )}
    </div>
  );
}
