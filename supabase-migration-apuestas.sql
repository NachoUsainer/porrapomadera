-- ===========================================================
--  MIGRACION: Apuestas especiales (binarias SI/NO, doble o nada)
--  Ejecutar en Supabase -> SQL Editor. Seguro: usa "if not exists".
-- ===========================================================

-- Apuestas que crea el admin. Se cierran a mano (is_open=false).
-- outcome: null = sin resolver, true = SI ocurrio, false = NO ocurrio.
create table if not exists special_bets (
  id          uuid primary key default gen_random_uuid(),
  question    text not null,
  is_open     boolean not null default true,
  outcome     boolean,
  created_at  timestamptz not null default now()
);

-- Apuesta de un jugador: SOLO se apuesta a que SI ocurre. stake = puntos jugados.
-- Si la apuesta se resuelve SI -> gana +stake; si NO -> pierde -stake (doble o nada).
create table if not exists bet_wagers (
  id          uuid primary key default gen_random_uuid(),
  bet_id      uuid not null references special_bets(id) on delete cascade,
  player_id   uuid not null references players(id) on delete cascade,
  stake       integer not null check (stake >= 1),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (bet_id, player_id)
);

create index if not exists bet_wagers_bet_idx on bet_wagers (bet_id);
create index if not exists bet_wagers_player_idx on bet_wagers (player_id);

alter table special_bets enable row level security;
alter table bet_wagers   enable row level security;
