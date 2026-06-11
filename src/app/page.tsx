import Link from "next/link";
import { supabase, type Match } from "@/lib/supabase";
import { buildLeaderboard, POINTS } from "@/lib/scoring";
import { getCurrentPlayer } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const player = await getCurrentPlayer();

  const [{ data: players }, { data: matches }, { data: predictions }] =
    await Promise.all([
      supabase.from("players").select("id, name"),
      supabase.from("matches").select("*"),
      supabase.from("predictions").select("*"),
    ]);

  const allMatches = (matches ?? []) as Match[];
  const leaderboard = buildLeaderboard(
    players ?? [],
    allMatches,
    predictions ?? []
  );
  const finishedCount = allMatches.filter((m) => m.finished).length;

  return (
    <div className="space-y-8">
      <section className="rounded-lg bg-gradient-to-br from-pitch-900 to-pitch-700 p-6 text-white">
        <h1 className="text-2xl font-extrabold">🏆 Ranking de la porra</h1>
        <p className="mt-1 text-sm text-white/80">
          {players?.length ?? 0} jugadores · {finishedCount} partidos jugados
        </p>
        {!player && (
          <div className="mt-4 flex gap-2">
            <Link
              href="/register"
              className="rounded bg-white px-4 py-2 text-sm font-semibold text-pitch-900 hover:bg-white/90"
            >
              Unirme a la porra
            </Link>
            <Link
              href="/login"
              className="rounded bg-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/25"
            >
              Ya tengo usuario
            </Link>
          </div>
        )}
      </section>

      <section>
        {leaderboard.length === 0 ? (
          <p className="rounded border border-dashed border-slate-300 p-6 text-center text-slate-500">
            Aún no hay jugadores. ¡Sé el primero en{" "}
            <Link href="/register" className="font-medium text-pitch-700 underline">
              unirte
            </Link>
            !
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-2 w-10">#</th>
                  <th className="px-4 py-2">Jugador</th>
                  <th className="px-4 py-2 text-center">Exactos</th>
                  <th className="px-4 py-2 text-center">Ganadores</th>
                  <th className="px-4 py-2 text-right">Puntos</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row, i) => {
                  const isMe = player?.id === row.playerId;
                  const medal = ["🥇", "🥈", "🥉"][i] ?? null;
                  return (
                    <tr
                      key={row.playerId}
                      className={`border-t border-slate-100 ${
                        isMe ? "bg-pitch-500/10 font-semibold" : ""
                      }`}
                    >
                      <td className="px-4 py-2">{medal ?? i + 1}</td>
                      <td className="px-4 py-2">
                        {row.name}
                        {isMe && <span className="ml-1 text-xs text-pitch-700">(tú)</span>}
                      </td>
                      <td className="px-4 py-2 text-center text-slate-500">{row.exact}</td>
                      <td className="px-4 py-2 text-center text-slate-500">{row.outcomes}</td>
                      <td className="px-4 py-2 text-right text-lg font-bold text-pitch-900">
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

      <section className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">
        <h2 className="mb-2 font-semibold text-slate-800">¿Cómo se puntúa?</h2>
        <ul className="space-y-1">
          <li>
            🎯 <strong>{POINTS.EXACT} puntos</strong> si aciertas el resultado exacto.
          </li>
          <li>
            ✅ <strong>{POINTS.OUTCOME} puntos</strong> si aciertas quién gana (o empate) pero no
            el resultado exacto.
          </li>
          <li>
            🔝 <strong>+{POINTS.ADVANCE} puntos</strong> en eliminatorias si aciertas qué
            selección clasifica.
          </li>
        </ul>
      </section>
    </div>
  );
}
