-- 0060: Trilla — pruebas físicas y peso final inferior de exportación

ALTER TABLE public.trilla_lote
  ADD COLUMN IF NOT EXISTS pruebas_fisicas_trilla text,
  ADD COLUMN IF NOT EXISTS peso_en_verde_final_inferior numeric(10,2);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'trilla_lote_peso_en_verde_final_inferior_check'
  ) THEN
    ALTER TABLE public.trilla_lote
      ADD CONSTRAINT trilla_lote_peso_en_verde_final_inferior_check
      CHECK (peso_en_verde_final_inferior >= 0);
  END IF;
END $$;

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
      id_lote, fecha_final_reposo, pruebas_fisicas_trilla,
      rendimiento_teorico_pelado, rendimiento_teorico_seleccion,
      rendimiento_final_pelado, rendimiento_final_seleccion,
      peso_en_verde_teorico, peso_verde_final,
      humedad_inicial_pergamino_bellota, humedad_final_verde,
      porcentaje_primera, porcentaje_madres, porcentaje_caracolillo, porcentaje_menudos,
      porcentaje_cataduras, porcentaje_segundas, porcentaje_barreduras,
      porcentaje_escogeduras, porcentaje_otras_inferiores,
      peso_en_verde_final, peso_verde_inferiores, peso_en_verde_final_inferior
    ) VALUES (
      p_id_lote,
      public._ben_date(p_trilla, 'fecha_final_reposo'),
      public._ben_text(p_trilla, 'pruebas_fisicas_trilla'),
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
      public._ben_num(p_trilla, 'peso_verde_inferiores'),
      public._ben_num(p_trilla, 'peso_en_verde_final_inferior')
    )
    RETURNING id_trilla INTO v_id;
  ELSE
    UPDATE public.trilla_lote SET
      fecha_final_reposo = public._ben_date(p_trilla, 'fecha_final_reposo'),
      pruebas_fisicas_trilla = public._ben_text(p_trilla, 'pruebas_fisicas_trilla'),
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
      peso_en_verde_final_inferior = public._ben_num(p_trilla, 'peso_en_verde_final_inferior'),
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

NOTIFY pgrst, 'reload schema';
