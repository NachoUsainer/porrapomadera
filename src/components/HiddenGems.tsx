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
    <div className="space-y-2.5">
      {personal.length > 0 && (
        <p
          key={`p${p}`}
          className="mx-auto max-w-md rounded-2xl bg-ink px-4 py-2.5 text-center text-sm font-medium text-white animate-[fadein_0.6s_ease]"
        >
          ✨ {personal[p]}
        </p>
      )}
      {gems.length > 0 && (
        <p key={i} className="text-center text-xs text-subtle animate-[fadein_0.6s_ease]">
          💎 {gems[i]}
        </p>
      )}
    </div>
  );
}
