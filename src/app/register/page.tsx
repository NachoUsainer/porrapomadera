import Link from "next/link";
import AuthForm from "@/components/AuthForm";
import { registerPlayer } from "@/lib/actions";
import { getCurrentPlayer } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function RegisterPage() {
  if (await getCurrentPlayer()) redirect("/predictions");
  return (
    <div className="mx-auto max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="mb-1 text-xl font-bold">Únete a la porra</h1>
      <p className="mb-5 text-sm text-slate-500">
        Solo tu nombre y un PIN. Sin emails ni líos.
      </p>
      <AuthForm action={registerPlayer} cta="Crear mi usuario" mode="register" />
      <p className="mt-4 text-center text-sm text-slate-500">
        ¿Ya tienes usuario?{" "}
        <Link href="/login" className="font-medium text-pitch-700 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
