import Link from "next/link";
import AuthForm from "@/components/AuthForm";
import { registerPlayer } from "@/lib/actions";
import { getCurrentPlayer } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function RegisterPage() {
  if (await getCurrentPlayer()) redirect("/predictions");
  return (
    <div className="mx-auto max-w-sm">
      <div className="card p-7">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Únete a la porra</h1>
        <p className="mb-6 mt-1 text-[15px] text-subtle">
          Solo tu nombre y un PIN. Sin emails ni líos.
        </p>
        <AuthForm action={registerPlayer} cta="Crear mi usuario" mode="register" />
      </div>
      <p className="mt-5 text-center text-sm text-subtle">
        ¿Ya tienes usuario?{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
