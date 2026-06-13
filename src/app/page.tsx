import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCurrentPlayer, isAdmin } from "@/lib/session";
import { deleteMessage } from "@/lib/actions";
import { allGemTexts } from "@/lib/hiddenGems";
import MessageComposer from "@/components/MessageComposer";

export const dynamic = "force-dynamic";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function renderText(text: string, meFirst: string) {
  const parts = text.split(/(@[\p{L}\d_]+)/u);
  return parts.map((part, i) => {
    if (part.startsWith("@")) {
      const isMe = norm(part.slice(1)) === meFirst;
      return (
        <span
          key={i}
          className={
            isMe
              ? "rounded bg-accent/15 px-1 font-semibold text-accent"
              : "font-medium text-accent"
          }
        >
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function when(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  });
}

export default async function MuroPage() {
  const player = await getCurrentPlayer();
  if (!player) redirect("/ranking");
  const admin = await isAdmin();
  const meFirst = norm(player.name).split(" ")[0];

  const [{ data: messages }, { data: players }] = await Promise.all([
    supabase
      .from("messages")
      .select("id, text, created_at, player_id")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("players").select("id, name"),
  ]);
  const nameById = new Map((players ?? []).map((p) => [p.id, p.name as string]));
  const msgs = (messages ?? []) as {
    id: string;
    text: string;
    created_at: string;
    player_id: string;
  }[];

  // Intercalar hidden gems entre los mensajes (con color "pomada").
  const gemPool = [...allGemTexts()];
  for (let k = gemPool.length - 1; k > 0; k--) {
    const j = Math.floor(Math.random() * (k + 1));
    [gemPool[k], gemPool[j]] = [gemPool[j], gemPool[k]];
  }
  let gp = 0;
  const takeGem = () => gemPool[gp++ % gemPool.length];

  type Feed =
    | { kind: "msg"; m: (typeof msgs)[number] }
    | { kind: "gem"; text: string; id: string };
  const feed: Feed[] = [];
  if (msgs.length === 0) {
    for (let k = 0; k < 3; k++) feed.push({ kind: "gem", text: takeGem(), id: "g" + k });
  } else {
    msgs.forEach((m, idx) => {
      feed.push({ kind: "msg", m });
      if ((idx + 1) % 3 === 0) feed.push({ kind: "gem", text: takeGem(), id: "g" + idx });
    });
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Muro</h1>
        <p className="mx-auto mt-1 max-w-md text-[15px] text-subtle">
          Chincha a quien quieras. Usa <span className="text-accent">@</span> para mencionar y
          que le llegue el aviso.
        </p>
      </div>

      <MessageComposer players={(players ?? []) as { id: string; name: string }[]} meId={player.id} />

      <div className="space-y-2.5">
        {feed.map((item) => {
          if (item.kind === "gem") {
            return (
              <div
                key={item.id}
                className="rounded-2xl bg-amber-50 p-4 shadow-card ring-1 ring-amber-200"
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-white">
                    P
                  </span>
                  <span className="text-sm font-semibold text-amber-800">Pomada</span>
                </div>
                <p className="pl-9 text-sm italic text-amber-900">{item.text}</p>
              </div>
            );
          }
          const m = item.m;
          const author = nameById.get(m.player_id) ?? "—";
          const mine = m.player_id === player.id;
          const canDelete = mine || admin;
          return (
            <div key={m.id} className="card p-4">
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">
                    {author.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="text-sm font-semibold text-ink">{author}</span>
                  {mine && <span className="text-[11px] text-accent">tú</span>}
                </div>
                <span className="text-[11px] text-subtle">{when(m.created_at)}</span>
              </div>
              <p className="whitespace-pre-wrap break-words pl-9 text-sm text-ink">
                {renderText(m.text, meFirst)}
              </p>
              {canDelete && (
                <form action={deleteMessage} className="mt-1 pl-9">
                  <input type="hidden" name="message_id" value={m.id} />
                  <button className="text-[11px] text-red-500 hover:underline">Borrar</button>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
