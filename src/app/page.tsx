import Link from "next/link";
import { supabase, type Match } from "@/lib/supabase";
import { buildLeaderboard, bonusByPlayer, POINTS } from "@/lib/scoring";
import { getCurrentPlayer } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const player = await getCurrentPlayer();

  const [
    { data: players },
    { data: matches },
    { data: predictions },
    { data: gwPreds },
    { data: gResults },
    { data: scorerPreds },
    { data: settings },
  ] = await Promise.all([
    supabase.from("players").select("id, name"),
    supabase.from("matches").select("*"),
    supabase.from("predictions").select("*"),
    supabase.from("group_winner_predictions").select("player_id, group_name, team_id"),
    supabase.from("group_results").select("group_name, winner_team_id"),
    supabase.from("scorer_predictions").select("player_id, player_name"),
    supabase.from("settings").select("key, value").eq("key", "top_scorer").maybeSingle(),
  ]);

  const allMatches = (matches ?? []) as Match[];
  const bonus = bonusByPlayer(
    gwPreds ?? [],
    gResults ?? [],
    scorerPreds ?? [],
    settings?.value ?? null
  );
  const leaderboard = buildLeaderboard(players ?? [], allMatches, predictions ?? [], bonus);
  const finishedCount = allMatches.filter((m) => m.finished).length;

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="pt-2 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-subtle">
          Mundial 2026
        </p>
        <h1 className="mt-3 text-5xl font-semibold tracking-tight text-ink sm:text-6xl">
          Porra pomadera
        </h1>
        <p className="mt-3 text-lg text-subtle">by JARS Crisol</p>
        <p className="mx-auto mt-4 max-w-md text-[15px] text-subtle">
          {players?.length ?? 0} jugadores · {finishedCount} partidos jugados
        </p>
        {!player && (
          <div className="mt-7 flex justify-center gap-3">
            <Link href="/register" className="btn-primary px-6 py-2.5">
              Unirme a la porra
            </Link>
            <Link href="/login" className="btn-ghost px-6 py-2.5">
              Ya tengo usuario
            </Link>
          </div>
        )}
      </section>

      {/* Ranking */}
      <section>
        <h2 className="mb-4 px-1 text-sm font-semibold uppercase tracking-wide text-subtle">
          Clasificación
        </h2>
        {leaderboard.length === 0 ? (
          <div className="card p-10 text-center text-[15px] text-subtle">
            Aún no hay jugadores. Sé el primero en{" "}
            <Link href="/register" className="font-medium text-accent hover:underline">
              unirte
            </Link>
            .
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-subtle">
                  <th className="w-12 px-5 py-3 font-medium">#</th>
                  <th className="px-2 py-3 font-medium">Jugador</th>
                  <th className="px-3 py-3 text-center font-medium">Exactos</th>
                  <th className="hidden px-3 py-3 text-center font-medium sm:table-cell">Esp.</th>
                  <th className="px-5 py-3 text-right font-medium">Puntos</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row, i) => {
                  const isMe = player?.id === row.playerId;
                  const medal = ["🥇", "🥈", "🥉"][i] ?? null;
                  return (
                    <tr
                      key={row.playerId}
                      className={`border-t border-hair ${isMe ? "bg-accent/[0.05]" : ""}`}
                    >
                      <td className="px-5 py-3 text-subtle">{medal ?? i + 1}</td>
                      <td className="px-2 py-3 font-medium text-ink">
                        {row.name}
                        {isMe && <span className="ml-1.5 text-xs text-accent">tú</span>}
                      </td>
                      <td className="px-3 py-3 text-center text-subtle tnum">{row.exact}</td>
                      <td className="hidden px-3 py-3 text-center text-subtle tnum sm:table-cell">
                        {row.bonus > 0 ? `+${row.bonus}` : "–"}
                      </td>
                      <td className="px-5 py-3 text-right text-lg font-semibold text-ink tnum">
                        {row.points}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Reglas */}
      <section className="card p-6 text-[15px] text-subtle">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink">
          Puntuación
        </h2>
        <ul className="space-y-1.5">
          <li>
            <span className="font-medium text-ink">{POINTS.EXACT} pts</span> · resultado exacto.
          </li>
          <li>
            <span className="font-medium text-ink">{POINTS.OUTCOME} pts</span> · acertar
            ganador o empate.
          </li>
          <li>
            <span className="font-medium text-ink">+{POINTS.ADVANCE} pts</span> · en
            eliminatorias, predecir empate y acertar quién pasa (prórroga/penaltis).
          </li>
          <li>
            <span className="font-medium text-ink">+{POINTS.GROUP_WINNER} pts</span> · acertar
            el campeón de un grupo.
          </li>
          <li>
            <span className="font-medium text-ink">+{POINTS.TOP_SCORER} pts</span> · acertar el
            máximo goleador del torneo.
          </li>
        </ul>
      </section>
    </div>
  );
}
