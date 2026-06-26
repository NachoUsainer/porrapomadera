-- ===========================================================
--  CUADRO / BRACKET CHALLENGE  (Fase 2)
--  Cada jugador rellena su cuadro: por cada "hueco" (slot) elige
--  qué seleccion pasa. slot = "r32:1".."r32:16","r16:1".."r16:8",
--  "qf:1".."qf:4","sf:1","sf:2","final:1".
--  Editable hasta el primer partido de eliminatorias (lo controla
--  la app); luego se congela.
--  Ejecutar en el SQL Editor de Supabase.
-- ===========================================================

create table if not exists bracket_picks (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  slot text not null,
  team_id integer not null references teams(id) on delete cascade,
  updated_at timestamptz not null default now(),
  unique (player_id, slot)
);

create index if not exists bracket_picks_player_idx on bracket_picks(player_id);

alter table bracket_picks enable row level security;
