-- ============================================================================
-- 0025_tarifas_exclusion.sql
-- Garantía declarativa PostgreSQL anti-solape de tarifas (Fase 4 auditoría).
--
-- Problema corregido: el trigger check_tarifa_traslape() (0019/0021) usa
-- patrón check-then-insert sin locking → bajo READ COMMITTED dos transacciones
-- concurrentes pueden leer 0 traslapes y confirmar intervalos traslapados.
--
-- Solución: constraint EXCLUDE USING gist con numrange sobre los intervalos
-- activos. Postgres evalúa el índice GiST dentro de la inserción/actualización
-- con serialización por fila del índice → sin race posible.
--
-- Semántica preservada:
--   - min inclusivo, max exclusivo ('[)' → [min, max) )
--   - max_weight_kg NULL = sin límite superior (numrange con límite superior
--     NULL = unbounded, exactamente la semántica del intervalo abierto)
--   - solo intervalos activos (WHERE activo = true)
--
-- Seguridad/consistencia:
--   - btree_gist requerido para mezclar int8 (id_servicio) con range en GiST.
--   - CHECK min < max (o max NULL) y min >= 0 como primera línea de defensa.
--   - Se elimina el trigger reemplazado (única fuente de verdad).
--
-- Validación (ejecutar en Supabase tras aplicar):
--   INSERT exitoso de intervalos contiguos [1,25) [25,100) [100,NULL) → OK
--   INSERT con traslape → ERROR 'servicio_precios_no_traslape'
--   UPDATE concurrente de dos intervalos → serializado por el índice
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- CHECK de intervalo válido (idempotente vía DO)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'servicio_precios_rango_valido'
  ) THEN
    ALTER TABLE servicio_precios
      ADD CONSTRAINT servicio_precios_rango_valido
      CHECK (min_weight_kg >= 0 AND (max_weight_kg IS NULL OR max_weight_kg > min_weight_kg));
  END IF;
END $$;

-- Exclusión declarativa anti-solape (idempotente vía DO)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'servicio_precios_no_traslape'
  ) THEN
    ALTER TABLE servicio_precios
      ADD CONSTRAINT servicio_precios_no_traslape
      EXCLUDE USING gist (
        id_servicio WITH =,
        numrange(min_weight_kg, max_weight_kg, '[)') WITH &&
      ) WHERE (activo = true);
  END IF;
END $$;

-- Retirar el mecanismo anterior (trigger + función), reemplazado por la
-- constraint declarativa.
DROP TRIGGER IF EXISTS trg_check_tarifa_traslape ON servicio_precios;
DROP FUNCTION IF EXISTS public.check_tarifa_traslape();
