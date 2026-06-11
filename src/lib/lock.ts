// Reglas de cierre de predicciones.
// Las predicciones se pueden cambiar hasta 2 HORAS ANTES del inicio del partido.
export const LOCK_BEFORE_MS = 2 * 60 * 60 * 1000; // 2 horas

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
