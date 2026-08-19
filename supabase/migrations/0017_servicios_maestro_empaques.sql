-- ============================================================
-- Fase 7: Módulo Maestro Servicios + Empaques con Snapshots
-- ============================================================

-- ========== TABLAS MAESTRAS ==========

CREATE TABLE IF NOT EXISTS servicios_maestro (
  id_servicio_maestro SERIAL PRIMARY KEY,
  codigo              VARCHAR(30) NOT NULL UNIQUE,
  nombre              VARCHAR(150) NOT NULL,
  descripcion         TEXT,
  default_peso_kg     NUMERIC(10,2),
  activo              BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS servicio_precios (
  id_precio       SERIAL PRIMARY KEY,
  id_servicio     INT NOT NULL REFERENCES servicios_maestro(id_servicio_maestro) ON DELETE CASCADE,
  precio_por_kg   NUMERIC(10,2) NOT NULL CHECK (precio_por_kg >= 0),
  valid_from      TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_to        TIMESTAMPTZ,
  creado_por      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_servicio_precios_vigente ON servicio_precios(id_servicio, valid_to)
  WHERE valid_to IS NULL;

CREATE TABLE IF NOT EXISTS empaques (
  id_empaque      SERIAL PRIMARY KEY,
  nombre          VARCHAR(150) NOT NULL UNIQUE,
  unit_weight_kg  NUMERIC(10,2),
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS empaque_precios (
  id_precio     SERIAL PRIMARY KEY,
  id_empaque    INT NOT NULL REFERENCES empaques(id_empaque) ON DELETE CASCADE,
  precio        NUMERIC(10,2) NOT NULL CHECK (precio >= 0),
  valid_from    TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_to      TIMESTAMPTZ,
  creado_por    UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_empaque_precios_vigente ON empaque_precios(id_empaque, valid_to)
  WHERE valid_to IS NULL;

-- ========== ALTER SERVICIOS_EJECUTADOS ==========

-- Relajar tipo_servicio de enum a TEXT para permitir nombres
-- de servicio arbitrarios desde servicios_maestro (backward compatible).
ALTER TABLE servicios_ejecutados
  ALTER COLUMN tipo_servicio TYPE TEXT USING tipo_servicio::TEXT;

ALTER TABLE servicios_ejecutados
  ADD COLUMN IF NOT EXISTS servicio_id INT REFERENCES servicios_maestro(id_servicio_maestro),
  ADD COLUMN IF NOT EXISTS empaque_id  INT REFERENCES empaques(id_empaque),
  ADD COLUMN IF NOT EXISTS peso_kg     NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS snapshot_precio_por_kg NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS snapshot_precio_empaque NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS linea_total NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS override_precio BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS override_motivo TEXT;

CREATE INDEX IF NOT EXISTS idx_servicios_servicio_id ON servicios_ejecutados(servicio_id);
CREATE INDEX IF NOT EXISTS idx_servicios_empaque_id ON servicios_ejecutados(empaque_id);

-- Relajar UNIQUE: permitir mismo servicio con diferente empaque
ALTER TABLE servicios_ejecutados
  DROP CONSTRAINT IF EXISTS servicios_ejecutados_id_orden_tipo_servicio_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'servicios_ejecutados_orden_servicio_empaque_key'
  ) THEN
    ALTER TABLE servicios_ejecutados
      ADD CONSTRAINT servicios_ejecutados_orden_servicio_empaque_key
      UNIQUE (id_orden, tipo_servicio, empaque_id);
  END IF;
END
$$;

-- ========== FUNCIONES HELPER ==========

CREATE OR REPLACE FUNCTION get_current_precio_servicio(p_servicio_id INT)
RETURNS NUMERIC(10,2) AS $$
  SELECT precio_por_kg FROM servicio_precios
  WHERE id_servicio = p_servicio_id AND valid_to IS NULL
  ORDER BY valid_from DESC LIMIT 1;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION get_current_precio_empaque(p_empaque_id INT)
RETURNS NUMERIC(10,2) AS $$
  SELECT precio FROM empaque_precios
  WHERE id_empaque = p_empaque_id AND valid_to IS NULL
  ORDER BY valid_from DESC LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Trigger: updated_at automático para nuevas tablas
DROP TRIGGER IF EXISTS trg_servicios_maestro_updated_at ON servicios_maestro;
CREATE TRIGGER trg_servicios_maestro_updated_at
  BEFORE UPDATE ON servicios_maestro
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_empaques_updated_at ON empaques;
CREATE TRIGGER trg_empaques_updated_at
  BEFORE UPDATE ON empaques
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ========== RLS ==========

ALTER TABLE servicios_maestro ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "servicios_maestro_select" ON servicios_maestro;
CREATE POLICY "servicios_maestro_select" ON servicios_maestro
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "servicios_maestro_admin_all" ON servicios_maestro;
CREATE POLICY "servicios_maestro_admin_all" ON servicios_maestro
  FOR ALL TO authenticated USING (get_empleado_rol() = 'Admin') WITH CHECK (true);

ALTER TABLE servicio_precios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "servicio_precios_select" ON servicio_precios;
CREATE POLICY "servicio_precios_select" ON servicio_precios
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "servicio_precios_admin_all" ON servicio_precios;
CREATE POLICY "servicio_precios_admin_all" ON servicio_precios
  FOR ALL TO authenticated USING (get_empleado_rol() = 'Admin') WITH CHECK (true);

ALTER TABLE empaques ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "empaques_select" ON empaques;
CREATE POLICY "empaques_select" ON empaques
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "empaques_admin_all" ON empaques;
CREATE POLICY "empaques_admin_all" ON empaques
  FOR ALL TO authenticated USING (get_empleado_rol() = 'Admin') WITH CHECK (true);

ALTER TABLE empaque_precios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "empaque_precios_select" ON empaque_precios;
CREATE POLICY "empaque_precios_select" ON empaque_precios
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "empaque_precios_admin_all" ON empaque_precios;
CREATE POLICY "empaque_precios_admin_all" ON empaque_precios
  FOR ALL TO authenticated USING (get_empleado_rol() = 'Admin') WITH CHECK (true);

-- Asegurar WITH CHECK (true) en políticas UPDATE de servicios_ejecutados
DROP POLICY IF EXISTS "servicios_update" ON servicios_ejecutados;
CREATE POLICY "servicios_update" ON servicios_ejecutados
  FOR UPDATE TO authenticated
  USING (get_empleado_rol() IN ('Recepción', 'Admin'))
  WITH CHECK (true);

-- ========== SEED INICIAL DE CATÁLOGO (OPCIONAL, idempotente) ==========
-- Mapea los enum tipo_servicio existentes a servicios_maestro
INSERT INTO servicios_maestro (codigo, nombre, default_peso_kg)
VALUES
  ('CHANCADO', 'Chancado', NULL),
  ('TRILLADO', 'Trillado', NULL),
  ('CLASIFICACION-M', 'Clasificación Mecánica', NULL),
  ('CLASIFICACION-N', 'Clasificación Manual', NULL),
  ('TUESTE', 'Tueste', NULL),
  ('MOLIDO', 'Molido', NULL),
  ('EMPACADO', 'Empacado', NULL)
ON CONFLICT (codigo) DO NOTHING;

-- Semilla de empaques desde los enums de especificaciones
INSERT INTO empaques (nombre)
VALUES
  ('Bolsa con válvula 500g'),
  ('Bolsa con válvula 1Kg'),
  ('Bolsa 5Kg'),
  ('Saco 46Kg'),
  ('A granel')
ON CONFLICT (nombre) DO NOTHING;
