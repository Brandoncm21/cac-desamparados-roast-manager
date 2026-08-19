-- ============================================================
-- Corrección del flujo de procesos, cálculos y empaques
--  1. Prioridad no-única (desempate estable por id)
--  2. peso_facturable_kg explícito por paso
--  3. Índice para orden determinista
--  4. Backfill defensivo de capacidad_kg en empaques
-- ============================================================

-- ========== 1. Permitir prioridades duplicadas ==========
-- El orden de pasos se garantiza con (prioridad ASC, id ASC).
ALTER TABLE servicios_maestro
  DROP CONSTRAINT IF EXISTS servicios_maestro_prioridad_key;

ALTER TABLE orden_pasos
  DROP CONSTRAINT IF EXISTS orden_pasos_id_orden_prioridad_key;

-- ========== 2. Peso facturable explícito ==========
ALTER TABLE orden_pasos
  ADD COLUMN IF NOT EXISTS peso_facturable_kg NUMERIC(10,2);

-- Backfill: para pasos ya existentes, el peso facturable es el peso inicial
-- (o el final si el inicial no está definido).
UPDATE orden_pasos
SET peso_facturable_kg = COALESCE(peso_inicial_kg, peso_final_kg)
WHERE peso_facturable_kg IS NULL
  AND COALESCE(peso_inicial_kg, peso_final_kg) IS NOT NULL;

-- ========== 3. Índice de orden determinista ==========
CREATE INDEX IF NOT EXISTS idx_orden_pasos_orden_prioridad
  ON orden_pasos(id_orden, prioridad, id_paso);

-- ========== 4. Backfill defensivo de capacidades de empaque ==========
-- La fuente principal es capacidad_kg. Si quedó NULL y existe unit_weight_kg
-- (campo legacy), se usa como respaldo.
UPDATE empaques
SET capacidad_kg = unit_weight_kg
WHERE capacidad_kg IS NULL AND unit_weight_kg IS NOT NULL;
