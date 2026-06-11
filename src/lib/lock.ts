// Reglas de cierre de predicciones.
// Las predicciones se pueden cambiar hasta el INICIO del partido (kickoff).
export const LOCK_BEFORE_MS = 0; // sin margen: cierra justo al empezar

// ¿Está cerrada la predicción de este partido?
export function isMatchLocked(
  kickoff: string | null,
  finished: boolean,
  now: number = Date.now()
): boolean {
  if (finished) return true;
  if (!kickoff) return false; // sin fecha aún: se puede predecir
  return new Date(kickoff).getTime() - LOCK_BEFORE_MS <= now;
}
