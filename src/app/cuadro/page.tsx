import { supabase } from "@/lib/supabase";
import { getCurrentPlayer } from "@/lib/session";
import { slotFromLabel, bracketBoxes } from "@/lib/bracket";
import BracketView, { type SlotData } from "@/components/BracketView";

export const dynamic = "force-dynamic";

const KO = ["r32", "r16", "qf", "sf", "third", "final"];

function pretty(ph: string): string {
  const t = ph.trim();
  const m = t.match(/^([123])([A-L])$/);
  if (m) return `${m[1]}º${m[2]}`;
  return t
    .replace(/^3\(/, "3º (")
    .replace(/^G\.1\/16-/, "Gº16º ")
    .replace(/^G\.Oct-/, "Gº Oct ")
    .replace(/^G\.Cuartos-/, "Gº Cto ")
    .replace(/^G\.Semi-/, "Gº SF ")
    .replace(/^P\.Semi-/, "Pº SF ");
}

function placeholders(label: string | null): [string, string] {
  const after = (label ?? "").split(":").slice(1).join(":");
  const parts = after.split(" vs ");
  return [pretty(parts[0] ?? "—"), pretty(parts[1] ?? "—")];
}

type KoMatch = {
  stage: string;
  label: string | null;
  home_team_id: number | null;
  away_team_id: number | null;
  home_score: number | null;
  away_score: number | null;
  advance_team_id: number | null;
  kickoff: string | null;
  finished: boolean;
};

function advancerOf(m: KoMatch): number | null {
  if (!m.finished) return null;
  if (m.advance_team_id) return m.advance_team_id;
  if (m.home_score != null && m.away_score != null && m.home_score !== m.away_score) {
    return m.home_score > m.away_score ? m.home_team_id : m.away_team_id;
  }
  return null;
}

export default async function CuadroPage() {
  const me = await getCurrentPlayer();

  const [{ data: matches }, { data: teams }, { data: players }, { data: allPicks }] =
    await Promise.all([
      supabase
        .from("matches")
        .select(
          "stage, label, home_team_id, away_team_id, home_score, away_score, advance_team_id, kickoff, finished"
        )
        .in("stage", KO),
      supabase.from("teams").select("id, name"),
      supabase.from("players").select("id, name"),
      supabase.from("bracket_picks").select("player_id, slot, team_id"),
    ]);

  const ko = (matches ?? []) as KoMatch[];
  const bySlot = new Map<string, KoMatch>();
  for (const m of ko) bySlot.set(`${m.stage}:${slotFromLabel(m.stage, m.label)}`, m);

  // Datos por cada caja del cuadro
  const slotData: Record<string, SlotData> = {};
  for (const b of bracketBoxes()) {
    const m = bySlot.get(b.key);
    const [phHome, phAway] = placeholders(m?.label ?? null);
    slotData[b.key] = {
      homeTeamId: m?.home_team_id ?? null,
      awayTeamId: m?.away_team_id ?? null,
      advancerId: m ? advancerOf(m) : null,
      finished: m?.finished ?? false,
      phHome,
      phAway,
    };
  }

  // Cierre: primer kickoff de eliminatorias
  const firstKoTime = ko
    .map((m) => (m.kickoff ? new Date(m.kickoff).getTime() : Infinity))
    .sort((a, b) => a - b)[0];
  const locked = firstKoTime != null && firstKoTime !== Infinity && firstKoTime <= Date.now();
  const firstKoLabel =
    firstKoTime != null && firstKoTime !== Infinity
      ? new Date(firstKoTime).toLocaleString("es-ES", {
          weekday: "long",
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Europe/Madrid",
        })
      : null;

  // Picks por jugador
  const picksByPlayer: Record<string, Record<string, number>> = {};
  for (const r of allPicks ?? []) {
    (picksByPlayer[r.player_id] ??= {})[r.slot] = r.team_id;
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Cuadro</h1>
        <p className="mt-1 text-sm text-subtle">
          Rellena quién pasa en cada cruce hasta el campeón. Se cierra al empezar las
          eliminatorias.
        </p>
      </header>

      <BracketView
        teams={(teams ?? []).map((t) => ({ id: t.id, name: t.name as string }))}
        players={(players ?? []).map((p) => ({ id: p.id, name: p.name as string }))}
        slotData={slotData}
        myId={me?.id ?? null}
        picksByPlayer={picksByPlayer}
        locked={locked}
        firstKoLabel={firstKoLabel}
      />
    </div>
  );
}
