-- ===========================================================
--  MIGRACION: Muro de mensajes + menciones (@)
--  Seguro: solo crea tablas nuevas.
-- ===========================================================

create table if not exists messages (
  id          uuid primary key default gen_random_uuid(),
  player_id   uuid not null references players(id) on delete cascade,
  text        text not null,
  created_at  timestamptz not null default now()
);

create table if not exists message_mentions (
  message_id  uuid not null references messages(id) on delete cascade,
  player_id   uuid not null references players(id) on delete cascade,
  primary key (message_id, player_id)
);

create index if not exists messages_created_idx on messages (created_at desc);

alter table messages         enable row level security;
alter table message_mentions enable row level security;
