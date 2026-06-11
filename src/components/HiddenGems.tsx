"use client";

import { useEffect, useState } from "react";

export default function HiddenGems({
  gems,
  personal,
}: {
  gems: string[];
  personal: string[];
}) {
  const [i, setI] = useState(0);
  const [p, setP] = useState(0);

  useEffect(() => {
    if (gems.length <= 1) return;
    const id = setInterval(() => setI((x) => (x + 1) % gems.length), 6000);
    return () => clearInterval(id);
  }, [gems.length]);

  useEffect(() => {
    if (personal.length <= 1) return;
    const id = setInterval(() => setP((x) => (x + 1) % personal.length), 7000);
    return () => clearInterval(id);
  }, [personal.length]);

  return (
    <div className="space-y-2">
      {personal.length > 0 && (
        <p className="mx-auto max-w-md rounded-md bg-amber-100 px-3 py-2 text-center text-sm font-semibold text-amber-900">
          ✨ {personal[p]}
        </p>
      )}
      {gems.length > 0 && (
        <p key={i} className="text-center text-xs text-slate-400 animate-[fadein_0.6s_ease]">
          💎 {gems[i]}
        </p>
      )}
    </div>
  );
}
