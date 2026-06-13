import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getCurrentPlayer, isAdmin } from "@/lib/session";
import { logout } from "@/lib/actions";
import HiddenGems from "@/components/HiddenGems";
import { allGemTexts, gemsForName } from "@/lib/hiddenGems";
import NotificationBell from "@/components/NotificationBell";
import NavLinks from "@/components/NavLinks";
import { getNotifications } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";

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
  const notif = player ? await getNotifications(player.id) : null;

  // Mensajes recientes del muro para el toast flotante (solo si estás registrado).
  let toastMessages: { author: string; text: string }[] = [];
  if (player) {
    const [{ data: msgs }, { data: pls }] = await Promise.all([
      supabase
        .from("messages")
        .select("text, player_id")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("players").select("id, name"),
    ]);
    const byId = new Map((pls ?? []).map((p) => [p.id, p.name as string]));
    toastMessages = (msgs ?? []).map((m) => ({
      author: byId.get(m.player_id) ?? "—",
      text: m.text as string,
    }));
  }

  return (
    <html lang="es">
      <body>
        <header className="sticky top-0 z-50 border-b border-hair bg-white/70 backdrop-blur-xl backdrop-saturate-150">
          <nav className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-3 text-[13px] font-medium text-subtle">
            <Link href="/" className="mr-1 flex items-baseline gap-1.5 text-ink">
              <span className="font-semibold tracking-tight">Porra pomadera</span>
            </Link>
            <NavLinks showPredictions={!!player} />
            <div className="ml-auto flex items-center gap-3">
              {player ? (
                <>
                  {notif && (
                    <NotificationBell items={notif.items} unseen={notif.unseen} />
                  )}
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
            messages={toastMessages}
          />
          <p className="text-center text-[11px] tracking-wide text-subtle">
            Porra pomadera · by JARS Crisol · Mundial 2026
          </p>
        </footer>
      </body>
    </html>
  );
}
