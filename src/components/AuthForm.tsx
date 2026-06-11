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
    <form action={formAction} className="space-y-5">
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-subtle">
          Tu nombre
        </label>
        <input
          name="name"
          autoComplete="off"
          placeholder="Ej: Crisol"
          className="input w-full"
          required
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-subtle">
          PIN de 4 dígitos
        </label>
        <input
          name="pin"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          placeholder="••••"
          className="input w-full tracking-[0.5em]"
          required
        />
        <p className="mt-1.5 text-xs text-subtle">
          {mode === "register"
            ? "Elige un PIN para volver a entrar y que nadie toque tus predicciones."
            : "El PIN que pusiste al registrarte."}
        </p>
      </div>

      {state.error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}

      <button disabled={pending} className="btn-primary w-full py-2.5">
        {pending ? "…" : cta}
      </button>
    </form>
  );
}
