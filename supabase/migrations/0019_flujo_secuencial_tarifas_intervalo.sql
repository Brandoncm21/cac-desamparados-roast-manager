-- ============================================================
-- Fase 8: Flujo Secuencial + Tarifas por Intervalo de Peso
-- ============================================================

-- ========== 1. servicios_maestro: agregar prioridad ==========
ALTER TABLE servicios_maestro
  ADD COLUMN IF NOT EXISTS prioridad INT UNIQUE;

UPDATE servicios_maestro SET prioridad = 1 WHERE codigo = 'CHANCADO';
UPDATE servicios_maestro SET prioridad = 2 WHERE codigo = 'TRILLADO';
UPDATE servicios_maestro SET prioridad = 3 WHERE codigo = 'CLASIFICACION-M';
UPDATE servicios_maestro SET prioridad = 4 WHERE codigo = 'CLASIFICACION-N';
UPDATE servicios_maestro SET prioridad = 5 WHERE codigo = 'TUESTE';
UPDATE servicios_maestro SET prioridad = 6 WHERE codigo = 'MOLIDO';
UPDATE servicios_maestro SET prioridad = 7 WHERE codigo = 'EMPACADO';

ALTER TABLE servicios_maestro
  ALTER COLUMN prioridad SET NOT NULL;

-- ========== 2. servicio_precios: time-based → weight-interval ==========
ALTER TABLE servicio_precios
  DROP COLUMN IF EXISTS valid_from,
  DROP COLUMN IF EXISTS valid_to,
  DROP COLUMN IF EXISTS creado_por;

ALTER TABLE servicio_precios
  ADD COLUMN IF NOT EXISTS min_weight_kg NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_weight_kg NUMERIC(10,2); -- NULL = sin límite

-- Trigger: prevenir traslape de intervalos por servicio
CREATE OR REPLACE FUNCTION check_tarifa_traslape()
RETURNS TRIGGER AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM servicio_precios
  WHERE id_servicio = NEW.id_servicio
    AND id_precio != COALESCE(NEW.id_precio, 0)
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

-- ========== 3. empaques: agregar capacidad ==========
ALTER TABLE empaques
  ADD COLUMN IF NOT EXISTS capacidad_kg NUMERIC(10,2);

-- Backfill: usar unit_weight_kg como capacidad_kg
UPDATE empaques SET capacidad_kg = unit_weight_kg WHERE capacidad_kg IS NULL;

-- ========== 4. Función helper: resolver tarifa por peso ==========
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
    AND sp.precio_por_kg >= 0
    AND p_peso_kg >= sp.min_weight_kg
    AND (sp.max_weight_kg IS NULL OR p_peso_kg < sp.max_weight_kg)
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- ========== 5. NUEVA TABLA: orden_pasos ==========
CREATE TABLE IF NOT EXISTS orden_pasos (
  id_paso             SERIAL PRIMARY KEY,
  id_orden            INT NOT NULL REFERENCES ordenes_trabajo(id_orden) ON DELETE CASCADE,
  servicio_id         INT NOT NULL REFERENCES servicios_maestro(id_servicio_maestro),
  prioridad           INT NOT NULL,
  estado              VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
                        CHECK (estado IN ('PENDIENTE','EN_PROCESO','COMPLETADO','OMITIDO')),
  peso_inicial_kg     NUMERIC(10,2),
  peso_final_kg       NUMERIC(10,2),
  merma_kg            NUMERIC(10,2),
  tarifa_id           INT REFERENCES servicio_precios(id_precio),
  snapshot_precio_kg  NUMERIC(10,2),
  subtotal_servicio   NUMERIC(12,2),
  empaque_id          INT REFERENCES empaques(id_empaque),
  cantidad_empaques   INT,
  snapshot_precio_empaque NUMERIC(10,2),
  costo_empaques      NUMERIC(12,2),
  costo_total_paso    NUMERIC(12,2),
  id_perfil_tueste    INT REFERENCES perfiles_tueste(id_perfil),
  id_operador_inicio  INT REFERENCES empleados(id_empleado),
  id_operador_cierre  INT REFERENCES empleados(id_empleado),
  fecha_inicio        TIMESTAMPTZ,
  fecha_fin           TIMESTAMPTZ,
  observaciones       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id_orden, prioridad)
);
CREATE INDEX IF NOT EXISTS idx_orden_pasos_orden ON orden_pasos(id_orden);
CREATE INDEX IF NOT EXISTS idx_orden_pasos_estado ON orden_pasos(id_orden, estado);

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_orden_pasos_updated_at ON orden_pasos;
CREATE TRIGGER trg_orden_pasos_updated_at
  BEFORE UPDATE ON orden_pasos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE orden_pasos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orden_pasos_select" ON orden_pasos;
CREATE POLICY "orden_pasos_select" ON orden_pasos
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "orden_pasos_insert" ON orden_pasos;
CREATE POLICY "orden_pasos_insert" ON orden_pasos
  FOR INSERT TO authenticated WITH CHECK (get_empleado_rol() IN ('Recepción', 'Admin'));

DROP POLICY IF EXISTS "orden_pasos_update" ON orden_pasos;
CREATE POLICY "orden_pasos_update" ON orden_pasos
  FOR UPDATE TO authenticated
  USING (get_empleado_rol() IN ('Recepción', 'Tostador', 'Admin'))
  WITH CHECK (true);
