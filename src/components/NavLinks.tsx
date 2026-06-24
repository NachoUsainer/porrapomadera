"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLinks({ showPredictions }: { showPredictions: boolean }) {
  const path = usePathname();
  const items = [
    { href: "/ranking", label: "Ranking" },
    { href: "/partidos", label: "Partidos" },
    { href: "/cuadro", label: "Cuadro" },
    ...(showPredictions ? [{ href: "/predictions", label: "Predicciones" }] : []),
    { href: "/admin", label: "Admin" },
  ];
  return (
    <div className="flex items-center gap-0.5">
      {items.map((it) => {
        const active = path === it.href;
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-3 py-1.5 transition ${
              active ? "bg-black/[0.06] text-ink" : "text-subtle hover:text-ink"
            }`}
          >
            {it.label}
          </Link>
        );
      })}
    </div>
  );
}
