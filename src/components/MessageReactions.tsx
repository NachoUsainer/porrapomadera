"use client";

import { useState, useTransition } from "react";
import { reactToMessage } from "@/lib/actions";
import { REACTIONS } from "@/lib/reactions";

export default function MessageReactions({
  messageId,
  reactors,
  mine,
}: {
  messageId: string;
  reactors: Record<string, string[]>; // key -> nombres de quienes reaccionaron
  mine: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [list, setList] = useState<string | null>(null); // reacción cuya lista se muestra
  const [, start] = useTransition();

  const send = (key: string) => start(() => reactToMessage(messageId, key));

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
    if (open) setHover(keyAt(e.clientX, e.clientY));
  };
  const onUp = (e: React.PointerEvent) => {
    if (!open) return;
    const k = keyAt(e.clientX, e.clientY);
    if (k) {
      send(k);
      setOpen(false);
      setHover(null);
    }
  };

  const active = REACTIONS.filter((r) => (reactors[r.key]?.length ?? 0) > 0);
  const listLabel = REACTIONS.find((r) => r.key === list)?.label;

  return (
    <div className="mt-2 pl-9">
      {/* Reacciones puestas (clic para ver quién) */}
      {active.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {active.map((r) => {
            const n = reactors[r.key].length;
            return (
              <button
                key={r.key}
                type="button"
                onClick={() => setList((cur) => (cur === r.key ? null : r.key))}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                  mine === r.key
                    ? "bg-accent text-white"
                    : "bg-black/[0.05] text-subtle hover:bg-black/[0.09] hover:text-ink"
                }`}
              >
                {r.label} <span className="tnum">{n}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Lista de quién reaccionó */}
      {list && (
        <div className="mb-2 rounded-xl bg-black/[0.03] px-3 py-2 text-xs text-ink">
          <span className="font-medium">{listLabel}:</span>{" "}
          {reactors[list].join(", ")}
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
          Reaccionar
        </button>
      </div>
    </div>
  );
}
