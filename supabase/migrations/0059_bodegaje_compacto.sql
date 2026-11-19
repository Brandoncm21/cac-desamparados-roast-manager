-- 0059: Bodegaje compacto — se dejan de escribir densidades y condiciones ambientales

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
      humedad_inicial, humedad_final
    ) VALUES (
      p_id_lote,
      public._ben_date(p_bodega, 'inicio_reposo'),
      public._ben_int(p_bodega, 'cantidad_sacos'),
      public._ben_num(p_bodega, 'peso_pergamino'),
      public._ben_num(p_bodega, 'peso_bellota'),
      public._ben_num(p_bodega, 'humedad_inicial'),
      public._ben_num(p_bodega, 'humedad_final')
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

NOTIFY pgrst, 'reload schema';
