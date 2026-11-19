-- 0054 — Calificación de café arábiga (verde y tostado)
--
-- Cierra el punto 7 del flujo: una evaluación final por lote, en dos bloques
-- (verde y tostado) dentro de la misma fila 1:1. No revive los 48 atributos
-- retirados en 0048: es una entidad propia y explícita.

-- 1. Nuevo estado del flujo: Calificado entre Catado y Vendido.
ALTER TABLE public.lotes_cafe DROP CONSTRAINT IF EXISTS lotes_cafe_enproceso_check;
ALTER TABLE public.lotes_cafe
  ADD CONSTRAINT lotes_cafe_enproceso_check
  CHECK (enproceso = ANY (ARRAY[
    'Recibido',
    'En Caracterización',
    'En Secado',
    'En Bodega',
    'En Trilla',
    'Catado',
    'Calificado',
    'Vendido'
  ]::text[]));

-- 2. Tabla 1:1 con el lote.
CREATE TABLE IF NOT EXISTS public.calificacion_lote (
  id_calificacion        serial PRIMARY KEY,
  id_lote                integer NOT NULL,
  -- bloque verde (análisis físico)
  humedad                numeric(5,2),
  densidad               numeric(6,3),
  defectos_primarios     integer,
  defectos_secundarios   integer,
  porcentaje_verde       numeric(5,2),
  -- bloque tostado (físico + sensorial)
  puntaje_sca            numeric(5,2),
  fragancia              smallint,
  acidez                 smallint,
  cuerpo                 smallint,
  dulzor                 smallint,
  balance                smallint,
  notas                  text,
  calificado_por         integer,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  deleted_at             timestamptz,
  CONSTRAINT calificacion_lote_id_lote_fkey
    FOREIGN KEY (id_lote) REFERENCES public.lotes_cafe(id_lote) ON DELETE RESTRICT,
  CONSTRAINT calificacion_lote_calificado_por_fkey
    FOREIGN KEY (calificado_por) REFERENCES public.empleados(id_empleado) ON DELETE SET NULL,
  CONSTRAINT calificacion_lote_humedad_check
    CHECK (humedad IS NULL OR (humedad >= 0 AND humedad <= 100)),
  CONSTRAINT calificacion_lote_densidad_check
    CHECK (densidad IS NULL OR densidad > 0),
  CONSTRAINT calificacion_lote_defectos_check
    CHECK ((defectos_primarios IS NULL OR defectos_primarios >= 0)
       AND (defectos_secundarios IS NULL OR defectos_secundarios >= 0)),
  CONSTRAINT calificacion_lote_porcentaje_verde_check
    CHECK (porcentaje_verde IS NULL OR (porcentaje_verde >= 0 AND porcentaje_verde <= 100)),
  CONSTRAINT calificacion_lote_puntaje_sca_check
    CHECK (puntaje_sca IS NULL OR (puntaje_sca >= 0 AND puntaje_sca <= 100)),
  CONSTRAINT calificacion_lote_atributos_check
    CHECK (
      (fragancia  IS NULL OR (fragancia  >= 1 AND fragancia  <= 10)) AND
      (acidez     IS NULL OR (acidez     >= 1 AND acidez     <= 10)) AND
      (cuerpo     IS NULL OR (cuerpo     >= 1 AND cuerpo     <= 10)) AND
      (dulzor     IS NULL OR (dulzor     >= 1 AND dulzor     <= 10)) AND
      (balance    IS NULL OR (balance    >= 1 AND balance    <= 10))
    )
);

-- Una sola calificación viva por lote.
CREATE UNIQUE INDEX IF NOT EXISTS calificacion_lote_id_lote_uidx
  ON public.calificacion_lote (id_lote)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_calificacion_lote
  ON public.calificacion_lote (id_lote);

DROP TRIGGER IF EXISTS calificacion_lote_updated_at ON public.calificacion_lote;
CREATE TRIGGER calificacion_lote_updated_at
  BEFORE UPDATE ON public.calificacion_lote
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 3. RLS: mismo patrón que las otras etapas del flujo.
ALTER TABLE public.calificacion_lote ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS calificacion_select ON public.calificacion_lote;
CREATE POLICY calificacion_select ON public.calificacion_lote
  FOR SELECT TO authenticated USING (deleted_at IS NULL);

DROP POLICY IF EXISTS calificacion_insert ON public.calificacion_lote;
CREATE POLICY calificacion_insert ON public.calificacion_lote
  FOR INSERT TO authenticated
  WITH CHECK (get_empleado_rol() = ANY (ARRAY['Tostador', 'Admin']));

DROP POLICY IF EXISTS calificacion_update ON public.calificacion_lote;
CREATE POLICY calificacion_update ON public.calificacion_lote
  FOR UPDATE TO authenticated
  USING (get_empleado_rol() = ANY (ARRAY['Tostador', 'Admin']))
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.calificacion_lote TO authenticated;
GRANT ALL ON public.calificacion_lote TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.calificacion_lote_id_calificacion_seq
  TO authenticated, service_role;

-- 4. RPC transaccional: upsert por lote y avance a 'Calificado'.
CREATE OR REPLACE FUNCTION public.guardar_calificacion(p_id_lote integer, p_calificacion jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
DECLARE
  v_rol text := get_empleado_rol();
  v_id integer;
  v_puntaje numeric;
  v_humedad numeric;
  v_fila jsonb;
BEGIN
  IF v_rol NOT IN ('Tostador', 'Admin') THEN
    RAISE EXCEPTION 'Solo Tostador o Admin pueden registrar la calificación';
  END IF;

  IF p_calificacion IS NULL THEN
    RAISE EXCEPTION 'Datos de calificación faltantes';
  END IF;

  PERFORM _ben_lote_editable(p_id_lote);

  v_puntaje := _ben_num(p_calificacion, 'puntaje_sca');
  v_humedad := _ben_num(p_calificacion, 'humedad');

  IF v_puntaje IS NOT NULL AND v_humedad IS NULL THEN
    RAISE EXCEPTION 'Registre primero el análisis del café verde (humedad)'
      USING ERRCODE = '22023';
  END IF;

  SELECT id_calificacion INTO v_id
    FROM calificacion_lote
   WHERE id_lote = p_id_lote AND deleted_at IS NULL;

  IF v_id IS NULL THEN
    INSERT INTO calificacion_lote (
      id_lote, humedad, densidad, defectos_primarios, defectos_secundarios,
      porcentaje_verde, puntaje_sca, fragancia, acidez, cuerpo, dulzor, balance,
      notas, calificado_por
    ) VALUES (
      p_id_lote,
      v_humedad,
      _ben_num(p_calificacion, 'densidad'),
      _ben_int(p_calificacion, 'defectos_primarios'),
      _ben_int(p_calificacion, 'defectos_secundarios'),
      _ben_num(p_calificacion, 'porcentaje_verde'),
      v_puntaje,
      _ben_int(p_calificacion, 'fragancia'),
      _ben_int(p_calificacion, 'acidez'),
      _ben_int(p_calificacion, 'cuerpo'),
      _ben_int(p_calificacion, 'dulzor'),
      _ben_int(p_calificacion, 'balance'),
      _ben_text(p_calificacion, 'notas'),
      (SELECT id_empleado FROM empleados WHERE id_auth = auth.uid() LIMIT 1)
    )
    RETURNING id_calificacion INTO v_id;
  ELSE
    UPDATE calificacion_lote SET
      humedad              = v_humedad,
      densidad             = _ben_num(p_calificacion, 'densidad'),
      defectos_primarios   = _ben_int(p_calificacion, 'defectos_primarios'),
      defectos_secundarios = _ben_int(p_calificacion, 'defectos_secundarios'),
      porcentaje_verde     = _ben_num(p_calificacion, 'porcentaje_verde'),
      puntaje_sca          = v_puntaje,
      fragancia            = _ben_int(p_calificacion, 'fragancia'),
      acidez               = _ben_int(p_calificacion, 'acidez'),
      cuerpo               = _ben_int(p_calificacion, 'cuerpo'),
      dulzor               = _ben_int(p_calificacion, 'dulzor'),
      balance              = _ben_int(p_calificacion, 'balance'),
      notas                = _ben_text(p_calificacion, 'notas'),
      calificado_por       = (SELECT id_empleado FROM empleados WHERE id_auth = auth.uid() LIMIT 1)
    WHERE id_calificacion = v_id;
  END IF;

  -- Con el tostado cargado la etapa está completa: el lote avanza.
  IF v_puntaje IS NOT NULL THEN
    PERFORM _ben_avanzar(p_id_lote, 'Calificado');
  END IF;

  SELECT to_jsonb(c.*) INTO v_fila FROM calificacion_lote c WHERE c.id_calificacion = v_id;

  RETURN jsonb_build_object(
    'enproceso', (SELECT enproceso FROM lotes_cafe WHERE id_lote = p_id_lote),
    'calificacion', v_fila
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.guardar_calificacion(integer, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.guardar_calificacion(integer, jsonb) TO authenticated, service_role;
