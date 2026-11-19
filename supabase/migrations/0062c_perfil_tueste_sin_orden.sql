-- 0062c: permite crear perfiles de tueste con lotes y sin factura/orden

CREATE OR REPLACE FUNCTION public.crear_perfil_tueste(p_datos jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_rol text := get_empleado_rol();
  v_id_orden integer;
  v_id_perfil integer;
  v_lote_id integer;
  v_primer_lote text;
  v_lotes jsonb;
BEGIN
  IF v_rol NOT IN ('Tostador', 'Admin') THEN
    RAISE EXCEPTION 'Solo Tostador o Admin pueden crear perfiles de tueste' USING ERRCODE = '42501';
  END IF;

  v_id_orden := public._ben_int(p_datos, 'id_orden');

  IF v_id_orden IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.ordenes_trabajo WHERE id_orden = v_id_orden AND deleted_at IS NULL) THEN
      RAISE EXCEPTION 'La factura indicada no existe o fue eliminada' USING ERRCODE = '22023';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.servicios_ejecutados WHERE id_orden = v_id_orden AND tipo_servicio = 'Tueste') THEN
      RAISE EXCEPTION 'La factura no contiene el servicio de Tueste' USING ERRCODE = '22023';
    END IF;
    IF EXISTS (SELECT 1 FROM public.perfiles_tueste WHERE id_orden = v_id_orden AND deleted_at IS NULL) THEN
      RAISE EXCEPTION 'La factura ya tiene un perfil de tueste activo' USING ERRCODE = '23505';
    END IF;
  END IF;

  INSERT INTO public.perfiles_tueste (id_orden, nombre_cafe, fecha_tueste, id_tostador, temperatura_sala, humedad_sala)
  VALUES (
    v_id_orden,
    public._ben_text(p_datos, 'nombre_cafe'),
    COALESCE(public._ben_date(p_datos, 'fecha_tueste'), CURRENT_DATE),
    public._ben_int(p_datos, 'id_tostador'),
    public._ben_num(p_datos, 'temperatura_sala'),
    public._ben_num(p_datos, 'humedad_sala')
  )
  RETURNING id_perfil INTO v_id_perfil;

  FOR v_lote_id IN SELECT DISTINCT value::integer FROM jsonb_array_elements_text(COALESCE(p_datos->'lote_ids', '[]'::jsonb))
  LOOP
    IF v_lote_id IS NULL OR v_lote_id <= 0 THEN CONTINUE; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.lotes_cafe WHERE id_lote = v_lote_id AND deleted_at IS NULL) THEN
      RAISE EXCEPTION 'El lote % no existe o fue eliminado', v_lote_id USING ERRCODE = '22023';
    END IF;
    INSERT INTO public.perfil_tueste_lotes (id_perfil, id_lote)
    SELECT v_id_perfil, v_lote_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.perfil_tueste_lotes
       WHERE id_perfil = v_id_perfil AND id_lote = v_lote_id AND deleted_at IS NULL
    );
    IF v_primer_lote IS NULL THEN
      SELECT numero_lote INTO v_primer_lote FROM public.lotes_cafe WHERE id_lote = v_lote_id;
    END IF;
  END LOOP;

  IF v_primer_lote IS NOT NULL THEN
    UPDATE public.perfiles_tueste SET numero_lote = v_primer_lote, updated_at = now() WHERE id_perfil = v_id_perfil;
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id_lote', l.id_lote,
    'numero_lote', l.numero_lote,
    'enproceso', l.enproceso,
    'estado_lote', l.estado_lote
  ) ORDER BY l.numero_lote), '[]'::jsonb)
  INTO v_lotes
  FROM public.perfil_tueste_lotes ptl
  JOIN public.lotes_cafe l ON l.id_lote = ptl.id_lote
  WHERE ptl.id_perfil = v_id_perfil AND ptl.deleted_at IS NULL;

  RETURN jsonb_build_object(
    'perfil', (SELECT to_jsonb(p.*) FROM public.perfiles_tueste p WHERE p.id_perfil = v_id_perfil),
    'lotes', v_lotes
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.crear_perfil_tueste(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crear_perfil_tueste(jsonb) TO authenticated, service_role;
NOTIFY pgrst, 'reload schema';
