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

  const now = Date.now();

  // Datos por cada caja del cuadro
  const slotData: Record<string, SlotData> = {};
  for (const b of bracketBoxes()) {
    const m = bySlot.get(b.key);
    const [phHome, phAway] = placeholders(m?.label ?? null);
    const kickoff = m?.kickoff ? new Date(m.kickoff).getTime() : Infinity;
    slotData[b.key] = {
      homeTeamId: m?.home_team_id ?? null,
      awayTeamId: m?.away_team_id ?? null,
      advancerId: m ? advancerOf(m) : null,
      finished: m?.finished ?? false,
      started: kickoff <= now,
      phHome,
      phAway,
    };
  }

  // Cierre: primer kickoff de eliminatorias
  const firstKoTime = ko
    .map((m) => (m.kickoff ? new Date(m.kickoff).getTime() : Infinity))
    .sort((a, b) => a - b)[0];
  const firstKoStarted =
    firstKoTime != null && firstKoTime !== Infinity && firstKoTime <= now;
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
        firstKoStarted={firstKoStarted}
        firstKoLabel={firstKoLabel}
      />

      <details className="card p-5 text-[15px] text-subtle [&_summary]:cursor-pointer">
        <summary className="text-sm font-semibold uppercase tracking-wide text-ink">
          Cómo funciona el cuadro
        </summary>
        <div className="mt-3 space-y-2.5">
          <p>
            Rellenas tu cuadro entero prediciendo <span className="text-ink">quién pasa</span> en
            cada cruce, de los 16avos hasta el campeón. Empiezas por los 16avos y los octavos,
            cuartos, etc. se van rellenando con <span className="text-ink">tus propios
            ganadores</span>.
          </p>
          <p>
            Cada cruce se <span className="text-ink">cierra al empezar su partido</span>; puedes
            editarlo hasta entonces. Lo ideal es tenerlo completo antes de que arranquen las
            eliminatorias. Si no llegas a tiempo, aún puedes engancharte y rellenar los cruces que{" "}
            <span className="text-ink">todavía no hayan empezado</span> — con menos oportunidades,
            porque los ya jugados no cuentan.
          </p>
          <p>
            Tu cuadro se <span className="text-ink">superpone con la realidad</span> para puntuar:
            en <span className="font-medium text-green-700">verde</span> lo que aciertas, tachado
            lo que falla. Si tu favorito cae, esas rondas valen 0, pero{" "}
            <span className="text-ink">sigues sumando</span> por todo lo que acertaste antes (tu
            cuadro puede reventar, pero no te elimina).
          </p>
          <p>
            <span className="text-ink">Puntos por ronda:</span> acertar quién pasa vale 16avos
            <span className="text-ink"> +1</span>, octavos <span className="text-ink">+2</span>,
            cuartos <span className="text-ink">+4</span>, semis <span className="text-ink">+6</span>{" "}
            y campeón <span className="text-ink">+10</span>. Suman en la columna “Cuadro” del
            ranking.
          </p>
          <p>
            <span className="text-ink">Vistas:</span> <span className="text-ink">Real</span> es lo
            que pasa de verdad; <span className="text-ink">Mi cuadro</span> es el tuyo (editable);{" "}
            <span className="text-ink">Rivales</span> para cotillear el de cualquiera.
          </p>
        </div>
      </details>
    </div>
  );
}
