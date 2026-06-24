-- ===========================================================
--  Correccion de cruces de eliminatorias al cuadro OFICIAL
--  FIFA Mundial 2026. Solo cambia las etiquetas (feeders) de
--  octavos y cuartos; las plazas de 16avos y sus fechas ya
--  estaban bien. No toca selecciones ni resultados.
--  Ejecutar en el SQL Editor de Supabase.
-- ===========================================================

update matches set label = 'Octavos #1: G.1/16-1 vs G.1/16-4' where stage = 'r16' and label like 'Octavos #1:%';
update matches set label = 'Octavos #2: G.1/16-3 vs G.1/16-6' where stage = 'r16' and label like 'Octavos #2:%';
update matches set label = 'Octavos #3: G.1/16-12 vs G.1/16-11' where stage = 'r16' and label like 'Octavos #3:%';
update matches set label = 'Octavos #4: G.1/16-10 vs G.1/16-9' where stage = 'r16' and label like 'Octavos #4:%';
update matches set label = 'Octavos #5: G.1/16-2 vs G.1/16-5' where stage = 'r16' and label like 'Octavos #5:%';
update matches set label = 'Octavos #6: G.1/16-7 vs G.1/16-8' where stage = 'r16' and label like 'Octavos #6:%';
update matches set label = 'Octavos #7: G.1/16-15 vs G.1/16-14' where stage = 'r16' and label like 'Octavos #7:%';
update matches set label = 'Octavos #8: G.1/16-13 vs G.1/16-16' where stage = 'r16' and label like 'Octavos #8:%';

update matches set label = 'Cuartos #1: G.Oct-2 vs G.Oct-1' where stage = 'qf' and label like 'Cuartos #1:%';
update matches set label = 'Cuartos #2: G.Oct-3 vs G.Oct-4' where stage = 'qf' and label like 'Cuartos #2:%';
update matches set label = 'Cuartos #3: G.Oct-5 vs G.Oct-6' where stage = 'qf' and label like 'Cuartos #3:%';
update matches set label = 'Cuartos #4: G.Oct-7 vs G.Oct-8' where stage = 'qf' and label like 'Cuartos #4:%';
