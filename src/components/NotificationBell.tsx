"use client";

import { useState, useTransition } from "react";
import { markNotificationsSeen } from "@/lib/actions";

type Item = {
  id: string;
  text: string;
  positive: boolean;
  points: number;
  read: boolean;
  createdAt: string;
};

function when(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  });
}

export default function NotificationBell({
  items,
  unseen,
}: {
  items: Item[];
  unseen: number;
}) {
  const [open, setOpen] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [, start] = useTransition();
  const lit = unseen > 0 && !cleared;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unseen > 0 && !cleared) {
      setCleared(true);
      start(() => {
        markNotificationsSeen();
      });
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label="Notificaciones"
        className="relative flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-black/[0.06]"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={`h-[18px] w-[18px] transition-colors ${lit ? "text-accent" : "text-subtle"} ${
            lit ? "animate-[wiggle_1s_ease-in-out]" : ""
          }`}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {lit && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unseen}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl bg-white shadow-float ring-1 ring-hair">
            <div className="border-b border-hair px-4 py-2.5 text-sm font-semibold text-ink">
              Notificaciones
            </div>
            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-subtle">Sin novedades aún 🔕</p>
            ) : (
              <ul className="max-h-96 overflow-auto">
                {items.map((it) => {
                  const fresh = !it.read;
                  return (
                    <li
                      key={it.id}
                      className={`flex items-start gap-2 border-b border-hair px-4 py-2.5 text-sm last:border-0 ${
                        fresh ? "bg-accent/[0.06]" : ""
                      }`}
                    >
                      {fresh && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
                      )}
                      <div className={fresh ? "" : "pl-4"}>
                        <p className={`${fresh ? "font-medium text-ink" : "text-subtle"}`}>
                          {it.text}
                        </p>
                        <p className="mt-0.5 text-[11px] text-subtle">{when(it.createdAt)}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
