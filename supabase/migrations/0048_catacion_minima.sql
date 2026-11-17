-- 0048 — Catación mínima: lote + catado + notas
--
-- Decisión del dueño (2026-11-17): borrado directo, sin tabla de respaldo.
-- Se retiran los 49 atributos heredados de CoffeeBeanFlow y la tabla
-- `catacion_rondas`. Regla nueva: toda catación pertenece a un lote válido.

-- 1. Filas sin lote: incompatibles con `id_lote NOT NULL`.
DELETE FROM public.catacion_tueste WHERE id_lote IS NULL;

-- 2. La RPC leía todas las columnas retiradas; se reemplaza al final.
DROP FUNCTION IF EXISTS public.guardar_catacion(jsonb, jsonb);

-- 3. Rondas de calidad: se eliminan con sus políticas.
DROP TABLE IF EXISTS public.catacion_rondas;

-- 4. Constraints que citan columnas retiradas.
ALTER TABLE public.catacion_tueste
  DROP CONSTRAINT IF EXISTS catacion_rangos,
  DROP CONSTRAINT IF EXISTS catacion_tueste_nlote_fkey,
  DROP CONSTRAINT IF EXISTS catacion_tueste_perfil_tueste_ref_fkey,
  DROP CONSTRAINT IF EXISTS catacion_tueste_producto_analizado_check;

-- 5. Atributos heredados (evaluación físico-visual, defectos C1/C2,
--    zarandas y Agtron) más el enlace al perfil de tueste y el texto libre.
ALTER TABLE public.catacion_tueste
  DROP COLUMN IF EXISTS perfil_tueste_ref,
  DROP COLUMN IF EXISTS producto_analizado,
  DROP COLUMN IF EXISTS nlote,
  DROP COLUMN IF EXISTS ffreposo,
  DROP COLUMN IF EXISTS pfinales,
  DROP COLUMN IF EXISTS limpio,
  DROP COLUMN IF EXISTS defectuoso,
  DROP COLUMN IF EXISTS overde,
  DROP COLUMN IF EXISTS ccverde,
  DROP COLUMN IF EXISTS quaker,
  DROP COLUMN IF EXISTS rtostado,
  DROP COLUMN IF EXISTS dfueste,
  DROP COLUMN IF EXISTS cccalidad,
  DROP COLUMN IF EXISTS c1agrio,
  DROP COLUMN IF EXISTS c1hongos,
  DROP COLUMN IF EXISTS c1cerezaseca,
  DROP COLUMN IF EXISTS c1negro,
  DROP COLUMN IF EXISTS c1insectos,
  DROP COLUMN IF EXISTS c1me,
  DROP COLUMN IF EXISTS c2flotador,
  DROP COLUMN IF EXISTS c2averanado,
  DROP COLUMN IF EXISTS c2pergamino,
  DROP COLUMN IF EXISTS c2inmaduro,
  DROP COLUMN IF EXISTS c2concha,
  DROP COLUMN IF EXISTS c2insectos,
  DROP COLUMN IF EXISTS c2cascara,
  DROP COLUMN IF EXISTS c2pulpa,
  DROP COLUMN IF EXISTS c2partido,
  DROP COLUMN IF EXISTS c2cortado,
  DROP COLUMN IF EXISTS c2mordido,
  DROP COLUMN IF EXISTS c2negrop,
  DROP COLUMN IF EXISTS c2agriop,
  DROP COLUMN IF EXISTS tres_sobre_dieciseis,
  DROP COLUMN IF EXISTS veinte,
  DROP COLUMN IF EXISTS diecinueve,
  DROP COLUMN IF EXISTS dieciocho,
  DROP COLUMN IF EXISTS diecisiete,
  DROP COLUMN IF EXISTS dieciseis,
  DROP COLUMN IF EXISTS quince,
  DROP COLUMN IF EXISTS catorce,
  DROP COLUMN IF EXISTS trece,
  DROP COLUMN IF EXISTS tonagton_25,
  DROP COLUMN IF EXISTS tonagton_35,
  DROP COLUMN IF EXISTS tonagton_45,
  DROP COLUMN IF EXISTS tonagton_55,
  DROP COLUMN IF EXISTS tonagton_65,
  DROP COLUMN IF EXISTS tonagton_75,
  DROP COLUMN IF EXISTS tonagton_85,
  DROP COLUMN IF EXISTS tonagton_95;

-- 6. Lo único que se conserva del dominio: ¿se cató? y las notas.
ALTER TABLE public.catacion_tueste
  ADD COLUMN IF NOT EXISTS catado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notas_catacion text;

-- 7. Vínculo estricto con el lote: obligatorio y único entre los vivos.
ALTER TABLE public.catacion_tueste ALTER COLUMN id_lote SET NOT NULL;

ALTER TABLE public.catacion_tueste
  DROP CONSTRAINT IF EXISTS catacion_tueste_id_lote_fkey;
ALTER TABLE public.catacion_tueste
  ADD CONSTRAINT catacion_tueste_id_lote_fkey
  FOREIGN KEY (id_lote) REFERENCES public.lotes_cafe(id_lote) ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS catacion_tueste_id_lote_uidx
  ON public.catacion_tueste (id_lote)
  WHERE deleted_at IS NULL;

-- 8. RPC mínima: una catación por lote (upsert por lote).
CREATE OR REPLACE FUNCTION public.guardar_catacion(p_catacion jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_rol text := get_empleado_rol();
  v_id integer;
  v_lote integer;
  v_catado boolean;
  v_notas text;
  v_enproceso text;
BEGIN
  IF v_rol NOT IN ('Tostador', 'Admin') THEN
    RAISE EXCEPTION 'Solo Tostador o Admin pueden registrar la catación';
  END IF;

  IF p_catacion IS NULL THEN
    RAISE EXCEPTION 'Datos de catación faltantes';
  END IF;

  v_lote := NULLIF(btrim(COALESCE(p_catacion->>'id_lote', '')), '')::integer;
  IF v_lote IS NULL THEN
    RAISE EXCEPTION 'La catación debe estar vinculada a un lote';
  END IF;

  SELECT l.enproceso INTO v_enproceso
    FROM lotes_cafe l
   WHERE l.id_lote = v_lote AND l.deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El lote indicado no existe o fue eliminado';
  END IF;

  v_catado := COALESCE((p_catacion->>'catado')::boolean, false);
  v_notas := NULLIF(btrim(COALESCE(p_catacion->>'notas_catacion', '')), '');

  IF (p_catacion ? 'id_catacion_tueste') AND NULLIF(p_catacion->>'id_catacion_tueste', '') IS NOT NULL THEN
    UPDATE catacion_tueste
       SET id_lote = v_lote,
           catado = v_catado,
           notas_catacion = v_notas,
           updated_at = now()
     WHERE id_catacion_tueste = (p_catacion->>'id_catacion_tueste')::integer
       AND deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Catación no encontrada';
    END IF;

    v_id := (p_catacion->>'id_catacion_tueste')::integer;
  ELSE
    -- Una sola catación viva por lote: si ya existe, se actualiza.
    SELECT ct.id_catacion_tueste INTO v_id
      FROM catacion_tueste ct
     WHERE ct.id_lote = v_lote AND ct.deleted_at IS NULL;

    IF v_id IS NOT NULL THEN
      UPDATE catacion_tueste
         SET catado = v_catado,
             notas_catacion = v_notas,
             updated_at = now()
       WHERE id_catacion_tueste = v_id;
    ELSE
      INSERT INTO catacion_tueste (id_lote, catado, notas_catacion)
      VALUES (v_lote, v_catado, v_notas)
      RETURNING id_catacion_tueste INTO v_id;
    END IF;
  END IF;

  -- Estado del lote: catado lo mueve a 'En Catación'; desmarcarlo lo devuelve
  -- a 'No' solo si seguía en esa etapa (no pisa 'Vendido' ni etapas previas).
  IF v_catado THEN
    UPDATE lotes_cafe
       SET enproceso = 'En Catación'
     WHERE id_lote = v_lote AND deleted_at IS NULL AND enproceso <> 'Vendido';
  ELSE
    UPDATE lotes_cafe
       SET enproceso = 'No'
     WHERE id_lote = v_lote AND deleted_at IS NULL AND enproceso = 'En Catación';
  END IF;

  RETURN jsonb_build_object(
    'catacion', (SELECT to_jsonb(ct.*) FROM catacion_tueste ct WHERE ct.id_catacion_tueste = v_id)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.guardar_catacion(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guardar_catacion(jsonb) TO authenticated, service_role;
