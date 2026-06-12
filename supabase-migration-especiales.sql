-- ===========================================================
--  MIGRACION: Predicciones especiales
--  (campeon de cada grupo + maximo goleador)
--  Ejecutar en Supabase -> SQL Editor. Es seguro: no toca lo existente
--  (usa "if not exists"), asi que no afecta a los jugadores ya registrados.
-- ===========================================================

-- Prediccion de campeon de grupo (una por jugador y grupo)
create table if not exists group_winner_predictions (
  id         uuid primary key default gen_random_uuid(),
  player_id  uuid not null references players(id) on delete cascade,
  group_name text not null,
  team_id    integer not null references teams(id),
  unique (player_id, group_name)
);

-- Resultado real del campeon de cada grupo (lo pone el admin)
create table if not exists group_results (
  group_name      text primary key,
  winner_team_id  integer references teams(id)
);

-- Prediccion de maximo goleador (texto libre: nombre del jugador)
create table if not exists scorer_predictions (
  id          uuid primary key default gen_random_uuid(),
  player_id   uuid not null references players(id) on delete cascade unique,
  player_name text not null
);

-- Ajustes globales (clave/valor). Aqui guardamos el goleador real.
create table if not exists settings (
  key   text primary key,
  value text
);

-- Seguridad: RLS activado sin politicas (acceso solo desde el servidor)
alter table group_winner_predictions enable row level security;
alter table group_results            enable row level security;
alter table scorer_predictions       enable row level security;
alter table settings                 enable row level security;
