"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { postMessage } from "@/lib/actions";

type P = { id: string; name: string };

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export default function MessageComposer({
  players,
  meId,
}: {
  players: P[];
  meId: string;
}) {
  const [state, action, pending] = useActionState(postMessage, {});
  const [value, setValue] = useState("");
  const [picked, setPicked] = useState<P[]>([]);
  const [query, setQuery] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);

  // Limpiar al publicar con éxito
  useEffect(() => {
    if ("saved" in state) {
      setValue("");
      setPicked([]);
      setQuery(null);
    }
  }, [state]);

  // Menciones que siguen presentes en el texto
  const mentionIds = [
    ...new Set(
      picked
        .filter((p) => norm(value).includes(norm("@" + p.name)))
        .map((p) => p.id)
    ),
  ].join(",");

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setValue(v);
    const caret = e.target.selectionStart ?? v.length;
    const before = v.slice(0, caret);
    const m = before.match(/@([\p{L}\d_]*)$/u);
    setQuery(m ? m[1] : null);
  };

  const suggestions =
    query == null
      ? []
      : players
          .filter((p) => p.id !== meId && norm(p.name).startsWith(norm(query)))
          .slice(0, 6);

  const choose = (p: P) => {
    const el = ref.current;
    const caret = el?.selectionStart ?? value.length;
    const before = value.slice(0, caret).replace(/@([\p{L}\d_]*)$/u, "@" + p.name + " ");
    const next = before + value.slice(caret);
    setValue(next);
    setPicked((prev) => (prev.some((x) => x.id === p.id) ? prev : [...prev, p]));
    setQuery(null);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(before.length, before.length);
    });
  };

  return (
    <form action={action} className="card p-4">
      <input type="hidden" name="mentions" value={mentionIds} />
      <div className="relative">
        <textarea
          ref={ref}
          name="text"
          value={value}
          onChange={onChange}
          maxLength={500}
          rows={3}
          placeholder="Escribe un mensaje… usa @ para picar a alguien"
          className="w-full resize-none rounded-xl bg-black/[0.04] px-3 py-2 text-sm outline-none ring-1 ring-transparent transition focus:bg-white focus:ring-2 focus:ring-accent/60"
        />
        {suggestions.length > 0 && (
          <ul className="absolute left-2 top-full z-20 mt-1 w-56 overflow-hidden rounded-xl bg-white shadow-float ring-1 ring-hair">
            {suggestions.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => choose(p)}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-accent/[0.08]"
                >
                  @{p.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-[11px] text-subtle">{value.length}/500</span>
        <div className="flex items-center gap-3">
          {state.error && <span className="text-sm text-red-600">{state.error}</span>}
          <button disabled={pending || value.trim().length === 0} className="btn-primary">
            {pending ? "…" : "Publicar"}
          </button>
        </div>
      </div>
    </form>
  );
}
