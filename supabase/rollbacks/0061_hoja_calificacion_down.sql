-- Rollback de 0061_hoja_calificacion
-- No toca la RPC vieja guardar_calificacion ni las columnas legado de 0054.

DROP FUNCTION IF EXISTS public.guardar_hoja_calificacion(integer, jsonb);
DROP TABLE IF EXISTS public.calificacion_defecto;
DROP TABLE IF EXISTS public.cat_defecto_calificacion;

ALTER TABLE public.calificacion_lote
  DROP COLUMN IF EXISTS nombre,
  DROP COLUMN IF EXISTS codigo,
  DROP COLUMN IF EXISTS fecha,
  DROP COLUMN IF EXISTS grado,
  DROP COLUMN IF EXISTS total_equivalencia,
  DROP COLUMN IF EXISTS total_defectos_verde,
  DROP COLUMN IF EXISTS color,
  DROP COLUMN IF EXISTS olor,
  DROP COLUMN IF EXISTS codigo_muestra_tostado,
  DROP COLUMN IF EXISTS quakers,
  DROP COLUMN IF EXISTS grado_tostado;

NOTIFY pgrst, 'reload schema';
