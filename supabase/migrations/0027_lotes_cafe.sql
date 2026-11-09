-- 0027_lotes_cafe.sql
-- P1 (slice vertical) de 002-fusion-cbf: módulo de Acopio portado de CoffeeBeanFlow.
-- Sustituye `area_acopio` (CBF). Referencias: ARQUITECTURA_Y_DATOS_INTEGRACION.md
-- §4.4.1 (tabla de porteo), FR-010 (booleans de despulpado conservados), FR-011
-- (timestamptz + CHECK de `enproceso`), disp. 7 (fecha de acopio materializada),
-- disp. 10 (NOT NULL consciente), disp. 1 (nproductor varchar(100)).

CREATE TABLE lotes_cafe (
  id_lote serial PRIMARY KEY,
  nlote varchar(100) NOT NULL,
  public_id uuid NOT NULL DEFAULT gen_random_uuid(),
  nrecibo integer NOT NULL CHECK (nrecibo >= 0),
  nproductor varchar(100) NOT NULL,
  nfinca varchar(100) NOT NULL,
  zona varchar(100),
  altura numeric,
  robjetivo numeric,
  rtotal numeric,
  disponible numeric,
  vendido boolean NOT NULL DEFAULT false,
  enproceso varchar(50) NOT NULL DEFAULT 'No'
    CHECK (enproceso IN ('No', 'En Secado', 'En Trilla', 'En Bodega', 'Vendido')),
  semilavado boolean NOT NULL DEFAULT false,
  "natural" boolean NOT NULL DEFAULT false,
  anaerobico boolean NOT NULL DEFAULT false,
  miel boolean NOT NULL DEFAULT false,
  lavado boolean NOT NULL DEFAULT false,
  otro varchar(100),
  -- Pruebas físicas (beneficiado húmedo) + densidades — portadas tal cual CBF
  pf_pulpa_pergamino numeric,
  pf_dmecanicos numeric,
  pf_segundas numeric,
  pf_pergamino_pulpa numeric,
  pdensidad_fruta numeric,
  pdensidad_pergamino_humedo numeric,
  -- Corrige disp. 7: el lote tiene fecha real de acopio
  fecha_acopio timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,

  CONSTRAINT lotes_cafe_nlote_key UNIQUE (nlote),
  CONSTRAINT lotes_public_id_unique UNIQUE (public_id)
);

-- Auditoría: misma función ya existente (0001).
CREATE TRIGGER trg_lotes_updated_at
  BEFORE UPDATE ON lotes_cafe
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RLS (regla de porteo 1) ───────────────────────────────────────────────────
-- Escritura: Recepción/Admin. Lectura: cualquier autenticado con lote activo
-- (incluye Tostador — FR-001). Baja = soft delete vía UPDATE (sin DELETE policy).
ALTER TABLE lotes_cafe ENABLE ROW LEVEL SECURITY;

CREATE POLICY lotes_select ON lotes_cafe
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY lotes_insert ON lotes_cafe
  FOR INSERT TO authenticated
  WITH CHECK (get_empleado_rol() IN ('Recepción', 'Admin'));

CREATE POLICY lotes_update ON lotes_cafe
  FOR UPDATE TO authenticated
  USING (get_empleado_rol() IN ('Recepción', 'Admin'))
  WITH CHECK (true);

-- ── Índices (regla de porteo 6: listados + búsqueda trgm) ────────────────────
CREATE INDEX idx_lotes_activos_fecha ON lotes_cafe (fecha_acopio DESC, id_lote DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_lotes_nlote_trgm ON lotes_cafe USING gin (nlote gin_trgm_ops)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_lotes_nproductor_trgm ON lotes_cafe USING gin (nproductor gin_trgm_ops)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_lotes_enproceso ON lotes_cafe (enproceso)
  WHERE deleted_at IS NULL;
