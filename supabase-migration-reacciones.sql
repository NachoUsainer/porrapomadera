-- ===========================================================
--  MIGRACION: reacciones a los mensajes del muro
--  Una reaccion por jugador y mensaje (como Facebook).
--  Seguro: solo crea una tabla nueva.
-- ===========================================================

create table if not exists message_reactions (
  message_id  uuid not null references messages(id) on delete cascade,
  player_id   uuid not null references players(id) on delete cascade,
  reaction    text not null,
  created_at  timestamptz not null default now(),
  primary key (message_id, player_id)
);

alter table message_reactions enable row level security;
