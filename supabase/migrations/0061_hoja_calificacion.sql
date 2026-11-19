-- 0061: Hoja de calificación de café arábiga verde y tostado
-- Reutiliza calificacion_lote (1:1 con el lote) y conserva las columnas
-- anteriores como legado nullable. No modifica la RPC vieja para permitir rollback.

ALTER TABLE public.calificacion_lote
  ADD COLUMN IF NOT EXISTS nombre varchar(150),
  ADD COLUMN IF NOT EXISTS codigo varchar(100),
  ADD COLUMN IF NOT EXISTS fecha date,
  ADD COLUMN IF NOT EXISTS grado varchar(30),
  ADD COLUMN IF NOT EXISTS total_equivalencia numeric(10,2),
  ADD COLUMN IF NOT EXISTS total_defectos_verde integer,
  ADD COLUMN IF NOT EXISTS color varchar(30),
  ADD COLUMN IF NOT EXISTS olor varchar(30),
  ADD COLUMN IF NOT EXISTS codigo_muestra_tostado varchar(100),
  ADD COLUMN IF NOT EXISTS quakers integer,
  ADD COLUMN IF NOT EXISTS grado_tostado varchar(30);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'calificacion_lote_grado_check') THEN
    ALTER TABLE public.calificacion_lote
      ADD CONSTRAINT calificacion_lote_grado_check
      CHECK (grado IS NULL OR grado IN ('Specialty', 'Premium', 'Exchange', 'Below Standard'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'calificacion_lote_grado_tostado_check') THEN
    ALTER TABLE public.calificacion_lote
      ADD CONSTRAINT calificacion_lote_grado_tostado_check
      CHECK (grado_tostado IS NULL OR grado_tostado IN ('Specialty', 'Premium', 'Exchange', 'Below Standard'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'calificacion_lote_total_equivalencia_check') THEN
    ALTER TABLE public.calificacion_lote
      ADD CONSTRAINT calificacion_lote_total_equivalencia_check
      CHECK (total_equivalencia IS NULL OR total_equivalencia >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'calificacion_lote_total_defectos_verde_check') THEN
    ALTER TABLE public.calificacion_lote
      ADD CONSTRAINT calificacion_lote_total_defectos_verde_check
      CHECK (total_defectos_verde IS NULL OR total_defectos_verde >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'calificacion_lote_color_check') THEN
    ALTER TABLE public.calificacion_lote
      ADD CONSTRAINT calificacion_lote_color_check
      CHECK (
        color IS NULL OR color IN (
          'Azul-Verde', 'Azulado-Verde', 'Verde', 'Verdoso',
          'Amarillo-Verde', 'Amarillo pálido', 'Amarillo', 'Cafezoso'
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'calificacion_lote_olor_check') THEN
    ALTER TABLE public.calificacion_lote
      ADD CONSTRAINT calificacion_lote_olor_check
      CHECK (olor IS NULL OR olor IN ('Olor extraño', 'Limpio'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'calificacion_lote_quakers_check') THEN
    ALTER TABLE public.calificacion_lote
      ADD CONSTRAINT calificacion_lote_quakers_check
      CHECK (quakers IS NULL OR quakers >= 0);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.cat_defecto_calificacion (
  id_defecto      serial PRIMARY KEY,
  codigo          varchar(60) NOT NULL UNIQUE,
  nombre          varchar(150) NOT NULL,
  tipo_cafe       varchar(10) NOT NULL CHECK (tipo_cafe IN ('verde', 'tostado')),
  categoria       smallint CHECK (categoria IN (1, 2)),
  proporcion      integer NOT NULL CHECK (proporcion > 0),
  orden           integer NOT NULL,
  activo          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cat_defecto_calificacion_tipo_categoria_check
    CHECK (
      (tipo_cafe = 'verde' AND categoria IN (1, 2))
      OR (tipo_cafe = 'tostado' AND categoria IS NULL)
    )
);

DROP TRIGGER IF EXISTS cat_defecto_calificacion_updated_at ON public.cat_defecto_calificacion;
CREATE TRIGGER cat_defecto_calificacion_updated_at
  BEFORE UPDATE ON public.cat_defecto_calificacion
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.cat_defecto_calificacion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cat_defecto_calificacion_select ON public.cat_defecto_calificacion;
CREATE POLICY cat_defecto_calificacion_select ON public.cat_defecto_calificacion
  FOR SELECT TO authenticated USING (activo);

REVOKE ALL ON public.cat_defecto_calificacion FROM anon;
GRANT SELECT ON public.cat_defecto_calificacion TO authenticated;
GRANT ALL ON public.cat_defecto_calificacion TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.cat_defecto_calificacion_id_defecto_seq TO authenticated, service_role;

INSERT INTO public.cat_defecto_calificacion (codigo, nombre, tipo_cafe, categoria, proporcion, orden)
VALUES
  ('negro_completo', 'Negro completo', 'verde', 1, 1, 1),
  ('agrio_completo', 'Agrio completo', 'verde', 1, 1, 2),
  ('cereza_seca', 'Cereza seca', 'verde', 1, 1, 3),
  ('danado_hongos', 'Dañado por hongos', 'verde', 1, 1, 4),
  ('dano_severo_insecto', 'Daño severo de insecto', 'verde', 1, 5, 5),
  ('materia_extrana', 'Materia extraña', 'verde', 1, 1, 6),
  ('negro_parcial', 'Negro parcial', 'verde', 2, 3, 7),
  ('agrio_parcial', 'Agrio parcial', 'verde', 2, 3, 8),
  ('pergamino', 'Pergamino', 'verde', 2, 5, 9),
  ('flotador', 'Flotador', 'verde', 2, 5, 10),
  ('inmaduro', 'Inmaduro', 'verde', 2, 5, 11),
  ('averanado', 'Averanado', 'verde', 2, 5, 12),
  ('concha', 'Concha', 'verde', 2, 5, 13),
  ('quebrado_cortado_mordido', 'Quebrado / cortado / mordido', 'verde', 2, 5, 14),
  ('cascara_pulpa', 'Cáscara / pulpa', 'verde', 2, 5, 15),
  ('dano_ligero_insecto', 'Daño ligero de insecto', 'verde', 2, 10, 16),
  ('quaker', 'Quaker (café inmaduro)', 'tostado', NULL, 1, 100)
ON CONFLICT (codigo) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.calificacion_defecto (
  id_calificacion_defecto serial PRIMARY KEY,
  id_calificacion           integer NOT NULL REFERENCES public.calificacion_lote(id_calificacion) ON DELETE CASCADE,
  id_defecto                integer NOT NULL REFERENCES public.cat_defecto_calificacion(id_defecto) ON DELETE RESTRICT,
  numero_defectos           integer NOT NULL CHECK (numero_defectos >= 0),
  proporcion                integer NOT NULL CHECK (proporcion > 0),
  equivalencia              numeric(10,2) NOT NULL CHECK (equivalencia >= 0),
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT calificacion_defecto_unica UNIQUE (id_calificacion, id_defecto)
);

CREATE INDEX IF NOT EXISTS idx_calificacion_defecto_calificacion
  ON public.calificacion_defecto (id_calificacion);

DROP TRIGGER IF EXISTS calificacion_defecto_updated_at ON public.calificacion_defecto;
CREATE TRIGGER calificacion_defecto_updated_at
  BEFORE UPDATE ON public.calificacion_defecto
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.calificacion_defecto ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS calificacion_defecto_select ON public.calificacion_defecto;
CREATE POLICY calificacion_defecto_select ON public.calificacion_defecto
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS calificacion_defecto_insert ON public.calificacion_defecto;
CREATE POLICY calificacion_defecto_insert ON public.calificacion_defecto
  FOR INSERT TO authenticated
  WITH CHECK (get_empleado_rol() = ANY (ARRAY['Tostador', 'Admin']));

DROP POLICY IF EXISTS calificacion_defecto_update ON public.calificacion_defecto;
CREATE POLICY calificacion_defecto_update ON public.calificacion_defecto
  FOR UPDATE TO authenticated
  USING (get_empleado_rol() = ANY (ARRAY['Tostador', 'Admin']))
  WITH CHECK (true);

REVOKE ALL ON public.calificacion_defecto FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.calificacion_defecto TO authenticated;
GRANT ALL ON public.calificacion_defecto TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.calificacion_defecto_id_calificacion_defecto_seq TO authenticated, service_role;

-- RPC nueva: no reemplaza guardar_calificacion para mantener rollback limpio.
CREATE OR REPLACE FUNCTION public.guardar_hoja_calificacion(p_id_lote integer, p_datos jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_rol text := get_empleado_rol();
  v_id integer;
  v_def record;
  v_conteo integer;
  v_equivalencia numeric;
  v_total_defectos integer := 0;
  v_total_equivalencia numeric := 0;
  v_cat1 integer := 0;
  v_quakers integer;
  v_grado text;
  v_grado_tostado text;
  v_fecha date;
BEGIN
  IF v_rol NOT IN ('Tostador', 'Admin') THEN
    RAISE EXCEPTION 'Solo Tostador o Admin pueden registrar la hoja de calificación'
      USING ERRCODE = '42501';
  END IF;

  IF p_datos IS NULL THEN
    RAISE EXCEPTION 'Datos de calificación faltantes' USING ERRCODE = '22023';
  END IF;

  PERFORM public._ben_lote_editable(p_id_lote);

  SELECT id_calificacion INTO v_id
    FROM public.calificacion_lote
   WHERE id_lote = p_id_lote AND deleted_at IS NULL;

  IF v_id IS NULL THEN
    INSERT INTO public.calificacion_lote (id_lote, calificado_por)
    VALUES (
      p_id_lote,
      (SELECT id_empleado FROM empleados WHERE id_auth = auth.uid() LIMIT 1)
    )
    RETURNING id_calificacion INTO v_id;
  END IF;

  FOR v_def IN
    SELECT id_defecto, categoria, proporcion
      FROM public.cat_defecto_calificacion
     WHERE tipo_cafe = 'verde' AND activo
     ORDER BY orden
  LOOP
    v_conteo := COALESCE((
      SELECT (elem->>'numero_defectos')::integer
        FROM jsonb_array_elements(COALESCE(p_datos->'defectos', '[]'::jsonb)) elem
       WHERE (elem->>'id_defecto')::integer = v_def.id_defecto
       LIMIT 1
    ), 0);

    v_equivalencia := ROUND(v_conteo::numeric / v_def.proporcion, 2);
    v_total_defectos := v_total_defectos + v_conteo;
    v_total_equivalencia := v_total_equivalencia + v_equivalencia;
    IF v_def.categoria = 1 THEN
      v_cat1 := v_cat1 + v_conteo;
    END IF;

    INSERT INTO public.calificacion_defecto (
      id_calificacion, id_defecto, numero_defectos, proporcion, equivalencia
    ) VALUES (
      v_id, v_def.id_defecto, v_conteo, v_def.proporcion, v_equivalencia
    )
    ON CONFLICT (id_calificacion, id_defecto) DO UPDATE SET
      numero_defectos = EXCLUDED.numero_defectos,
      proporcion = EXCLUDED.proporcion,
      equivalencia = EXCLUDED.equivalencia,
      updated_at = now();
  END LOOP;

  v_quakers := public._ben_int(p_datos, 'quakers');
  v_fecha := public._ben_date(p_datos, 'fecha');
  v_grado := public._ben_text(p_datos, 'grado');
  v_grado_tostado := public._ben_text(p_datos, 'grado_tostado');

  IF v_grado IS NULL THEN
    v_grado := CASE
      WHEN v_cat1 = 0 AND v_total_equivalencia <= 5 THEN 'Specialty'
      WHEN v_total_equivalencia <= 8 THEN 'Premium'
      WHEN v_total_equivalencia <= 23 THEN 'Exchange'
      ELSE 'Below Standard'
    END;
  END IF;

  IF v_grado_tostado IS NULL THEN
    v_grado_tostado := CASE
      WHEN COALESCE(v_quakers, 0) = 0 THEN 'Specialty'
      WHEN COALESCE(v_quakers, 0) <= 3 THEN 'Premium'
      ELSE 'Exchange'
    END;
  END IF;

  UPDATE public.calificacion_lote SET
    nombre = public._ben_text(p_datos, 'nombre'),
    codigo = public._ben_text(p_datos, 'codigo'),
    fecha = v_fecha,
    humedad = public._ben_num(p_datos, 'humedad'),
    grado = v_grado,
    total_equivalencia = v_total_equivalencia,
    total_defectos_verde = v_total_defectos,
    color = public._ben_text(p_datos, 'color'),
    olor = public._ben_text(p_datos, 'olor'),
    codigo_muestra_tostado = public._ben_text(p_datos, 'codigo_muestra_tostado'),
    quakers = v_quakers,
    grado_tostado = v_grado_tostado,
    calificado_por = (SELECT id_empleado FROM empleados WHERE id_auth = auth.uid() LIMIT 1),
    updated_at = now()
  WHERE id_calificacion = v_id;

  IF v_grado IS NOT NULL AND v_grado_tostado IS NOT NULL THEN
    PERFORM public._ben_avanzar(p_id_lote, 'Calificado');
  END IF;

  RETURN jsonb_build_object(
    'calificacion', (
      SELECT to_jsonb(c.*) FROM public.calificacion_lote c WHERE c.id_calificacion = v_id
    ),
    'defectos', (
      SELECT COALESCE(jsonb_agg(to_jsonb(d.*) ORDER BY d.id_calificacion_defecto), '[]'::jsonb)
        FROM public.calificacion_defecto d
       WHERE d.id_calificacion = v_id
    ),
    'enproceso', (SELECT enproceso FROM public.lotes_cafe WHERE id_lote = p_id_lote)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.guardar_hoja_calificacion(integer, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.guardar_hoja_calificacion(integer, jsonb) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
