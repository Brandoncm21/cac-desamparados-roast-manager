-- 0046_fincas_ubicacion_altura_opcional.sql
-- Feature 005 (módulo de fincas) — ajustes pedidos por el dueño:
--   * `ubicacion`: detalle libre de la ubicación (la `zona` sigue siendo el catálogo `zonas_finca`).
--   * `altura` pasa a ser OPCIONAL (antes NOT NULL desde 0038); se muestra "—" cuando no hay dato.

ALTER TABLE public.fincas
  ADD COLUMN IF NOT EXISTS ubicacion varchar(200);

ALTER TABLE public.fincas
  ALTER COLUMN altura DROP NOT NULL;

COMMENT ON COLUMN public.fincas.ubicacion IS 'Ubicación libre / dirección de la finca (la zona es zonas_finca)';
COMMENT ON COLUMN public.fincas.altura IS 'Altura en msnm; opcional. Fuente única de la altura del lote (spec 004 D8)';
