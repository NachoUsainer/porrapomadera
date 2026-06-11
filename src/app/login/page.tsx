import Link from "next/link";
import AuthForm from "@/components/AuthForm";
import { loginPlayer } from "@/lib/actions";
import { getCurrentPlayer } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  if (await getCurrentPlayer()) redirect("/predictions");
  return (
    <div className="mx-auto max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="mb-1 text-xl font-bold">Entrar</h1>
      <p className="mb-5 text-sm text-slate-500">Con tu nombre y tu PIN.</p>
      <AuthForm action={loginPlayer} cta="Entrar" mode="login" />
      <p className="mt-4 text-center text-sm text-slate-500">
        ¿Aún no juegas?{" "}
        <Link href="/register" className="font-medium text-pitch-700 hover:underline">
          Crear usuario
        </Link>
      </p>
    </div>
  );
}
