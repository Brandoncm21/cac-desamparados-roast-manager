-- 0058: Secado — 5 mediciones, tiempo calculado y fechas sin bloqueo

ALTER TABLE public.secado_lote
  DROP COLUMN IF EXISTS humedad_6,
  DROP COLUMN IF EXISTS tem_6;

ALTER TABLE public.secado_lote
  DROP CONSTRAINT IF EXISTS secado_lote_fechas_check;

CREATE OR REPLACE FUNCTION public.guardar_secado(p_id_lote integer, p_secado jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_rol    text := get_empleado_rol();
  v_id     integer;
  v_inicio date;
  v_fin    date;
  v_dias   integer;
  v_tiempo varchar(50);
BEGIN
  IF v_rol NOT IN ('Recepción', 'Admin') THEN
    RAISE EXCEPTION 'Solo Recepción o Admin pueden registrar el secado' USING ERRCODE = '42501';
  END IF;

  IF p_secado IS NULL THEN
    RAISE EXCEPTION 'Datos de secado faltantes' USING ERRCODE = '22023';
  END IF;

  PERFORM public._ben_lote_editable(p_id_lote);

  v_inicio := public._ben_date(p_secado, 'fecha_inicio_secado');
  v_fin := public._ben_date(p_secado, 'fecha_finalizacion_secado');

  IF v_inicio IS NOT NULL AND v_fin IS NOT NULL AND v_fin >= v_inicio THEN
    v_dias := v_fin - v_inicio;
    v_tiempo := CASE WHEN v_dias = 1 THEN '1 día' ELSE v_dias::text || ' días' END;
  ELSE
    v_dias := NULL;
    v_tiempo := NULL;
  END IF;

  SELECT id_secado INTO v_id
    FROM public.secado_lote
   WHERE id_lote = p_id_lote AND deleted_at IS NULL;

  IF v_id IS NULL THEN
    INSERT INTO public.secado_lote (
      id_lote, tiempo_secado, fecha_inicio_secado, fecha_finalizacion_secado, dias_secado, numero_cama,
      porcentaje_solar, porcentaje_mecanico,
      humedad_1, humedad_2, humedad_3, humedad_4, humedad_5,
      tem_1, tem_2, tem_3, tem_4, tem_5,
      peso_inicial, peso_final
    ) VALUES (
      p_id_lote,
      v_tiempo,
      v_inicio,
      v_fin,
      v_dias,
      public._ben_text(p_secado, 'numero_cama'),
      public._ben_num(p_secado, 'porcentaje_solar'),
      public._ben_num(p_secado, 'porcentaje_mecanico'),
      public._ben_num(p_secado, 'humedad_1'),
      public._ben_num(p_secado, 'humedad_2'),
      public._ben_num(p_secado, 'humedad_3'),
      public._ben_num(p_secado, 'humedad_4'),
      public._ben_num(p_secado, 'humedad_5'),
      public._ben_num(p_secado, 'tem_1'),
      public._ben_num(p_secado, 'tem_2'),
      public._ben_num(p_secado, 'tem_3'),
      public._ben_num(p_secado, 'tem_4'),
      public._ben_num(p_secado, 'tem_5'),
      public._ben_num(p_secado, 'peso_inicial'),
      public._ben_num(p_secado, 'peso_final')
    )
    RETURNING id_secado INTO v_id;
  ELSE
    UPDATE public.secado_lote SET
      tiempo_secado = v_tiempo,
      fecha_inicio_secado = v_inicio,
      fecha_finalizacion_secado = v_fin,
      dias_secado = v_dias,
      numero_cama = public._ben_text(p_secado, 'numero_cama'),
      porcentaje_solar = public._ben_num(p_secado, 'porcentaje_solar'),
      porcentaje_mecanico = public._ben_num(p_secado, 'porcentaje_mecanico'),
      humedad_1 = public._ben_num(p_secado, 'humedad_1'),
      humedad_2 = public._ben_num(p_secado, 'humedad_2'),
      humedad_3 = public._ben_num(p_secado, 'humedad_3'),
      humedad_4 = public._ben_num(p_secado, 'humedad_4'),
      humedad_5 = public._ben_num(p_secado, 'humedad_5'),
      tem_1 = public._ben_num(p_secado, 'tem_1'),
      tem_2 = public._ben_num(p_secado, 'tem_2'),
      tem_3 = public._ben_num(p_secado, 'tem_3'),
      tem_4 = public._ben_num(p_secado, 'tem_4'),
      tem_5 = public._ben_num(p_secado, 'tem_5'),
      peso_inicial = public._ben_num(p_secado, 'peso_inicial'),
      peso_final = public._ben_num(p_secado, 'peso_final'),
      updated_at = now()
    WHERE id_secado = v_id;
  END IF;

  PERFORM public._ben_avanzar(p_id_lote, 'En Secado');

  RETURN jsonb_build_object(
    'secado', (SELECT to_jsonb(s.*) FROM public.secado_lote s WHERE s.id_secado = v_id),
    'enproceso', (SELECT enproceso FROM public.lotes_cafe WHERE id_lote = p_id_lote)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.guardar_secado(integer, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guardar_secado(integer, jsonb) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
