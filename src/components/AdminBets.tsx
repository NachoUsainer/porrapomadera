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
  wagerCount: number;
  totalStaked: number;
};

export default function AdminBets({ bets }: { bets: AdminBet[] }) {
  const [state, action, pending] = useActionState(adminCreateBet, {});

  return (
    <section className="card space-y-5 p-5">
      <div>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink">
          Apuestas especiales 🎰
        </h2>
        <p className="mb-3 text-xs text-subtle">
          Crea apuestas a que algo ocurre. La gente apuesta sus puntos a que SÍ pasa. Tú la
          cierras a mano y luego marcas el resultado (SÍ/NO).
        </p>
        <form action={action} className="flex flex-wrap items-center gap-2">
          <input
            name="question"
            placeholder="Ej: Ferran marca a Cabo Verde"
            className="input flex-1 min-w-[14rem]"
          />
          <button disabled={pending} className="btn-primary">
            {pending ? "…" : "Crear apuesta"}
          </button>
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

function BetRow({ bet }: { bet: AdminBet }) {
  const resolved = bet.outcome != null;
  return (
    <div className="rounded-xl bg-black/[0.02] p-3">
      <div className="mb-2 flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-ink">{bet.question}</p>
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
                bet.is_open ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
              }`}
            >
              {bet.is_open ? "Abierta" : "Cerrada"}
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
