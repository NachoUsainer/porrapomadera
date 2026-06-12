import { supabase, type Match, type Team } from "@/lib/supabase";
import { isAdmin } from "@/lib/session";
import { getStandings } from "@/lib/standings";
import { adminRegenNotifications } from "@/lib/actions";
import { flagFor } from "@/lib/flags";
import AdminLoginForm from "@/components/AdminLoginForm";
import AdminPanel from "@/components/AdminPanel";
import AdminSpecials from "@/components/AdminSpecials";
import AdminBets, { type AdminBet, type MatchOption } from "@/components/AdminBets";

export const dynamic = "force-dynamic";

const STAGE_ORDER = ["group", "r32", "r16", "qf", "sf", "third", "final"];

export default async function AdminPage() {
  if (!(await isAdmin())) {
    return <AdminLoginForm />;
  }

  const [
    { data: teams },
    { data: matches },
    { data: players },
    { data: preds },
    { data: groupResults },
    { data: settings },
  ] = await Promise.all([
    supabase.from("teams").select("*").order("name"),
    supabase.from("matches").select("*"),
    supabase.from("players").select("id, name, created_at").order("created_at"),
    supabase.from("predictions").select("player_id"),
    supabase.from("group_results").select("group_name, winner_team_id"),
    supabase.from("settings").select("key, value").eq("key", "top_scorer").maybeSingle(),
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

  // Apuestas + estadísticas (nº de apuestas y puntos en juego por apuesta)
  const standings = await getStandings();
  const statByBet = new Map<string, { count: number; staked: number }>();
  for (const w of standings.wagers) {
    const s = statByBet.get(w.bet_id) ?? { count: 0, staked: 0 };
    s.count += 1;
    s.staked += w.stake;
    statByBet.set(w.bet_id, s);
  }
  const now = Date.now();
  const adminBets: AdminBet[] = [...standings.bets]
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .map((b) => ({
      id: b.id,
      question: b.question,
      is_open: b.is_open,
      outcome: b.outcome,
      closesAt: b.closes_at,
      autoClosed: b.closes_at != null && new Date(b.closes_at).getTime() <= now,
      wagerCount: statByBet.get(b.id)?.count ?? 0,
      totalStaked: statByBet.get(b.id)?.staked ?? 0,
    }));

  // Partidos elegibles para cierre automático (con equipos y aún sin empezar)
  const teamName = (id: number | null) =>
    id ? (teams ?? []).find((t) => t.id === id)?.name ?? "?" : "?";
  const matchOptions: MatchOption[] = sortedMatches
    .filter((m) => !m.finished && m.kickoff && m.home_team_id && m.away_team_id)
    .map((m) => {
      const h = teamName(m.home_team_id);
      const a = teamName(m.away_team_id);
      const when = new Date(m.kickoff as string).toLocaleString("es-ES", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Madrid",
      });
      return { id: m.id, label: `${flagFor(h)} ${h} – ${flagFor(a)} ${a} · ${when}` };
    });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Administración</h1>
        <form action={adminRegenNotifications}>
          <button className="btn-ghost text-xs">Regenerar notificaciones</button>
        </form>
      </div>
      <div className="mb-10">
        <AdminBets bets={adminBets} matchOptions={matchOptions} />
      </div>
      <div className="mb-10">
        <AdminSpecials
          teams={(teams ?? []) as Team[]}
          groupResults={groupResults ?? []}
          topScorer={settings?.value ?? ""}
        />
      </div>
      <AdminPanel
        teams={(teams ?? []) as Team[]}
        matches={sortedMatches}
        players={playerRows}
      />
    </div>
  );
}
