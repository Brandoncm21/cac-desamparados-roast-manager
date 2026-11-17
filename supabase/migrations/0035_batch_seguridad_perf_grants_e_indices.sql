-- 0035_batch_seguridad_perf_grants_e_indices.sql
-- A3: 0026 revocó solo a `anon`, pero PUBLIC conservaba el EXECUTE y `anon` lo
-- heredaba. Se revoca el grant de PUBLIC y se otorga explícitamente a
-- `authenticated` (el rol que lo necesita; no se pasa a SECURITY INVOKER porque
-- `empleados_admin_full` la llama → recursión de políticas).
-- A2: índices redundantes (cubiertos como prefijo por un índice más largo; no
-- son constraints de unicidad).
-- Aplicado en producción vía MCP con el nombre `batch_seguridad_perf_grants_e_indices`.

REVOKE EXECUTE ON FUNCTION public.get_empleado_rol() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_empleado_rol() TO authenticated;

DROP INDEX IF EXISTS idx_ordenes_numero_factura;   -- duplica ordenes_numero_factura_unique
DROP INDEX IF EXISTS idx_orden_pasos_orden;        -- prefijo de idx_orden_pasos_orden_prioridad
DROP INDEX IF EXISTS idx_servicios_orden;          -- prefijo de servicios_ejecutados_orden_servicio_empaque_key
