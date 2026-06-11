"use client";

import { useActionState } from "react";
import { adminLogin } from "@/lib/actions";

export default function AdminLoginForm() {
  const [state, action, pending] = useActionState(adminLogin, {});
  return (
    <div className="mx-auto max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="mb-1 text-xl font-bold">Panel de administración</h1>
      <p className="mb-5 text-sm text-slate-500">
        Introduce la contraseña de admin (la del archivo <code>.env.local</code>).
      </p>
      <form action={action} className="space-y-3">
        <input
          type="password"
          name="password"
          placeholder="Contraseña"
          className="w-full rounded border border-slate-300 px-3 py-2"
          required
        />
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button disabled={pending} className="btn-primary w-full">
          {pending ? "..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
