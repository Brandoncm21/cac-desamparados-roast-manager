-- ============================================================
-- Fase 7 (datos): Backfill de snapshots para servicios existentes
-- ============================================================
-- Ejecutar DESPUÉS de validar la migración 0017.
-- Copia precio actual -> snapshot_precio_por_kg, peso_inicial -> peso_kg
-- y calcula linea_total = peso * precio para órdenes históricas.

UPDATE servicios_ejecutados
SET peso_kg = peso_inicial,
    snapshot_precio_por_kg = precio,
    snapshot_precio_empaque = 0,
    linea_total = COALESCE(peso_inicial, 0) * COALESCE(precio, 0),
    override_precio = FALSE
WHERE peso_kg IS NULL;
