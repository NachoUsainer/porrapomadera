-- ===========================================================
--  MIGRACION: guardar IP para detectar cuentas duplicadas
--  signup_ip: IP al registrarse. last_ip: IP del último acceso.
--  Seguro: solo añade columnas nullable.
-- ===========================================================

alter table players add column if not exists signup_ip text;
alter table players add column if not exists last_ip text;
