import { supabase } from "@/lib/supabase";
import { buildBracketSvg, slotFromLabel, type Cell } from "@/lib/bracket";
import { withFlag } from "@/lib/flags";
import BracketView from "@/components/BracketView";

export const dynamic = "force-dynamic";

const KO = ["r32", "r16", "qf", "sf", "third", "final"];

// Embellece los placeholders de los cruces ("2A" -> "2ºA", "G.1/16-3" -> "Gº 16º 3").
function pretty(ph: string): string {
  const t = ph.trim();
  const m = t.match(/^([123])([A-L])$/);
  if (m) return `${m[1]}º${m[2]}`;
  return t
    .replace(/^3\(/, "3º (")
    .replace(/^G\.1\/16-/, "Gº 16º ")
    .replace(/^G\.Oct-/, "Gº Oct ")
    .replace(/^G\.Cuartos-/, "Gº Cto ")
    .replace(/^G\.Semi-/, "Gº SF ")
    .replace(/^P\.Semi-/, "Pº SF ");
}

// De la etiqueta "Octavos #1: A vs B" saca ["A", "B"].
function placeholders(label: string | null): [string, string] {
  const after = (label ?? "").split(":").slice(1).join(":");
  const parts = after.split(" vs ");
  return [pretty(parts[0] ?? ""), pretty(parts[1] ?? "")];
}

type KoMatch = {
  id: number;
  stage: string;
  label: string | null;
  home_team_id: number | null;
  away_team_id: number | null;
  home_score: number | null;
  away_score: number | null;
  advance_team_id: number | null;
  finished: boolean;
};

export default async function CuadroPage() {
  const [{ data: matches }, { data: teams }] = await Promise.all([
    supabase
      .from("matches")
      .select(
        "id, stage, label, home_team_id, away_team_id, home_score, away_score, advance_team_id, finished"
      )
      .in("stage", KO),
    supabase.from("teams").select("id, name"),
  ]);

  const teamById = new Map((teams ?? []).map((t) => [t.id, t.name as string]));
  const bySlot = new Map<string, KoMatch>();
  for (const m of (matches ?? []) as KoMatch[]) {
    bySlot.set(`${m.stage}:${slotFromLabel(m.stage, m.label)}`, m);
  }

  const winnerOf = (m: KoMatch): number | null => {
    if (!m.finished) return null;
    if (m.advance_team_id) return m.advance_team_id;
    if (m.home_score != null && m.away_score != null && m.home_score !== m.away_score) {
      return m.home_score > m.away_score ? m.home_team_id : m.away_team_id;
    }
    return null;
  };

  const box = (stage: string, slot: number) => {
    const m = bySlot.get(`${stage}:${slot}`);
    if (!m) {
      return { home: { label: "—", win: false }, away: { label: "—", win: false } };
    }
    const [ph, pa] = placeholders(m.label);
    const win = winnerOf(m);
    const cell = (teamId: number | null, placeholder: string): Cell => ({
      label: teamId ? withFlag(teamById.get(teamId) ?? "?") : placeholder,
      win: win != null && teamId != null && win === teamId,
    });
    return { home: cell(m.home_team_id, ph), away: cell(m.away_team_id, pa) };
  };

  const svg = buildBracketSvg(box);
  const hasTeams = (matches ?? []).some((m) => m.home_team_id || m.away_team_id);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Cuadro</h1>
        <p className="mt-1 text-sm text-subtle">
          Las llaves del Mundial: 16avos a los lados, la final en el centro.
        </p>
      </header>

      <BracketView realSvg={svg} hasTeams={hasTeams} />
    </div>
  );
}
