-- Rollback de 0062_perfil_tueste_lotes
DROP FUNCTION IF EXISTS public.crear_perfil_tueste(jsonb);
DROP TABLE IF EXISTS public.perfil_tueste_lotes;
NOTIFY pgrst, 'reload schema';
