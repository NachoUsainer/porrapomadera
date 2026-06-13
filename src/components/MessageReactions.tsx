"use client";

import { useTransition } from "react";
import { reactToMessage } from "@/lib/actions";
import { REACTIONS } from "@/lib/reactions";

export default function MessageReactions({
  messageId,
  counts,
  mine,
}: {
  messageId: string;
  counts: Record<string, number>;
  mine: string | null;
}) {
  const [pending, start] = useTransition();
  return (
    <div className="mt-2 flex flex-wrap gap-1.5 pl-9">
      {REACTIONS.map((r) => {
        const n = counts[r.key] ?? 0;
        const active = mine === r.key;
        return (
          <button
            key={r.key}
            type="button"
            disabled={pending}
            onClick={() => start(() => reactToMessage(messageId, r.key))}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition disabled:opacity-60 ${
              active
                ? "bg-accent text-white"
                : "bg-black/[0.05] text-subtle hover:bg-black/[0.09] hover:text-ink"
            }`}
          >
            {r.label}
            {n > 0 && <span className="ml-1 tnum">{n}</span>}
          </button>
        );
      })}
    </div>
  );
}
