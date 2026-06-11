-- ============================================================
--  PORRA DEL MUNDIAL  —  Esquema de base de datos (Supabase / Postgres)
--  Pega este archivo entero en Supabase -> SQL Editor -> New query -> Run
-- ============================================================

-- Limpieza (por si lo ejecutas más de una vez)
drop table if exists predictions cascade;
drop table if exists matches cascade;
drop table if exists teams cascade;
drop table if exists players cascade;

-- -------- JUGADORES (tus amigos) --------
create table players (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  name_key    text not null unique,          -- nombre normalizado (minúsculas) para evitar duplicados
  pin_hash    text not null,                 -- hash del PIN de 4 dígitos
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- -------- SELECCIONES --------
create table teams (
  id          serial primary key,
  name        text not null,
  code        text,                          -- ej: ESP, ARG (opcional)
  group_name  text                           -- ej: 'A', 'B'... (opcional)
);

-- -------- PARTIDOS --------
-- stage: 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'third' | 'final'
create table matches (
  id            serial primary key,
  stage         text not null default 'group',
  label         text,                         -- ej: 'Jornada 1', 'Octavos A'
  home_team_id  integer references teams(id),
  away_team_id  integer references teams(id),
  kickoff       timestamptz,                  -- a partir de esta hora se bloquean las predicciones
  home_score    integer,                      -- resultado REAL (lo mete el admin)
  away_score    integer,
  -- en eliminatorias, equipo que pasa (por si hay penaltis); lo mete el admin
  advance_team_id integer references teams(id),
  finished      boolean not null default false,
  created_at    timestamptz not null default now()
);

-- -------- PREDICCIONES --------
create table predictions (
  id            uuid primary key default gen_random_uuid(),
  player_id     uuid not null references players(id) on delete cascade,
  match_id      integer not null references matches(id) on delete cascade,
  home_score    integer not null,
  away_score    integer not null,
  -- en eliminatorias: quién cree el jugador que clasifica
  advance_team_id integer references teams(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (player_id, match_id)
);

create index on predictions (match_id);
create index on predictions (player_id);
create index on matches (kickoff);

-- -------- SEGURIDAD --------
-- Activamos RLS y NO creamos políticas: así el acceso anónimo desde el navegador
-- queda bloqueado. La app accede siempre desde el servidor con la clave service_role,
-- que se salta RLS. (Nunca expongas la service_role key en el navegador.)
alter table players     enable row level security;
alter table teams       enable row level security;
alter table matches     enable row level security;
alter table predictions enable row level security;
