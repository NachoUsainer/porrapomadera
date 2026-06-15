"use client";

import { useState } from "react";
import { flagFor } from "@/lib/flags";

export type PastRow = {
  name: string;
  mine: boolean;
  home: number;
  away: number;
  advanceName: string | null;
  points: number | null;
};

export type PastMatch = {
  id: number;
  when: string;
  homeName: string | null;
  awayName: string | null;
  finished: boolean;
  homeScore: number | null;
  awayScore: number | null;
  isKnockout: boolean;
  rows: PastRow[];
};

export default function PastMatches({ matches }: { matches: PastMatch[] }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-2xl bg-black/[0.04] px-4 py-3 text-sm font-medium text-ink transition hover:bg-black/[0.07]"
      >
        <span>Partidos jugados ({matches.length})</span>
        <span className="text-lg leading-none text-subtle">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="mt-2.5 space-y-2">
          {matches.map((m) => (
            <div key={m.id} className="card overflow-hidden">
              <button
                type="button"
                onClick={() => setExpanded((e) => (e === m.id ? null : m.id))}
                className="block w-full p-3 text-left transition hover:bg-black/[0.015]"
              >
                <div className="mb-1 flex items-center justify-between text-[11px] text-subtle">
                  <span>{m.when}</span>
                  <span>{m.rows.length} pron.</span>
                </div>
                <div className="flex items-center justify-center gap-3 text-sm font-medium text-ink">
                  <span className="flex flex-1 items-center justify-end gap-2">
                    <span className="truncate">{m.homeName ?? "?"}</span>
                    <span className="text-lg leading-none">{flagFor(m.homeName)}</span>
                  </span>
                  {m.finished ? (
                    <span className="rounded-lg bg-ink px-2 py-0.5 text-xs font-semibold text-white tnum">
                      {m.homeScore} : {m.awayScore}
                    </span>
                  ) : (
                    <span className="text-subtle">vs</span>
                  )}
                  <span className="flex flex-1 items-center gap-2">
                    <span className="text-lg leading-none">{flagFor(m.awayName)}</span>
                    <span className="truncate">{m.awayName ?? "?"}</span>
                  </span>
                </div>
              </button>

              {expanded === m.id && (
                <div className="border-t border-hair px-4 py-3">
                  {m.rows.length === 0 ? (
                    <p className="text-center text-xs text-subtle">Nadie predijo este partido.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <tbody>
                        {m.rows.map((r, i) => (
                          <tr
                            key={i}
                            className={`border-t border-hair first:border-0 ${
                              r.mine ? "bg-accent/[0.05]" : ""
                            }`}
                          >
                            <td className="py-1.5 text-ink">
                              {r.name}
                              {r.mine && <span className="ml-1 text-xs text-accent">tú</span>}
                            </td>
                            <td className="py-1.5 text-center text-ink tnum">
                              {r.home} : {r.away}
                            </td>
                            {m.isKnockout && (
                              <td className="py-1.5 text-center text-xs text-subtle">
                                {r.advanceName
                                  ? `pasa: ${flagFor(r.advanceName)} ${r.advanceName}`
                                  : ""}
                              </td>
                            )}
                            {m.finished && (
                              <td className="py-1.5 text-right">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                    (r.points ?? 0) > 0
                                      ? "bg-green-100 text-green-700"
                                      : "bg-black/[0.05] text-subtle"
                                  }`}
                                >
                                  {r.points} pts
                                </span>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
