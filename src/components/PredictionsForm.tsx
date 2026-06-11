"use client";

import { useActionState } from "react";
import { savePredictions } from "@/lib/actions";
import { STAGE_LABELS } from "@/lib/supabase";

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
  const d = new Date(iso);
  return d.toLocaleString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PredictionsForm({ rows }: { rows: MatchRow[] }) {
  const [state, formAction, pending] = useActionState(savePredictions, {});

  // Agrupar por fase manteniendo el orden de aparición
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
    <form action={formAction} className="space-y-8">
      {groups.map((group) => (
        <section key={group.stage}>
          <h2 className="mb-3 text-lg font-bold text-slate-800">
            {STAGE_LABELS[group.stage] ?? group.stage}
          </h2>
          <div className="space-y-2">
            {group.rows.map((m) => (
              <MatchCard key={m.id} m={m} />
            ))}
          </div>
        </section>
      ))}

      {state.error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      {state && !state.error && "saved" in (state as object) && (
        <p className="rounded bg-green-50 px-3 py-2 text-sm text-green-700">
          ¡Predicciones guardadas!
        </p>
      )}

      {hasOpen ? (
        <div className="sticky bottom-4 flex justify-end">
          <button
            disabled={pending}
            className="rounded-full bg-pitch-700 px-6 py-3 font-semibold text-white shadow-lg hover:bg-pitch-900 disabled:opacity-50"
          >
            {pending ? "Guardando..." : "💾 Guardar predicciones"}
          </button>
        </div>
      ) : (
        <p className="text-center text-sm text-slate-500">
          No hay partidos abiertos para predecir ahora mismo.
        </p>
      )}
    </form>
  );
}

function MatchCard({ m }: { m: MatchRow }) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        m.locked ? "border-slate-200 bg-slate-50" : "border-slate-300 bg-white"
      }`}
    >
      <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
        <span>{m.label ?? kickoffLabel(m.kickoff)}</span>
        {m.finished ? (
          <span className="rounded bg-slate-200 px-2 py-0.5 font-medium">
            Final: {m.realHome}–{m.realAway}
            {m.points != null && (
              <span className="ml-1 text-pitch-700">(+{m.points} pts)</span>
            )}
          </span>
        ) : m.pendingTeams ? (
          <span className="rounded bg-slate-200 px-2 py-0.5 text-slate-600">
            ⏳ Equipos por definir
          </span>
        ) : m.locked ? (
          <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-700">🔒 Cerrado</span>
        ) : (
          <span>{kickoffLabel(m.kickoff)}</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="flex-1 text-right font-medium">{m.homeName}</span>
        <input
          type="number"
          name={`home_${m.id}`}
          min={0}
          max={99}
          defaultValue={m.predHome ?? ""}
          disabled={m.locked}
          className="w-12 rounded border border-slate-300 px-2 py-1 text-center disabled:bg-slate-100"
        />
        <span className="text-slate-400">–</span>
        <input
          type="number"
          name={`away_${m.id}`}
          min={0}
          max={99}
          defaultValue={m.predAway ?? ""}
          disabled={m.locked}
          className="w-12 rounded border border-slate-300 px-2 py-1 text-center disabled:bg-slate-100"
        />
        <span className="flex-1 font-medium">{m.awayName}</span>
      </div>

      {m.isKnockout && (
        <div className="mt-2 flex items-center justify-center gap-2 text-xs">
          <span className="text-slate-500">¿Quién clasifica?</span>
          <select
            name={`advance_${m.id}`}
            defaultValue={m.predAdvance ?? ""}
            disabled={m.locked}
            className="rounded border border-slate-300 px-2 py-1 disabled:bg-slate-100"
          >
            <option value="">—</option>
            {m.homeTeamId && <option value={m.homeTeamId}>{m.homeName}</option>}
            {m.awayTeamId && <option value={m.awayTeamId}>{m.awayName}</option>}
          </select>
        </div>
      )}
    </div>
  );
}
