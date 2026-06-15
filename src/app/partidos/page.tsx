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

  // En juego: empezado pero SIN resultado final (sigue arriba, con predicciones)
  const live = ms
    .filter((m) => !m.finished && isMatchLocked(m.kickoff, m.finished, now))
    .sort((a, b) => k(a) - k(b) || a.id - b.id);
  // Próximos: aún sin empezar
  const upcoming = ms
    .filter((m) => !m.finished && !isMatchLocked(m.kickoff, m.finished, now))
    .sort((a, b) => k(a) - k(b) || a.id - b.id);
  // Jugados (finalizados por el admin): al desplegable, más reciente primero
  const finished = ms.filter((m) => m.finished).sort((a, b) => k(b) - k(a) || b.id - a.id);

  const rowsOf = (m: Match) =>
    (predsByMatch.get(m.id) ?? [])
      .map((p) => ({
        name: nameById.get(p.player_id) ?? "—",
        mine: me?.id === p.player_id,
        home: p.home_score,
        away: p.away_score,
        advanceName: p.advance_team_id ? tName(p.advance_team_id) : null,
        points: m.finished ? scorePrediction(m, p) : null,
      }))
      .sort((a, b) => (b.points ?? 0) - (a.points ?? 0) || a.name.localeCompare(b.name));

  const pastData: PastMatch[] = finished.map((m) => ({
    id: m.id,
    when: fmt(m.kickoff),
    homeName: tName(m.home_team_id),
    awayName: tName(m.away_team_id),
    finished: true,
    homeScore: m.home_score,
    awayScore: m.away_score,
    isKnockout: KNOCKOUT.has(m.stage),
    rows: rowsOf(m),
  }));

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Partidos</h1>
        <p className="mx-auto mt-2 max-w-md text-[15px] text-subtle">
          Las predicciones se revelan al empezar el partido. Los ya finalizados están plegados
          abajo.
        </p>
      </div>

      {ms.length === 0 ? (
        <div className="card p-10 text-center text-[15px] text-subtle">
          Aún no hay partidos cargados.
        </div>
      ) : (
        <div className="space-y-8">
          {/* En juego (predicciones visibles) */}
          {live.length > 0 && (
            <section>
              <h2 className="mb-3 px-1 text-sm font-semibold uppercase tracking-wide text-subtle">
                En juego
              </h2>
              <div className="space-y-3">
                {live.map((m) => {
                  const rows = rowsOf(m);
                  return (
                    <div key={m.id} className="card p-5">
                      <MatchHeader m={m} tName={tName} live />
                      <div className="mt-4 border-t border-hair pt-3">
                        {rows.length === 0 ? (
                          <p className="text-center text-xs text-subtle">
                            Nadie predijo este partido.
                          </p>
                        ) : (
                          <PredTable rows={rows} isKnockout={KNOCKOUT.has(m.stage)} finished={false} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Próximos */}
          <section>
            <h2 className="mb-3 px-1 text-sm font-semibold uppercase tracking-wide text-subtle">
              Próximos
            </h2>
            {upcoming.length === 0 ? (
              <div className="card p-6 text-center text-sm text-subtle">
                No quedan partidos por empezar.
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.map((m) => {
                  const pendingTeams = !m.home_team_id || !m.away_team_id;
                  const n = (predsByMatch.get(m.id) ?? []).length;
                  return (
                    <div key={m.id} className="card p-5">
                      <MatchHeader m={m} tName={tName} />
                      <div className="mt-4 border-t border-hair pt-3 text-center text-xs text-subtle">
                        {pendingTeams
                          ? "Cruce por definir."
                          : `Ocultas hasta el cierre · ${n} ${
                              n === 1 ? "pronóstico" : "pronósticos"
                            }`}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Finalizados (desplegable, click para ver predicciones) */}
          {pastData.length > 0 && <PastMatches matches={pastData} />}
        </div>
      )}
    </div>
  );
}

function MatchHeader({
  m,
  tName,
  live,
}: {
  m: Match;
  tName: (id: number | null) => string | null;
  live?: boolean;
}) {
  const homeName = tName(m.home_team_id);
  const awayName = tName(m.away_team_id);
  return (
    <>
      <div className="mb-2 flex items-center justify-between text-[11px] text-subtle">
        <span className="tracking-wide">{m.label ?? fmt(m.kickoff)}</span>
        <span>{fmt(m.kickoff)}</span>
      </div>
      <div className="flex items-center justify-center gap-3 text-[15px] font-medium text-ink">
        <span className="flex flex-1 items-center justify-end gap-2">
          <span className="truncate">{homeName ?? "Por definir"}</span>
          <span className="text-xl leading-none">{flagFor(homeName)}</span>
        </span>
        {live ? (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">
            En juego
          </span>
        ) : (
          <span className="text-subtle">vs</span>
        )}
        <span className="flex flex-1 items-center gap-2">
          <span className="text-xl leading-none">{flagFor(awayName)}</span>
          <span className="truncate">{awayName ?? "Por definir"}</span>
        </span>
      </div>
    </>
  );
}

function PredTable({
  rows,
  isKnockout,
  finished,
}: {
  rows: {
    name: string;
    mine: boolean;
    home: number;
    away: number;
    advanceName: string | null;
    points: number | null;
  }[];
  isKnockout: boolean;
  finished: boolean;
}) {
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map((r, i) => (
          <tr
            key={i}
            className={`border-t border-hair first:border-0 ${r.mine ? "bg-accent/[0.05]" : ""}`}
          >
            <td className="py-1.5 text-ink">
              {r.name}
              {r.mine && <span className="ml-1 text-xs text-accent">tú</span>}
            </td>
            <td className="py-1.5 text-center text-ink tnum">
              {r.home} : {r.away}
            </td>
            {isKnockout && (
              <td className="py-1.5 text-center text-xs text-subtle">
                {r.advanceName ? `pasa: ${flagFor(r.advanceName)} ${r.advanceName}` : ""}
              </td>
            )}
            {finished && (
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
        ))}
      </tbody>
    </table>
  );
}
