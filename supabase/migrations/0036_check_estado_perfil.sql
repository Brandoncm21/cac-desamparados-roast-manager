-- 0036_check_estado_perfil.sql
-- Cierra la última columna de estado con semántica cerrada sin constraint en DB
-- (perfiles_tueste.estado). Espejo del enum Zod `actualizarPerfilSchema.estado`
-- en lib/schemas/perfiles.ts.
-- Datos verificados antes de aplicar (2026-11-11): DISTINCT estado ∈ {'Completado','Pendiente'}.

ALTER TABLE public.perfiles_tueste
  ADD CONSTRAINT perfiles_tueste_estado_check
  CHECK (estado IN ('Pendiente', 'Completado'));
