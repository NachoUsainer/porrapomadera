import Link from "next/link";
import AuthForm from "@/components/AuthForm";
import { loginPlayer } from "@/lib/actions";
import { getCurrentPlayer } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  if (await getCurrentPlayer()) redirect("/predictions");
  return (
    <div className="mx-auto max-w-sm">
      <div className="card p-7">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Entrar</h1>
        <p className="mb-6 mt-1 text-[15px] text-subtle">Con tu nombre y tu PIN.</p>
        <AuthForm action={loginPlayer} cta="Entrar" mode="login" />
      </div>
      <p className="mt-5 text-center text-sm text-subtle">
        ¿Aún no juegas?{" "}
        <Link href="/register" className="font-medium text-accent hover:underline">
          Crear usuario
        </Link>
      </p>
    </div>
  );
}
