-- ============================================================
-- Fase 6: Granularidad de Tiempo para Tueste
-- ============================================================
-- Cambiar tipo de minuto de SMALLINT a NUMERIC(5,2) para soportar
-- intervalos de 0.5 minutos (30 segundos) en la captura de tueste.

-- Dropear constraint UNIQUE existente
ALTER TABLE trazabilidad_temperatura 
  DROP CONSTRAINT IF EXISTS trazabilidad_temperatura_id_perfil_minuto_key;

-- Cambiar tipo de columna
ALTER TABLE trazabilidad_temperatura 
  ALTER COLUMN minuto TYPE NUMERIC(5,2);

-- Recrear constraint UNIQUE
ALTER TABLE trazabilidad_temperatura 
  ADD CONSTRAINT trazabilidad_temperatura_id_perfil_minuto_key 
  UNIQUE (id_perfil, minuto);

-- Actualizar índice para el nuevo tipo
DROP INDEX IF EXISTS idx_trazabilidad_perfil_minuto;
CREATE INDEX idx_trazabilidad_perfil_minuto 
  ON trazabilidad_temperatura (id_perfil, minuto);
