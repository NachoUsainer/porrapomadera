"use client";

import { useActionState } from "react";
import { savePredictions } from "@/lib/actions";
import { STAGE_LABELS } from "@/lib/supabase";
import { flagFor } from "@/lib/flags";

export type MatchRow = {
  id: number;
  stage: string;
  label: string | null;
  kickoff: string | null;
  homeName: string;
  awayName: string;
  homeTeamId: number | null;
  awayTeamId: number | null;
  isKnockout: boolean;
  locked: boolean;
  pendingTeams: boolean;
  finished: boolean;
  realHome: number | null;
  realAway: number | null;
  predHome: number | null;
  predAway: number | null;
  predAdvance: number | null;
  points: number | null;
};

function kickoffLabel(iso: string | null): string {
  if (!iso) return "Sin fecha";
  return new Date(iso).toLocaleString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PredictionsForm({ rows }: { rows: MatchRow[] }) {
  const [state, formAction, pending] = useActionState(savePredictions, {});

  const groups: { stage: string; rows: MatchRow[] }[] = [];
  for (const r of rows) {
    let g = groups.find((x) => x.stage === r.stage);
    if (!g) {
      g = { stage: r.stage, rows: [] };
      groups.push(g);
    }
    g.rows.push(r);
  }

  const hasOpen = rows.some((r) => !r.locked);

  return (
    <form action={formAction} className="space-y-10">
      {groups.map((group) => (
        <section key={group.stage}>
          <h2 className="mb-3 px-1 text-sm font-semibold uppercase tracking-wide text-subtle">
            {STAGE_LABELS[group.stage] ?? group.stage}
          </h2>
          <div className="space-y-2.5">
            {group.rows.map((m) => (
              <MatchCard key={m.id} m={m} />
            ))}
          </div>
        </section>
      ))}

      {state.error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}
      {state && !state.error && "saved" in (state as object) && (
        <p className="rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700">
          Predicciones guardadas ✓
        </p>
      )}

      {hasOpen ? (
        <div className="sticky bottom-5 flex justify-center">
          <button
            disabled={pending}
            className="rounded-full bg-ink px-7 py-3 text-sm font-medium text-white shadow-float transition hover:opacity-80 disabled:opacity-40"
          >
            {pending ? "Guardando…" : "Guardar predicciones"}
          </button>
        </div>
      ) : (
        <p className="text-center text-sm text-subtle">
          No hay partidos abiertos para predecir ahora mismo.
        </p>
      )}
    </form>
  );
}

function MatchCard({ m }: { m: MatchRow }) {
  return (
    <div className={`card p-4 ${m.locked ? "opacity-95" : ""}`}>
      <div className="mb-3 flex items-center justify-between text-[11px] text-subtle">
        <span className="tracking-wide">{m.label ?? kickoffLabel(m.kickoff)}</span>
        {m.finished ? (
          <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 font-medium text-ink">
            Final {m.realHome}–{m.realAway}
            {m.points != null && <span className="ml-1 text-accent">+{m.points}</span>}
          </span>
        ) : m.pendingTeams ? (
          <span className="rounded-full bg-ink/[0.06] px-2 py-0.5">⏳ Por definir</span>
        ) : m.locked ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">Cerrado</span>
        ) : (
          <span>{kickoffLabel(m.kickoff)}</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="flex flex-1 items-center justify-end gap-2 font-medium text-ink">
          <span className="truncate">{m.homeName}</span>
          <span className="text-lg leading-none">{flagFor(m.homeName)}</span>
        </span>
        <input
          type="number"
          name={`home_${m.id}`}
          min={0}
          max={99}
          defaultValue={m.predHome ?? ""}
          disabled={m.locked}
          className="input w-12 text-center tnum disabled:opacity-60"
        />
        <span className="text-subtle">:</span>
        <input
          type="number"
          name={`away_${m.id}`}
          min={0}
          max={99}
          defaultValue={m.predAway ?? ""}
          disabled={m.locked}
          className="input w-12 text-center tnum disabled:opacity-60"
        />
        <span className="flex flex-1 items-center gap-2 font-medium text-ink">
          <span className="text-lg leading-none">{flagFor(m.awayName)}</span>
          <span className="truncate">{m.awayName}</span>
        </span>
      </div>

      {m.isKnockout && !m.pendingTeams && (
        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-subtle">
          <span>Clasifica</span>
          <select
            name={`advance_${m.id}`}
            defaultValue={m.predAdvance ?? ""}
            disabled={m.locked}
            className="input py-1 disabled:opacity-60"
          >
            <option value="">—</option>
            {m.homeTeamId && (
              <option value={m.homeTeamId}>
                {flagFor(m.homeName)} {m.homeName}
              </option>
            )}
            {m.awayTeamId && (
              <option value={m.awayTeamId}>
                {flagFor(m.awayName)} {m.awayName}
              </option>
            )}
          </select>
        </div>
      )}
    </div>
  );
}
