"use client";

import { useActionState, useState } from "react";
import { placeWager, removeWager } from "@/lib/actions";
import { MAX_WAGER } from "@/lib/scoring";

export type BetItem = {
  id: string;
  question: string;
  status: "open" | "closed" | "resolved";
  outcome: boolean | null;
  closesAt: string | null;
  myStake: number | null;
  available: number; // puntos que puedes apostar en esta apuesta
  bettors: { name: string; stake: number }[]; // quién ha apostado (público)
};

function closeLabel(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  });
}

export type BetsSummary = { total: number; reserved: number; available: number };

export default function SpecialBets({
  bets,
  summary,
}: {
  bets: BetItem[];
  summary: BetsSummary;
}) {
  const [open, setOpen] = useState(false);
  const openBets = bets.filter((b) => b.status === "open").length;

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="card flex w-full items-center gap-3 p-4 text-left transition hover:bg-black/[0.015]"
      >
        <span className="flex-1">
          <span className="block font-semibold text-ink">Apuestas especiales</span>
          <span className="block text-xs text-subtle">Añádele pomada</span>
        </span>
        {openBets > 0 && !open && (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            {openBets} abierta{openBets > 1 ? "s" : ""}
          </span>
        )}
        <span className="text-lg leading-none text-subtle">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="mt-3 animate-[fadein_0.3s_ease]">
          <p className="mb-3 px-1 text-xs text-subtle">
            Apuesta tus puntos a que el evento <span className="text-ink">SÍ ocurre</span>. Si
            aciertas ganas lo apostado; si fallas, lo pierdes (doble o nada). Máximo{" "}
            <span className="text-ink">{MAX_WAGER} pts</span> por apuesta.
          </p>

          <div className="card mb-3 flex items-center justify-around p-3 text-center">
            <Stat label="Tus puntos" value={summary.total} />
            <div className="h-8 w-px bg-hair" />
            <Stat label="En juego" value={summary.reserved} />
            <div className="h-8 w-px bg-hair" />
            <Stat label="Disponible" value={summary.available} accent />
          </div>

          {bets.length === 0 ? (
            <div className="card p-6 text-center text-sm text-subtle">
              No hay apuestas ahora mismo. ¡Atento, que el admin las va metiendo!
            </div>
          ) : (
            <div className="space-y-2.5">
              {bets.map((b) => (
                <BetCard key={b.id} bet={b} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div>
      <div className={`text-xl font-semibold tnum ${accent ? "text-accent" : "text-ink"}`}>
        {value}
      </div>
      <div className="text-[11px] uppercase tracking-wide text-subtle">{label}</div>
    </div>
  );
}

function BetCard({ bet }: { bet: BetItem }) {
  const [state, action, pending] = useActionState(placeWager, {});

  return (
    <div className="card p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <p className="font-medium text-ink">{bet.question}</p>
        <StatusBadge bet={bet} />
      </div>

      {bet.status === "resolved" ? (
        <Resolved bet={bet} />
      ) : bet.status === "closed" ? (
        <p className="text-xs text-subtle">
          Cerrada para apuestas{bet.myStake ? ` · jugaste ${bet.myStake} pts` : ""}.
          Esperando resultado.
        </p>
      ) : (
        // open
        <div>
          {(() => {
            const cap = Math.min(bet.available, MAX_WAGER);
            return (
              <form action={action} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="bet_id" value={bet.id} />
                <input
                  type="number"
                  name="stake"
                  min={1}
                  max={cap}
                  defaultValue={bet.myStake ?? ""}
                  placeholder="puntos"
                  disabled={cap < 1 && !bet.myStake}
                  className="input w-24 tnum"
                />
                <button
                  disabled={pending || (cap < 1 && !bet.myStake)}
                  className="btn-primary"
                >
                  {pending ? "…" : bet.myStake ? "Cambiar" : "Apostar"}
                </button>
                <span className="text-xs text-subtle">
                  Hasta <span className="text-ink tnum">{cap}</span> pts
                  {bet.available > MAX_WAGER && ` (máx. ${MAX_WAGER} por apuesta)`}
                </span>
              </form>
            );
          })()}

          {bet.closesAt && (
            <p className="mt-1.5 text-xs text-amber-700">
              Se cierra el {closeLabel(bet.closesAt)}
            </p>
          )}

          {bet.myStake != null && (
            <form action={removeWager} className="mt-1">
              <input type="hidden" name="bet_id" value={bet.id} />
              <button className="text-xs text-red-500 hover:underline">
                Retirar apuesta ({bet.myStake} pts)
              </button>
            </form>
          )}

          {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
          {"saved" in state && <p className="mt-2 text-sm text-green-700">Apuesta registrada</p>}
          {bet.available < 1 && !bet.myStake && (
            <p className="mt-2 text-xs text-subtle">
              Aún no tienes puntos disponibles para apostar.
            </p>
          )}
        </div>
      )}

      {bet.bettors.length > 0 && (
        <div className="mt-2 border-t border-hair pt-2">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-subtle">
            Han apostado ({bet.bettors.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {bet.bettors.map((b, i) => (
              <span
                key={i}
                className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[11px] text-ink"
              >
                {b.name} <span className="text-subtle tnum">{b.stake}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ bet }: { bet: BetItem }) {
  if (bet.status === "resolved") {
    return (
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
          bet.outcome ? "bg-green-100 text-green-700" : "bg-ink/[0.06] text-subtle"
        }`}
      >
        {bet.outcome ? "Salió SÍ" : "Salió NO"}
      </span>
    );
  }
  if (bet.status === "closed") {
    return (
      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-700">
        Cerrada
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[11px] text-green-700">
      Abierta
    </span>
  );
}

function Resolved({ bet }: { bet: BetItem }) {
  if (bet.myStake == null) {
    return <p className="text-xs text-subtle">No apostaste en esta.</p>;
  }
  const won = bet.outcome === true;
  return (
    <p className="text-sm">
      Jugaste <span className="font-medium tnum">{bet.myStake}</span> pts ·{" "}
      <span className={won ? "font-semibold text-green-600" : "font-semibold text-red-600"}>
        {won ? `+${bet.myStake}` : `-${bet.myStake}`} pts
      </span>
    </p>
  );
}
