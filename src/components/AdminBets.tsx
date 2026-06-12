"use client";

import { useActionState } from "react";
import {
  adminCreateBet,
  adminToggleBet,
  adminResolveBet,
  adminDeleteBet,
} from "@/lib/actions";

export type AdminBet = {
  id: string;
  question: string;
  is_open: boolean;
  outcome: boolean | null;
  closesAt: string | null;
  autoClosed: boolean;
  wagerCount: number;
  totalStaked: number;
};

export type MatchOption = { id: number; label: string };

export default function AdminBets({
  bets,
  matchOptions,
}: {
  bets: AdminBet[];
  matchOptions: MatchOption[];
}) {
  const [state, action, pending] = useActionState(adminCreateBet, {});

  return (
    <section className="card space-y-5 p-5">
      <div>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink">
          Apuestas especiales
        </h2>
        <p className="mb-3 text-xs text-subtle">
          Crea apuestas a que algo ocurre. La gente apuesta sus puntos a que SÍ pasa. Elige un
          partido para que se <strong>cierre sola al empezar</strong>, o déjalo sin partido y la
          cierras tú a mano. Luego marcas el resultado (SÍ/NO).
        </p>
        <form action={action} className="space-y-2">
          <input
            name="question"
            placeholder="Ej: Ferran marca a Cabo Verde"
            className="input w-full"
          />
          <div className="flex flex-wrap items-center gap-2">
            <select name="match_id" defaultValue="" className="input min-w-[16rem] flex-1">
              <option value="">⏱️ Cierre automático: sin partido (cierro a mano)</option>
              {matchOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  Cierra al empezar: {m.label}
                </option>
              ))}
            </select>
            <button disabled={pending} className="btn-primary">
              {pending ? "…" : "Crear apuesta"}
            </button>
          </div>
        </form>
        {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      </div>

      {bets.length > 0 && (
        <div className="space-y-2 border-t border-hair pt-4">
          {bets.map((b) => (
            <BetRow key={b.id} bet={b} />
          ))}
        </div>
      )}
    </section>
  );
}

function fmt(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  });
}

function BetRow({ bet }: { bet: AdminBet }) {
  const resolved = bet.outcome != null;
  const effectivelyOpen = bet.is_open && !bet.autoClosed;
  return (
    <div className="rounded-xl bg-black/[0.02] p-3">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink">{bet.question}</p>
          {bet.closesAt && (
            <p className="text-[11px] text-subtle">
              ⏱️ {bet.autoClosed ? "Cerró" : "Cierra"} el {fmt(bet.closesAt)}
            </p>
          )}
        </div>
        <span className="shrink-0 text-[11px] text-subtle">
          {bet.wagerCount} apuestas · {bet.totalStaked} pts
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        {resolved ? (
          <>
            <span
              className={`rounded-full px-2 py-0.5 font-medium ${
                bet.outcome ? "bg-green-100 text-green-700" : "bg-ink/[0.06] text-subtle"
              }`}
            >
              Resuelta: {bet.outcome ? "SÍ" : "NO"}
            </span>
            <ResultButton betId={bet.id} result="pending" label="Reabrir (pendiente)" />
          </>
        ) : (
          <>
            <span
              className={`rounded-full px-2 py-0.5 ${
                effectivelyOpen ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
              }`}
            >
              {effectivelyOpen ? "Abierta" : bet.autoClosed ? "Cerrada (auto)" : "Cerrada"}
            </span>
            <form action={adminToggleBet} className="inline">
              <input type="hidden" name="bet_id" value={bet.id} />
              <button className="btn-ghost px-3 py-1 text-xs">
                {bet.is_open ? "Cerrar apuestas" : "Reabrir"}
              </button>
            </form>
            <ResultButton betId={bet.id} result="yes" label="✓ Resolver SÍ" green />
            <ResultButton betId={bet.id} result="no" label="✗ Resolver NO" />
          </>
        )}

        <form
          action={adminDeleteBet}
          className="ml-auto inline"
          onSubmit={(e) => {
            if (!confirm("¿Eliminar esta apuesta y todas sus apuestas? No se puede deshacer."))
              e.preventDefault();
          }}
        >
          <input type="hidden" name="bet_id" value={bet.id} />
          <button className="text-xs text-red-500 hover:underline">Eliminar</button>
        </form>
      </div>
    </div>
  );
}

function ResultButton({
  betId,
  result,
  label,
  green,
}: {
  betId: string;
  result: string;
  label: string;
  green?: boolean;
}) {
  return (
    <form action={adminResolveBet} className="inline">
      <input type="hidden" name="bet_id" value={betId} />
      <input type="hidden" name="result" value={result} />
      <button
        className={`rounded-full px-3 py-1 text-xs font-medium ${
          green ? "bg-green-600 text-white hover:bg-green-700" : "btn-ghost"
        }`}
      >
        {label}
      </button>
    </form>
  );
}
