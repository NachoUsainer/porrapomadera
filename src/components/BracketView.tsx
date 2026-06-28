"use client";

import { useMemo, useState, useTransition } from "react";
import { saveBracketPicks } from "@/lib/actions";
import {
  bracketBoxes,
  bracketLines,
  FEEDERS,
  PICK_SLOTS,
  GEO,
  ROUND_POINTS,
  type BBox,
} from "@/lib/bracket";
import { withFlag } from "@/lib/flags";

export type SlotData = {
  homeTeamId: number | null;
  awayTeamId: number | null;
  advancerId: number | null;
  finished: boolean;
  started: boolean;
  phHome: string;
  phAway: string;
};

type View = "real" | "mine" | "rival";
type Picks = Record<string, number>;

const HAIR = "#dcdce0";
const SUB = "#6e6e73";
type CellState = "none" | "picked" | "correct" | "wrong" | "adv";
const COLORS: Record<CellState, { bg?: string; fg: string; bold?: boolean; strike?: boolean }> = {
  none: { fg: "#1d1d1f" },
  picked: { bg: "#e9f1fe", fg: "#0071e3", bold: true },
  correct: { bg: "#e7f6ec", fg: "#15803d", bold: true },
  adv: { bg: "#e7f6ec", fg: "#15803d", bold: true },
  wrong: { bg: "#fdecec", fg: "#b91c1c", strike: true },
};

export default function BracketView({
  teams,
  players,
  slotData,
  myId,
  picksByPlayer,
  firstKoStarted,
  firstKoLabel,
}: {
  teams: { id: number; name: string }[];
  players: { id: string; name: string }[];
  slotData: Record<string, SlotData>;
  myId: string | null;
  picksByPlayer: Record<string, Picks>;
  firstKoStarted: boolean;
  firstKoLabel: string | null;
}) {
  const teamName = useMemo(() => new Map(teams.map((t) => [t.id, t.name])), [teams]);
  const [view, setView] = useState<View>(myId ? "mine" : "real");
  const [rivalId, setRivalId] = useState<string>(players.find((p) => p.id !== myId)?.id ?? "");
  const [picks, setPicks] = useState<Picks>(() => ({ ...((myId && picksByPlayer[myId]) || {}) }));
  const [savedSet, setSavedSet] = useState<Set<string>>(
    () => new Set(Object.keys((myId && picksByPlayer[myId]) || {}))
  );
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  // ¿Se puede editar este cruce ahora mismo?
  function slotEditable(key: string): boolean {
    if (view !== "mine" || !myId) return false;
    if (slotData[key]?.started) return false; // su partido ya empezó
    if (!firstKoStarted) return true; // antes del primer KO, todo abierto
    return !savedSet.has(key); // reenganche: solo cruces aún vacíos
  }

  function normalize(p: Picks): Picks {
    const out: Picks = {};
    for (const slot of PICK_SLOTS) {
      const pickId = p[slot];
      if (!pickId) continue;
      if (!slotEditable(slot)) {
        out[slot] = pickId; // congelado o ya empezado: se mantiene tal cual
        continue;
      }
      const stage = slot.split(":")[0];
      const sd = slotData[slot];
      let cands: (number | null)[];
      if (stage === "r32") {
        cands = sd ? [sd.homeTeamId, sd.awayTeamId] : [];
      } else {
        const f = FEEDERS[slot];
        cands = [out[f.home] ?? sd?.homeTeamId ?? null, out[f.away] ?? sd?.awayTeamId ?? null];
      }
      if (cands.includes(pickId)) out[slot] = pickId;
    }
    return out;
  }

  function choose(slot: string, id: number | null) {
    if (!slotEditable(slot) || !id) return;
    setSaved(false);
    setPicks((prev) => normalize({ ...prev, [slot]: id }));
  }

  function save() {
    start(async () => {
      await saveBracketPicks(picks);
      setSavedSet(new Set(Object.keys(picks)));
      setSaved(true);
    });
  }

  const activePicks: Picks = view === "rival" ? picksByPlayer[rivalId] ?? {} : picks;
  const label = (id: number | null, ph: string) =>
    id ? withFlag(teamName.get(id) ?? "?") : ph;

  function cellsOf(box: BBox): {
    home: { id: number | null; label: string; state: CellState };
    away: { id: number | null; label: string; state: CellState };
  } {
    const sd = slotData[box.key];
    if (view === "real" || box.stage === "third") {
      const adv = sd?.advancerId ?? null;
      return {
        home: {
          id: sd?.homeTeamId ?? null,
          label: label(sd?.homeTeamId ?? null, sd?.phHome ?? "—"),
          state: adv != null && adv === sd?.homeTeamId ? "adv" : "none",
        },
        away: {
          id: sd?.awayTeamId ?? null,
          label: label(sd?.awayTeamId ?? null, sd?.phAway ?? "—"),
          state: adv != null && adv === sd?.awayTeamId ? "adv" : "none",
        },
      };
    }
    // mine / rival: cascada desde los picks (o equipos reales si no hay pick previo)
    let homeId: number | null;
    let awayId: number | null;
    let phH = sd?.phHome ?? "—";
    let phA = sd?.phAway ?? "—";
    if (box.stage === "r32") {
      homeId = sd?.homeTeamId ?? null;
      awayId = sd?.awayTeamId ?? null;
    } else {
      const f = FEEDERS[box.key];
      homeId = activePicks[f.home] ?? sd?.homeTeamId ?? null;
      awayId = activePicks[f.away] ?? sd?.awayTeamId ?? null;
    }
    const myPick = activePicks[box.key] ?? null;
    const adv = sd?.advancerId ?? null;
    const fin = sd?.finished ?? false;
    const stateFor = (id: number | null): CellState => {
      if (id == null || myPick !== id) return "none";
      if (!fin) return "picked";
      return adv != null && id === adv ? "correct" : "wrong";
    };
    return {
      home: { id: homeId, label: label(homeId, phH), state: stateFor(homeId) },
      away: { id: awayId, label: label(awayId, phA), state: stateFor(awayId) },
    };
  }

  const score = useMemo(() => {
    let pts = 0;
    let hits = 0;
    let filled = 0;
    for (const slot of PICK_SLOTS) {
      const id = activePicks[slot];
      if (!id) continue;
      filled++;
      const sd = slotData[slot];
      if (sd?.finished && sd.advancerId === id) {
        pts += ROUND_POINTS[slot.split(":")[0]] ?? 0;
        hits++;
      }
    }
    return { pts, hits, filled };
  }, [activePicks, slotData]);

  const openCount =
    view === "mine" && myId ? PICK_SLOTS.filter((s) => slotEditable(s)).length : 0;

  const boxes = bracketBoxes();
  const lines = bracketLines();
  const { bw, boxH } = GEO;

  const heads: [number, string][] = [
    [GEO.leftX[0] + bw / 2, "16avos"],
    [GEO.leftX[1] + bw / 2, "Octavos"],
    [GEO.leftX[2] + bw / 2, "Cuartos"],
    [GEO.leftX[3] + bw / 2, "Semis"],
    [GEO.finalX + bw / 2, "Final"],
    [GEO.rightX[3] + bw / 2, "Semis"],
    [GEO.rightX[2] + bw / 2, "Cuartos"],
    [GEO.rightX[1] + bw / 2, "Octavos"],
    [GEO.rightX[0] + bw / 2, "16avos"],
  ];

  const Seg = ({ id, lbl }: { id: View; lbl: string }) => (
    <button
      type="button"
      onClick={() => setView(id)}
      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
        view === id ? "bg-white text-ink shadow-sm" : "text-subtle hover:text-ink"
      }`}
    >
      {lbl}
    </button>
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-full bg-black/[0.05] p-0.5">
          <Seg id="real" lbl="Real" />
          {myId && <Seg id="mine" lbl="Mi cuadro" />}
          <Seg id="rival" lbl="Rivales" />
        </div>
        {view === "rival" && (
          <select
            value={rivalId}
            onChange={(e) => setRivalId(e.target.value)}
            className="input w-auto py-1.5"
          >
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {view === "mine" && myId && (
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-hair bg-white p-3 text-sm">
          <span className="text-subtle">
            Cruces puestos <span className="font-semibold text-ink tnum">{score.filled}/31</span>
          </span>
          <span className="text-subtle">
            Aciertos <span className="font-semibold text-green-700 tnum">{score.hits}</span> ·{" "}
            <span className="font-semibold text-green-700 tnum">{score.pts} pts</span>
          </span>
          {openCount > 0 ? (
            <span className="ml-auto flex items-center gap-3">
              {saved && <span className="text-xs text-green-700">Guardado</span>}
              <button onClick={save} disabled={pending} className="btn-primary py-1.5">
                {pending ? "…" : "Guardar cuadro"}
              </button>
            </span>
          ) : (
            <span className="ml-auto rounded-full bg-black/[0.05] px-2.5 py-1 text-xs text-subtle">
              Cuadro cerrado
            </span>
          )}
        </div>
      )}
      {view === "mine" && myId && openCount > 0 && (
        <p className="mb-2 px-1 text-xs text-subtle">
          {firstKoStarted
            ? `Reenganche abierto: te quedan ${openCount} cruces por poner (los que aún no han empezado). Los ya jugados no se pueden rellenar. No olvides Guardar.`
            : `Toca el equipo que crees que pasa en cada cruce. Empieza por los 16avos; los octavos y siguientes se rellenan con tus ganadores. Editable hasta el primer partido${firstKoLabel ? ` (${firstKoLabel})` : ""}. No olvides Guardar.`}
        </p>
      )}
      {view === "rival" && (
        <div className="mb-3 rounded-2xl border border-hair bg-white p-3 text-sm text-subtle">
          Cruces puestos <span className="font-semibold text-ink tnum">{score.filled}/31</span> ·
          aciertos <span className="font-semibold text-green-700 tnum">{score.hits}</span> ·{" "}
          <span className="font-semibold text-green-700 tnum">{score.pts} pts</span>
        </div>
      )}

      {view === "mine" && !myId ? (
        <div className="card p-8 text-center text-sm text-subtle">
          Inicia sesión para rellenar tu cuadro.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-hair bg-white p-3">
          <div className="min-w-[1040px]">
            <svg
              viewBox={`0 0 ${GEO.W} ${GEO.H}`}
              width="100%"
              preserveAspectRatio="xMidYMid meet"
              style={{ display: "block", height: "auto" }}
            >
              {lines.map((l, i) => (
                <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={HAIR} />
              ))}
              {heads.map(([x, t], i) => (
                <text key={`h${i}`} x={x} y={16} textAnchor="middle" fontSize="10" fill={SUB}>
                  {t}
                </text>
              ))}
              <text
                x={GEO.finalX + bw / 2}
                y={GEO.thirdY - boxH / 2 - 6}
                textAnchor="middle"
                fontSize="9"
                fill={SUB}
              >
                3º y 4º puesto
              </text>
              {boxes.map((box) => {
                const c = cellsOf(box);
                const top = box.cy - boxH / 2;
                const clickable = box.pickable && slotEditable(box.key);
                const Cell = ({
                  cell,
                  y,
                }: {
                  cell: { id: number | null; label: string; state: CellState };
                  y: number;
                }) => {
                  const col = COLORS[cell.state];
                  const canClick = clickable && cell.id != null;
                  return (
                    <g
                      onClick={canClick ? () => choose(box.key, cell.id) : undefined}
                      style={{ cursor: canClick ? "pointer" : "default" }}
                    >
                      {col.bg && (
                        <rect
                          x={box.x + 1}
                          y={y}
                          width={bw - 2}
                          height={boxH / 2}
                          rx={3}
                          fill={col.bg}
                        />
                      )}
                      {canClick && (
                        <rect x={box.x} y={y} width={bw} height={boxH / 2} fill="transparent" />
                      )}
                      <text
                        x={box.x + bw / 2}
                        y={y + 13}
                        textAnchor="middle"
                        fontSize="9.5"
                        fontWeight={col.bold ? 600 : 400}
                        fill={col.fg}
                        style={col.strike ? { textDecoration: "line-through" } : undefined}
                      >
                        {cell.label}
                      </text>
                    </g>
                  );
                };
                return (
                  <g key={box.key}>
                    <rect
                      x={box.x}
                      y={top}
                      width={bw}
                      height={boxH}
                      rx={5}
                      fill="#fff"
                      stroke={box.stage === "final" ? "#0071e3" : HAIR}
                      strokeWidth={box.stage === "final" ? 1.5 : 1}
                    />
                    <line x1={box.x} y1={box.cy} x2={box.x + bw} y2={box.cy} stroke={HAIR} />
                    <Cell cell={c.home} y={top} />
                    <Cell cell={c.away} y={box.cy} />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
