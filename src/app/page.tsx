import Link from "next/link";
import { POINTS } from "@/lib/scoring";
import { getStandings } from "@/lib/standings";
import { getCurrentPlayer } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const player = await getCurrentPlayer();
  const { leaderboard, playerCount, finishedCount } = await getStandings();

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
          {playerCount} jugadores · {finishedCount} partidos jugados
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
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[660px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-subtle">
                  <th className="w-10 py-3 pl-5 pr-2 font-medium">#</th>
                  <th className="py-3 pr-3 font-medium">Jugador</th>
                  <th className="px-3 py-3 text-center font-medium">Exactos</th>
                  <th className="px-3 py-3 text-center font-medium">Ganador</th>
                  <th className="px-3 py-3 text-center font-medium">Elim.</th>
                  <th className="px-3 py-3 text-center font-medium">Grupo</th>
                  <th className="px-3 py-3 text-center font-medium">Goleador</th>
                  <th className="px-3 py-3 text-center font-medium">Apuestas</th>
                  <th className="sticky right-0 bg-[#eaf1fb] px-5 py-3 text-right font-semibold text-accent shadow-[-6px_0_10px_-6px_rgba(0,0,0,0.12)]">
                    Puntos
                  </th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row, i) => {
                  const isMe = player?.id === row.playerId;
                  const stickyBg = isMe ? "bg-[#dfeafb]" : "bg-[#f3f7fd]";
                  return (
                    <tr
                      key={row.playerId}
                      className={`border-t border-hair ${isMe ? "bg-[#f1f6fd]" : ""}`}
                    >
                      <td className="py-3 pl-5 pr-2 font-semibold text-subtle tnum">{i + 1}</td>
                      <td className="whitespace-nowrap py-3 pr-3 font-medium text-ink">
                        {row.name}
                        {isMe && <span className="ml-1.5 text-xs text-accent">tú</span>}
                      </td>
                      <Cell value={row.exact} />
                      <Cell value={row.outcomes} />
                      <Cell value={row.advanceHits} />
                      <Cell value={row.groupHits} />
                      <td className="px-3 py-3 text-center tnum">
                        {row.scorerHit ? (
                          <span className="text-green-600">+{POINTS.TOP_SCORER}</span>
                        ) : (
                          <span className="text-black/20">–</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center tnum">
                        {row.betNet === 0 ? (
                          <span className="text-black/20">–</span>
                        ) : (
                          <span className={row.betNet > 0 ? "text-green-600" : "text-red-600"}>
                            {row.betNet > 0 ? `+${row.betNet}` : row.betNet}
                          </span>
                        )}
                      </td>
                      <td
                        className={`sticky right-0 ${stickyBg} px-5 py-3 text-right text-xl font-bold text-ink tnum shadow-[-6px_0_10px_-6px_rgba(0,0,0,0.12)]`}
                      >
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

function Cell({ value }: { value: number }) {
  return (
    <td className="px-3 py-3 text-center tnum">
      {value > 0 ? (
        <span className="text-subtle">{value}</span>
      ) : (
        <span className="text-black/20">–</span>
      )}
    </td>
  );
}
