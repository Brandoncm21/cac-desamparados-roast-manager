-- 0026_seguridad_conectores.sql
-- Fase 1 de `002-fusion-cbf` — Sanitización de seguridad + conectores K1/K2/K4.
-- Referencia: ARQUITECTURA_Y_DATOS_INTEGRACION.md §4.8 (C2) y §4.3 (K1/K2/K4).

-- ── C2: función eliminada (riesgo crítico activo) ─────────────────────────────
-- `soft_delete_row(text,text,integer)`: SECURITY DEFINER sin search_path,
-- sin chequeo de rol y con EXECUTE a PUBLIC/anon (confirmado en producción).
-- Ningún endpoint la invoca (verificado por grep en Paso 6). Se elimina.
DROP FUNCTION IF EXISTS soft_delete_row(TEXT, TEXT, INTEGER);

-- ── K2: UUID público estable inter-sistema ────────────────────────────────────
-- Los seriales son locales y reasignables al restaurar; el UUID es el id de
-- referencia para la fusión. NOT NULL + DEFAULT backfilla filas existentes.
ALTER TABLE ordenes_trabajo
  ADD COLUMN public_id uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE ordenes_trabajo
  ADD CONSTRAINT ordenes_public_id_unique UNIQUE (public_id);

ALTER TABLE perfiles_tueste
  ADD COLUMN public_id uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE perfiles_tueste
  ADD CONSTRAINT perfiles_tueste_public_id_unique UNIQUE (public_id);

ALTER TABLE clientes
  ADD COLUMN public_id uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE clientes
  ADD CONSTRAINT clientes_public_id_unique UNIQUE (public_id);

-- ── K4: referencia externa para conciliar productores CBF ────────────────────
ALTER TABLE clientes
  ADD COLUMN external_ref varchar(100);
CREATE INDEX idx_clientes_external_ref ON clientes (external_ref)
  WHERE external_ref IS NOT NULL;

-- ── K1: tabla puente orden ↔ lote externo (CBF) ──────────────────────────────
-- Relación N:M: una orden puede cubrir varios lotes y un lote alimentar varias
-- órdenes. La PK compuesta también es el contrato de idempotencia de e1 (K5):
-- reenviar el mismo (origen, nlote, id_orden) no duplica.
CREATE TABLE orden_lotes_externos (
  id_orden   integer      NOT NULL REFERENCES ordenes_trabajo(id_orden) ON DELETE CASCADE,
  nlote      varchar(50)  NOT NULL,
  peso_kg    numeric(10,2),
  origen     text         NOT NULL DEFAULT 'coffeebeanflow',
  created_at timestamptz  NOT NULL DEFAULT now(),
  PRIMARY KEY (id_orden, nlote, origen)
);

-- Lookup por lote sin partir de la orden (la PK solo cubre el orden inverso).
CREATE INDEX idx_ole_origen_nlote ON orden_lotes_externos (origen, nlote);

ALTER TABLE orden_lotes_externos ENABLE ROW LEVEL SECURITY;

CREATE POLICY ole_select ON orden_lotes_externos
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY ole_insert ON orden_lotes_externos
  FOR INSERT TO authenticated
  WITH CHECK (get_empleado_rol() IN ('Admin', 'Recepción'));

CREATE POLICY ole_delete ON orden_lotes_externos
  FOR DELETE TO authenticated
  USING (get_empleado_rol() IN ('Admin', 'Recepción'));

-- Higiene de grants (patrón de las tablas de negocio): sin acceso anónimo
-- y sin UPDATE policy (filas K1 inmutables vía RLS; la corrección pasa por
-- DELETE + reinsert, misma política del pasillo de canción pivotante).
REVOKE ALL ON orden_lotes_externos FROM anon;
GRANT SELECT, INSERT, DELETE ON orden_lotes_externos TO authenticated;
