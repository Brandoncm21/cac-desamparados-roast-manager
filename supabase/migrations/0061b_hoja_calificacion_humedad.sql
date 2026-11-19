-- 0061b: corrige la persistencia de humedad en la hoja de calificación

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
    RAISE EXCEPTION 'Solo Tostador o Admin pueden registrar la hoja de calificación' USING ERRCODE = '42501';
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
    VALUES (p_id_lote, (SELECT id_empleado FROM empleados WHERE id_auth = auth.uid() LIMIT 1))
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
    INSERT INTO public.calificacion_defecto (id_calificacion, id_defecto, numero_defectos, proporcion, equivalencia)
    VALUES (v_id, v_def.id_defecto, v_conteo, v_def.proporcion, v_equivalencia)
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
    'calificacion', (SELECT to_jsonb(c.*) FROM public.calificacion_lote c WHERE c.id_calificacion = v_id),
    'defectos', (SELECT COALESCE(jsonb_agg(to_jsonb(d.*) ORDER BY d.id_calificacion_defecto), '[]'::jsonb) FROM public.calificacion_defecto d WHERE d.id_calificacion = v_id),
    'enproceso', (SELECT enproceso FROM public.lotes_cafe WHERE id_lote = p_id_lote)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.guardar_hoja_calificacion(integer, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.guardar_hoja_calificacion(integer, jsonb) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
