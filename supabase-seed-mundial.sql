-- ============================================================
--  CALENDARIO MUNDIAL 2026  —  seed completo
--  Fuente: calendario de Marca (horas en CET/CEST = UTC+2).
--  Ejecútalo DESPUÉS de supabase-schema.sql, en Supabase -> SQL Editor.
--
--  Notas:
--   * Todas las horas se guardan como UTC+2 (CEST), la hora del calendario.
--   * Los partidos de eliminatorias se cargan SIN equipos (cruces por posición):
--     cuando se conozca cada cruce, asígnalo desde /admin con "Asignar cruce".
--   * El México–Sudáfrica ya está cargado con su resultado real (2-0).
-- ============================================================

-- Empezamos de cero (no toca la tabla de jugadores).
delete from matches;
delete from teams;

-- -------- 48 SELECCIONES (12 grupos) --------
insert into teams (name, group_name) values
  ('México','A'), ('Corea del Sur','A'), ('República Checa','A'), ('Sudáfrica','A'),
  ('Canadá','B'), ('Bosnia Herzegovina','B'), ('Qatar','B'), ('Suiza','B'),
  ('Brasil','C'), ('Marruecos','C'), ('Haití','C'), ('Escocia','C'),
  ('Estados Unidos','D'), ('Paraguay','D'), ('Australia','D'), ('Turquía','D'),
  ('Alemania','E'), ('Curaçao','E'), ('Costa de Marfil','E'), ('Ecuador','E'),
  ('Países Bajos','F'), ('Japón','F'), ('Suecia','F'), ('Túnez','F'),
  ('Bélgica','G'), ('Egipto','G'), ('Irán','G'), ('Nueva Zelanda','G'),
  ('España','H'), ('Cabo Verde','H'), ('Arabia Saudí','H'), ('Uruguay','H'),
  ('Francia','I'), ('Senegal','I'), ('Iraq','I'), ('Noruega','I'),
  ('Argentina','J'), ('Argelia','J'), ('Austria','J'), ('Jordania','J'),
  ('Portugal','K'), ('R.D. del Congo','K'), ('Uzbekistán','K'), ('Colombia','K'),
  ('Inglaterra','L'), ('Croacia','L'), ('Ghana','L'), ('Panamá','L');

-- Helper temporal: id de selección por nombre.
create or replace function tid(p text) returns int language sql stable as
$$ select id from teams where name = p $$;

-- -------- 72 PARTIDOS DE GRUPOS --------
insert into matches (stage, label, home_team_id, away_team_id, kickoff, home_score, away_score, finished) values
-- Grupo A
('group','Grupo A · J1', tid('México'),         tid('Sudáfrica'),        '2026-06-11 21:00+02', 2, 0, true),
('group','Grupo A · J1', tid('Corea del Sur'),  tid('República Checa'),  '2026-06-12 04:00+02', null, null, false),
('group','Grupo A · J2', tid('República Checa'),tid('Sudáfrica'),        '2026-06-18 18:00+02', null, null, false),
('group','Grupo A · J2', tid('México'),         tid('Corea del Sur'),    '2026-06-19 03:00+02', null, null, false),
('group','Grupo A · J3', tid('Sudáfrica'),      tid('Corea del Sur'),    '2026-06-25 03:00+02', null, null, false),
('group','Grupo A · J3', tid('República Checa'),tid('México'),           '2026-06-25 03:00+02', null, null, false),
-- Grupo B
('group','Grupo B · J1', tid('Canadá'),             tid('Bosnia Herzegovina'),'2026-06-12 21:00+02', null, null, false),
('group','Grupo B · J1', tid('Qatar'),              tid('Suiza'),             '2026-06-13 21:00+02', null, null, false),
('group','Grupo B · J2', tid('Suiza'),              tid('Bosnia Herzegovina'),'2026-06-18 21:00+02', null, null, false),
('group','Grupo B · J2', tid('Canadá'),             tid('Qatar'),             '2026-06-19 00:00+02', null, null, false),
('group','Grupo B · J3', tid('Suiza'),              tid('Canadá'),            '2026-06-24 21:00+02', null, null, false),
('group','Grupo B · J3', tid('Bosnia Herzegovina'),tid('Qatar'),             '2026-06-24 21:00+02', null, null, false),
-- Grupo C
('group','Grupo C · J1', tid('Brasil'),   tid('Marruecos'), '2026-06-14 00:00+02', null, null, false),
('group','Grupo C · J1', tid('Haití'),    tid('Escocia'),   '2026-06-14 03:00+02', null, null, false),
('group','Grupo C · J2', tid('Escocia'),  tid('Marruecos'), '2026-06-20 00:00+02', null, null, false),
('group','Grupo C · J2', tid('Brasil'),   tid('Haití'),     '2026-06-20 02:30+02', null, null, false),
('group','Grupo C · J3', tid('Escocia'),  tid('Brasil'),    '2026-06-25 00:00+02', null, null, false),
('group','Grupo C · J3', tid('Marruecos'),tid('Haití'),     '2026-06-25 00:00+02', null, null, false),
-- Grupo D
('group','Grupo D · J1', tid('Estados Unidos'),tid('Paraguay'),       '2026-06-13 03:00+02', null, null, false),
('group','Grupo D · J1', tid('Australia'),     tid('Turquía'),        '2026-06-14 06:00+02', null, null, false),
('group','Grupo D · J2', tid('Estados Unidos'),tid('Australia'),      '2026-06-19 21:00+02', null, null, false),
('group','Grupo D · J2', tid('Turquía'),       tid('Paraguay'),       '2026-06-20 05:00+02', null, null, false),
('group','Grupo D · J3', tid('Turquía'),       tid('Estados Unidos'), '2026-06-26 04:00+02', null, null, false),
('group','Grupo D · J3', tid('Paraguay'),      tid('Australia'),      '2026-06-26 04:00+02', null, null, false),
-- Grupo E
('group','Grupo E · J1', tid('Alemania'),       tid('Curaçao'),         '2026-06-14 19:00+02', null, null, false),
('group','Grupo E · J1', tid('Costa de Marfil'),tid('Ecuador'),         '2026-06-15 01:00+02', null, null, false),
('group','Grupo E · J2', tid('Alemania'),       tid('Costa de Marfil'), '2026-06-20 22:00+02', null, null, false),
('group','Grupo E · J2', tid('Ecuador'),        tid('Curaçao'),         '2026-06-21 02:00+02', null, null, false),
('group','Grupo E · J3', tid('Ecuador'),        tid('Alemania'),        '2026-06-25 22:00+02', null, null, false),
('group','Grupo E · J3', tid('Curaçao'),        tid('Costa de Marfil'), '2026-06-25 22:00+02', null, null, false),
-- Grupo F
('group','Grupo F · J1', tid('Países Bajos'),tid('Japón'),       '2026-06-14 22:00+02', null, null, false),
('group','Grupo F · J1', tid('Suecia'),      tid('Túnez'),       '2026-06-15 04:00+02', null, null, false),
('group','Grupo F · J2', tid('Países Bajos'),tid('Suecia'),      '2026-06-20 19:00+02', null, null, false),
('group','Grupo F · J2', tid('Túnez'),       tid('Japón'),       '2026-06-21 06:00+02', null, null, false),
('group','Grupo F · J3', tid('Túnez'),       tid('Países Bajos'),'2026-06-26 01:00+02', null, null, false),
('group','Grupo F · J3', tid('Japón'),       tid('Suecia'),      '2026-06-26 01:00+02', null, null, false),
-- Grupo G
('group','Grupo G · J1', tid('Bélgica'),       tid('Egipto'),        '2026-06-15 21:00+02', null, null, false),
('group','Grupo G · J1', tid('Irán'),          tid('Nueva Zelanda'), '2026-06-16 03:00+02', null, null, false),
('group','Grupo G · J2', tid('Bélgica'),       tid('Irán'),          '2026-06-21 21:00+02', null, null, false),
('group','Grupo G · J2', tid('Nueva Zelanda'), tid('Egipto'),        '2026-06-22 03:00+02', null, null, false),
('group','Grupo G · J3', tid('Nueva Zelanda'), tid('Bélgica'),       '2026-06-27 05:00+02', null, null, false),
('group','Grupo G · J3', tid('Egipto'),        tid('Irán'),          '2026-06-27 05:00+02', null, null, false),
-- Grupo H
('group','Grupo H · J1', tid('España'),       tid('Cabo Verde'),   '2026-06-15 18:00+02', null, null, false),
('group','Grupo H · J1', tid('Arabia Saudí'), tid('Uruguay'),      '2026-06-16 00:00+02', null, null, false),
('group','Grupo H · J2', tid('España'),       tid('Arabia Saudí'), '2026-06-21 18:00+02', null, null, false),
('group','Grupo H · J2', tid('Uruguay'),      tid('Cabo Verde'),   '2026-06-22 00:00+02', null, null, false),
('group','Grupo H · J3', tid('Uruguay'),      tid('España'),       '2026-06-27 02:00+02', null, null, false),
('group','Grupo H · J3', tid('Cabo Verde'),   tid('Arabia Saudí'), '2026-06-27 02:00+02', null, null, false),
-- Grupo I
('group','Grupo I · J1', tid('Francia'), tid('Senegal'), '2026-06-16 21:00+02', null, null, false),
('group','Grupo I · J1', tid('Iraq'),    tid('Noruega'), '2026-06-17 00:00+02', null, null, false),
('group','Grupo I · J2', tid('Francia'), tid('Iraq'),    '2026-06-22 23:00+02', null, null, false),
('group','Grupo I · J2', tid('Noruega'), tid('Senegal'), '2026-06-23 02:00+02', null, null, false),
('group','Grupo I · J3', tid('Senegal'), tid('Iraq'),    '2026-06-26 21:00+02', null, null, false),
('group','Grupo I · J3', tid('Noruega'), tid('Francia'), '2026-06-26 21:00+02', null, null, false),
-- Grupo J
('group','Grupo J · J1', tid('Argentina'),tid('Argelia'),  '2026-06-17 03:00+02', null, null, false),
('group','Grupo J · J1', tid('Austria'),  tid('Jordania'), '2026-06-17 06:00+02', null, null, false),
('group','Grupo J · J2', tid('Argentina'),tid('Austria'),  '2026-06-22 19:00+02', null, null, false),
('group','Grupo J · J2', tid('Jordania'), tid('Argelia'),  '2026-06-23 05:00+02', null, null, false),
('group','Grupo J · J3', tid('Jordania'), tid('Argentina'),'2026-06-28 04:00+02', null, null, false),
('group','Grupo J · J3', tid('Argelia'),  tid('Austria'),  '2026-06-28 04:00+02', null, null, false),
-- Grupo K
('group','Grupo K · J1', tid('Portugal'),      tid('R.D. del Congo'), '2026-06-17 19:00+02', null, null, false),
('group','Grupo K · J1', tid('Uzbekistán'),    tid('Colombia'),       '2026-06-18 04:00+02', null, null, false),
('group','Grupo K · J2', tid('Portugal'),      tid('Uzbekistán'),     '2026-06-23 19:00+02', null, null, false),
('group','Grupo K · J2', tid('Colombia'),      tid('R.D. del Congo'), '2026-06-24 04:00+02', null, null, false),
('group','Grupo K · J3', tid('R.D. del Congo'),tid('Uzbekistán'),     '2026-06-28 01:30+02', null, null, false),
('group','Grupo K · J3', tid('Colombia'),      tid('Portugal'),       '2026-06-28 01:30+02', null, null, false),
-- Grupo L
('group','Grupo L · J1', tid('Inglaterra'),tid('Croacia'),    '2026-06-17 22:00+02', null, null, false),
('group','Grupo L · J1', tid('Ghana'),     tid('Panamá'),     '2026-06-18 01:00+02', null, null, false),
('group','Grupo L · J2', tid('Inglaterra'),tid('Ghana'),      '2026-06-23 22:00+02', null, null, false),
('group','Grupo L · J2', tid('Panamá'),    tid('Croacia'),    '2026-06-24 01:00+02', null, null, false),
('group','Grupo L · J3', tid('Panamá'),    tid('Inglaterra'), '2026-06-27 23:00+02', null, null, false),
('group','Grupo L · J3', tid('Croacia'),   tid('Ghana'),      '2026-06-27 23:00+02', null, null, false);

-- -------- ELIMINATORIAS (cruces por posición; equipos a asignar luego) --------
-- Dieciseisavos (#1..#16 en el orden del cuadro)
insert into matches (stage, label, kickoff) values
('r32','1/16 #1 · 2ºA - 2ºB',                '2026-06-28 21:00+02'),
('r32','1/16 #2 · 1ºC - 2ºF',                '2026-06-29 19:00+02'),
('r32','1/16 #3 · 1ºE - 3º(A/B/C/D/F)',      '2026-06-29 22:30+02'),
('r32','1/16 #4 · 1ºF - 2ºC',                '2026-06-30 03:00+02'),
('r32','1/16 #5 · 2ºE - 2ºI',                '2026-06-30 19:00+02'),
('r32','1/16 #6 · 1ºI - 3º(C/D/F/G/H)',      '2026-06-30 23:00+02'),
('r32','1/16 #7 · 1ºA - 3º(C/E/F/H/I)',      '2026-07-01 03:00+02'),
('r32','1/16 #8 · 1ºL - 3º(E/H/I/J/K)',      '2026-07-01 18:00+02'),
('r32','1/16 #9 · 1ºG - 3º(A/E/H/I/J)',      '2026-07-01 22:00+02'),
('r32','1/16 #10 · 1ºD - 3º(B/E/F/I/J)',     '2026-07-02 02:00+02'),
('r32','1/16 #11 · 1ºH - 2ºJ',               '2026-07-02 21:00+02'),
('r32','1/16 #12 · 2ºK - 2ºL',               '2026-07-03 01:00+02'),
('r32','1/16 #13 · 1ºB - 3º(E/F/G/I/J)',     '2026-07-03 05:00+02'),
('r32','1/16 #14 · 2ºD - 2ºG',               '2026-07-03 20:00+02'),
('r32','1/16 #15 · 1ºJ - 2ºH',               '2026-07-04 00:00+02'),
('r32','1/16 #16 · 1ºK - 3º(D/E/I/J/L)',     '2026-07-04 03:30+02'),
-- Octavos (#1..#8): G.1/16-N = ganador del dieciseisavos N
('r16','Octavos #1 · G.1/16-1 - G.1/16-3',   '2026-07-04 19:00+02'),
('r16','Octavos #2 · G.1/16-2 - G.1/16-5',   '2026-07-04 23:00+02'),
('r16','Octavos #3 · G.1/16-11 - G.1/16-12', '2026-07-06 21:00+02'),
('r16','Octavos #4 · G.1/16-9 - G.1/16-10',  '2026-07-07 02:00+02'),
('r16','Octavos #5 · G.1/16-4 - G.1/16-6',   '2026-07-05 22:00+02'),
('r16','Octavos #6 · G.1/16-7 - G.1/16-8',   '2026-07-06 02:00+02'),
('r16','Octavos #7 · G.1/16-14 - G.1/16-16', '2026-07-07 18:00+02'),
('r16','Octavos #8 · G.1/16-13 - G.1/16-15', '2026-07-07 22:00+02'),
-- Cuartos (#1..#4): G.Oct-N = ganador del octavo N
('qf','Cuartos #1 · G.Oct-1 - G.Oct-2',      '2026-07-09 22:00+02'),
('qf','Cuartos #2 · G.Oct-5 - G.Oct-6',      '2026-07-10 21:00+02'),
('qf','Cuartos #3 · G.Oct-3 - G.Oct-4',      '2026-07-11 23:00+02'),
('qf','Cuartos #4 · G.Oct-7 - G.Oct-8',      '2026-07-12 03:00+02'),
-- Semifinales: G.Cuartos-N = ganador del cuarto N
('sf','Semifinal #1 · G.Cuartos-1 - G.Cuartos-2', '2026-07-14 21:00+02'),
('sf','Semifinal #2 · G.Cuartos-3 - G.Cuartos-4', '2026-07-15 21:00+02'),
-- 3er y 4º puesto: perdedores de semis
('third','3º y 4º · P.Semi-1 - P.Semi-2',    '2026-07-18 23:00+02'),
-- Final: ganadores de semis
('final','Final · G.Semi-1 - G.Semi-2',      '2026-07-19 21:00+02');

-- Limpiamos el helper.
drop function tid(text);

-- Comprobación rápida (debería dar 104 partidos y 48 selecciones).
-- select (select count(*) from matches) as partidos, (select count(*) from teams) as selecciones;
