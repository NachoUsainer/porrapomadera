"use client";

import { useEffect, useRef, useState } from "react";

// "Hidden gems": un toast sutil que asoma por sorpresa en una esquina,
// en momentos aleatorios y con una frase al azar (las personales con más
// probabilidad). Ni en bucle fijo ni previsible.
export default function HiddenGems({
  gems,
  personal,
}: {
  gems: string[];
  personal: string[];
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (gems.length === 0 && personal.length === 0) return;
    let active = true;
    const push = (t: number) => timers.current.push(t);

    const pick = () => {
      // ~55% de probabilidad de sacar una frase personal, si tienes.
      const usePersonal = personal.length > 0 && Math.random() < 0.55;
      const pool = usePersonal ? personal : gems.length ? gems : personal;
      return pool[Math.floor(Math.random() * pool.length)];
    };
    const rand = (min: number, max: number) => min + Math.random() * (max - min);

    const schedule = (delay: number) => {
      push(
        window.setTimeout(() => {
          if (!active) return;
          setMsg(pick());
          setShow(true);
          push(
            window.setTimeout(() => {
              if (!active) return;
              setShow(false);
              schedule(rand(20000, 45000)); // siguiente aparición, aleatoria
            }, 6500)
          );
        }, delay)
      );
    };

    schedule(rand(7000, 14000)); // primera aparición
    return () => {
      active = false;
      timers.current.forEach((t) => clearTimeout(t));
      timers.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gems.join("|"), personal.join("|")]);

  return (
    <div className="pointer-events-none fixed bottom-5 left-4 z-40 max-w-[78vw] sm:left-5 sm:max-w-xs">
      <div
        className={`rounded-2xl bg-ink/90 px-4 py-2.5 text-sm font-medium text-white shadow-float backdrop-blur transition-all duration-700 ease-out ${
          show ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
        aria-hidden={!show}
      >
        {msg}
      </div>
    </div>
  );
}
