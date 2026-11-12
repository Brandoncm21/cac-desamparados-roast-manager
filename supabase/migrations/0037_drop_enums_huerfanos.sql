-- 0037_drop_enums_huerfanos.sql
-- Elimina 4 enums sin uso, verificados con 0 dependencias en pg_depend (2026-11-11):
--   especificaciones_orden usa varchar(100) para tueste/molienda/empaque;
--   servicios_ejecutados.tipo_servicio usa text desde 0017.
-- Higiene: corresponden a la deuda §2.3 de ARQUITECTURA_Y_DATOS_INTEGRACION.md.

DROP TYPE IF EXISTS public.tipo_tueste_enum;
DROP TYPE IF EXISTS public.tipo_molienda_enum;
DROP TYPE IF EXISTS public.tipo_empaque_enum;
DROP TYPE IF EXISTS public.tipo_servicio_enum;
