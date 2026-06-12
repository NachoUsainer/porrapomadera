"use client";

import { useActionState } from "react";
import { saveGroupWinners, saveScorer } from "@/lib/actions";
import { flagFor } from "@/lib/flags";
import { POINTS } from "@/lib/scoring";

export type GroupItem = {
  name: string;
  teams: { id: number; name: string }[];
  locked: boolean;
  pickedTeamId: number | null;
  winnerTeamId: number | null; // campeón real (lo pone el admin)
};

export type ScorerItem = {
  value: string;
  locked: boolean;
  real: string | null;
};

export default function SpecialPredictions({
  groups,
  scorer,
}: {
  groups: GroupItem[];
  scorer: ScorerItem;
}) {
  return (
    <div className="space-y-10">
      <GroupChampions groups={groups} />
      <TopScorer scorer={scorer} />
    </div>
  );
}

function GroupChampions({ groups }: { groups: GroupItem[] }) {
  const [state, action, pending] = useActionState(saveGroupWinners, {});
  const anyOpen = groups.some((g) => !g.locked);

  return (
    <section>
      <h2 className="mb-1 px-1 text-sm font-semibold uppercase tracking-wide text-subtle">
        Campeón de cada grupo
      </h2>
      <p className="mb-3 px-1 text-xs text-subtle">
        Acierta el primero de cada grupo · <span className="text-ink">+{POINTS.GROUP_WINNER} pts</span> cada uno.
        Cada grupo se cierra al empezar su primer partido.
      </p>
      <form action={action}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {groups.map((g) => {
            const winnerName = g.winnerTeamId
              ? g.teams.find((t) => t.id === g.winnerTeamId)?.name ?? null
              : null;
            const correct =
              g.winnerTeamId != null && g.pickedTeamId === g.winnerTeamId;
            return (
              <div key={g.name} className="card p-3">
                <div className="mb-1.5 flex items-center justify-between text-[11px] text-subtle">
                  <span className="font-semibold text-ink">Grupo {g.name}</span>
                  {winnerName ? (
                    <span className={correct ? "text-green-600" : "text-subtle"}>
                      {correct ? `+${POINTS.GROUP_WINNER}` : "—"}
                    </span>
                  ) : g.locked ? (
                    <span className="text-subtle">cerrado</span>
                  ) : null}
                </div>
                <select
                  name={`group_${g.name}`}
                  defaultValue={g.pickedTeamId ?? ""}
                  disabled={g.locked}
                  className="input w-full disabled:opacity-60"
                >
                  <option value="">— elige —</option>
                  {g.teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {flagFor(t.name)} {t.name}
                    </option>
                  ))}
                </select>
                {winnerName && (
                  <p className="mt-1 text-[11px] text-subtle">
                    Campeón: {flagFor(winnerName)} {winnerName}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {state.error && (
          <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
        )}
        {"saved" in state && (
          <p className="mt-3 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700">Guardado</p>
        )}

        {anyOpen && (
          <div className="mt-4 flex justify-center">
            <button disabled={pending} className="btn-primary px-6 py-2.5">
              {pending ? "Guardando…" : "Guardar campeones"}
            </button>
          </div>
        )}
      </form>
    </section>
  );
}

function TopScorer({ scorer }: { scorer: ScorerItem }) {
  const [state, action, pending] = useActionState(saveScorer, {});
  const correct =
    scorer.real != null &&
    scorer.value.trim().toLowerCase() === scorer.real.trim().toLowerCase();

  return (
    <section>
      <h2 className="mb-1 px-1 text-sm font-semibold uppercase tracking-wide text-subtle">
        Máximo goleador
      </h2>
      <p className="mb-3 px-1 text-xs text-subtle">
        El Pichichi del Mundial · <span className="text-ink">+{POINTS.TOP_SCORER} pts</span>.
        Se cierra al empezar las eliminatorias.
      </p>
      <form action={action} className="card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            name="scorer"
            defaultValue={scorer.value}
            disabled={scorer.locked}
            placeholder="Ej: Mbappé"
            className="input flex-1 disabled:opacity-60"
          />
          {!scorer.locked && (
            <button disabled={pending} className="btn-primary">
              {pending ? "…" : "Guardar"}
            </button>
          )}
        </div>
        {scorer.real && (
          <p className="mt-2 text-xs text-subtle">
            Goleador real: <span className="font-medium text-ink">{scorer.real}</span>{" "}
            {correct ? (
              <span className="text-green-600">+{POINTS.TOP_SCORER}</span>
            ) : (
              <span>—</span>
            )}
          </p>
        )}
        {scorer.locked && !scorer.real && (
          <p className="mt-2 text-xs text-subtle">Plazo cerrado.</p>
        )}
        {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
        {"saved" in state && <p className="mt-2 text-sm text-green-700">Guardado</p>}
      </form>
    </section>
  );
}
