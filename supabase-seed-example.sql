-- ============================================================
--  DATOS DE EJEMPLO (opcional) — para probar la app rápido.
--  Ejecútalo DESPUÉS de supabase-schema.sql.
--  Luego puedes borrar todo y meter los datos reales desde /admin.
-- ============================================================

insert into teams (name, code, group_name) values
  ('España', 'ESP', 'A'),
  ('Argentina', 'ARG', 'A'),
  ('Francia', 'FRA', 'A'),
  ('Brasil', 'BRA', 'A'),
  ('Alemania', 'GER', 'B'),
  ('Portugal', 'POR', 'B'),
  ('Inglaterra', 'ENG', 'B'),
  ('Países Bajos', 'NED', 'B');

-- Un par de partidos de grupo de ejemplo.
-- Nota: ajusta las fechas; si la fecha ya pasó, el partido saldrá "cerrado".
insert into matches (stage, label, home_team_id, away_team_id, kickoff)
select 'group', 'Jornada 1',
       (select id from teams where code = 'ESP'),
       (select id from teams where code = 'ARG'),
       now() + interval '2 days';

insert into matches (stage, label, home_team_id, away_team_id, kickoff)
select 'group', 'Jornada 1',
       (select id from teams where code = 'FRA'),
       (select id from teams where code = 'BRA'),
       now() + interval '2 days';

-- Un partido de octavos de ejemplo (con bonus de "quién clasifica").
insert into matches (stage, label, home_team_id, away_team_id, kickoff)
select 'r16', 'Octavos 1',
       (select id from teams where code = 'GER'),
       (select id from teams where code = 'POR'),
       now() + interval '10 days';
