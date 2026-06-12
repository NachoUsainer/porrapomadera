"use client";

import { useActionState } from "react";
import {
  adminAddTeam,
  adminAddMatch,
  adminSetResult,
  adminDeleteMatch,
  adminDeletePlayer,
  adminBulkImport,
  adminSetMatchTeams,
} from "@/lib/actions";
import { STAGE_LABELS, type Team, type Match } from "@/lib/supabase";
import { flagFor } from "@/lib/flags";

const STAGES = ["group", "r32", "r16", "qf", "sf", "third", "final"];

export type PlayerRow = {
  id: string;
  name: string;
  createdAt: string;
  predictions: number;
};

export default function AdminPanel({
  teams,
  matches,
  players,
}: {
  teams: Team[];
  matches: Match[];
  players: PlayerRow[];
}) {
  const teamById = new Map(teams.map((t) => [t.id, t]));

  return (
    <div className="space-y-10">
      <Players players={players} />
      <BulkImport />
      <AddTeam teams={teams} />
      <AddMatch teams={teams} />

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink">Partidos ({matches.length})</h2>
        {matches.length === 0 ? (
          <p className="text-sm text-subtle">Aún no hay partidos.</p>
        ) : (
          <div className="space-y-2">
            {matches.map((m) => (
              <ResultRow key={m.id} match={m} teamById={teamById} teams={teams} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Players({ players }: { players: PlayerRow[] }) {
  // Marcamos posibles duplicados: nombres que comparten el mismo "primer token"
  // (p.ej. "Javi" y "Javi G."). Es solo una pista visual; tú decides a quién echar.
  const firstToken = (n: string) => n.trim().toLowerCase().split(/\s+/)[0];
  const counts = new Map<string, number>();
  players.forEach((p) => counts.set(firstToken(p.name), (counts.get(firstToken(p.name)) ?? 0) + 1));

  return (
    <section className="card p-5">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink">Jugadores ({players.length})</h2>
      <p className="mb-3 text-xs text-subtle">
        Expulsa a usuarios que creas duplicados. Al expulsar se borran también sus
        predicciones. No tiene vuelta atrás.
      </p>
      {players.length === 0 ? (
        <p className="text-sm text-subtle">Aún no hay jugadores registrados.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-subtle">
            <tr>
              <th className="py-1">Nombre</th>
              <th className="py-1">Alta</th>
              <th className="py-1 text-center">Predicciones</th>
              <th className="py-1"></th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => {
              const dup = (counts.get(firstToken(p.name)) ?? 0) > 1;
              return (
                <tr key={p.id} className="border-t border-hair">
                  <td className="py-1.5 font-medium">
                    {p.name}
                    {dup && (
                      <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
                        posible duplicado
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 text-subtle">
                    {new Date(p.createdAt).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "Europe/Madrid",
                    })}
                  </td>
                  <td className="py-1.5 text-center text-subtle">{p.predictions}</td>
                  <td className="py-1.5 text-right">
                    <ExpelButton id={p.id} name={p.name} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}

function ExpelButton({ id, name }: { id: string; name: string }) {
  return (
    <form
      action={adminDeletePlayer}
      onSubmit={(e) => {
        if (!confirm(`¿Expulsar a "${name}"? Se borrarán sus predicciones. Esta acción no se puede deshacer.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="player_id" value={id} />
      <button className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50">
        Expulsar
      </button>
    </form>
  );
}

function AddTeam({ teams }: { teams: Team[] }) {
  const [state, action, pending] = useActionState(adminAddTeam, {});
  return (
    <section className="card p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink">Añadir selección</h2>
      <form action={action} className="flex flex-wrap items-end gap-2">
        <Field label="Nombre">
          <input name="name" required placeholder="España" className="input" />
        </Field>
        <Field label="Código">
          <input name="code" placeholder="ESP" maxLength={3} className="input w-20" />
        </Field>
        <Field label="Grupo">
          <input name="group_name" placeholder="A" maxLength={2} className="input w-16" />
        </Field>
        <button disabled={pending} className="btn-primary">
          {pending ? "..." : "Añadir"}
        </button>
      </form>
      {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      <p className="mt-2 text-xs text-subtle">
        {teams.length} selecciones cargadas.
      </p>
    </section>
  );
}

function AddMatch({ teams }: { teams: Team[] }) {
  const [state, action, pending] = useActionState(adminAddMatch, {});
  const sorted = [...teams].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <section className="card p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink">Añadir partido</h2>
      <form action={action} className="flex flex-wrap items-end gap-2">
        <Field label="Fase">
          <select name="stage" className="input">
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Local">
          <TeamSelect name="home_team_id" teams={sorted} />
        </Field>
        <Field label="Visitante">
          <TeamSelect name="away_team_id" teams={sorted} />
        </Field>
        <Field label="Fecha y hora">
          <input type="datetime-local" name="kickoff" className="input" />
        </Field>
        <Field label="Etiqueta (opcional)">
          <input name="label" placeholder="Jornada 1" className="input" />
        </Field>
        <button disabled={pending} className="btn-primary">
          {pending ? "..." : "Crear partido"}
        </button>
      </form>
      {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
    </section>
  );
}

function ResultRow({
  match,
  teamById,
  teams,
}: {
  match: Match;
  teamById: Map<number, Team>;
  teams: Team[];
}) {
  const [state, action, pending] = useActionState(adminSetResult, {});
  const home = match.home_team_id ? teamById.get(match.home_team_id) : null;
  const away = match.away_team_id ? teamById.get(match.away_team_id) : null;
  const isKnockout = match.stage !== "group";
  const teamsMissing = !match.home_team_id || !match.away_team_id;

  return (
    <div className="card p-4">
      <div className="mb-2 text-xs text-subtle">
        {STAGE_LABELS[match.stage]} {match.label ? `· ${match.label}` : ""}
        {match.finished && (
          <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-green-700">
            finalizado
          </span>
        )}
      </div>

      {(teamsMissing || isKnockout) && <SetTeams match={match} teams={teams} />}
      <form action={action} className="flex flex-wrap items-center gap-2 text-sm">
        <input type="hidden" name="match_id" value={match.id} />
        <span className="min-w-[7rem] text-right font-medium">
          {home ? `${flagFor(home.name)} ${home.name}` : "?"}
        </span>
        <input
          type="number"
          name="home_score"
          min={0}
          defaultValue={match.home_score ?? ""}
          className="input w-14 text-center"
        />
        <span>–</span>
        <input
          type="number"
          name="away_score"
          min={0}
          defaultValue={match.away_score ?? ""}
          className="input w-14 text-center"
        />
        <span className="min-w-[7rem] font-medium">
          {away ? `${flagFor(away.name)} ${away.name}` : "?"}
        </span>

        {isKnockout && (
          <label className="flex items-center gap-1 text-xs text-subtle">
            Clasifica:
            <select
              name="advance_team_id"
              defaultValue={match.advance_team_id ?? ""}
              className="input"
            >
              <option value="">—</option>
              {home && <option value={home.id}>{flagFor(home.name)} {home.name}</option>}
              {away && <option value={away.id}>{flagFor(away.name)} {away.name}</option>}
            </select>
          </label>
        )}

        <label className="flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            name="finished"
            defaultChecked={match.finished}
          />
          finalizado
        </label>

        <button disabled={pending} className="btn-primary">
          {pending ? "..." : "Guardar"}
        </button>
        {state.error && <span className="text-xs text-red-600">{state.error}</span>}
      </form>

      <form action={adminDeleteMatch} className="mt-1">
        <input type="hidden" name="match_id" value={match.id} />
        <button className="text-xs text-red-500 hover:underline">Eliminar partido</button>
      </form>
    </div>
  );
}

function SetTeams({ match, teams }: { match: Match; teams: Team[] }) {
  const [state, action, pending] = useActionState(adminSetMatchTeams, {});
  const sorted = [...teams].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <form
      action={action}
      className="mb-2 flex flex-wrap items-center gap-2 rounded-xl bg-black/[0.03] p-2 text-xs"
    >
      <input type="hidden" name="match_id" value={match.id} />
      <span className="text-subtle">Asignar cruce:</span>
      <select name="home_team_id" defaultValue={match.home_team_id ?? ""} className="input">
        <option value="">— local —</option>
        {sorted.map((t) => (
          <option key={t.id} value={t.id}>
            {flagFor(t.name)} {t.name}
          </option>
        ))}
      </select>
      <span>vs</span>
      <select name="away_team_id" defaultValue={match.away_team_id ?? ""} className="input">
        <option value="">— visitante —</option>
        {sorted.map((t) => (
          <option key={t.id} value={t.id}>
            {flagFor(t.name)} {t.name}
          </option>
        ))}
      </select>
      <button disabled={pending} className="btn-ghost px-3 py-1">
        {pending ? "..." : "Fijar equipos"}
      </button>
      {state.error && <span className="text-red-600">{state.error}</span>}
    </form>
  );
}

const IMPORT_PLACEHOLDER = `# fase ; local ; visitante ; AAAA-MM-DD HH:MM ; etiqueta
# fase = group | r32 | r16 | qf | sf | third | final
# La hora es CET/CEST (la del calendario). Ejemplos:
group ; México ; ... ; 2026-06-11 20:00 ; Grupo A J1
group ; Canadá ; ... ; 2026-06-12 21:00 ; Grupo B J1
# Eliminatoria aún sin equipos: deja local/visitante vacíos y usa la etiqueta
r16 ;  ;  ; 2026-06-29 18:00 ; Octavos 1 (1A-2B)`;

function BulkImport() {
  const [state, action, pending] = useActionState(adminBulkImport, {});
  return (
    <section className="card p-5">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink">Importar calendario</h2>
      <p className="mb-3 text-xs text-subtle">
        Pega el calendario, un partido por línea, separado por <code>;</code>:{" "}
        <code>fase ; local ; visitante ; AAAA-MM-DD HH:MM ; etiqueta</code>. Las
        selecciones se crean solas. Las horas se interpretan en hora CET/CEST. Esto{" "}
        <strong>añade</strong> partidos (no borra los que ya haya).
      </p>
      <form action={action} className="space-y-2">
        <textarea
          name="data"
          rows={10}
          placeholder={IMPORT_PLACEHOLDER}
          className="input w-full p-2 font-mono text-xs"
        />
        <div className="flex items-center gap-3">
          <button disabled={pending} className="btn-primary">
            {pending ? "Importando..." : "Importar partidos"}
          </button>
          {state.error && <span className="text-sm text-red-600">{state.error}</span>}
          {"imported" in state && state.imported != null && (
            <span className="text-sm text-green-700">
              {state.imported} partidos importados.
            </span>
          )}
        </div>
      </form>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-subtle">
      {label}
      {children}
    </label>
  );
}

function TeamSelect({ name, teams }: { name: string; teams: Team[] }) {
  return (
    <select name={name} required className="input">
      <option value="">—</option>
      {teams.map((t) => (
        <option key={t.id} value={t.id}>
          {flagFor(t.name)} {t.name}
          {t.group_name ? ` (${t.group_name})` : ""}
        </option>
      ))}
    </select>
  );
}
