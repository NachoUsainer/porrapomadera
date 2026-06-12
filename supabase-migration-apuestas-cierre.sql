-- ===========================================================
--  MIGRACION: cierre automatico de apuestas
--  closes_at: si se rellena, la apuesta deja de aceptar dinero a esa hora
--  (normalmente el inicio de un partido). Si es null, cierre manual como antes.
--  Seguro: solo ANADE una columna nullable.
-- ===========================================================

alter table special_bets add column if not exists closes_at timestamptz;
