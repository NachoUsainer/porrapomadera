// ===========================================================
//  Estructura del cuadro de eliminatorias (cruces fijos) +
//  generador del SVG de llaves. Pura, sin dependencias de servidor.
// ===========================================================

// Orden visual (arriba->abajo) de cada columna, por lado.
export const LAYOUT = {
  leftR32: [1, 3, 2, 5, 4, 6, 7, 8],
  rightR32: [11, 12, 9, 10, 14, 16, 13, 15],
  leftR16: [1, 2, 5, 6],
  rightR16: [3, 4, 7, 8],
  leftQf: [1, 2],
  rightQf: [3, 4],
  leftSf: 1,
  rightSf: 2,
};

// Auto-avance: dado (stage, slot) ganador -> a qué (stage, slot, lado) va.
// Para sf, el PERDEDOR va al 3er puesto (third, 1).
type Target = { stage: string; slot: number; side: "home" | "away" };
export const FORWARD: Record<string, Target> = {
  "r32:1": { stage: "r16", slot: 1, side: "home" },
  "r32:3": { stage: "r16", slot: 1, side: "away" },
  "r32:2": { stage: "r16", slot: 2, side: "home" },
  "r32:5": { stage: "r16", slot: 2, side: "away" },
  "r32:11": { stage: "r16", slot: 3, side: "home" },
  "r32:12": { stage: "r16", slot: 3, side: "away" },
  "r32:9": { stage: "r16", slot: 4, side: "home" },
  "r32:10": { stage: "r16", slot: 4, side: "away" },
  "r32:4": { stage: "r16", slot: 5, side: "home" },
  "r32:6": { stage: "r16", slot: 5, side: "away" },
  "r32:7": { stage: "r16", slot: 6, side: "home" },
  "r32:8": { stage: "r16", slot: 6, side: "away" },
  "r32:14": { stage: "r16", slot: 7, side: "home" },
  "r32:16": { stage: "r16", slot: 7, side: "away" },
  "r32:13": { stage: "r16", slot: 8, side: "home" },
  "r32:15": { stage: "r16", slot: 8, side: "away" },
  "r16:1": { stage: "qf", slot: 1, side: "home" },
  "r16:2": { stage: "qf", slot: 1, side: "away" },
  "r16:5": { stage: "qf", slot: 2, side: "home" },
  "r16:6": { stage: "qf", slot: 2, side: "away" },
  "r16:3": { stage: "qf", slot: 3, side: "home" },
  "r16:4": { stage: "qf", slot: 3, side: "away" },
  "r16:7": { stage: "qf", slot: 4, side: "home" },
  "r16:8": { stage: "qf", slot: 4, side: "away" },
  "qf:1": { stage: "sf", slot: 1, side: "home" },
  "qf:2": { stage: "sf", slot: 1, side: "away" },
  "qf:3": { stage: "sf", slot: 2, side: "home" },
  "qf:4": { stage: "sf", slot: 2, side: "away" },
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

// ---------- Generador del SVG de llaves ----------
export type Cell = { label: string; win: boolean };
export type BoxFn = (stage: string, slot: number) => { home: Cell; away: Cell };

const INK = "#1d1d1f";
const SUB = "#6e6e73";
const HAIR = "#dcdce0";
const WIN_BG = "#e7f6ec";
const WIN_TX = "#15803d";

export function buildBracketSvg(box: BoxFn): string {
  const W = 1250;
  const bw = 120;
  const boxH = 38;
  const leftX = [10, 150, 290, 430];
  const rightX = [1120, 980, 840, 700];
  const finalX = 565;
  const c0 = [44, 108, 172, 236, 300, 364, 428, 492];
  const c1 = [76, 204, 332, 460];
  const c2 = [140, 396];
  const c3 = 268;

  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  let out = "";

  const cell = (x: number, y: number, c: Cell) => {
    let g = "";
    if (c.win) g += `<rect x="${x + 1}" y="${y}" width="${bw - 2}" height="${boxH / 2}" rx="3" fill="${WIN_BG}"/>`;
    g += `<text x="${x + bw / 2}" y="${y + 13}" text-anchor="middle" font-size="9.5" font-weight="${c.win ? 600 : 400}" fill="${c.win ? WIN_TX : INK}">${esc(c.label)}</text>`;
    return g;
  };
  const drawBox = (x: number, cy: number, stage: string, slot: number, hl?: boolean) => {
    const top = cy - boxH / 2;
    const b = box(stage, slot);
    let g = `<rect x="${x}" y="${top}" width="${bw}" height="${boxH}" rx="5" fill="#fff" stroke="${hl ? "#0071e3" : HAIR}" stroke-width="${hl ? 1.5 : 1}"/>`;
    g += `<line x1="${x}" y1="${cy}" x2="${x + bw}" y2="${cy}" stroke="${HAIR}"/>`;
    g += cell(x, top, b.home);
    g += cell(x, cy, b.away);
    return g;
  };
  const conn = (fx: number, ya: number, yb: number, midx: number, nx: number, nc: number) =>
    `<line x1="${fx}" y1="${ya}" x2="${midx}" y2="${ya}" stroke="${HAIR}"/>` +
    `<line x1="${fx}" y1="${yb}" x2="${midx}" y2="${yb}" stroke="${HAIR}"/>` +
    `<line x1="${midx}" y1="${ya}" x2="${midx}" y2="${yb}" stroke="${HAIR}"/>` +
    `<line x1="${midx}" y1="${nc}" x2="${nx}" y2="${nc}" stroke="${HAIR}"/>`;

  // Conectores (debajo de las cajas)
  for (let j = 0; j < 4; j++) { const fx = leftX[0] + bw, nx = leftX[1], mid = (fx + nx) / 2; out += conn(fx, c0[2 * j], c0[2 * j + 1], mid, nx, c1[j]); }
  for (let j = 0; j < 2; j++) { const fx = leftX[1] + bw, nx = leftX[2], mid = (fx + nx) / 2; out += conn(fx, c1[2 * j], c1[2 * j + 1], mid, nx, c2[j]); }
  { const fx = leftX[2] + bw, nx = leftX[3], mid = (fx + nx) / 2; out += conn(fx, c2[0], c2[1], mid, nx, c3); }
  out += `<line x1="${leftX[3] + bw}" y1="${c3}" x2="${finalX}" y2="${c3}" stroke="${HAIR}"/>`;
  for (let j = 0; j < 4; j++) { const fx = rightX[0], nx = rightX[1] + bw, mid = (fx + nx) / 2; out += conn(fx, c0[2 * j], c0[2 * j + 1], mid, nx, c1[j]); }
  for (let j = 0; j < 2; j++) { const fx = rightX[1], nx = rightX[2] + bw, mid = (fx + nx) / 2; out += conn(fx, c1[2 * j], c1[2 * j + 1], mid, nx, c2[j]); }
  { const fx = rightX[2], nx = rightX[3] + bw, mid = (fx + nx) / 2; out += conn(fx, c2[0], c2[1], mid, nx, c3); }
  out += `<line x1="${rightX[3]}" y1="${c3}" x2="${finalX + bw}" y2="${c3}" stroke="${HAIR}"/>`;

  // Cajas
  LAYOUT.leftR32.forEach((s, i) => { out += drawBox(leftX[0], c0[i], "r32", s); });
  LAYOUT.leftR16.forEach((s, i) => { out += drawBox(leftX[1], c1[i], "r16", s); });
  LAYOUT.leftQf.forEach((s, i) => { out += drawBox(leftX[2], c2[i], "qf", s); });
  out += drawBox(leftX[3], c3, "sf", LAYOUT.leftSf);
  LAYOUT.rightR32.forEach((s, i) => { out += drawBox(rightX[0], c0[i], "r32", s); });
  LAYOUT.rightR16.forEach((s, i) => { out += drawBox(rightX[1], c1[i], "r16", s); });
  LAYOUT.rightQf.forEach((s, i) => { out += drawBox(rightX[2], c2[i], "qf", s); });
  out += drawBox(rightX[3], c3, "sf", LAYOUT.rightSf);
  out += drawBox(finalX, c3, "final", 1, true);
  out += `<text x="${finalX + bw / 2}" y="${c3 - boxH / 2 - 8}" text-anchor="middle" font-size="11" font-weight="600" fill="#0071e3">Final</text>`;
  out += drawBox(finalX, 540, "third", 1);
  out += `<text x="${finalX + bw / 2}" y="${540 - boxH / 2 - 6}" text-anchor="middle" font-size="9" fill="${SUB}">3º y 4º puesto</text>`;

  // Cabeceras
  const heads: [number, string][] = [
    [leftX[0] + bw / 2, "16avos"], [leftX[1] + bw / 2, "Octavos"], [leftX[2] + bw / 2, "Cuartos"],
    [leftX[3] + bw / 2, "Semis"], [finalX + bw / 2, "Final"], [rightX[3] + bw / 2, "Semis"],
    [rightX[2] + bw / 2, "Cuartos"], [rightX[1] + bw / 2, "Octavos"], [rightX[0] + bw / 2, "16avos"],
  ];
  heads.forEach(([x, t]) => { out += `<text x="${x}" y="16" text-anchor="middle" font-size="10" fill="${SUB}">${t}</text>`; });

  return `<svg viewBox="0 0 ${W} 588" width="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" style="display:block;height:auto">${out}</svg>`;
}
