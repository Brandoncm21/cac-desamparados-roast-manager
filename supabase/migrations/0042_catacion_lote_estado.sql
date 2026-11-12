-- 0042_catacion_lote_estado.sql
-- Feature 004 (refactor flujo lotes) — T11 Catación elige lote
-- FR-004: al guardar la catación con lote → lotes_cafe.enproceso='En Catación';
--         al marcarla finalizada (p_catacion.finalizada=true) → 'Vendido'.
-- FR-012: la catación puede asociarse a perfil, a lote, o a ambos.
-- Mejora: nlote se deriva del lote (fuente de verdad) y, si no hay lote,
--         desde orden_lotes (nuevo modelo) con fallback a orden_lotes_externos (legacy).

CREATE OR REPLACE FUNCTION public.guardar_catacion(p_catacion jsonb, p_rondas jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_rol text := get_empleado_rol();
  v_id integer;
  v_ref uuid;
  v_it jsonb;
  v_hay_ids boolean;
  v_nlote text;
  v_lote integer;
  v_finalizada boolean := false;
  v_nuevos int[] := '{}';
  v_nuevo_id integer;
BEGIN
  IF v_rol NOT IN ('Tostador', 'Admin') THEN
    RAISE EXCEPTION 'Solo Tostador o Admin pueden registrar la catación';
  END IF;
  IF p_catacion IS NULL THEN RAISE EXCEPTION 'Datos de catación faltantes'; END IF;

  v_ref := NULLIF(p_catacion->>'perfil_tueste_ref', '')::uuid;
  v_lote := NULLIF(p_catacion->>'id_lote', '')::integer;
  v_finalizada := COALESCE((p_catacion->>'finalizada')::boolean, false);

  IF v_ref IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM perfiles_tueste WHERE public_id = v_ref AND estado = 'Completado' AND deleted_at IS NULL
  ) THEN RAISE EXCEPTION 'El perfil de tueste no existe o aún no está Completado'; END IF;

  -- Deriva nlote desde el perfil: primero el modelo nuevo (orden_lotes), luego legacy.
  IF v_ref IS NOT NULL AND (p_catacion ? 'id_catacion_tueste') IS FALSE AND p_catacion->>'nlote' IS NULL THEN
    SELECT l.nlote INTO v_nlote
      FROM perfiles_tueste pt
      JOIN orden_lotes ol ON ol.id_orden = pt.id_orden
      JOIN lotes_cafe l ON l.id_lote = ol.id_lote
      WHERE pt.public_id = v_ref AND l.deleted_at IS NULL
      ORDER BY ol.created_at DESC LIMIT 1;

    IF v_nlote IS NULL THEN
      SELECT ole.nlote INTO v_nlote
        FROM perfiles_tueste pt
        JOIN ordenes_trabajo o ON o.id_orden = pt.id_orden
        JOIN orden_lotes_externos ole ON ole.id_orden = o.id_orden
        WHERE pt.public_id = v_ref
        ORDER BY ole.origen <> 'fusion', ole.created_at DESC LIMIT 1;
    END IF;
  END IF;

  -- El lote es la fuente de verdad del nlote cuando viene explícito.
  IF v_lote IS NOT NULL THEN
    SELECT l.nlote INTO v_nlote
      FROM lotes_cafe l
      WHERE l.id_lote = v_lote AND l.deleted_at IS NULL;
    IF NOT FOUND THEN RAISE EXCEPTION 'El lote indicado no existe o fue eliminado'; END IF;
  END IF;

  IF (p_catacion ? 'id_catacion_tueste') THEN
    UPDATE catacion_tueste SET
      id_lote        = COALESCE((p_catacion->>'id_lote')::integer, id_lote),
      nlote          = COALESCE(v_nlote, p_catacion->>'nlote', nlote),
      producto_analizado = COALESCE(p_catacion->>'producto_analizado', producto_analizado),
      ffreposo       = COALESCE((p_catacion->>'ffreposo')::timestamptz, ffreposo),
      pfinales       = COALESCE((p_catacion->>'pfinales')::numeric, pfinales),
      limpio         = COALESCE((p_catacion->>'limpio')::numeric, limpio),
      defectuoso     = COALESCE((p_catacion->>'defectuoso')::numeric, defectuoso),
      overde         = COALESCE((p_catacion->>'overde')::numeric, overde),
      ccverde        = COALESCE((p_catacion->>'ccverde')::numeric, ccverde),
      quaker         = COALESCE((p_catacion->>'quaker')::numeric, quaker),
      rtostado       = COALESCE((p_catacion->>'rtostado')::numeric, rtostado),
      dfueste        = COALESCE((p_catacion->>'dfueste')::numeric, dfueste),
      cccalidad      = COALESCE((p_catacion->>'cccalidad')::numeric, cccalidad),
      c1agrio        = COALESCE((p_catacion->>'c1agrio')::numeric, c1agrio),
      c1hongos       = COALESCE((p_catacion->>'c1hongos')::numeric, c1hongos),
      c1cerezaseca   = COALESCE((p_catacion->>'c1cerezaseca')::numeric, c1cerezaseca),
      c1negro        = COALESCE((p_catacion->>'c1negro')::numeric, c1negro),
      c1insectos     = COALESCE((p_catacion->>'c1insectos')::numeric, c1insectos),
      c1me           = COALESCE((p_catacion->>'c1me')::numeric, c1me),
      c2flotador     = COALESCE((p_catacion->>'c2flotador')::numeric, c2flotador),
      c2averanado    = COALESCE((p_catacion->>'c2averanado')::numeric, c2averanado),
      c2pergamino    = COALESCE((p_catacion->>'c2pergamino')::numeric, c2pergamino),
      c2inmaduro     = COALESCE((p_catacion->>'c2inmaduro')::numeric, c2inmaduro),
      c2concha       = COALESCE((p_catacion->>'c2concha')::numeric, c2concha),
      c2insectos     = COALESCE((p_catacion->>'c2insectos')::numeric, c2insectos),
      c2cascara      = COALESCE((p_catacion->>'c2cascara')::numeric, c2cascara),
      c2pulpa        = COALESCE((p_catacion->>'c2pulpa')::numeric, c2pulpa),
      c2partido      = COALESCE((p_catacion->>'c2partido')::numeric, c2partido),
      c2cortado      = COALESCE((p_catacion->>'c2cortado')::numeric, c2cortado),
      c2mordido      = COALESCE((p_catacion->>'c2mordido')::numeric, c2mordido),
      c2negrop       = COALESCE((p_catacion->>'c2negrop')::numeric, c2negrop),
      c2agriop       = COALESCE((p_catacion->>'c2agriop')::numeric, c2agriop),
      tres_sobre_dieciseis = COALESCE((p_catacion->>'tres_sobre_dieciseis')::numeric, tres_sobre_dieciseis),
      veinte         = COALESCE((p_catacion->>'veinte')::numeric, veinte),
      diecinueve     = COALESCE((p_catacion->>'diecinueve')::numeric, diecinueve),
      dieciocho      = COALESCE((p_catacion->>'dieciocho')::numeric, dieciocho),
      diecisiete     = COALESCE((p_catacion->>'diecisiete')::numeric, diecisiete),
      dieciseis      = COALESCE((p_catacion->>'dieciseis')::numeric, dieciseis),
      quince         = COALESCE((p_catacion->>'quince')::numeric, quince),
      catorce        = COALESCE((p_catacion->>'catorce')::numeric, catorce),
      trece          = COALESCE((p_catacion->>'trece')::numeric, trece),
      tonagton_25    = COALESCE((p_catacion->>'tonagton_25')::numeric, tonagton_25),
      tonagton_35    = COALESCE((p_catacion->>'tonagton_35')::numeric, tonagton_35),
      tonagton_45    = COALESCE((p_catacion->>'tonagton_45')::numeric, tonagton_45),
      tonagton_55    = COALESCE((p_catacion->>'tonagton_55')::numeric, tonagton_55),
      tonagton_65    = COALESCE((p_catacion->>'tonagton_65')::numeric, tonagton_65),
      tonagton_75    = COALESCE((p_catacion->>'tonagton_75')::numeric, tonagton_75),
      tonagton_85    = COALESCE((p_catacion->>'tonagton_85')::numeric, tonagton_85),
      tonagton_95    = COALESCE((p_catacion->>'tonagton_95')::numeric, tonagton_95)
    WHERE id_catacion_tueste = (p_catacion->>'id_catacion_tueste')::integer AND deleted_at IS NULL;

    IF NOT FOUND THEN RAISE EXCEPTION 'Catación no encontrada'; END IF;
    v_id := (p_catacion->>'id_catacion_tueste')::integer;
  ELSE
    INSERT INTO catacion_tueste (
      perfil_tueste_ref, producto_analizado, id_lote, nlote, ffreposo, pfinales,
      limpio, defectuoso, overde, ccverde, quaker, rtostado, dfueste, cccalidad,
      c1agrio, c1hongos, c1cerezaseca, c1negro, c1insectos, c1me,
      c2flotador, c2averanado, c2pergamino, c2inmaduro, c2concha, c2insectos,
      c2cascara, c2pulpa, c2partido, c2cortado, c2mordido, c2negrop, c2agriop,
      tres_sobre_dieciseis, veinte, diecinueve, dieciocho, diecisiete, dieciseis,
      quince, catorce, trece,
      tonagton_25, tonagton_35, tonagton_45, tonagton_55,
      tonagton_65, tonagton_75, tonagton_85, tonagton_95
    ) VALUES (
      v_ref,
      COALESCE(p_catacion->>'producto_analizado', 'tueste'),
      v_lote,
      COALESCE(v_nlote, p_catacion->>'nlote'),
      (p_catacion->>'ffreposo')::timestamptz,
      (p_catacion->>'pfinales')::numeric,
      (p_catacion->>'limpio')::numeric,
      (p_catacion->>'defectuoso')::numeric,
      (p_catacion->>'overde')::numeric,
      (p_catacion->>'ccverde')::numeric,
      (p_catacion->>'quaker')::numeric,
      (p_catacion->>'rtostado')::numeric,
      (p_catacion->>'dfueste')::numeric,
      (p_catacion->>'cccalidad')::numeric,
      (p_catacion->>'c1agrio')::numeric,
      (p_catacion->>'c1hongos')::numeric,
      (p_catacion->>'c1cerezaseca')::numeric,
      (p_catacion->>'c1negro')::numeric,
      (p_catacion->>'c1insectos')::numeric,
      (p_catacion->>'c1me')::numeric,
      (p_catacion->>'c2flotador')::numeric,
      (p_catacion->>'c2averanado')::numeric,
      (p_catacion->>'c2pergamino')::numeric,
      (p_catacion->>'c2inmaduro')::numeric,
      (p_catacion->>'c2concha')::numeric,
      (p_catacion->>'c2insectos')::numeric,
      (p_catacion->>'c2cascara')::numeric,
      (p_catacion->>'c2pulpa')::numeric,
      (p_catacion->>'c2partido')::numeric,
      (p_catacion->>'c2cortado')::numeric,
      (p_catacion->>'c2mordido')::numeric,
      (p_catacion->>'c2negrop')::numeric,
      (p_catacion->>'c2agriop')::numeric,
      (p_catacion->>'tres_sobre_dieciseis')::numeric,
      (p_catacion->>'veinte')::numeric,
      (p_catacion->>'diecinueve')::numeric,
      (p_catacion->>'dieciocho')::numeric,
      (p_catacion->>'diecisiete')::numeric,
      (p_catacion->>'dieciseis')::numeric,
      (p_catacion->>'quince')::numeric,
      (p_catacion->>'catorce')::numeric,
      (p_catacion->>'trece')::numeric,
      (p_catacion->>'tonagton_25')::numeric,
      (p_catacion->>'tonagton_35')::numeric,
      (p_catacion->>'tonagton_45')::numeric,
      (p_catacion->>'tonagton_55')::numeric,
      (p_catacion->>'tonagton_65')::numeric,
      (p_catacion->>'tonagton_75')::numeric,
      (p_catacion->>'tonagton_85')::numeric,
      (p_catacion->>'tonagton_95')::numeric
    )
    RETURNING id_catacion_tueste INTO v_id;
  END IF;

  IF p_rondas IS NOT NULL THEN
    v_hay_ids := EXISTS (SELECT 1 FROM jsonb_array_elements(p_rondas) je WHERE je->>'id' IS NOT NULL);

    FOR v_it IN SELECT * FROM jsonb_array_elements(p_rondas) LOOP
      IF (v_it->>'id') IS NOT NULL THEN
        UPDATE catacion_rondas SET
          valor_calidad = COALESCE((v_it->>'valor_calidad')::numeric, valor_calidad),
          deleted_at = NULL
        WHERE id_catacion_ronda = (v_it->>'id')::integer AND catacion_id = v_id;
        IF NOT FOUND THEN RAISE EXCEPTION 'ronda % no pertenece a esta catación', (v_it->>'id'); END IF;
      ELSE
        INSERT INTO catacion_rondas (catacion_id, valor_calidad)
        VALUES (v_id, (v_it->>'valor_calidad')::numeric)
        RETURNING id_catacion_ronda INTO v_nuevo_id;
        v_nuevos := v_nuevos || v_nuevo_id;
      END IF;
    END LOOP;

    IF v_hay_ids THEN
      UPDATE catacion_rondas SET deleted_at = now()
        WHERE catacion_id = v_id AND deleted_at IS NULL
          AND id_catacion_ronda NOT IN (SELECT unnest(v_nuevos))
          AND id_catacion_ronda NOT IN (
            SELECT (je->>'id')::int FROM jsonb_array_elements(p_rondas) je
            WHERE je->>'id' IS NOT NULL
          );
    END IF;
  END IF;

  -- FR-004: transición de estado del lote catado.
  -- En UPDATE puede no venir id_lote explícito: se lee el de la catación guardada.
  IF v_lote IS NULL THEN
    SELECT ct.id_lote INTO v_lote FROM catacion_tueste ct WHERE ct.id_catacion_tueste = v_id;
  END IF;

  IF v_lote IS NOT NULL THEN
    UPDATE lotes_cafe
       SET enproceso = CASE WHEN v_finalizada THEN 'Vendido' ELSE 'En Catación' END
     WHERE id_lote = v_lote
       AND deleted_at IS NULL
       -- editar una catación de un lote ya vendido no lo devuelve a catación
       AND (v_finalizada OR enproceso <> 'Vendido');
  END IF;

  RETURN jsonb_build_object(
    'catacion', (SELECT to_jsonb(ct.*) FROM catacion_tueste ct WHERE ct.id_catacion_tueste = v_id),
    'rondas', (SELECT COALESCE(jsonb_agg(to_jsonb(cr) ORDER BY cr.id_catacion_ronda), '[]'::jsonb)
               FROM catacion_rondas cr WHERE cr.catacion_id = v_id AND cr.deleted_at IS NULL)
  );
END;
$function$;
