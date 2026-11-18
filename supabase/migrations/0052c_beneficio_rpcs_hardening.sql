-- 0052c_beneficio_rpcs_hardening.sql
-- F3 · Endurecimiento detectado por advisors tras 0052b:
--   1. Los helpers _ben_* no fijaban search_path (lint 0011).
--   2. Los privilegios por defecto de Supabase conceden EXECUTE a `anon`;
--      REVOKE FROM PUBLIC no lo retiraba (lint 0028/0029).
--
-- Las 4 RPCs de etapa son SECURITY INVOKER (RLS de cada tabla aplica).
-- `guardar_catacion` es SECURITY DEFINER porque el rol Tostador no tiene
-- UPDATE sobre lotes_cafe; valida el rol al inicio y solo toca catación + estado.

ALTER FUNCTION public._ben_text(jsonb, text) SET search_path TO 'public';
ALTER FUNCTION public._ben_num(jsonb, text) SET search_path TO 'public';
ALTER FUNCTION public._ben_int(jsonb, text) SET search_path TO 'public';
ALTER FUNCTION public._ben_date(jsonb, text) SET search_path TO 'public';
ALTER FUNCTION public._ben_ts(jsonb, text) SET search_path TO 'public';
ALTER FUNCTION public._ben_bool(jsonb, text) SET search_path TO 'public';
ALTER FUNCTION public._ben_avanzar(integer, text) SET search_path TO 'public';
ALTER FUNCTION public._ben_lote_editable(integer) SET search_path TO 'public';

REVOKE EXECUTE ON FUNCTION public._ben_text(jsonb, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public._ben_num(jsonb, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public._ben_int(jsonb, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public._ben_date(jsonb, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public._ben_ts(jsonb, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public._ben_bool(jsonb, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public._ben_avanzar(integer, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public._ben_lote_editable(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.guardar_caracterizacion(integer, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.guardar_secado(integer, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.guardar_bodega(integer, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.guardar_trilla(integer, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.guardar_catacion(jsonb) FROM anon;
