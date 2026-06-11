"use client";

import { useActionState } from "react";

type Action = (
  prev: { error?: string },
  formData: FormData
) => Promise<{ error?: string }>;

export default function AuthForm({
  action,
  cta,
  mode,
}: {
  action: Action;
  cta: string;
  mode: "register" | "login";
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700">Tu nombre</label>
        <input
          name="name"
          autoComplete="off"
          placeholder="Ej: Javi"
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">
          PIN de 4 dígitos
        </label>
        <input
          name="pin"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          placeholder="••••"
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 tracking-[0.5em]"
          required
        />
        <p className="mt-1 text-xs text-slate-500">
          {mode === "register"
            ? "Elige un PIN. Lo necesitarás para volver a entrar y que nadie toque tus predicciones."
            : "El PIN que pusiste al registrarte."}
        </p>
      </div>

      {state.error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <button
        disabled={pending}
        className="w-full rounded bg-pitch-700 px-4 py-2 font-semibold text-white hover:bg-pitch-900 disabled:opacity-50"
      >
        {pending ? "..." : cta}
      </button>
    </form>
  );
}
