-- 0052b_beneficio_rpcs.sql
-- F3 · RPCs del flujo continuo de Beneficio/Acopio.
--
-- Patrón del proyecto: rol validado dentro de la función, `SET search_path`,
-- REVOKE de PUBLIC y GRANT a authenticated/service_role. Las 4 etapas de
-- proceso son SECURITY INVOKER (Recepción/Admin ya pueden escribir por RLS);
-- la catación es SECURITY DEFINER porque mueve el estado del lote y el rol
-- Tostador no tiene UPDATE sobre lotes_cafe (se valida el rol al inicio).
--
-- El lote solo avanza de estado (nunca retrocede, salvo desmarcar la catación).

-- ── Helpers de parseo (JSONB → tipos) ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public._ben_text(p jsonb, k text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT NULLIF(btrim(COALESCE(p->>k, '')), '')
$$;

CREATE OR REPLACE FUNCTION public._ben_num(p jsonb, k text)
RETURNS numeric LANGUAGE sql IMMUTABLE AS $$
  SELECT public._ben_text(p, k)::numeric
$$;

CREATE OR REPLACE FUNCTION public._ben_int(p jsonb, k text)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT public._ben_text(p, k)::integer
$$;

CREATE OR REPLACE FUNCTION public._ben_date(p jsonb, k text)
RETURNS date LANGUAGE sql IMMUTABLE AS $$
  SELECT public._ben_text(p, k)::date
$$;

CREATE OR REPLACE FUNCTION public._ben_ts(p jsonb, k text)
RETURNS timestamptz LANGUAGE sql IMMUTABLE AS $$
  SELECT public._ben_text(p, k)::timestamptz
$$;

CREATE OR REPLACE FUNCTION public._ben_bool(p jsonb, k text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT public._ben_text(p, k)::boolean
$$;

-- Avanza el lote solo hacia adelante en la secuencia del beneficio.
CREATE OR REPLACE FUNCTION public._ben_avanzar(p_id_lote integer, p_estado text)
RETURNS void LANGUAGE sql AS $$
  UPDATE public.lotes_cafe
     SET enproceso = p_estado
   WHERE id_lote = p_id_lote
     AND deleted_at IS NULL
     AND enproceso NOT IN ('Vendido', 'Catado')
     AND array_position(
           ARRAY['Recibido','En Caracterización','En Secado','En Bodega','En Trilla','Catado'],
           enproceso
         ) < array_position(
           ARRAY['Recibido','En Caracterización','En Secado','En Bodega','En Trilla','Catado'],
           p_estado
         )
$$;

REVOKE ALL ON FUNCTION public._ben_text(jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._ben_num(jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._ben_int(jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._ben_date(jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._ben_ts(jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._ben_bool(jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._ben_avanzar(integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._ben_text(jsonb, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._ben_num(jsonb, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._ben_int(jsonb, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._ben_date(jsonb, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._ben_ts(jsonb, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._ben_bool(jsonb, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._ben_avanzar(integer, text) TO authenticated, service_role;

-- ── Validación común de lote editable ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public._ben_lote_editable(p_id_lote integer)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_estado text;
BEGIN
  IF p_id_lote IS NULL THEN
    RAISE EXCEPTION 'El lote es obligatorio' USING ERRCODE = '22023';
  END IF;

  SELECT enproceso INTO v_estado
    FROM public.lotes_cafe
   WHERE id_lote = p_id_lote AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El lote indicado no existe o fue eliminado' USING ERRCODE = 'P0002';
  END IF;

  IF v_estado = 'Vendido' THEN
    RAISE EXCEPTION 'El lote está vendido y no admite cambios' USING ERRCODE = '55000';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public._ben_lote_editable(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._ben_lote_editable(integer) TO authenticated, service_role;

-- ── 1. Caracterización de materia prima ─────────────────────────────────────
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
      id_lote, fecha_hora, proceso,
      cerezas_verdes, cerezas_semimaduras, cerezas_en_objetivo, cerezas_sobremaduras, cerezas_secas,
      semimadura_1, semimadura_2, semimadura_3, semimadura_4, semimadura_5, semimadura_bx_promedio,
      madura_1, madura_2, madura_3, madura_4, madura_5, madura_bx_promedio,
      sobremadura_1, sobremadura_2, sobremadura_3, sobremadura_4, sobremadura_5, sobremadura_bx_promedio,
      observaciones_aspecto_textura,
      densidad_g_ml, escala_maduracion, rango_optimo_madurez, muestreo_tabla,
      pct_verdes_muestra, pct_debajo_objetivo_muestra, pct_objetivo_muestra,
      pct_encima_objetivo_muestra, pct_secas_muestra,
      g_vanos, g_secos, g_broca
    ) VALUES (
      p_id_lote,
      COALESCE(public._ben_ts(p_datos, 'fecha_hora'), now()),
      public._ben_text(p_datos, 'proceso'),
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
      public._ben_text(p_datos, 'escala_maduracion'),
      public._ben_text(p_datos, 'rango_optimo_madurez'),
      public._ben_num(p_datos, 'muestreo_tabla'),
      public._ben_num(p_datos, 'pct_verdes_muestra'),
      public._ben_num(p_datos, 'pct_debajo_objetivo_muestra'),
      public._ben_num(p_datos, 'pct_objetivo_muestra'),
      public._ben_num(p_datos, 'pct_encima_objetivo_muestra'),
      public._ben_num(p_datos, 'pct_secas_muestra'),
      public._ben_num(p_datos, 'g_vanos'),
      public._ben_num(p_datos, 'g_secos'),
      public._ben_num(p_datos, 'g_broca')
    )
    RETURNING id_caracterizacion INTO v_id;
  ELSE
    UPDATE public.caracterizacion_lote SET
      fecha_hora = COALESCE(public._ben_ts(p_datos, 'fecha_hora'), fecha_hora),
      proceso = public._ben_text(p_datos, 'proceso'),
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
      escala_maduracion = public._ben_text(p_datos, 'escala_maduracion'),
      rango_optimo_madurez = public._ben_text(p_datos, 'rango_optimo_madurez'),
      muestreo_tabla = public._ben_num(p_datos, 'muestreo_tabla'),
      pct_verdes_muestra = public._ben_num(p_datos, 'pct_verdes_muestra'),
      pct_debajo_objetivo_muestra = public._ben_num(p_datos, 'pct_debajo_objetivo_muestra'),
      pct_objetivo_muestra = public._ben_num(p_datos, 'pct_objetivo_muestra'),
      pct_encima_objetivo_muestra = public._ben_num(p_datos, 'pct_encima_objetivo_muestra'),
      pct_secas_muestra = public._ben_num(p_datos, 'pct_secas_muestra'),
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

-- ── 2. Secado ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.guardar_secado(p_id_lote integer, p_secado jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_rol text := get_empleado_rol();
  v_id  integer;
BEGIN
  IF v_rol NOT IN ('Recepción', 'Admin') THEN
    RAISE EXCEPTION 'Solo Recepción o Admin pueden registrar el secado' USING ERRCODE = '42501';
  END IF;

  IF p_secado IS NULL THEN
    RAISE EXCEPTION 'Datos de secado faltantes' USING ERRCODE = '22023';
  END IF;

  PERFORM public._ben_lote_editable(p_id_lote);

  SELECT id_secado INTO v_id
    FROM public.secado_lote
   WHERE id_lote = p_id_lote AND deleted_at IS NULL;

  IF v_id IS NULL THEN
    INSERT INTO public.secado_lote (
      id_lote, tiempo_secado, fecha_inicio_secado, fecha_finalizacion_secado, dias_secado, numero_cama,
      porcentaje_solar, porcentaje_mecanico,
      humedad_1, humedad_2, humedad_3, humedad_4, humedad_5, humedad_6,
      tem_1, tem_2, tem_3, tem_4, tem_5, tem_6,
      peso_inicial, peso_final
    ) VALUES (
      p_id_lote,
      public._ben_text(p_secado, 'tiempo_secado'),
      public._ben_date(p_secado, 'fecha_inicio_secado'),
      public._ben_date(p_secado, 'fecha_finalizacion_secado'),
      public._ben_int(p_secado, 'dias_secado'),
      public._ben_text(p_secado, 'numero_cama'),
      public._ben_num(p_secado, 'porcentaje_solar'),
      public._ben_num(p_secado, 'porcentaje_mecanico'),
      public._ben_num(p_secado, 'humedad_1'),
      public._ben_num(p_secado, 'humedad_2'),
      public._ben_num(p_secado, 'humedad_3'),
      public._ben_num(p_secado, 'humedad_4'),
      public._ben_num(p_secado, 'humedad_5'),
      public._ben_num(p_secado, 'humedad_6'),
      public._ben_num(p_secado, 'tem_1'),
      public._ben_num(p_secado, 'tem_2'),
      public._ben_num(p_secado, 'tem_3'),
      public._ben_num(p_secado, 'tem_4'),
      public._ben_num(p_secado, 'tem_5'),
      public._ben_num(p_secado, 'tem_6'),
      public._ben_num(p_secado, 'peso_inicial'),
      public._ben_num(p_secado, 'peso_final')
    )
    RETURNING id_secado INTO v_id;
  ELSE
    UPDATE public.secado_lote SET
      tiempo_secado = public._ben_text(p_secado, 'tiempo_secado'),
      fecha_inicio_secado = public._ben_date(p_secado, 'fecha_inicio_secado'),
      fecha_finalizacion_secado = public._ben_date(p_secado, 'fecha_finalizacion_secado'),
      dias_secado = public._ben_int(p_secado, 'dias_secado'),
      numero_cama = public._ben_text(p_secado, 'numero_cama'),
      porcentaje_solar = public._ben_num(p_secado, 'porcentaje_solar'),
      porcentaje_mecanico = public._ben_num(p_secado, 'porcentaje_mecanico'),
      humedad_1 = public._ben_num(p_secado, 'humedad_1'),
      humedad_2 = public._ben_num(p_secado, 'humedad_2'),
      humedad_3 = public._ben_num(p_secado, 'humedad_3'),
      humedad_4 = public._ben_num(p_secado, 'humedad_4'),
      humedad_5 = public._ben_num(p_secado, 'humedad_5'),
      humedad_6 = public._ben_num(p_secado, 'humedad_6'),
      tem_1 = public._ben_num(p_secado, 'tem_1'),
      tem_2 = public._ben_num(p_secado, 'tem_2'),
      tem_3 = public._ben_num(p_secado, 'tem_3'),
      tem_4 = public._ben_num(p_secado, 'tem_4'),
      tem_5 = public._ben_num(p_secado, 'tem_5'),
      tem_6 = public._ben_num(p_secado, 'tem_6'),
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

-- ── 3. Bodegaje ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.guardar_bodega(p_id_lote integer, p_bodega jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_rol text := get_empleado_rol();
  v_id  integer;
BEGIN
  IF v_rol NOT IN ('Recepción', 'Admin') THEN
    RAISE EXCEPTION 'Solo Recepción o Admin pueden registrar el bodegaje' USING ERRCODE = '42501';
  END IF;

  IF p_bodega IS NULL THEN
    RAISE EXCEPTION 'Datos de bodegaje faltantes' USING ERRCODE = '22023';
  END IF;

  PERFORM public._ben_lote_editable(p_id_lote);

  SELECT id_bodega INTO v_id
    FROM public.bodega_lote
   WHERE id_lote = p_id_lote AND deleted_at IS NULL;

  IF v_id IS NULL THEN
    INSERT INTO public.bodega_lote (
      id_lote, inicio_reposo, cantidad_sacos, peso_pergamino, peso_bellota,
      humedad_inicial, humedad_final, densidad_pergamino, densidad_bellota,
      lectura_humedad_relativa, lectura_temperatura_interna, lectura_temperatura_externa
    ) VALUES (
      p_id_lote,
      public._ben_date(p_bodega, 'inicio_reposo'),
      public._ben_int(p_bodega, 'cantidad_sacos'),
      public._ben_num(p_bodega, 'peso_pergamino'),
      public._ben_num(p_bodega, 'peso_bellota'),
      public._ben_num(p_bodega, 'humedad_inicial'),
      public._ben_num(p_bodega, 'humedad_final'),
      public._ben_num(p_bodega, 'densidad_pergamino'),
      public._ben_num(p_bodega, 'densidad_bellota'),
      public._ben_num(p_bodega, 'lectura_humedad_relativa'),
      public._ben_num(p_bodega, 'lectura_temperatura_interna'),
      public._ben_num(p_bodega, 'lectura_temperatura_externa')
    )
    RETURNING id_bodega INTO v_id;
  ELSE
    UPDATE public.bodega_lote SET
      inicio_reposo = public._ben_date(p_bodega, 'inicio_reposo'),
      cantidad_sacos = public._ben_int(p_bodega, 'cantidad_sacos'),
      peso_pergamino = public._ben_num(p_bodega, 'peso_pergamino'),
      peso_bellota = public._ben_num(p_bodega, 'peso_bellota'),
      humedad_inicial = public._ben_num(p_bodega, 'humedad_inicial'),
      humedad_final = public._ben_num(p_bodega, 'humedad_final'),
      densidad_pergamino = public._ben_num(p_bodega, 'densidad_pergamino'),
      densidad_bellota = public._ben_num(p_bodega, 'densidad_bellota'),
      lectura_humedad_relativa = public._ben_num(p_bodega, 'lectura_humedad_relativa'),
      lectura_temperatura_interna = public._ben_num(p_bodega, 'lectura_temperatura_interna'),
      lectura_temperatura_externa = public._ben_num(p_bodega, 'lectura_temperatura_externa'),
      updated_at = now()
    WHERE id_bodega = v_id;
  END IF;

  PERFORM public._ben_avanzar(p_id_lote, 'En Bodega');

  RETURN jsonb_build_object(
    'bodega', (SELECT to_jsonb(b.*) FROM public.bodega_lote b WHERE b.id_bodega = v_id),
    'enproceso', (SELECT enproceso FROM public.lotes_cafe WHERE id_lote = p_id_lote)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.guardar_bodega(integer, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guardar_bodega(integer, jsonb) TO authenticated, service_role;

-- ── 4. Trilla ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.guardar_trilla(p_id_lote integer, p_trilla jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_rol text := get_empleado_rol();
  v_id  integer;
BEGIN
  IF v_rol NOT IN ('Recepción', 'Admin') THEN
    RAISE EXCEPTION 'Solo Recepción o Admin pueden registrar la trilla' USING ERRCODE = '42501';
  END IF;

  IF p_trilla IS NULL THEN
    RAISE EXCEPTION 'Datos de trilla faltantes' USING ERRCODE = '22023';
  END IF;

  PERFORM public._ben_lote_editable(p_id_lote);

  SELECT id_trilla INTO v_id
    FROM public.trilla_lote
   WHERE id_lote = p_id_lote AND deleted_at IS NULL;

  IF v_id IS NULL THEN
    INSERT INTO public.trilla_lote (
      id_lote, fecha_final_reposo,
      rendimiento_teorico_pelado, rendimiento_teorico_seleccion,
      rendimiento_final_pelado, rendimiento_final_seleccion,
      peso_en_verde_teorico, peso_verde_final,
      humedad_inicial_pergamino_bellota, humedad_final_verde,
      porcentaje_primera, porcentaje_madres, porcentaje_caracolillo, porcentaje_menudos,
      porcentaje_cataduras, porcentaje_segundas, porcentaje_barreduras,
      porcentaje_escogeduras, porcentaje_otras_inferiores,
      peso_en_verde_final, peso_verde_inferiores
    ) VALUES (
      p_id_lote,
      public._ben_date(p_trilla, 'fecha_final_reposo'),
      public._ben_num(p_trilla, 'rendimiento_teorico_pelado'),
      public._ben_num(p_trilla, 'rendimiento_teorico_seleccion'),
      public._ben_num(p_trilla, 'rendimiento_final_pelado'),
      public._ben_num(p_trilla, 'rendimiento_final_seleccion'),
      public._ben_num(p_trilla, 'peso_en_verde_teorico'),
      public._ben_num(p_trilla, 'peso_verde_final'),
      public._ben_num(p_trilla, 'humedad_inicial_pergamino_bellota'),
      public._ben_num(p_trilla, 'humedad_final_verde'),
      public._ben_num(p_trilla, 'porcentaje_primera'),
      public._ben_num(p_trilla, 'porcentaje_madres'),
      public._ben_num(p_trilla, 'porcentaje_caracolillo'),
      public._ben_num(p_trilla, 'porcentaje_menudos'),
      public._ben_num(p_trilla, 'porcentaje_cataduras'),
      public._ben_num(p_trilla, 'porcentaje_segundas'),
      public._ben_num(p_trilla, 'porcentaje_barreduras'),
      public._ben_num(p_trilla, 'porcentaje_escogeduras'),
      public._ben_num(p_trilla, 'porcentaje_otras_inferiores'),
      public._ben_num(p_trilla, 'peso_en_verde_final'),
      public._ben_num(p_trilla, 'peso_verde_inferiores')
    )
    RETURNING id_trilla INTO v_id;
  ELSE
    UPDATE public.trilla_lote SET
      fecha_final_reposo = public._ben_date(p_trilla, 'fecha_final_reposo'),
      rendimiento_teorico_pelado = public._ben_num(p_trilla, 'rendimiento_teorico_pelado'),
      rendimiento_teorico_seleccion = public._ben_num(p_trilla, 'rendimiento_teorico_seleccion'),
      rendimiento_final_pelado = public._ben_num(p_trilla, 'rendimiento_final_pelado'),
      rendimiento_final_seleccion = public._ben_num(p_trilla, 'rendimiento_final_seleccion'),
      peso_en_verde_teorico = public._ben_num(p_trilla, 'peso_en_verde_teorico'),
      peso_verde_final = public._ben_num(p_trilla, 'peso_verde_final'),
      humedad_inicial_pergamino_bellota = public._ben_num(p_trilla, 'humedad_inicial_pergamino_bellota'),
      humedad_final_verde = public._ben_num(p_trilla, 'humedad_final_verde'),
      porcentaje_primera = public._ben_num(p_trilla, 'porcentaje_primera'),
      porcentaje_madres = public._ben_num(p_trilla, 'porcentaje_madres'),
      porcentaje_caracolillo = public._ben_num(p_trilla, 'porcentaje_caracolillo'),
      porcentaje_menudos = public._ben_num(p_trilla, 'porcentaje_menudos'),
      porcentaje_cataduras = public._ben_num(p_trilla, 'porcentaje_cataduras'),
      porcentaje_segundas = public._ben_num(p_trilla, 'porcentaje_segundas'),
      porcentaje_barreduras = public._ben_num(p_trilla, 'porcentaje_barreduras'),
      porcentaje_escogeduras = public._ben_num(p_trilla, 'porcentaje_escogeduras'),
      porcentaje_otras_inferiores = public._ben_num(p_trilla, 'porcentaje_otras_inferiores'),
      peso_en_verde_final = public._ben_num(p_trilla, 'peso_en_verde_final'),
      peso_verde_inferiores = public._ben_num(p_trilla, 'peso_verde_inferiores'),
      updated_at = now()
    WHERE id_trilla = v_id;
  END IF;

  PERFORM public._ben_avanzar(p_id_lote, 'En Trilla');

  RETURN jsonb_build_object(
    'trilla', (SELECT to_jsonb(t.*) FROM public.trilla_lote t WHERE t.id_trilla = v_id),
    'enproceso', (SELECT enproceso FROM public.lotes_cafe WHERE id_lote = p_id_lote)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.guardar_trilla(integer, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guardar_trilla(integer, jsonb) TO authenticated, service_role;

-- ── 5. Catación simplificada ────────────────────────────────────────────────
-- SECURITY DEFINER: Tostador no tiene UPDATE sobre lotes_cafe; el rol se valida
-- explícitamente al inicio y la función solo toca catacion_tueste y el estado.
CREATE OR REPLACE FUNCTION public.guardar_catacion(p_catacion jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_rol    text := get_empleado_rol();
  v_id     integer;
  v_lote   integer;
  v_catado boolean;
  v_notas  text;
  v_estado text;
BEGIN
  IF v_rol NOT IN ('Tostador', 'Admin') THEN
    RAISE EXCEPTION 'Solo Tostador o Admin pueden registrar la catación' USING ERRCODE = '42501';
  END IF;

  IF p_catacion IS NULL THEN
    RAISE EXCEPTION 'Datos de catación faltantes' USING ERRCODE = '22023';
  END IF;

  v_lote := public._ben_int(p_catacion, 'id_lote');
  IF v_lote IS NULL THEN
    RAISE EXCEPTION 'La catación debe estar vinculada a un lote' USING ERRCODE = '22023';
  END IF;

  SELECT enproceso INTO v_estado
    FROM public.lotes_cafe
   WHERE id_lote = v_lote AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El lote indicado no existe o fue eliminado' USING ERRCODE = 'P0002';
  END IF;

  IF v_estado = 'Vendido' THEN
    RAISE EXCEPTION 'El lote está vendido y no admite cambios' USING ERRCODE = '55000';
  END IF;

  v_catado := COALESCE(public._ben_bool(p_catacion, 'catado'), false);
  v_notas  := public._ben_text(p_catacion, 'notas_catacion');

  SELECT id_catacion_tueste INTO v_id
    FROM public.catacion_tueste
   WHERE id_lote = v_lote AND deleted_at IS NULL;

  IF v_id IS NULL THEN
    INSERT INTO public.catacion_tueste (id_lote, catado, notas_catacion)
    VALUES (v_lote, v_catado, v_notas)
    RETURNING id_catacion_tueste INTO v_id;
  ELSE
    UPDATE public.catacion_tueste
       SET catado = v_catado,
           notas_catacion = v_notas,
           updated_at = now()
     WHERE id_catacion_tueste = v_id;
  END IF;

  IF v_catado THEN
    UPDATE public.lotes_cafe
       SET enproceso = 'Catado'
     WHERE id_lote = v_lote AND deleted_at IS NULL AND enproceso <> 'Vendido';
  ELSE
    -- Desmarcar devuelve el lote a la etapa anterior del flujo.
    UPDATE public.lotes_cafe
       SET enproceso = 'En Trilla'
     WHERE id_lote = v_lote AND deleted_at IS NULL AND enproceso = 'Catado';
  END IF;

  RETURN jsonb_build_object(
    'catacion', (SELECT to_jsonb(ct.*) FROM public.catacion_tueste ct WHERE ct.id_catacion_tueste = v_id),
    'enproceso', (SELECT enproceso FROM public.lotes_cafe WHERE id_lote = v_lote)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.guardar_catacion(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guardar_catacion(jsonb) TO authenticated, service_role;
