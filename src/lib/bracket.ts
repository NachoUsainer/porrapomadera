// ===========================================================
//  Estructura del cuadro de eliminatorias (cruces fijos) +
//  generador del SVG de llaves. Pura, sin dependencias de servidor.
// ===========================================================

// Orden visual (arriba->abajo) de cada columna, por lado.
// Estructura de cruces = cuadro oficial FIFA Mundial 2026.
export const LAYOUT = {
  leftR32: [3, 6, 1, 4, 12, 11, 10, 9],
  rightR32: [2, 5, 7, 8, 15, 14, 13, 16],
  leftR16: [2, 1, 3, 4],
  rightR16: [5, 6, 7, 8],
  leftQf: [1, 2],
  rightQf: [3, 4],
  leftSf: 1,
  rightSf: 2,
};

// Auto-avance: dado (stage, slot) ganador -> a qué (stage, slot, lado) va.
// Para sf, el PERDEDOR va al 3er puesto (third, 1).
// Cruces tomados del cuadro oficial FIFA Mundial 2026.
type Target = { stage: string; slot: number; side: "home" | "away" };
export const FORWARD: Record<string, Target> = {
  // 16avos -> octavos
  "r32:1": { stage: "r16", slot: 1, side: "home" },
  "r32:4": { stage: "r16", slot: 1, side: "away" },
  "r32:3": { stage: "r16", slot: 2, side: "home" },
  "r32:6": { stage: "r16", slot: 2, side: "away" },
  "r32:12": { stage: "r16", slot: 3, side: "home" },
  "r32:11": { stage: "r16", slot: 3, side: "away" },
  "r32:10": { stage: "r16", slot: 4, side: "home" },
  "r32:9": { stage: "r16", slot: 4, side: "away" },
  "r32:2": { stage: "r16", slot: 5, side: "home" },
  "r32:5": { stage: "r16", slot: 5, side: "away" },
  "r32:7": { stage: "r16", slot: 6, side: "home" },
  "r32:8": { stage: "r16", slot: 6, side: "away" },
  "r32:15": { stage: "r16", slot: 7, side: "home" },
  "r32:14": { stage: "r16", slot: 7, side: "away" },
  "r32:13": { stage: "r16", slot: 8, side: "home" },
  "r32:16": { stage: "r16", slot: 8, side: "away" },
  // octavos -> cuartos
  "r16:2": { stage: "qf", slot: 1, side: "home" },
  "r16:1": { stage: "qf", slot: 1, side: "away" },
  "r16:3": { stage: "qf", slot: 2, side: "home" },
  "r16:4": { stage: "qf", slot: 2, side: "away" },
  "r16:5": { stage: "qf", slot: 3, side: "home" },
  "r16:6": { stage: "qf", slot: 3, side: "away" },
  "r16:7": { stage: "qf", slot: 4, side: "home" },
  "r16:8": { stage: "qf", slot: 4, side: "away" },
  // cuartos -> semis
  "qf:1": { stage: "sf", slot: 1, side: "home" },
  "qf:2": { stage: "sf", slot: 1, side: "away" },
  "qf:3": { stage: "sf", slot: 2, side: "home" },
  "qf:4": { stage: "sf", slot: 2, side: "away" },
  // semis -> final
  "sf:1": { stage: "final", slot: 1, side: "home" },
  "sf:2": { stage: "final", slot: 1, side: "away" },
};
// Perdedor de cada semifinal -> 3er puesto
export const THIRD_FROM_SF: Record<number, "home" | "away"> = { 1: "home", 2: "away" };

// Slot a partir de la etiqueta del partido ("#N"); final/third = 1.
export function slotFromLabel(stage: string, label: string | null): number {
  if (stage === "final" || stage === "third") return 1;
  const m = (label ?? "").match(/#(\d+)/);
  return m ? Number(m[1]) : 0;
}

// ---------- Feeders: de qué dos slots viene cada cruce (inverso de FORWARD) ----------
export type Feeder = { home: string; away: string };
export const FEEDERS: Record<string, Feeder> = (() => {
  const f: Record<string, Feeder> = {};
  for (const [src, t] of Object.entries(FORWARD)) {
    const key = `${t.stage}:${t.slot}`;
    if (!f[key]) f[key] = { home: "", away: "" };
    f[key][t.side] = src;
  }
  return f;
})();

// ---------- Puntuación del cuadro por ronda (ajustable) ----------
export const ROUND_POINTS: Record<string, number> = {
  r32: 1,
  r16: 2,
  qf: 4,
  sf: 6,
  final: 10,
};
export const ROUND_LABEL: Record<string, string> = {
  r32: "16avos",
  r16: "octavos",
  qf: "cuartos",
  sf: "semis",
  final: "campeón",
};

// Slots del cuadro que se pueden pronosticar (de 16avos al campeón). 31 en total.
export const PICK_SLOTS: string[] = [
  ...Array.from({ length: 16 }, (_, i) => `r32:${i + 1}`),
  ...Array.from({ length: 8 }, (_, i) => `r16:${i + 1}`),
  ...Array.from({ length: 4 }, (_, i) => `qf:${i + 1}`),
  "sf:1",
  "sf:2",
  "final:1",
];

// Puntos de cuadro de un jugador: por cada slot acertado (su pick = quien paso de verdad).
export function bracketScore(
  picks: Record<string, number>,
  advancerByKey: Map<string, number>
): { points: number; hits: number } {
  let points = 0;
  let hits = 0;
  for (const [key, teamId] of Object.entries(picks)) {
    const stage = key.split(":")[0];
    const adv = advancerByKey.get(key);
    if (adv != null && adv === teamId) {
      points += ROUND_POINTS[stage] ?? 0;
      hits += 1;
    }
  }
  return { points, hits };
}

// ---------- Geometría de las llaves (para render interactivo en React) ----------
export const GEO = {
  W: 1250,
  H: 588,
  bw: 120,
  boxH: 38,
  leftX: [10, 150, 290, 430],
  rightX: [1120, 980, 840, 700],
  finalX: 565,
  c0: [44, 108, 172, 236, 300, 364, 428, 492],
  c1: [76, 204, 332, 460],
  c2: [140, 396],
  c3: 268,
  thirdY: 540,
};

export type BBox = {
  key: string;
  stage: string;
  slot: number;
  x: number;
  cy: number;
  pickable: boolean;
};

// Posición de cada caja del cuadro (orden = LAYOUT, geometría = GEO).
export function bracketBoxes(): BBox[] {
  const b: BBox[] = [];
  const push = (stage: string, slot: number, x: number, cy: number, pickable = true) =>
    b.push({ key: `${stage}:${slot}`, stage, slot, x, cy, pickable });
  LAYOUT.leftR32.forEach((s, i) => push("r32", s, GEO.leftX[0], GEO.c0[i]));
  LAYOUT.leftR16.forEach((s, i) => push("r16", s, GEO.leftX[1], GEO.c1[i]));
  LAYOUT.leftQf.forEach((s, i) => push("qf", s, GEO.leftX[2], GEO.c2[i]));
  push("sf", LAYOUT.leftSf, GEO.leftX[3], GEO.c3);
  LAYOUT.rightR32.forEach((s, i) => push("r32", s, GEO.rightX[0], GEO.c0[i]));
  LAYOUT.rightR16.forEach((s, i) => push("r16", s, GEO.rightX[1], GEO.c1[i]));
  LAYOUT.rightQf.forEach((s, i) => push("qf", s, GEO.rightX[2], GEO.c2[i]));
  push("sf", LAYOUT.rightSf, GEO.rightX[3], GEO.c3);
  push("final", 1, GEO.finalX, GEO.c3);
  push("third", 1, GEO.finalX, GEO.thirdY, false);
  return b;
}

export type Seg = { x1: number; y1: number; x2: number; y2: number };

// Segmentos conectores de las llaves.
export function bracketLines(): Seg[] {
  const L: Seg[] = [];
  const { bw, leftX, rightX, finalX, c0, c1, c2, c3 } = GEO;
  const seg = (x1: number, y1: number, x2: number, y2: number) => L.push({ x1, y1, x2, y2 });
  const conn = (fx: number, ya: number, yb: number, mid: number, nx: number, nc: number) => {
    seg(fx, ya, mid, ya);
    seg(fx, yb, mid, yb);
    seg(mid, ya, mid, yb);
    seg(mid, nc, nx, nc);
  };
  for (let j = 0; j < 4; j++) {
    const fx = leftX[0] + bw, nx = leftX[1], mid = (fx + nx) / 2;
    conn(fx, c0[2 * j], c0[2 * j + 1], mid, nx, c1[j]);
  }
  for (let j = 0; j < 2; j++) {
    const fx = leftX[1] + bw, nx = leftX[2], mid = (fx + nx) / 2;
    conn(fx, c1[2 * j], c1[2 * j + 1], mid, nx, c2[j]);
  }
  {
    const fx = leftX[2] + bw, nx = leftX[3], mid = (fx + nx) / 2;
    conn(fx, c2[0], c2[1], mid, nx, c3);
  }
  seg(leftX[3] + bw, c3, finalX, c3);
  for (let j = 0; j < 4; j++) {
    const fx = rightX[0], nx = rightX[1] + bw, mid = (fx + nx) / 2;
    conn(fx, c0[2 * j], c0[2 * j + 1], mid, nx, c1[j]);
  }
  for (let j = 0; j < 2; j++) {
    const fx = rightX[1], nx = rightX[2] + bw, mid = (fx + nx) / 2;
    conn(fx, c1[2 * j], c1[2 * j + 1], mid, nx, c2[j]);
  }
  {
    const fx = rightX[2], nx = rightX[3] + bw, mid = (fx + nx) / 2;
    conn(fx, c2[0], c2[1], mid, nx, c3);
  }
  seg(rightX[3], c3, finalX + bw, c3);
  return L;
}
