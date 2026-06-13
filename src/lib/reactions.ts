// Reacciones del muro (estilo Facebook, pero nuestras).
export const REACTIONS: { key: string; label: string }[] = [
  { key: "genio", label: "Eres un genio" },
  { key: "payaso", label: "Payaso" },
  { key: "tonto", label: "Más tonto y no naces" },
  { key: "yisu", label: "Ni el Yisu" },
  { key: "champions", label: "Te regalo tu Champions particular" },
];

export const REACTION_KEYS = new Set(REACTIONS.map((r) => r.key));
