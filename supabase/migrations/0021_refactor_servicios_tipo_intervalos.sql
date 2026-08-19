-- ============================================================
-- Fase: Refactorización del Módulo de Servicios
--  - reemplazar "codigo" por "tipo" (general | tueste | empacado)
--  - eliminar default_peso_kg (precios por intervalo)
--  - agregar activo a servicio_precios (soft delete de intervalos)
--  - limpiar helpers/índices obsoletos y re-seed del catálogo
-- ============================================================

-- ========== 1. servicios_maestro: tipo enum ==========
ALTER TABLE servicios_maestro
  ADD COLUMN IF NOT EXISTS tipo VARCHAR(30);

-- Migrar valores existentes desde codigo
UPDATE servicios_maestro SET tipo = 'tueste'   WHERE codigo = 'TUESTE';
UPDATE servicios_maestro SET tipo = 'empacado' WHERE codigo = 'EMPACADO';
UPDATE servicios_maestro SET tipo = 'general'  WHERE codigo IN
  ('CHANCADO','TRILLADO','CLASIFICACION-M','CLASIFICACION-N','MOLIDO');

-- Seguridad: cualquier fila restante (sin codigo mapeado) pasa a general
UPDATE servicios_maestro SET tipo = 'general' WHERE tipo IS NULL;

ALTER TABLE servicios_maestro
  ALTER COLUMN tipo SET NOT NULL;

ALTER TABLE servicios_maestro
  ADD CONSTRAINT servicios_maestro_tipo_check
  CHECK (tipo IN ('general', 'tueste', 'empacado'));

-- Eliminar campos obsoletos del formulario anterior
ALTER TABLE servicios_maestro
  DROP COLUMN IF EXISTS codigo,
  DROP COLUMN IF EXISTS default_peso_kg;

-- ========== 2. servicio_precios: soft delete por intervalo ==========
ALTER TABLE servicio_precios
  ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;

-- Limpiar índice huérfano de la era time-based (si persistió)
DROP INDEX IF EXISTS idx_servicio_precios_vigente;

CREATE INDEX IF NOT EXISTS idx_servicio_precios_servicio ON servicio_precios(id_servicio);

-- ========== 3. Trigger de traslape: considerar solo activos ==========
CREATE OR REPLACE FUNCTION check_tarifa_traslape()
RETURNS TRIGGER AS $$
DECLARE
  v_count INT;
BEGIN
  IF COALESCE(NEW.activo, true) IS FALSE THEN
    RETURN NEW; -- inactivar nunca traslapa
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM servicio_precios
  WHERE id_servicio = NEW.id_servicio
    AND id_precio != COALESCE(NEW.id_precio, 0)
    AND activo = true
    AND (NEW.min_weight_kg < COALESCE(max_weight_kg, 999999999))
    AND (COALESCE(NEW.max_weight_kg, 999999999) > min_weight_kg);

  IF v_count > 0 THEN
    RAISE EXCEPTION 'Intervalo se traslapa con tarifa existente para este servicio';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_tarifa_traslape ON servicio_precios;
CREATE TRIGGER trg_check_tarifa_traslape
  BEFORE INSERT OR UPDATE ON servicio_precios
  FOR EACH ROW EXECUTE FUNCTION check_tarifa_traslape();

-- ========== 4. Helpers actualizados ==========

-- resolver_tarifa_por_peso: solo intervalos activos
CREATE OR REPLACE FUNCTION resolver_tarifa_por_peso(
  p_servicio_id INT,
  p_peso_kg NUMERIC
) RETURNS TABLE (
  id_precio INT,
  precio_por_kg NUMERIC,
  min_weight_kg NUMERIC,
  max_weight_kg NUMERIC
) AS $$
  SELECT sp.id_precio, sp.precio_por_kg, sp.min_weight_kg, sp.max_weight_kg
  FROM servicio_precios sp
  WHERE sp.id_servicio = p_servicio_id
    AND sp.activo = true
    AND sp.precio_por_kg >= 0
    AND p_peso_kg >= sp.min_weight_kg
    AND (sp.max_weight_kg IS NULL OR p_peso_kg < sp.max_weight_kg)
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- get_current_precio_servicio: referencia de precio más bajo activo
-- (antes usaba valid_to, ya eliminado)
CREATE OR REPLACE FUNCTION get_current_precio_servicio(p_servicio_id INT)
RETURNS NUMERIC(10,2) AS $$
  SELECT precio_por_kg FROM servicio_precios
  WHERE id_servicio = p_servicio_id AND activo = true
  ORDER BY min_weight_kg ASC LIMIT 1;
$$ LANGUAGE sql STABLE;

-- ========== 5. Re-seed del catálogo base (valores de referencia, editables por admin) ==========
-- NOTA: estos precios son de referencia inicial. El admin puede editarlos
-- desde la UI (agregar/quitar/editar intervalos). Rangos: min inclusive, max exclusive.

-- Eliminar intervalos de seed previos (1-5/5-25/25+) de los servicios base para
-- reemplazarlos por la nueva estructura. Solo afecta servicios del catálogo base;
-- los servicios creados por admin se conservan. También se conservan intervalos
-- referenciados por orden_pasos.
DELETE FROM servicio_precios sp
USING servicios_maestro s
WHERE sp.id_servicio = s.id_servicio_maestro
  AND s.nombre IN ('Chancado','Trillado','Tueste','Molido','Empacado','Clasificación Mecánica','Clasificación Manual')
  AND NOT EXISTS (SELECT 1 FROM orden_pasos op WHERE op.tarifa_id = sp.id_precio);

DO $$
DECLARE
  v_id INT;
  v_nombre VARCHAR;
BEGIN
  -- Servicios base: asegurar existencia y tipo correcto
  -- (idempotente sobre la data migrada en la sección 1)
  UPDATE servicios_maestro SET activo = true WHERE nombre IN
    ('Chancado','Trillado','Tueste','Molido','Empacado','Clasificación Mecánica','Clasificación Manual');

  -- -------- CHANCADO (intervalos más amplios) --------
  SELECT id_servicio_maestro INTO v_id FROM servicios_maestro WHERE nombre = 'Chancado';
  IF v_id IS NULL THEN
    INSERT INTO servicios_maestro (nombre, descripcion, tipo, prioridad, activo)
    VALUES ('Chancado', 'Reducción de tamaño del grano verde', 'general', 1, true)
    RETURNING id_servicio_maestro INTO v_id;
  END IF;
  INSERT INTO servicio_precios (id_servicio, precio_por_kg, min_weight_kg, max_weight_kg, activo)
  VALUES
    (v_id, 1000, 1, 50, true),
    (v_id, 850, 50, 200, true),
    (v_id, 700, 200, 500, true)
  ON CONFLICT DO NOTHING;

  -- -------- TRILLADO --------
  SELECT id_servicio_maestro INTO v_id FROM servicios_maestro WHERE nombre = 'Trillado';
  IF v_id IS NULL THEN
    INSERT INTO servicios_maestro (nombre, descripcion, tipo, prioridad, activo)
    VALUES ('Trillado', 'Remoción de la cascarilla del café pergamino', 'general', 2, true)
    RETURNING id_servicio_maestro INTO v_id;
  END IF;
  INSERT INTO servicio_precios (id_servicio, precio_por_kg, min_weight_kg, max_weight_kg, activo)
  VALUES
    (v_id, 1200, 1, 25, true),
    (v_id, 1000, 25, 100, true),
    (v_id, 850, 100, 300, true)
  ON CONFLICT DO NOTHING;

  -- -------- CLASIFICACIÓN MECÁNICA --------
  SELECT id_servicio_maestro INTO v_id FROM servicios_maestro WHERE nombre = 'Clasificación Mecánica';
  IF v_id IS NULL THEN
    INSERT INTO servicios_maestro (nombre, descripcion, tipo, prioridad, activo)
    VALUES ('Clasificación Mecánica', 'Separación por tamaño y densidad con equipo', 'general', 3, true)
    RETURNING id_servicio_maestro INTO v_id;
  END IF;
  INSERT INTO servicio_precios (id_servicio, precio_por_kg, min_weight_kg, max_weight_kg, activo)
  VALUES
    (v_id, 1500, 1, 25, true),
    (v_id, 1300, 25, 100, true),
    (v_id, 1100, 100, 300, true)
  ON CONFLICT DO NOTHING;

  -- -------- CLASIFICACIÓN MANUAL --------
  SELECT id_servicio_maestro INTO v_id FROM servicios_maestro WHERE nombre = 'Clasificación Manual';
  IF v_id IS NULL THEN
    INSERT INTO servicios_maestro (nombre, descripcion, tipo, prioridad, activo)
    VALUES ('Clasificación Manual', 'Selección manual de defectos', 'general', 4, true)
    RETURNING id_servicio_maestro INTO v_id;
  END IF;
  INSERT INTO servicio_precios (id_servicio, precio_por_kg, min_weight_kg, max_weight_kg, activo)
  VALUES
    (v_id, 2000, 1, 25, true),
    (v_id, 1700, 25, 100, true),
    (v_id, 1400, 100, 300, true)
  ON CONFLICT DO NOTHING;

  -- -------- TUESTE (paso especial) --------
  SELECT id_servicio_maestro INTO v_id FROM servicios_maestro WHERE nombre = 'Tueste';
  IF v_id IS NULL THEN
    INSERT INTO servicios_maestro (nombre, descripcion, tipo, prioridad, activo)
    VALUES ('Tueste', 'Tostado del café con perfil controlado', 'tueste', 5, true)
    RETURNING id_servicio_maestro INTO v_id;
  END IF;
  INSERT INTO servicio_precios (id_servicio, precio_por_kg, min_weight_kg, max_weight_kg, activo)
  VALUES
    (v_id, 2500, 1, 25, true),
    (v_id, 2200, 25, 100, true),
    (v_id, 1900, 100, 300, true)
  ON CONFLICT DO NOTHING;

  -- -------- MOLIDO --------
  SELECT id_servicio_maestro INTO v_id FROM servicios_maestro WHERE nombre = 'Molido';
  IF v_id IS NULL THEN
    INSERT INTO servicios_maestro (nombre, descripcion, tipo, prioridad, activo)
    VALUES ('Molido', 'Molienda según especificación del cliente', 'general', 6, true)
    RETURNING id_servicio_maestro INTO v_id;
  END IF;
  INSERT INTO servicio_precios (id_servicio, precio_por_kg, min_weight_kg, max_weight_kg, activo)
  VALUES
    (v_id, 1000, 1, 25, true),
    (v_id, 850, 25, 100, true),
    (v_id, 700, 100, 300, true)
  ON CONFLICT DO NOTHING;

  -- -------- EMPACADO (paso especial) --------
  SELECT id_servicio_maestro INTO v_id FROM servicios_maestro WHERE nombre = 'Empacado';
  IF v_id IS NULL THEN
    INSERT INTO servicios_maestro (nombre, descripcion, tipo, prioridad, activo)
    VALUES ('Empacado', 'Empaquetado final del producto', 'empacado', 7, true)
    RETURNING id_servicio_maestro INTO v_id;
  END IF;
  INSERT INTO servicio_precios (id_servicio, precio_por_kg, min_weight_kg, max_weight_kg, activo)
  VALUES
    (v_id, 700, 1, 25, true),
    (v_id, 550, 25, 100, true),
    (v_id, 450, 100, 300, true)
  ON CONFLICT DO NOTHING;
END $$;
