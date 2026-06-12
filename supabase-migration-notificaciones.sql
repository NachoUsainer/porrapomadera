-- ===========================================================
--  MIGRACION: Notificaciones (campanita)
--  Guarda en cada jugador el ultimo "estado visto" para saber que es nuevo.
--  Seguro: solo ANADE una columna nullable, no borra ni cambia datos.
-- ===========================================================

alter table players add column if not exists seen_state text;
