-- 0057: Caracterización de materia prima — limpieza de atributos y proceso libre

ALTER TABLE public.caracterizacion_lote
  ADD COLUMN IF NOT EXISTS proceso_otro varchar(100);

ALTER TABLE public.caracterizacion_lote
  DROP COLUMN IF EXISTS escala_maduracion,
  DROP COLUMN IF EXISTS rango_optimo_madurez,
  DROP COLUMN IF EXISTS muestreo_tabla,
  DROP COLUMN IF EXISTS pct_verdes_muestra,
  DROP COLUMN IF EXISTS pct_debajo_objetivo_muestra,
  DROP COLUMN IF EXISTS pct_objetivo_muestra,
  DROP COLUMN IF EXISTS pct_encima_objetivo_muestra,
  DROP COLUMN IF EXISTS pct_secas_muestra;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'caracterizacion_lote_proceso_check'
  ) THEN
    ALTER TABLE public.caracterizacion_lote
      ADD CONSTRAINT caracterizacion_lote_proceso_check
      CHECK (
        proceso IS NULL OR proceso IN (
          'Lavado', 'Honey', 'Natural', 'Miel', 'Semilavado', 'Anaeróbico', 'Otro'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'caracterizacion_lote_proceso_otro_check'
  ) THEN
    ALTER TABLE public.caracterizacion_lote
      ADD CONSTRAINT caracterizacion_lote_proceso_otro_check
      CHECK (
        proceso IS DISTINCT FROM 'Otro'
        OR (proceso_otro IS NOT NULL AND btrim(proceso_otro) <> '')
      );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.guardar_caracterizacion(p_id_lote integer, p_datos jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_rol  text := get_empleado_rol();
  v_id   integer;
BEGIN
  IF v_rol NOT IN ('Recepción', 'Admin') THEN
    RAISE EXCEPTION 'Solo Recepción o Admin pueden registrar la caracterización'
      USING ERRCODE = '42501';
  END IF;

  IF p_datos IS NULL THEN
    RAISE EXCEPTION 'Datos de caracterización faltantes' USING ERRCODE = '22023';
  END IF;

  PERFORM public._ben_lote_editable(p_id_lote);

  SELECT id_caracterizacion INTO v_id
    FROM public.caracterizacion_lote
   WHERE id_lote = p_id_lote AND deleted_at IS NULL;

  IF v_id IS NULL THEN
    INSERT INTO public.caracterizacion_lote (
      id_lote, fecha_hora, proceso, proceso_otro,
      cerezas_verdes, cerezas_semimaduras, cerezas_en_objetivo, cerezas_sobremaduras, cerezas_secas,
      semimadura_1, semimadura_2, semimadura_3, semimadura_4, semimadura_5, semimadura_bx_promedio,
      madura_1, madura_2, madura_3, madura_4, madura_5, madura_bx_promedio,
      sobremadura_1, sobremadura_2, sobremadura_3, sobremadura_4, sobremadura_5, sobremadura_bx_promedio,
      observaciones_aspecto_textura,
      densidad_g_ml,
      g_vanos, g_secos, g_broca
    ) VALUES (
      p_id_lote,
      COALESCE(public._ben_ts(p_datos, 'fecha_hora'), now()),
      public._ben_text(p_datos, 'proceso'),
      public._ben_text(p_datos, 'proceso_otro'),
      public._ben_int(p_datos, 'cerezas_verdes'),
      public._ben_int(p_datos, 'cerezas_semimaduras'),
      public._ben_int(p_datos, 'cerezas_en_objetivo'),
      public._ben_int(p_datos, 'cerezas_sobremaduras'),
      public._ben_int(p_datos, 'cerezas_secas'),
      public._ben_num(p_datos, 'semimadura_1'),
      public._ben_num(p_datos, 'semimadura_2'),
      public._ben_num(p_datos, 'semimadura_3'),
      public._ben_num(p_datos, 'semimadura_4'),
      public._ben_num(p_datos, 'semimadura_5'),
      public._ben_num(p_datos, 'semimadura_bx_promedio'),
      public._ben_num(p_datos, 'madura_1'),
      public._ben_num(p_datos, 'madura_2'),
      public._ben_num(p_datos, 'madura_3'),
      public._ben_num(p_datos, 'madura_4'),
      public._ben_num(p_datos, 'madura_5'),
      public._ben_num(p_datos, 'madura_bx_promedio'),
      public._ben_num(p_datos, 'sobremadura_1'),
      public._ben_num(p_datos, 'sobremadura_2'),
      public._ben_num(p_datos, 'sobremadura_3'),
      public._ben_num(p_datos, 'sobremadura_4'),
      public._ben_num(p_datos, 'sobremadura_5'),
      public._ben_num(p_datos, 'sobremadura_bx_promedio'),
      public._ben_text(p_datos, 'observaciones_aspecto_textura'),
      public._ben_num(p_datos, 'densidad_g_ml'),
      public._ben_num(p_datos, 'g_vanos'),
      public._ben_num(p_datos, 'g_secos'),
      public._ben_num(p_datos, 'g_broca')
    )
    RETURNING id_caracterizacion INTO v_id;
  ELSE
    UPDATE public.caracterizacion_lote SET
      fecha_hora = COALESCE(public._ben_ts(p_datos, 'fecha_hora'), fecha_hora),
      proceso = public._ben_text(p_datos, 'proceso'),
      proceso_otro = public._ben_text(p_datos, 'proceso_otro'),
      cerezas_verdes = public._ben_int(p_datos, 'cerezas_verdes'),
      cerezas_semimaduras = public._ben_int(p_datos, 'cerezas_semimaduras'),
      cerezas_en_objetivo = public._ben_int(p_datos, 'cerezas_en_objetivo'),
      cerezas_sobremaduras = public._ben_int(p_datos, 'cerezas_sobremaduras'),
      cerezas_secas = public._ben_int(p_datos, 'cerezas_secas'),
      semimadura_1 = public._ben_num(p_datos, 'semimadura_1'),
      semimadura_2 = public._ben_num(p_datos, 'semimadura_2'),
      semimadura_3 = public._ben_num(p_datos, 'semimadura_3'),
      semimadura_4 = public._ben_num(p_datos, 'semimadura_4'),
      semimadura_5 = public._ben_num(p_datos, 'semimadura_5'),
      semimadura_bx_promedio = public._ben_num(p_datos, 'semimadura_bx_promedio'),
      madura_1 = public._ben_num(p_datos, 'madura_1'),
      madura_2 = public._ben_num(p_datos, 'madura_2'),
      madura_3 = public._ben_num(p_datos, 'madura_3'),
      madura_4 = public._ben_num(p_datos, 'madura_4'),
      madura_5 = public._ben_num(p_datos, 'madura_5'),
      madura_bx_promedio = public._ben_num(p_datos, 'madura_bx_promedio'),
      sobremadura_1 = public._ben_num(p_datos, 'sobremadura_1'),
      sobremadura_2 = public._ben_num(p_datos, 'sobremadura_2'),
      sobremadura_3 = public._ben_num(p_datos, 'sobremadura_3'),
      sobremadura_4 = public._ben_num(p_datos, 'sobremadura_4'),
      sobremadura_5 = public._ben_num(p_datos, 'sobremadura_5'),
      sobremadura_bx_promedio = public._ben_num(p_datos, 'sobremadura_bx_promedio'),
      observaciones_aspecto_textura = public._ben_text(p_datos, 'observaciones_aspecto_textura'),
      densidad_g_ml = public._ben_num(p_datos, 'densidad_g_ml'),
      g_vanos = public._ben_num(p_datos, 'g_vanos'),
      g_secos = public._ben_num(p_datos, 'g_secos'),
      g_broca = public._ben_num(p_datos, 'g_broca'),
      updated_at = now()
    WHERE id_caracterizacion = v_id;
  END IF;

  PERFORM public._ben_avanzar(p_id_lote, 'En Caracterización');

  RETURN jsonb_build_object(
    'caracterizacion', (SELECT to_jsonb(c.*) FROM public.caracterizacion_lote c WHERE c.id_caracterizacion = v_id),
    'enproceso', (SELECT enproceso FROM public.lotes_cafe WHERE id_lote = p_id_lote)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.guardar_caracterizacion(integer, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guardar_caracterizacion(integer, jsonb) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
