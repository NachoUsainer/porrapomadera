"use client";

import { useEffect, useRef, useState } from "react";

type Item = { type: "gem" | "msg"; text: string; author?: string };

// Toast sutil abajo-izquierda: rota hidden gems (oscuro) y mensajes del muro (azul),
// en momentos aleatorios.
export default function HiddenGems({
  gems,
  personal,
  messages,
}: {
  gems: string[];
  personal: string[];
  messages: { author: string; text: string }[];
}) {
  const [item, setItem] = useState<Item | null>(null);
  const [show, setShow] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (gems.length === 0 && personal.length === 0 && messages.length === 0) return;
    let active = true;
    const push = (t: number) => timers.current.push(t);
    const rand = (min: number, max: number) => min + Math.random() * (max - min);

    const pick = (): Item => {
      // ~45% un mensaje del muro (si hay), si no una gem.
      if (messages.length > 0 && Math.random() < 0.45) {
        const m = messages[Math.floor(Math.random() * messages.length)];
        return { type: "msg", author: m.author, text: m.text };
      }
      const usePersonal = personal.length > 0 && Math.random() < 0.55;
      const pool = usePersonal ? personal : gems.length ? gems : personal;
      return { type: "gem", text: pool[Math.floor(Math.random() * pool.length)] };
    };

    const schedule = (delay: number) => {
      push(
        window.setTimeout(() => {
          if (!active) return;
          setItem(pick());
          setShow(true);
          push(
            window.setTimeout(() => {
              if (!active) return;
              setShow(false);
              schedule(rand(20000, 45000));
            }, 6500)
          );
        }, delay)
      );
    };

    schedule(rand(7000, 14000));
    return () => {
      active = false;
      timers.current.forEach((t) => clearTimeout(t));
      timers.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gems.join("|"), personal.join("|"), messages.map((m) => m.author + m.text).join("|")]);

  return (
    <div className="pointer-events-none fixed bottom-5 left-4 z-40 max-w-[78vw] sm:left-5 sm:max-w-xs">
      <div
        className={`rounded-2xl px-4 py-2.5 text-sm font-medium text-white shadow-float backdrop-blur transition-all duration-700 ease-out ${
          show ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        } ${item?.type === "msg" ? "bg-accent" : "bg-ink/90"}`}
        aria-hidden={!show}
      >
        {item?.type === "msg" && <span className="font-semibold">{item.author}: </span>}
        {item?.text}
      </div>
    </div>
  );
}
