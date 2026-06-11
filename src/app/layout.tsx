import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getCurrentPlayer, isAdmin } from "@/lib/session";
import { logout } from "@/lib/actions";
import HiddenGems from "@/components/HiddenGems";
import { allGemTexts, gemsForName } from "@/lib/hiddenGems";

export const metadata: Metadata = {
  title: "Porra pomadera",
  description: "Porra pomadera by JARS Crisol · Mundial 2026",
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
        <header className="sticky top-0 z-50 border-b border-hair bg-white/70 backdrop-blur-xl backdrop-saturate-150">
          <nav className="mx-auto flex max-w-3xl items-center gap-5 px-5 py-3 text-[13px] font-medium text-subtle">
            <Link href="/" className="flex items-baseline gap-1.5 text-ink">
              <span className="font-semibold tracking-tight">Porra pomadera</span>
            </Link>
            <Link href="/" className="transition hover:text-ink">
              Ranking
            </Link>
            <Link href="/partidos" className="transition hover:text-ink">
              Partidos
            </Link>
            {player && (
              <Link href="/predictions" className="transition hover:text-ink">
                Predicciones
              </Link>
            )}
            <Link href="/admin" className="transition hover:text-ink">
              Admin
            </Link>
            <div className="ml-auto flex items-center gap-3">
              {player ? (
                <>
                  <span className="hidden text-ink sm:inline">{player.name}</span>
                  <form action={logout}>
                    <button className="btn-ghost">Salir</button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login" className="transition hover:text-ink">
                    Entrar
                  </Link>
                  <Link href="/register" className="btn-primary">
                    Unirme
                  </Link>
                </>
              )}
              {admin && <span className="text-[11px] text-accent">admin</span>}
            </div>
          </nav>
        </header>

        <main className="mx-auto max-w-3xl px-5 py-10">{children}</main>

        <footer className="mx-auto max-w-3xl space-y-3 px-5 pb-12 pt-4">
          <HiddenGems
            gems={allGemTexts()}
            personal={gemsForName(player?.name).map((g) => g.text)}
          />
          <p className="text-center text-[11px] tracking-wide text-subtle">
            Porra pomadera · by JARS Crisol · Mundial 2026
          </p>
        </footer>
      </body>
    </html>
  );
}
