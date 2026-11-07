-- 0029_secado.sql
-- P2b de 002-fusion-cbf: Secado (patios/camas) con sus 4 series de medición.
-- Referencias: doc raíz §4.4.1 (secado_lote + 4 débiles), FR-003 (upsert con
-- diff, NO delete-all — disp. 16), FR-004 (auditoría+soft-delete), decisión de
-- dominio: la "Inspección Visual del Grano" del layout Stitch NO se implementa
-- (no existe en CBF). `dsecado` se DERIVA server-side (ceil días, semántica CBF).
-- Semántica de series del RPC (contrato): NULL no toca; [] o lista = upsert por
-- id + soft-delete de los ids activos que NO venían en el payload.

CREATE TABLE secado_lote (
  id_secado serial PRIMARY KEY,
  id_lote integer NOT NULL REFERENCES lotes_cafe(id_lote) ON DELETE CASCADE,
  finicio timestamptz NOT NULL,
  ffinal timestamptz,
  dsecado integer,          -- derivado por RPC: ceil((ffinal−finicio)/24h)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT secado_fuera_de_orden CHECK (ffinal IS NULL OR ffinal > finicio)
);

CREATE TABLE secado_humedad (
  id_secado_humedad serial PRIMARY KEY,
  id_secado integer NOT NULL REFERENCES secado_lote(id_secado) ON DELETE CASCADE,
  fecha timestamptz NOT NULL,
  humedad numeric NOT NULL CHECK (humedad BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE secado_ambiente (
  id_secado_ambiente serial PRIMARY KEY,
  id_secado integer NOT NULL REFERENCES secado_lote(id_secado) ON DELETE CASCADE,
  fecha timestamptz NOT NULL,
  temperatura_ambiente numeric NOT NULL CHECK (temperatura_ambiente BETWEEN -50 AND 70),
  humedad_ambiente numeric NOT NULL CHECK (humedad_ambiente BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE secado_temperatura (
  id_secado_temperatura serial PRIMARY KEY,
  id_secado integer NOT NULL REFERENCES secado_lote(id_secado) ON DELETE CASCADE,
  fecha timestamptz NOT NULL,
  temperatura numeric NOT NULL CHECK (temperatura BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE secado_camas (
  id_secado_cama serial PRIMARY KEY,
  id_secado integer NOT NULL REFERENCES secado_lote(id_secado) ON DELETE CASCADE,
  numero_cama varchar(50) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TRIGGER trg_secado_updated_at BEFORE UPDATE ON secado_lote
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_secado_humedad_updated_at BEFORE UPDATE ON secado_humedad
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_secado_ambiente_updated_at BEFORE UPDATE ON secado_ambiente
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_secado_temperatura_updated_at BEFORE UPDATE ON secado_temperatura
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_secado_camas_updated_at BEFORE UPDATE ON secado_camas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_secado_lote_idx ON secado_lote (id_lote) WHERE deleted_at IS NULL;
CREATE INDEX idx_secado_humedad_idx ON secado_humedad (id_secado) WHERE deleted_at IS NULL;
CREATE INDEX idx_secado_ambiente_idx ON secado_ambiente (id_secado) WHERE deleted_at IS NULL;
CREATE INDEX idx_secado_temperatura_idx ON secado_temperatura (id_secado) WHERE deleted_at IS NULL;
CREATE INDEX idx_secado_camas_idx ON secado_camas (id_secado) WHERE deleted_at IS NULL;

-- ── RLS (regla de porteo 1) ───────────────────────────────────────────────────
ALTER TABLE secado_lote ENABLE ROW LEVEL SECURITY;
CREATE POLICY secado_select ON secado_lote FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY secado_insert ON secado_lote FOR INSERT TO authenticated
  WITH CHECK (get_empleado_rol() IN ('Recepción', 'Admin'));
CREATE POLICY secado_update ON secado_lote FOR UPDATE TO authenticated
  USING (get_empleado_rol() IN ('Recepción', 'Admin')) WITH CHECK (true);

ALTER TABLE secado_humedad ENABLE ROW LEVEL SECURITY;
CREATE POLICY secado_humedad_select ON secado_humedad FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY secado_humedad_insert ON secado_humedad FOR INSERT TO authenticated
  WITH CHECK (get_empleado_rol() IN ('Recepción', 'Admin'));
CREATE POLICY secado_humedad_update ON secado_humedad FOR UPDATE TO authenticated
  USING (get_empleado_rol() IN ('Recepción', 'Admin')) WITH CHECK (true);

ALTER TABLE secado_ambiente ENABLE ROW LEVEL SECURITY;
CREATE POLICY secado_ambiente_select ON secado_ambiente FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY secado_ambiente_insert ON secado_ambiente FOR INSERT TO authenticated
  WITH CHECK (get_empleado_rol() IN ('Recepción', 'Admin'));
CREATE POLICY secado_ambiente_update ON secado_ambiente FOR UPDATE TO authenticated
  USING (get_empleado_rol() IN ('Recepción', 'Admin')) WITH CHECK (true);

ALTER TABLE secado_temperatura ENABLE ROW LEVEL SECURITY;
CREATE POLICY secado_temperatura_select ON secado_temperatura FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY secado_temperatura_insert ON secado_temperatura FOR INSERT TO authenticated
  WITH CHECK (get_empleado_rol() IN ('Recepción', 'Admin'));
CREATE POLICY secado_temperatura_update ON secado_temperatura FOR UPDATE TO authenticated
  USING (get_empleado_rol() IN ('Recepción', 'Admin')) WITH CHECK (true);

ALTER TABLE secado_camas ENABLE ROW LEVEL SECURITY;
CREATE POLICY secado_camas_select ON secado_camas FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY secado_camas_insert ON secado_camas FOR INSERT TO authenticated
  WITH CHECK (get_empleado_rol() IN ('Recepción', 'Admin'));
CREATE POLICY secado_camas_update ON secado_camas FOR UPDATE TO authenticated
  USING (get_empleado_rol() IN ('Recepción', 'Admin')) WITH CHECK (true);

-- ── RPC atómica guardar_secado (FR-003) ───────────────────────────────────────
CREATE OR REPLACE FUNCTION guardar_secado(
  p_id_lote integer,
  p_secado jsonb,
  p_humedades jsonb DEFAULT NULL,
  p_ambientes jsonb DEFAULT NULL,
  p_temperaturas jsonb DEFAULT NULL,
  p_camas jsonb DEFAULT NULL
) RETURNS jsonb
SECURITY INVOKER SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_rol text := get_empleado_rol();
  v_secado_id integer;
  v_finicio timestamptz;
  v_ffinal timestamptz;
  v_dsecado integer;
BEGIN
  IF v_rol NOT IN ('Admin', 'Recepción') THEN
    RAISE EXCEPTION 'Solo Recepción o Admin pueden guardar el secado';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM lotes_cafe WHERE id_lote = p_id_lote AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Lote no encontrado';
  END IF;

  v_finicio := (p_secado->>'finicio')::timestamptz;
  v_ffinal  := (p_secado->>'ffinal')::timestamptz;

  IF (p_secado ? 'id_secado') THEN
    SELECT s.finicio, COALESCE((p_secado->>'ffinal')::timestamptz, s.ffinal) INTO v_finicio, v_ffinal
      FROM secado_lote s
      WHERE s.id_secado = (p_secado->>'id_secado')::integer
        AND s.id_lote = p_id_lote AND s.deleted_at IS NULL;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Secado no encontrado para este lote';
    END IF;

    UPDATE secado_lote SET
      finicio = COALESCE(v_finicio, finicio),
      ffinal  = v_ffinal
    WHERE id_secado = (p_secado->>'id_secado')::integer;

    v_secado_id := (p_secado->>'id_secado')::integer;
  ELSE
    INSERT INTO secado_lote (id_lote, finicio, ffinal) VALUES (p_id_lote, v_finicio, v_ffinal);
    v_secado_id := (SELECT id_secado FROM secado_lote
                    WHERE id_lote = p_id_lote AND finicio = v_finicio
                    ORDER BY id_secado DESC LIMIT 1);
  END IF;

  -- dsecado derivado server-side: ceil(días) — regla CBF (no depende de la UI)
  SELECT CEIL(EXTRACT(EPOCH FROM (v_ffinal - v_finicio)) / 86400.0)::integer
    INTO v_dsecado
    WHERE v_ffinal IS NOT NULL AND v_ffinal > v_finicio;
  UPDATE secado_lote SET dsecado = v_dsecado WHERE id_secado = v_secado_id;

  -- Series: NULL no toca; lista ([] incluida) = upsert por id + soft-deletes faltantes
  IF p_humedades IS NOT NULL THEN
    PERFORM upsert_serie_secado(v_secado_id, p_humedades, 'secado_humedad');
  END IF;
  IF p_ambientes IS NOT NULL THEN
    PERFORM upsert_serie_secado(v_secado_id, p_ambientes, 'secado_ambiente');
  END IF;
  IF p_temperaturas IS NOT NULL THEN
    PERFORM upsert_serie_secado(v_secado_id, p_temperaturas, 'secado_temperatura');
  END IF;
  IF p_camas IS NOT NULL THEN
    PERFORM upsert_serie_camas(v_secado_id, p_camas);
  END IF;

  RETURN to_jsonb(s.*) FROM secado_lote s WHERE s.id_secado = v_secado_id;
END;
$$;

-- Helper de serie (3 series débiles): upsert por id + soft-delete de faltantes.
-- Items: {"id"?: id_existente, fecha, humedad | temperatura(+humedad_ambiente)}
CREATE OR REPLACE FUNCTION upsert_serie_secado(
  p_id_secado integer,
  p_items jsonb,
  p_tabla text
) RETURNS void
SECURITY INVOKER SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_it jsonb;
  v_id integer;
  v_fecha timestamptz;
  v_humedad numeric;
  v_temp numeric;
  v_hum_ambiente numeric;
  v_hay_ids boolean := EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_items) j WHERE j->>'id' IS NOT NULL
  );
  v_nuevos int[] := '{}';
  v_nuevo_id integer;
BEGIN
  IF NOT (p_tabla IN ('secado_humedad', 'secado_ambiente', 'secado_temperatura')) THEN
    RAISE EXCEPTION 'tabla de serie inválida';
  END IF;

  FOR v_it IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_id := (v_it->>'id')::integer;
    v_fecha := (v_it->>'fecha')::timestamptz;
    v_humedad := (v_it->>'humedad')::numeric;
    v_temp := (v_it->>'temperatura')::numeric;
    v_hum_ambiente := (v_it->>'humedad_ambiente')::numeric;

    IF p_tabla = 'secado_humedad' THEN
      IF v_id IS NOT NULL THEN
        UPDATE secado_humedad SET
          fecha = COALESCE(v_fecha, fecha),
          humedad = COALESCE(v_humedad, humedad),
          deleted_at = NULL
        WHERE id_secado_humedad = v_id AND id_secado = p_id_secado;
        IF NOT FOUND THEN RAISE EXCEPTION 'medición % no pertenece al secado', v_id; END IF;
      ELSE
        INSERT INTO secado_humedad (id_secado, fecha, humedad) VALUES (p_id_secado, v_fecha, v_humedad)
        RETURNING id_secado_humedad INTO v_nuevo_id;
        v_nuevos := v_nuevos || v_nuevo_id;
      END IF;
    ELSIF p_tabla = 'secado_ambiente' THEN
      IF v_id IS NOT NULL THEN
        UPDATE secado_ambiente SET
          fecha = COALESCE(v_fecha, fecha),
          temperatura_ambiente = COALESCE(v_temp, temperatura_ambiente),
          humedad_ambiente = COALESCE(v_hum_ambiente, humedad_ambiente),
          deleted_at = NULL
        WHERE id_secado_ambiente = v_id AND id_secado = p_id_secado;
        IF NOT FOUND THEN RAISE EXCEPTION 'medición % no pertenece al secado', v_id; END IF;
      ELSE
        INSERT INTO secado_ambiente (id_secado, fecha, temperatura_ambiente, humedad_ambiente)
        VALUES (p_id_secado, v_fecha, v_temp, v_hum_ambiente)
        RETURNING id_secado_ambiente INTO v_nuevo_id;
        v_nuevos := v_nuevos || v_nuevo_id;
      END IF;
    ELSE
      IF v_id IS NOT NULL THEN
        UPDATE secado_temperatura SET
          fecha = COALESCE(v_fecha, fecha),
          temperatura = COALESCE(v_temp, temperatura),
          deleted_at = NULL
        WHERE id_secado_temperatura = v_id AND id_secado = p_id_secado;
        IF NOT FOUND THEN RAISE EXCEPTION 'medición % no pertenece al secado', v_id; END IF;
      ELSE
        INSERT INTO secado_temperatura (id_secado, fecha, temperatura) VALUES (p_id_secado, v_fecha, v_temp)
        RETURNING id_secado_temperatura INTO v_nuevo_id;
        v_nuevos := v_nuevos || v_nuevo_id;
      END IF;
    END IF;
  END LOOP;

  -- Soft-delete de ids activos que NO vinieron (solo si el payload trae ids:
  -- payload solo-de-altas no debe vaciar la serie). Se preservan los ids
  -- recién creados en este pase (v_nuevos) — btn 0029 fix smoke Fase 4.
  IF v_hay_ids THEN
    IF p_tabla = 'secado_humedad' THEN
      UPDATE secado_humedad SET deleted_at = now()
        WHERE id_secado = p_id_secado AND deleted_at IS NULL
          AND id_secado_humedad NOT IN (SELECT unnest(v_nuevos))
          AND id_secado_humedad NOT IN (SELECT (j->>'id')::int FROM jsonb_array_elements(p_items) j WHERE j->>'id' IS NOT NULL);
    ELSIF p_tabla = 'secado_ambiente' THEN
      UPDATE secado_ambiente SET deleted_at = now()
        WHERE id_secado = p_id_secado AND deleted_at IS NULL
          AND id_secado_ambiente NOT IN (SELECT unnest(v_nuevos))
          AND id_secado_ambiente NOT IN (SELECT (j->>'id')::int FROM jsonb_array_elements(p_items) j WHERE j->>'id' IS NOT NULL);
    ELSE
      UPDATE secado_temperatura SET deleted_at = now()
        WHERE id_secado = p_id_secado AND deleted_at IS NULL
          AND id_secado_temperatura NOT IN (SELECT unnest(v_nuevos))
          AND id_secado_temperatura NOT IN (SELECT (j->>'id')::int FROM jsonb_array_elements(p_items) j WHERE j->>'id' IS NOT NULL);
    END IF;
  END IF;
END;
$$;

-- Camas: multivaluado simple (re-sent → upsert por id; faltantes → soft-delete)
CREATE OR REPLACE FUNCTION upsert_serie_camas(
  p_id_secado integer,
  p_items jsonb
) RETURNS void
SECURITY INVOKER SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_it jsonb;
  v_id integer;
  v_hay_ids boolean := EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_items) j WHERE j->>'id' IS NOT NULL
  );
  v_nuevos int[] := '{}';
  v_nuevo_id integer;
BEGIN
  FOR v_it IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_id := (v_it->>'id')::integer;
    IF v_id IS NOT NULL THEN
      UPDATE secado_camas SET
        numero_cama = COALESCE(v_it->>'numero_cama', numero_cama),
        deleted_at = NULL
      WHERE id_secado_cama = v_id AND id_secado = p_id_secado;
      IF NOT FOUND THEN RAISE EXCEPTION 'cama % no pertenece al secado', v_id; END IF;
    ELSE
      INSERT INTO secado_camas (id_secado, numero_cama) VALUES (p_id_secado, v_it->>'numero_cama')
      RETURNING id_secado_cama INTO v_nuevo_id;
      v_nuevos := v_nuevos || v_nuevo_id;
    END IF;
  END LOOP;

  IF v_hay_ids THEN
    UPDATE secado_camas SET deleted_at = now()
      WHERE id_secado = p_id_secado AND deleted_at IS NULL
        AND id_secado_cama NOT IN (SELECT unnest(v_nuevos))
        AND id_secado_cama NOT IN (SELECT (j->>'id')::int FROM jsonb_array_elements(p_items) j WHERE j->>'id' IS NOT NULL);
  END IF;
END;
$$;
