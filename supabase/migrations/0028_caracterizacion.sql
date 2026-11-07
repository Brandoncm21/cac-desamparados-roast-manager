-- 0028_caracterizacion.sql
-- P2a de 002-fusion-cbf: Caracterización físico-química del lote (portada de CBF).
-- Referencias: doc raíz §4.2 (caracterización → tabla nueva), FR-003 (RPC upsert,
-- no delete-all — disp. 16), FR-004 (auditoría+soft-delete), disp. 3 (exponer
-- l_asignado), disp. 10 (NOT NULL consciente), disp. 15 (snake_case alineado).

CREATE TABLE caracterizacion_lote (
  id_caracterizacion serial PRIMARY KEY,
  id_lote integer NOT NULL REFERENCES lotes_cafe(id_lote) ON DELETE CASCADE,
  tiempo timestamptz NOT NULL,              -- PK natural de CBF → ahora columna + UNIQUE(id_lote, tiempo)
  proceso varchar(100),
  l_asignado varchar(50),                   -- disp. 3: exponer en la fusión
  -- Conteos de muestreo
  c_verdes integer,
  c_objetivo integer,
  c_inmaduras integer,
  c_sobremaduras integer,
  c_secas integer,
  vanos integer,
  secos integer,
  -- Valores y porcentajes
  dr_maduras numeric,
  densidad numeric,
  m_tabla numeric,
  e_maduracion numeric,
  broca numeric,
  pc_debajo numeric,
  pc_verdes numeric,
  pc_secas numeric,
  pc_encima numeric,
  pc_objetivo numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,

  CONSTRAINT caracterizacion_lote_lote_tiempo_key UNIQUE (id_lote, tiempo),
  CONSTRAINT caracterizacion_conteos_no_neg CHECK (
    COALESCE(c_verdes,0) >= 0 AND COALESCE(c_objetivo,0) >= 0 AND COALESCE(c_inmaduras,0) >= 0
    AND COALESCE(c_sobremaduras,0) >= 0 AND COALESCE(c_secas,0) >= 0
    AND COALESCE(vanos,0) >= 0 AND COALESCE(secos,0) >= 0
  ),
  CONSTRAINT caracterizacion_porcentajes_rango CHECK (
    COALESCE(broca,0) BETWEEN 0 AND 100 AND COALESCE(pc_debajo,0) BETWEEN 0 AND 100
    AND COALESCE(pc_verdes,0) BETWEEN 0 AND 100 AND COALESCE(pc_secas,0) BETWEEN 0 AND 100
    AND COALESCE(pc_encima,0) BETWEEN 0 AND 100 AND COALESCE(pc_objetivo,0) BETWEEN 0 AND 100
  )
);

CREATE TRIGGER trg_caracterizacion_updated_at
  BEFORE UPDATE ON caracterizacion_lote
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE caracterizacion_rc (
  id_caracterizacion_rc serial PRIMARY KEY,
  caracterizacion_id integer NOT NULL REFERENCES caracterizacion_lote(id_caracterizacion) ON DELETE CASCADE,
  tipo_rc varchar(20) NOT NULL CHECK (tipo_rc IN ('maduras', 'inmaduras', 'sobremaduras')),
  gbx numeric,
  promedio numeric,
  observaciones varchar(500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,

  CONSTRAINT caracterizacion_rc_tipo_key UNIQUE (caracterizacion_id, tipo_rc)
);

CREATE TRIGGER trg_caracterizacion_rc_updated_at
  BEFORE UPDATE ON caracterizacion_rc
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_caracterizacion_lote_idx ON caracterizacion_lote (id_lote)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_caracterizacion_rc_caract ON caracterizacion_rc (caracterizacion_id)
  WHERE deleted_at IS NULL;

-- ── RLS (reglas 1) ────────────────────────────────────────────────────────────
ALTER TABLE caracterizacion_lote ENABLE ROW LEVEL SECURITY;

CREATE POLICY caracterizacion_select ON caracterizacion_lote
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY caracterizacion_insert ON caracterizacion_lote
  FOR INSERT TO authenticated
  WITH CHECK (get_empleado_rol() IN ('Recepción', 'Admin'));

CREATE POLICY caracterizacion_update ON caracterizacion_lote
  FOR UPDATE TO authenticated
  USING (get_empleado_rol() IN ('Recepción', 'Admin'))
  WITH CHECK (true);

ALTER TABLE caracterizacion_rc ENABLE ROW LEVEL SECURITY;

CREATE POLICY caracterizacion_rc_select ON caracterizacion_rc
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY caracterizacion_rc_insert ON caracterizacion_rc
  FOR INSERT TO authenticated
  WITH CHECK (get_empleado_rol() IN ('Recepción', 'Admin'));

CREATE POLICY caracterizacion_rc_update ON caracterizacion_rc
  FOR UPDATE TO authenticated
  USING (get_empleado_rol() IN ('Recepción', 'Admin'))
  WITH CHECK (true);

-- ── RPC atómica (FR-003): upsert + soft-delete de tipos no enviados ──────────
CREATE OR REPLACE FUNCTION guardar_caracterizacion(
  p_id_lote integer,
  p_datos jsonb,
  p_rcs jsonb DEFAULT NULL
) RETURNS jsonb
SECURITY INVOKER SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_rol        text := get_empleado_rol();
  v_car_id     integer;
  v_car        jsonb;
  v_rcs        jsonb := '[]'::jsonb;
  v_rc         jsonb;
  v_item_id    integer;
  v_tipo       text;
  v_car_out    jsonb;
BEGIN
  IF v_rol NOT IN ('Admin', 'Recepción') THEN
    RAISE EXCEPTION 'Solo Recepción o Admin pueden guardar caracterización';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM lotes_cafe WHERE id_lote = p_id_lote AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Lote no encontrado';
  END IF;

  -- 1) Upsert de la cabecera (id_lote SIEMPRE forzado — no es editable)
  IF (p_datos ? 'id_caracterizacion') THEN
    UPDATE caracterizacion_lote SET
      tiempo          = COALESCE((p_datos->>'tiempo')::timestamptz, tiempo),
      proceso         = COALESCE(p_datos->>'proceso', proceso),
      l_asignado      = COALESCE(p_datos->>'l_asignado', l_asignado),
      c_verdes        = COALESCE((p_datos->>'c_verdes')::integer, c_verdes),
      c_objetivo      = COALESCE((p_datos->>'c_objetivo')::integer, c_objetivo),
      c_inmaduras     = COALESCE((p_datos->>'c_inmaduras')::integer, c_inmaduras),
      c_sobremaduras  = COALESCE((p_datos->>'c_sobremaduras')::integer, c_sobremaduras),
      c_secas         = COALESCE((p_datos->>'c_secas')::integer, c_secas),
      vanos           = COALESCE((p_datos->>'vanos')::integer, vanos),
      secos           = COALESCE((p_datos->>'secos')::integer, secos),
      dr_maduras      = COALESCE((p_datos->>'dr_maduras')::numeric, dr_maduras),
      densidad        = COALESCE((p_datos->>'densidad')::numeric, densidad),
      m_tabla         = COALESCE((p_datos->>'m_tabla')::numeric, m_tabla),
      e_maduracion    = COALESCE((p_datos->>'e_maduracion')::numeric, e_maduracion),
      broca           = COALESCE((p_datos->>'broca')::numeric, broca),
      pc_debajo       = COALESCE((p_datos->>'pc_debajo')::numeric, pc_debajo),
      pc_verdes       = COALESCE((p_datos->>'pc_verdes')::numeric, pc_verdes),
      pc_secas        = COALESCE((p_datos->>'pc_secas')::numeric, pc_secas),
      pc_encima       = COALESCE((p_datos->>'pc_encima')::numeric, pc_encima),
      pc_objetivo     = COALESCE((p_datos->>'pc_objetivo')::numeric, pc_objetivo)
    WHERE id_caracterizacion = (p_datos->>'id_caracterizacion')::integer
      AND id_lote = p_id_lote AND deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Caracterización no encontrada para este lote';
    END IF;

    v_car_id := (p_datos->>'id_caracterizacion')::integer;
  ELSE
    INSERT INTO caracterizacion_lote (
      id_lote, tiempo, proceso, l_asignado,
      c_verdes, c_objetivo, c_inmaduras, c_sobremaduras, c_secas, vanos, secos,
      dr_maduras, densidad, m_tabla, e_maduracion, broca,
      pc_debajo, pc_verdes, pc_secas, pc_encima, pc_objetivo
    ) VALUES (
      p_id_lote,
      (p_datos->>'tiempo')::timestamptz,
      p_datos->>'proceso',
      p_datos->>'l_asignado',
      (p_datos->>'c_verdes')::integer,
      (p_datos->>'c_objetivo')::integer,
      (p_datos->>'c_inmaduras')::integer,
      (p_datos->>'c_sobremaduras')::integer,
      (p_datos->>'c_secas')::integer,
      (p_datos->>'vanos')::integer,
      (p_datos->>'secos')::integer,
      (p_datos->>'dr_maduras')::numeric,
      (p_datos->>'densidad')::numeric,
      (p_datos->>'m_tabla')::numeric,
      (p_datos->>'e_maduracion')::numeric,
      (p_datos->>'broca')::numeric,
      (p_datos->>'pc_debajo')::numeric,
      (p_datos->>'pc_verdes')::numeric,
      (p_datos->>'pc_secas')::numeric,
      (p_datos->>'pc_encima')::numeric,
      (p_datos->>'pc_objetivo')::numeric
    )
    ON CONFLICT (id_lote, tiempo) DO UPDATE SET
      proceso  = EXCLUDED.proceso,
      l_asignado = EXCLUDED.l_asignado,
      deleted_at = NULL;

    v_car_id := (SELECT id_caracterizacion FROM caracterizacion_lote
                 WHERE id_lote = p_id_lote AND tiempo = (p_datos->>'tiempo')::timestamptz LIMIT 1);
  END IF;

  -- 2) RCs enviados: upsert por tipo (UNIQUE caracterizacion_id+tipo_rc)
  IF p_rcs IS NOT NULL THEN
    FOR v_rc IN SELECT * FROM jsonb_array_elements(p_rcs) LOOP
      v_tipo := v_rc->>'tipo_rc';
      IF v_tipo NOT IN ('maduras', 'inmaduras', 'sobremaduras') THEN
        RAISE EXCEPTION 'tipo_rc inválido: %', v_tipo;
      END IF;

      INSERT INTO caracterizacion_rc
        (caracterizacion_id, tipo_rc, gbx, promedio, observaciones)
      VALUES (
        v_car_id, v_tipo,
        (v_rc->>'gbx')::numeric,
        (v_rc->>'promedio')::numeric,
        v_rc->>'observaciones'
      )
      ON CONFLICT (caracterizacion_id, tipo_rc) DO UPDATE SET
        gbx          = COALESCE(EXCLUDED.gbx, caracterizacion_rc.gbx),
        promedio     = COALESCE(EXCLUDED.promedio, caracterizacion_rc.promedio),
        observaciones = COALESCE(EXCLUDED.observaciones, caracterizacion_rc.observaciones),
        deleted_at   = NULL;
    END LOOP;

    -- 3) Tipos existentes NO enviados → soft-delete (trazabilidad, no delete-all)
    UPDATE caracterizacion_rc
      SET deleted_at = now()
    WHERE caracterizacion_id = v_car_id AND deleted_at IS NULL
      AND tipo_rc <> ALL (
        SELECT (j->>'tipo_rc') FROM jsonb_array_elements(p_rcs) j
      );
    -- (p_rcs vacío → soft-delete de todo lo activo; comportamiento explícito)

    v_rcs := (SELECT COALESCE(jsonb_agg(to_jsonb(rc) ORDER BY rc.tipo_rc), '[]'::jsonb)
              FROM caracterizacion_rc rc
              WHERE rc.caracterizacion_id = v_car_id AND rc.deleted_at IS NULL);
  ELSE
    v_rcs := (SELECT COALESCE(jsonb_agg(to_jsonb(rc) ORDER BY rc.tipo_rc), '[]'::jsonb)
              FROM caracterizacion_rc rc
              WHERE rc.caracterizacion_id = v_car_id AND rc.deleted_at IS NULL);
  END IF;

  SELECT to_jsonb(c.*) INTO v_car_out FROM caracterizacion_lote c WHERE c.id_caracterizacion = v_car_id;

  RETURN jsonb_build_object('caracterizacion', v_car_out, 'rcs', v_rcs);
END;
$$;

REVOKE ALL ON FUNCTION guardar_caracterizacion(integer, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION guardar_caracterizacion(integer, jsonb, jsonb) TO authenticated;
