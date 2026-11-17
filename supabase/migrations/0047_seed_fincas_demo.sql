-- 0047_seed_fincas_demo.sql
-- Datos de ejemplo para poder crear lotes con los productores demo 2–5
-- (sin esto esos clientes no tienen fincas y el selector aparece vacío).
--
-- Idempotente: no duplica por (cliente, nombre). No usa ids fijos: resuelve por
-- nombre de cliente y de zona. Para quitarlas:
--   UPDATE fincas SET deleted_at = now()
--   WHERE nombre IN ('Finca Los Santos','Finca Alto Los Santos','Finca El Valle','Finca Doña Ana','Finca La Amistad');

INSERT INTO public.fincas (cliente_id, nombre, zona_id, ubicacion, altura)
SELECT c.id_cliente, v.nombre, z.id_zona, v.ubicacion, v.altura
FROM (VALUES
  ('Cooperativa Los Santos', 'Finca Los Santos',      'Los Santos',    'Santa María de Dota, costado este del beneficio', 1450::numeric),
  ('Cooperativa Los Santos', 'Finca Alto Los Santos', 'Los Santos',    'Parte alta de Santa María de Dota',              1750::numeric),
  ('Beneficio El Valle',     'Finca El Valle',        'Valle Central', 'Grecia, Alajuela; 2 km al norte de la plaza',    1150::numeric),
  ('Cafetalera Doña Ana',    'Finca Doña Ana',        'Brunca',        'Pérez Zeledón, camino a San Isidro',              900::numeric),
  ('Hacienda La Amistad',    'Finca La Amistad',      'Turrialba',     'Turrialba, 3 km hacia Santa Cruz',               1050::numeric)
) AS v(cliente, nombre, zona, ubicacion, altura)
JOIN public.clientes c ON c.nombre_completo = v.cliente AND c.deleted_at IS NULL
LEFT JOIN public.zonas_finca z ON z.nombre = v.zona
WHERE NOT EXISTS (
  SELECT 1 FROM public.fincas f
  WHERE f.cliente_id = c.id_cliente
    AND f.nombre = v.nombre
    AND f.deleted_at IS NULL
);
