import { supabase, type Match, type Team } from "@/lib/supabase";
import { isAdmin } from "@/lib/session";
import AdminLoginForm from "@/components/AdminLoginForm";
import AdminPanel from "@/components/AdminPanel";

export const dynamic = "force-dynamic";

const STAGE_ORDER = ["group", "r32", "r16", "qf", "sf", "third", "final"];

export default async function AdminPage() {
  if (!(await isAdmin())) {
    return <AdminLoginForm />;
  }

  const [{ data: teams }, { data: matches }, { data: players }, { data: preds }] =
    await Promise.all([
      supabase.from("teams").select("*").order("name"),
      supabase.from("matches").select("*"),
      supabase.from("players").select("id, name, created_at").order("created_at"),
      supabase.from("predictions").select("player_id"),
    ]);

  const predCount = new Map<string, number>();
  for (const p of preds ?? []) {
    predCount.set(p.player_id, (predCount.get(p.player_id) ?? 0) + 1);
  }
  const playerRows = (players ?? []).map((p) => ({
    id: p.id as string,
    name: p.name as string,
    createdAt: p.created_at as string,
    predictions: predCount.get(p.id) ?? 0,
  }));

  const sortedMatches = ((matches ?? []) as Match[]).sort((a, b) => {
    const so = STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage);
    if (so !== 0) return so;
    const ka = a.kickoff ? new Date(a.kickoff).getTime() : Infinity;
    const kb = b.kickoff ? new Date(b.kickoff).getTime() : Infinity;
    return ka - kb || a.id - b.id;
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold">Administración</h1>
      <AdminPanel
        teams={(teams ?? []) as Team[]}
        matches={sortedMatches}
        players={playerRows}
      />
    </div>
  );
}
