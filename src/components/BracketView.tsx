"use client";

import { useState } from "react";

type View = "real" | "mine" | "rivals";

export default function BracketView({
  realSvg,
  hasTeams,
}: {
  realSvg: string;
  hasTeams: boolean;
}) {
  const [view, setView] = useState<View>("real");

  const Seg = ({ id, label }: { id: View; label: string }) => (
    <button
      type="button"
      onClick={() => setView(id)}
      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
        view === id ? "bg-white text-ink shadow-sm" : "text-subtle hover:text-ink"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="mb-4 inline-flex rounded-full bg-black/[0.05] p-0.5">
        <Seg id="real" label="Real" />
        <Seg id="mine" label="Mi cuadro" />
        <Seg id="rivals" label="Rivales" />
      </div>

      {view === "real" ? (
        <div>
          <div className="overflow-x-auto rounded-2xl border border-hair bg-white p-3">
            <div
              className="min-w-[1040px]"
              dangerouslySetInnerHTML={{ __html: realSvg }}
            />
          </div>
          <p className="mt-2 px-1 text-xs text-subtle">
            {hasTeams
              ? "Desliza para ver el cuadro completo. El ganador de cada cruce avanza solo a la siguiente ronda; en verde, quien pasa."
              : "Aún no hay cruces fijados. Cuando acaben los grupos, el admin asigna los 16avos y el resto del cuadro se va rellenando solo."}
          </p>
        </div>
      ) : (
        <Locked
          title={view === "mine" ? "Tu cuadro" : "Cuadros de los rivales"}
          text={
            view === "mine"
              ? "Podrás rellenar tu propio cuadro hasta el campeón cuando se cierren los grupos. Se bloquea al empezar los 16avos y puntúa por cada selección que acierte ronda."
              : "Cuando todos hayáis rellenado vuestro cuadro, aquí podrás cotillear los cuadros de cualquier rival, menos de Meo Lessi que lo he tirado al carrer."
          }
        />
      )}
    </div>
  );
}

function Locked({ title, text }: { title: string; text: string }) {
  return (
    <div className="card flex flex-col items-center gap-2 p-8 text-center">
      <span className="rounded-full bg-black/[0.05] px-3 py-1 text-xs font-medium text-subtle">
        Se desbloquea al cerrar los grupos
      </span>
      <p className="mt-1 font-semibold text-ink">{title}</p>
      <p className="max-w-sm text-sm text-subtle">{text}</p>
    </div>
  );
}
