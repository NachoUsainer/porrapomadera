"use client";

import { useActionState, useState } from "react";
import { adminSetGroupResults, adminSetTopScorer } from "@/lib/actions";
import { flagFor } from "@/lib/flags";
import type { Team } from "@/lib/supabase";

export default function AdminSpecials({
  teams,
  groupResults,
  topScorer,
}: {
  teams: Team[];
  groupResults: { group_name: string; winner_team_id: number | null }[];
  topScorer: string;
}) {
  const [gState, gAction, gPending] = useActionState(adminSetGroupResults, {});
  const [sState, sAction, sPending] = useActionState(adminSetTopScorer, {});
  const [scorer, setScorer] = useState(topScorer);

  const winnerByGroup = new Map(
    groupResults.map((g) => [g.group_name, g.winner_team_id])
  );
  const groupNames = [
    ...new Set(teams.map((t) => t.group_name).filter(Boolean) as string[]),
  ].sort();

  // Selects controlados: React 19 resetea los campos no controlados al enviar
  // el form-action, lo que hacía "desaparecer" el campeón recién guardado.
  const [picks, setPicks] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      groupNames.map((n) => [n, String(winnerByGroup.get(n) ?? "")])
    )
  );

  return (
    <section className="card space-y-6 p-5">
      <div>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink">
          Campeones de grupo (resultado real)
        </h2>
        <p className="mb-3 text-xs text-subtle">
          Cuando termine cada grupo, marca quién quedó primero. Da los bonus en el ranking.
        </p>
        <form action={gAction}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {groupNames.map((name) => {
              const teamsIn = teams
                .filter((t) => t.group_name === name)
                .sort((a, b) => a.name.localeCompare(b.name));
              return (
                <label key={name} className="flex flex-col gap-1 text-xs text-subtle">
                  Grupo {name}
                  <select
                    name={`gr_${name}`}
                    value={picks[name] ?? ""}
                    onChange={(e) =>
                      setPicks((p) => ({ ...p, [name]: e.target.value }))
                    }
                    className="input"
                  >
                    <option value="">— sin definir —</option>
                    {teamsIn.map((t) => (
                      <option key={t.id} value={t.id}>
                        {flagFor(t.name)} {t.name}
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button disabled={gPending} className="btn-primary">
              {gPending ? "…" : "Guardar campeones"}
            </button>
            {gState.error && <span className="text-sm text-red-600">{gState.error}</span>}
            {"saved" in gState && <span className="text-sm text-green-700">Guardado</span>}
          </div>
        </form>
      </div>

      <div className="border-t border-hair pt-5">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink">
          Máximo goleador (resultado real)
        </h2>
        <p className="mb-3 text-xs text-subtle">
          Al acabar el torneo, escribe el nombre del Pichichi. Se compara ignorando
          mayúsculas y acentos.
        </p>
        <form action={sAction} className="flex flex-wrap items-center gap-2">
          <input
            name="top_scorer"
            value={scorer}
            onChange={(e) => setScorer(e.target.value)}
            placeholder="Ej: Mbappé"
            className="input flex-1"
          />
          <button disabled={sPending} className="btn-primary">
            {sPending ? "…" : "Guardar goleador"}
          </button>
          {sState.error && <span className="text-sm text-red-600">{sState.error}</span>}
          {"saved" in sState && <span className="text-sm text-green-700">Guardado</span>}
        </form>
      </div>
    </section>
  );
}
