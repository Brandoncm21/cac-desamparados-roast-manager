-- 0032_catacion_pipeline.sql
-- P3 de 002-fusion-cbf: Catación (48 atributos del snapshot real de CBF incl.
-- c2cortado/c2negrop/c2agriop) + Rondas (SOLO valor_calidad) + K3 materializada
-- (perfil_tueste_ref → perfiles_tueste.public_id) + FK nlote materializada
-- (disp. 14) + RPC guardar_catacion + e1 crear_orden_desde_trilla (FR-010/013).
-- Referencias: doc raíz §4.2/§4.7, FR-003/013/014, disp. 2/4/6/14/15.

CREATE TABLE catacion_tueste (
  id_catacion_tueste serial PRIMARY KEY,
  -- K3: enlace al perfil de tueste cataado (nullable para cargas históricas;
  -- la API exige perfil 'Completado' al crear desde UI — FR-014)
  perfil_tueste_ref uuid REFERENCES perfiles_tueste(public_id),
  producto_analizado varchar(20) NOT NULL DEFAULT 'tueste'
    CHECK (producto_analizado IN ('tueste', 'verde')),
  -- Disp. 14: FK materializada al lote (SET NULL si se purga físicamente)
  id_lote integer REFERENCES lotes_cafe(id_lote) ON DELETE SET NULL,
  -- Identidad
  nlote varchar(100) REFERENCES lotes_cafe(nlote) ON UPDATE CASCADE ON DELETE SET NULL,
  ffreposo timestamptz,                    -- disp. 6: fecha real, NO numeric
  pfinales numeric,                        -- puntaje derivado (CBF lo llena)
  -- 1. Evaluación físico-visual
  limpio numeric,
  defectuoso numeric,
  overde numeric,                          -- olor en verde
  ccverde numeric,                         -- coloración en verde
  quaker numeric,
  rtostado numeric,                        -- rendimiento de tueste (%)
  dfueste numeric,                         -- densidad de tueste (g/ml — Anexo C)
  cccalidad numeric,
  -- 2. Defectos Categoría 1 (grano verde)
  c1agrio numeric,
  c1hongos numeric,
  c1cerezaseca numeric,
  c1negro numeric,
  c1insectos numeric,
  c1me numeric,
  -- 3. Defectos Categoría 2 (grano verde)
  c2flotador numeric,
  c2averanado numeric,
  c2pergamino numeric,
  c2inmaduro numeric,
  c2concha numeric,
  c2insectos numeric,
  c2cascara numeric,
  c2pulpa numeric,
  c2partido numeric,
  c2cortado numeric,                       -- disp. 2: campo existe con campo UI
  c2mordido numeric,
  c2negrop numeric,
  c2agriop numeric,
  -- 4. Zarandas (tamices)
  tres_sobre_dieciseis numeric,
  veinte numeric,
  diecinueve numeric,
  dieciocho numeric,
  diecisiete numeric,
  dieciseis numeric,
  quince numeric,
  catorce numeric,
  trece numeric,
  -- 5. Agtron
  tonagton_25 numeric,
  tonagton_35 numeric,
  tonagton_45 numeric,
  tonagton_55 numeric,
  tonagton_65 numeric,
  tonagton_75 numeric,
  tonagton_85 numeric,
  tonagton_95 numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,

  CONSTRAINT catacion_rangos CHECK (
    COALESCE(limpio,0) BETWEEN 0 AND 100
    AND COALESCE(defectuoso,0) BETWEEN 0 AND 100
    AND COALESCE(rtostado,0) BETWEEN 0 AND 100
    AND COALESCE(pfinales,0) BETWEEN 0 AND 100
    AND COALESCE(dfueste,0) >= 0
    AND COALESCE(quaker,0) >= 0 AND COALESCE(overde,0) >= 0
    AND COALESCE(ccverde,0) >= 0 AND COALESCE(cccalidad,0) >= 0
    AND COALESCE(c1agrio,0) >= 0 AND COALESCE(c1hongos,0) >= 0
    AND COALESCE(c1cerezaseca,0) >= 0 AND COALESCE(c1negro,0) >= 0
    AND COALESCE(c1insectos,0) >= 0 AND COALESCE(c1me,0) >= 0
    AND COALESCE(c2flotador,0) >= 0 AND COALESCE(c2averanado,0) >= 0
    AND COALESCE(c2pergamino,0) >= 0 AND COALESCE(c2inmaduro,0) >= 0
    AND COALESCE(c2concha,0) >= 0 AND COALESCE(c2insectos,0) >= 0
    AND COALESCE(c2cascara,0) >= 0 AND COALESCE(c2pulpa,0) >= 0
    AND COALESCE(c2partido,0) >= 0 AND COALESCE(c2cortado,0) >= 0
    AND COALESCE(c2mordido,0) >= 0 AND COALESCE(c2negrop,0) >= 0
    AND COALESCE(c2agriop,0) >= 0
    AND COALESCE(tres_sobre_dieciseis,0) BETWEEN 0 AND 100
    AND COALESCE(veinte,0) BETWEEN 0 AND 100
    AND COALESCE(diecinueve,0) BETWEEN 0 AND 100
    AND COALESCE(dieciocho,0) BETWEEN 0 AND 100
    AND COALESCE(diecisiete,0) BETWEEN 0 AND 100
    AND COALESCE(dieciseis,0) BETWEEN 0 AND 100
    AND COALESCE(quince,0) BETWEEN 0 AND 100
    AND COALESCE(catorce,0) BETWEEN 0 AND 100
    AND COALESCE(trece,0) BETWEEN 0 AND 100
  )
);

CREATE TABLE catacion_rondas (
  id_catacion_ronda serial PRIMARY KEY,
  catacion_id integer NOT NULL REFERENCES catacion_tueste(id_catacion_tueste) ON DELETE CASCADE,
  valor_calidad numeric NOT NULL CHECK (valor_calidad BETWEEN 0 AND 100),  -- decisión: solo valor_calidad
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TRIGGER trg_catacion_updated_at BEFORE UPDATE ON catacion_tueste
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_catacion_rondas_updated_at BEFORE UPDATE ON catacion_rondas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_catacion_ref ON catacion_tueste (perfil_tueste_ref) WHERE deleted_at IS NULL;
CREATE INDEX idx_catacion_lote ON catacion_tueste (id_lote) WHERE deleted_at IS NULL;
CREATE INDEX idx_catacion_nlote ON catacion_tueste (nlote) WHERE deleted_at IS NULL;
CREATE INDEX idx_catacion_rondas_idx ON catacion_rondas (catacion_id) WHERE deleted_at IS NULL;

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE catacion_tueste ENABLE ROW LEVEL SECURITY;
CREATE POLICY catacion_select ON catacion_tueste FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY catacion_insert ON catacion_tueste FOR INSERT TO authenticated
  WITH CHECK (get_empleado_rol() IN ('Tostador', 'Admin'));
CREATE POLICY catacion_update ON catacion_tueste FOR UPDATE TO authenticated
  USING (get_empleado_rol() IN ('Tostador', 'Admin')) WITH CHECK (true);

ALTER TABLE catacion_rondas ENABLE ROW LEVEL SECURITY;
CREATE POLICY catacion_rondas_select ON catacion_rondas FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY catacion_rondas_insert ON catacion_rondas FOR INSERT TO authenticated
  WITH CHECK (get_empleado_rol() IN ('Tostador', 'Admin'));
CREATE POLICY catacion_rondas_update ON catacion_rondas FOR UPDATE TO authenticated
  USING (get_empleado_rol() IN ('Tostador', 'Admin')) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON catacion_tueste TO authenticated;
GRANT SELECT, INSERT, UPDATE ON catacion_rondas TO authenticated;

-- ── RPC guardar_catacion (FR-003) ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION guardar_catacion(
  p_catacion jsonb,
  p_rondas jsonb DEFAULT NULL
) RETURNS jsonb
SECURITY INVOKER SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_rol text := get_empleado_rol();
  v_id integer;
  v_ref uuid;
  v_it jsonb;
  v_hay_ids boolean;
  v_nlote text;
  v_nuevos int[] := '{}';
  v_nuevo_id integer;
BEGIN
  IF v_rol NOT IN ('Tostador', 'Admin') THEN
    RAISE EXCEPTION 'Solo Tostador o Admin pueden registrar la catación';
  END IF;

  IF p_catacion IS NULL THEN
    RAISE EXCEPTION 'Datos de catación faltantes';
  END IF;

  v_ref := NULLIF(p_catacion->>'perfil_tueste_ref', '')::uuid;

  -- FR-014 (e2): el perfil referenciado debe existir y estar Completado
  IF v_ref IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM perfiles_tueste
    WHERE public_id = v_ref AND estado = 'Completado' AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'El perfil de tueste no existe o aún no está Completado';
  END IF;

  IF v_ref IS NOT NULL AND (p_catacion ? 'id_catacion_tueste') IS FALSE AND p_catacion->>'nlote' IS NULL THEN
    -- autoderiva nlote desde el enlace ole = dosis K1 del orden → K4 traceability
    SELECT ole.nlote INTO v_nlote
      FROM perfiles_tueste pt
      JOIN ordenes_trabajo o ON o.id_orden = pt.id_orden
      JOIN orden_lotes_externos ole ON ole.id_orden = o.id_orden
      WHERE pt.public_id = v_ref
      ORDER BY ole.origen <> 'fusion', ole.created_at DESC
      LIMIT 1;
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
    WHERE id_catacion_tueste = (p_catacion->>'id_catacion_tueste')::integer
      AND deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Catación no encontrada';
    END IF;
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
      (p_catacion->>'id_lote')::integer,
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

  -- Rondas: patrón de serie (upsert por id + soft-delete de ids no enviados)
  IF p_rondas IS NOT NULL THEN
    v_hay_ids := EXISTS (SELECT 1 FROM jsonb_array_elements(p_rondas) je WHERE je->>'id' IS NOT NULL);

    FOR v_it IN SELECT * FROM jsonb_array_elements(p_rondas) LOOP
      IF (v_it->>'id') IS NOT NULL THEN
        UPDATE catacion_rondas SET
          valor_calidad = COALESCE((v_it->>'valor_calidad')::numeric, valor_calidad),
          deleted_at = NULL
          WHERE id_catacion_ronda = (v_it->>'id')::integer
            AND catacion_id = v_id;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'ronda % no pertenece a esta catación', (v_it->>'id');
        END IF;
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

  RETURN jsonb_build_object(
    'catacion', (SELECT to_jsonb(ct.*) FROM catacion_tueste ct WHERE ct.id_catacion_tueste = v_id),
    'rondas', (SELECT COALESCE(jsonb_agg(to_jsonb(cr) ORDER BY cr.id_catacion_ronda), '[]'::jsonb)
               FROM catacion_rondas cr WHERE cr.catacion_id = v_id AND cr.deleted_at IS NULL)
  );
END;
$$;

REVOKE ALL ON FUNCTION guardar_catacion(jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION guardar_catacion(jsonb, jsonb) TO authenticated;

-- ── e1: crear_orden_desde_trilla (FR-013; K1 + K5 idempotencia) ───────────────
CREATE OR REPLACE FUNCTION crear_orden_desde_trilla(
  p_id_trilla integer
) RETURNS jsonb
SECURITY INVOKER SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_rol text := get_empleado_rol();
  v_trilla record;
  v_cliente_id integer;
  v_empleado_id integer;
  v_ref_existente integer;
  v_orden_nueva integer;
  v_resultado jsonb;
  v_servicios jsonb;
  v_proceso proceso_cafe_enum;
BEGIN
  IF v_rol NOT IN ('Admin', 'Recepción') THEN
    RAISE EXCEPTION 'Solo Recepción o Admin pueden enviar la trilla a proceso';
  END IF;

  SELECT t.*, l.nlote AS lote_nlote, l.nproductor, l.nfinca, l.zona,
         l.lavado, l.miel, l."natural", l.anaerobico, l.semilavado, l.otro,
         l.id_lote AS lote_id
    INTO v_trilla
    FROM trilla_lote t
    JOIN lotes_cafe l ON l.id_lote = t.id_lote
    WHERE t.id_trilla = p_id_trilla AND t.deleted_at IS NULL AND l.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trilla no encontrada';
  END IF;

  IF v_trilla.wverde_final IS NULL OR v_trilla.wverde_final <= 0 THEN
    RAISE EXCEPTION 'La trilla no tiene peso verde final registrado';
  END IF;

  -- K5 idempotencia: si este lote ya tiene orden enlazada, devolverla
  SELECT ole.id_orden INTO v_ref_existente
    FROM orden_lotes_externos ole
    WHERE ole.nlote = v_trilla.lote_nlote AND ole.origen = 'fusion'
    ORDER BY ole.created_at DESC LIMIT 1;

  IF v_ref_existente IS NOT NULL THEN
    RETURN jsonb_build_object('reused', true,
      'id_orden', v_ref_existente,
      'orden', (SELECT to_jsonb(o2.*) FROM ordenes_trabajo o2 WHERE o2.id_orden = v_ref_existente));
  END IF;

  -- K4: concordancia productor → cliente (external_ref o nombre exacto)
  SELECT c.id_cliente INTO v_cliente_id
    FROM clientes c
    WHERE c.deleted_at IS NULL
      AND (LOWER(c.external_ref) = LOWER(v_trilla.nproductor)
           OR LOWER(c.nombre_completo) = LOWER(v_trilla.nproductor))
    LIMIT 1;

  IF v_cliente_id IS NULL THEN
    RAISE EXCEPTION 'Concilie el productor "%" con un cliente (K4) antes de crear la orden', v_trilla.nproductor;
  END IF;

  SELECT e.id_empleado INTO v_empleado_id
    FROM empleados e WHERE e.id_auth = auth.uid() LIMIT 1;

  -- Servicios de la planta activos por prioridad
  SELECT COALESCE(jsonb_agg(jsonb_build_object('servicio_id', s.id_servicio_maestro) ORDER BY s.prioridad), '[]'::jsonb)
    INTO v_servicios
    FROM servicios_maestro s WHERE s.activo;

  IF v_servicios = '[]'::jsonb THEN
    RAISE EXCEPTION 'No hay servicios activos en la planta';
  END IF;

  -- FR-010: deriva proceso_cafe desde los booleans del lote
  v_proceso := CASE
    WHEN v_trilla.miel AND v_trilla.lavado THEN 'Honey'::proceso_cafe_enum
    WHEN v_trilla.lavado  THEN 'Lavado'::proceso_cafe_enum
    WHEN v_trilla."natural" THEN 'Natural'::proceso_cafe_enum
    WHEN v_trilla.miel THEN 'Honey'::proceso_cafe_enum
    ELSE 'Otro'::proceso_cafe_enum
  END;

  v_resultado := crear_orden_completa(
    jsonb_build_object(
      'id_cliente', v_cliente_id,
      'id_empleado_recibe', v_empleado_id,
      'zona_finca', v_trilla.zona,
      'proceso_cafe', v_proceso::text,
      'descripcion_producto', 'Fusión desde lote ' || v_trilla.lote_nlote
    ),
    v_servicios,
    NULL
  );

  v_orden_nueva := (v_resultado->>'id_orden')::integer;

  -- Puente K1: registrar el lote en la orden (ON CONFLICT idempotente)
  INSERT INTO orden_lotes_externos (id_orden, nlote, peso_kg, origen)
  VALUES (v_orden_nueva, v_trilla.lote_nlote, v_trilla.wverde_final, 'fusion')
  ON CONFLICT (id_orden, nlote, origen) DO NOTHING;

  RETURN jsonb_build_object('created', true, 'orden', v_resultado);
END;
$$;

REVOKE ALL ON FUNCTION crear_orden_desde_trilla(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION crear_orden_desde_trilla(integer) TO authenticated;
