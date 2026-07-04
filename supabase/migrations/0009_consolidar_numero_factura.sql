-- ============================================================
-- Fase 3: Consolidar num_talonario_fisico + num_factura
-- en un único numero_factura autogenerado: F-{id_orden}
-- ============================================================

-- 1) Agregar columna consolidada
ALTER TABLE ordenes_trabajo
  ADD COLUMN IF NOT EXISTS numero_factura VARCHAR(20);

-- 2) Generar numero_factura para todas las ordenes existentes
UPDATE ordenes_trabajo
SET numero_factura = 'F-' || LPAD(id_orden::TEXT, 4, '0')
WHERE numero_factura IS NULL;

-- 3) Eliminar trigger/función/sequence del talonario físico antiguo
DROP TRIGGER IF EXISTS trg_talonario_auto ON ordenes_trabajo;
DROP FUNCTION IF EXISTS generar_talonario();
DROP SEQUENCE IF EXISTS talonario_seq;

-- 4) Función para autogenerar numero_factura en nuevas ordenes
CREATE OR REPLACE FUNCTION generar_numero_factura()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.numero_factura IS NULL OR NEW.numero_factura = '' THEN
    NEW.numero_factura := 'F-' || LPAD(NEW.id_orden::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_numero_factura_auto ON ordenes_trabajo;
CREATE TRIGGER trg_numero_factura_auto
BEFORE INSERT ON ordenes_trabajo
FOR EACH ROW EXECUTE FUNCTION generar_numero_factura();

-- 5) Hacer numero_factura NOT NULL y UNIQUE
ALTER TABLE ordenes_trabajo
  ALTER COLUMN numero_factura SET NOT NULL;

ALTER TABLE ordenes_trabajo
  DROP CONSTRAINT IF EXISTS ordenes_numero_factura_unique;

ALTER TABLE ordenes_trabajo
  ADD CONSTRAINT ordenes_numero_factura_unique UNIQUE (numero_factura);

-- 6) Eliminar columnas legacy
ALTER TABLE ordenes_trabajo
  DROP COLUMN IF EXISTS num_talonario_fisico;

ALTER TABLE ordenes_trabajo
  DROP COLUMN IF EXISTS num_factura;

-- 7) Actualizar índices
DROP INDEX IF EXISTS idx_ordenes_talonario;
CREATE INDEX IF NOT EXISTS idx_ordenes_numero_factura ON ordenes_trabajo(numero_factura);
