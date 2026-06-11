import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getCurrentPlayer, isAdmin } from "@/lib/session";
import { logout } from "@/lib/actions";
import HiddenGems from "@/components/HiddenGems";
import { allGemTexts, gemsForName } from "@/lib/hiddenGems";

export const metadata: Metadata = {
  title: "Porra del Mundial",
  description: "La porra del Mundial para el grupo de amigos",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const player = await getCurrentPlayer();
  const admin = await isAdmin();

  return (
    <html lang="es">
      <body>
        <header className="bg-pitch-900 text-white">
          <nav className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-3 text-sm">
            <Link href="/" className="font-extrabold tracking-tight text-base">
              ⚽ Porra Mundial
            </Link>
            <Link href="/" className="hover:underline">
              Ranking
            </Link>
            <Link href="/partidos" className="hover:underline">
              Partidos
            </Link>
            {player && (
              <Link href="/predictions" className="hover:underline">
                Mis predicciones
              </Link>
            )}
            <Link href="/admin" className="hover:underline opacity-80">
              Admin
            </Link>
            <div className="ml-auto flex items-center gap-3">
              {player ? (
                <>
                  <span className="opacity-80">Hola, {player.name}</span>
                  <form action={logout}>
                    <button className="rounded bg-white/15 px-2 py-1 hover:bg-white/25">
                      Salir
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login" className="hover:underline">
                    Entrar
                  </Link>
                  <Link
                    href="/register"
                    className="rounded bg-pitch-500 px-3 py-1 font-semibold hover:bg-pitch-700"
                  >
                    Unirme
                  </Link>
                </>
              )}
              {admin && <span className="text-xs text-amber-300">[admin]</span>}
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-4xl space-y-3 px-4 py-8">
          <HiddenGems
            gems={allGemTexts()}
            personal={gemsForName(player?.name).map((g) => g.text)}
          />
          <p className="text-center text-xs text-slate-400">
            Hecho para la porra del grupo · Mundial 2026
          </p>
        </footer>
      </body>
    </html>
  );
}
