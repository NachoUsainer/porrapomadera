"use client";

import { useActionState } from "react";
import { adminLogin } from "@/lib/actions";

export default function AdminLoginForm() {
  const [state, action, pending] = useActionState(adminLogin, {});
  return (
    <div className="mx-auto max-w-sm">
      <div className="card p-7">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Administración</h1>
        <p className="mb-6 mt-1 text-[15px] text-subtle">
          Introduce la contraseña de admin (la de <code>.env.local</code>).
        </p>
        <form action={action} className="space-y-4">
          <input
            type="password"
            name="password"
            placeholder="Contraseña"
            className="input w-full"
            required
          />
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <button disabled={pending} className="btn-primary w-full py-2.5">
            {pending ? "…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
