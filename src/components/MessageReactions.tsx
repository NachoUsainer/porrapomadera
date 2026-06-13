"use client";

import { useState, useTransition } from "react";
import { reactToMessage } from "@/lib/actions";
import { REACTIONS } from "@/lib/reactions";

const labelOf = (key: string) => REACTIONS.find((r) => r.key === key)?.label ?? "";

export default function MessageReactions({
  messageId,
  counts,
  mine,
}: {
  messageId: string;
  counts: Record<string, number>;
  mine: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [, start] = useTransition();

  const send = (key: string) => start(() => reactToMessage(messageId, key));

  // Detecta sobre qué reacción está el dedo/ratón.
  const keyAt = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    return (el?.closest("[data-rkey]") as HTMLElement | null)?.dataset.rkey ?? null;
  };

  const onDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    setOpen(true);
    setHover(null);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!open) return;
    setHover(keyAt(e.clientX, e.clientY));
  };
  const onUp = (e: React.PointerEvent) => {
    if (!open) return;
    const k = keyAt(e.clientX, e.clientY);
    if (k) {
      send(k);
      setOpen(false);
      setHover(null);
    }
    // Si sueltas sin estar sobre una reacción, el desplegable queda abierto
    // (puedes elegir con un toque normal).
  };

  const active = REACTIONS.filter((r) => (counts[r.key] ?? 0) > 0);

  return (
    <div className="mt-2 pl-9">
      {/* Resumen de reacciones puestas */}
      {active.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {active.map((r) => (
            <span
              key={r.key}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                mine === r.key ? "bg-accent text-white" : "bg-black/[0.05] text-subtle"
              }`}
            >
              {r.label} <span className="tnum">{counts[r.key]}</span>
            </span>
          ))}
        </div>
      )}

      <div className="relative inline-block">
        {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}

        {open && (
          <div className="absolute bottom-full left-0 z-50 mb-2 w-60 overflow-hidden rounded-2xl bg-white p-1 shadow-float ring-1 ring-hair">
            {REACTIONS.map((r) => {
              const hot = hover === r.key;
              return (
                <button
                  key={r.key}
                  type="button"
                  data-rkey={r.key}
                  onClick={() => {
                    send(r.key);
                    setOpen(false);
                  }}
                  className={`block w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                    hot
                      ? "scale-[1.02] bg-accent font-medium text-white"
                      : mine === r.key
                        ? "text-accent"
                        : "text-ink hover:bg-black/[0.05]"
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={() => {
            setOpen(false);
            setHover(null);
          }}
          className="touch-none select-none rounded-full bg-black/[0.05] px-3 py-1 text-[11px] font-medium text-subtle transition hover:bg-black/[0.09] hover:text-ink"
        >
          {mine ? `Tu reacción: ${labelOf(mine)}` : "Reaccionar"}
        </button>
      </div>
    </div>
  );
}
