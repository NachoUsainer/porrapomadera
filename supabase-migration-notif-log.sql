-- ===========================================================
--  MIGRACION: registro persistente de notificaciones
--  Cada notificación se guarda (con el partido / tipo de acierto),
--  se marca como leída, y se puede repasar el historial.
--  Seguro: solo crea una tabla nueva.
-- ===========================================================

create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  player_id   uuid not null references players(id) on delete cascade,
  ref         text not null,            -- p.ej. 'match:12', 'bet:abc', 'group:A', 'scorer'
  text        text not null,
  kind        text,                     -- 'match' | 'group' | 'scorer' | 'bet'
  positive    boolean not null default true,
  points      integer not null default 0,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_player_idx on notifications (player_id, created_at desc);

alter table notifications enable row level security;
