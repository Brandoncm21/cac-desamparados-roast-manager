-- 0030_bodega.sql
-- P2c de 002-fusion-cbf: Bodega/reposo + vÃ­nculo N:M secadoâ†”bodega (guardar_cafe).
-- Referencias: doc raÃ­z Â§4.4.1, FR-003 (RPC atÃ³mica), disp. 13 (objeto
-- {id_secado, cantidad_sacos} en vez de int crudo), T5/densidades en g/ml,
-- T8 (split trilla), regla de porteo 1/4.
-- DECISIÃ“N DOCUMENTADA: para el vÃ­nculo N:M puro se aplica SYNC DURO
-- (delete + reinsert de los no-enviados): una tabla de relaciÃ³n pura no tiene
-- valor histÃ³rico y un soft-delete chocarÃ­a con la PK compuesta al re-agregar.

CREATE TABLE bodega_lote (
  id_bodega serial PRIMARY KEY,
  id_lote integer NOT NULL REFERENCES lotes_cafe(id_lote) ON DELETE CASCADE,
  finicio_reposo timestamptz,
  cantidad_sacos integer CHECK (cantidad_sacos >= 0),
  -- Pesos
  w_bellota numeric,
  w_pergamino numeric,
  -- Humedades
  hinicial numeric,
  hfinal numeric,
  -- Densidades (g/ml, valor tÃ­pico documentado: bellota 0.60â€“0.70, pergamino 0.65â€“0.75)
  d_bellota numeric,
  d_pergamino numeric,
  -- Pruebas de masa
  pmh_relativa numeric,
  pmt_interna numeric,
  pmt_externa numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,

  CONSTRAINT bodega_humedades_rango CHECK (
    COALESCE(hinicial,0) BETWEEN 0 AND 100 AND COALESCE(hfinal,0) BETWEEN 0 AND 100
  ),
  CONSTRAINT bodega_densidades_positivas CHECK (
    COALESCE(d_bellota,0) >= 0 AND COALESCE(d_pergamino,0) >= 0
  ),
  CONSTRAINT bodega_pesos_positivos CHECK (
    COALESCE(w_bellota,0) >= 0 AND COALESCE(w_pergamino,0) >= 0
  )
);

CREATE TABLE secado_bodega (
  id_secado integer NOT NULL REFERENCES secado_lote(id_secado) ON DELETE CASCADE,
  id_bodega integer NOT NULL REFERENCES bodega_lote(id_bodega) ON DELETE CASCADE,
  cantidad_sacos integer NOT NULL CHECK (cantidad_sacos > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id_secado, id_bodega)
);

CREATE TRIGGER trg_bodega_updated_at BEFORE UPDATE ON bodega_lote
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_bodega_lote_idx ON bodega_lote (id_lote) WHERE deleted_at IS NULL;
CREATE INDEX idx_secado_bodega_bodega ON secado_bodega (id_bodega);

-- â”€â”€ RLS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE bodega_lote ENABLE ROW LEVEL SECURITY;
CREATE POLICY bodega_select ON bodega_lote FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY bodega_insert ON bodega_lote FOR INSERT TO authenticated
  WITH CHECK (get_empleado_rol() IN ('RecepciÃ³n', 'Admin'));
CREATE POLICY bodega_update ON bodega_lote FOR UPDATE TO authenticated
  USING (get_empleado_rol() IN ('RecepciÃ³n', 'Admin')) WITH CHECK (true);

ALTER TABLE secado_bodega ENABLE ROW LEVEL SECURITY;
CREATE POLICY secado_bodega_select ON secado_bodega FOR SELECT TO authenticated USING (true);
CREATE POLICY secado_bodega_insert ON secado_bodega FOR INSERT TO authenticated
  WITH CHECK (get_empleado_rol() IN ('RecepciÃ³n', 'Admin'));
CREATE POLICY secado_bodega_delete ON secado_bodega FOR DELETE TO authenticated
  USING (get_empleado_rol() IN ('RecepciÃ³n', 'Admin'));

-- â”€â”€ RPC atÃ³mica guardar_bodega (FR-003) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE OR REPLACE FUNCTION guardar_bodega(
  p_id_lote integer,
  p_bodega jsonb,
  p_secados_guardados jsonb DEFAULT NULL
) RETURNS jsonb
SECURITY INVOKER SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_rol text := get_empleado_rol();
  v_bodega_id integer;
  v_it jsonb;
  v_id_secado integer;
  v_sacos integer;
  v_invalidos integer;
BEGIN
  IF v_rol NOT IN ('Admin', 'RecepciÃ³n') THEN
    RAISE EXCEPTION 'Solo RecepciÃ³n o Admin pueden guardar la bodega';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM lotes_cafe WHERE id_lote = p_id_lote AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Lote no encontrado';
  END IF;

  IF (p_bodega ? 'id_bodega') THEN
    UPDATE bodega_lote SET
      finicio_reposo = COALESCE((p_bodega->>'finicio_reposo')::timestamptz, finicio_reposo),
      cantidad_sacos = COALESCE((p_bodega->>'cantidad_sacos')::integer, cantidad_sacos),
      w_bellota      = COALESCE((p_bodega->>'w_bellota')::numeric, w_bellota),
      w_pergamino    = COALESCE((p_bodega->>'w_pergamino')::numeric, w_pergamino),
      hinicial       = COALESCE((p_bodega->>'hinicial')::numeric, hinicial),
      hfinal         = COALESCE((p_bodega->>'hfinal')::numeric, hfinal),
      d_bellota      = COALESCE((p_bodega->>'d_bellota')::numeric, d_bellota),
      d_pergamino    = COALESCE((p_bodega->>'d_pergamino')::numeric, d_pergamino),
      pmh_relativa   = COALESCE((p_bodega->>'pmh_relativa')::numeric, pmh_relativa),
      pmt_interna    = COALESCE((p_bodega->>'pmt_interna')::numeric, pmt_interna),
      pmt_externa    = COALESCE((p_bodega->>'pmt_externa')::numeric, pmt_externa)
    WHERE id_bodega = (p_bodega->>'id_bodega')::integer
      AND id_lote = p_id_lote AND deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Bodega no encontrada para este lote';
    END IF;
    v_bodega_id := (p_bodega->>'id_bodega')::integer;
  ELSE
    INSERT INTO bodega_lote (
      id_lote, finicio_reposo, cantidad_sacos,
      w_bellota, w_pergamino, hinicial, hfinal, d_bellota, d_pergamino,
      pmh_relativa, pmt_interna, pmt_externa
    ) VALUES (
      p_id_lote,
      (p_bodega->>'finicio_reposo')::timestamptz,
      (p_bodega->>'cantidad_sacos')::integer,
      (p_bodega->>'w_bellota')::numeric,
      (p_bodega->>'w_pergamino')::numeric,
      (p_bodega->>'hinicial')::numeric,
      (p_bodega->>'hfinal')::numeric,
      (p_bodega->>'d_bellota')::numeric,
      (p_bodega->>'d_pergamino')::numeric,
      (p_bodega->>'pmh_relativa')::numeric,
      (p_bodega->>'pmt_interna')::numeric,
      (p_bodega->>'pmt_externa')::numeric
    );
    v_bodega_id := (SELECT id_bodega FROM bodega_lote
                    WHERE id_lote = p_id_lote ORDER BY id_bodega DESC LIMIT 1);
  END IF;

  -- VÃ­nculos N:M: sync duro de la relaciÃ³n pura (decisiÃ³n documentada).
  -- p_secados_guardados: [{id_secado, cantidad_sacos}] â€” disp. 13 (objeto, no int crudo)
  IF p_secados_guardados IS NOT NULL THEN
    -- Validar antes de tocar: todos los id_secado deben existir y pertenecer al lote
    SELECT count(*)::integer INTO v_invalidos
      FROM jsonb_array_elements(p_secados_guardados) je
      WHERE NOT EXISTS (
        SELECT 1 FROM secado_lote s
        WHERE s.id_secado = (v_it->>'id_secado')::integer
          AND s.id_lote = p_id_lote AND s.deleted_at IS NULL
      );
    IF v_invalidos > 0 THEN
      RAISE EXCEPTION '% secado(s) invÃ¡lido(s): no existen o no pertenecen al lote', v_invalidos;
    END IF;

    -- Upsert de los enviados
    FOR v_it IN SELECT * FROM jsonb_array_elements(p_secados_guardados) je LOOP
      v_id_secado := (v_it->>'id_secado')::integer;
      v_sacos := (v_it->>'cantidad_sacos')::integer;
      INSERT INTO secado_bodega (id_secado, id_bodega, cantidad_sacos)
      VALUES (v_id_secado, v_bodega_id, v_sacos)
      ON CONFLICT (id_secado, id_bodega) DO UPDATE SET cantidad_sacos = EXCLUDED.cantidad_sacos;
    END LOOP;

    -- Borrar (vÃ­nculo puro) los que ya NO vienen
    DELETE FROM secado_bodega
      WHERE id_bodega = v_bodega_id
        AND id_secado <> ALL (
          SELECT (j->>'id_secado')::int FROM jsonb_array_elements(p_secados_guardados) j
        );
  END IF;

  RETURN to_jsonb(b.*) FROM bodega_lote b WHERE b.id_bodega = v_bodega_id;
END;
$$;

REVOKE ALL ON FUNCTION guardar_bodega(integer, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION guardar_bodega(integer, jsonb, jsonb) TO authenticated;
