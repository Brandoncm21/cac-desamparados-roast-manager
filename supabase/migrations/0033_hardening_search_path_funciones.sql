-- 0033_hardening_search_path_funciones.sql
-- Fija search_path en las funciones de `public` que lo tenían mutable
-- (advisor `function_search_path_mutable`). `pg_temp` se lista explícito y al
-- final para impedir shadowing por tablas temporales.
-- Aplicado en producción vía MCP con el nombre `hardening_search_path_funciones`;
-- se versiona aquí para que un `supabase db reset` no pierda el cambio.

alter function public.calc_dtr_perfil(integer) set search_path = public, pg_temp;
alter function public.calc_fechas_trazabilidad() set search_path = public, pg_temp;
alter function public.calc_porcentaje_diferencia() set search_path = public, pg_temp;
alter function public.generar_numero_factura() set search_path = public, pg_temp;
alter function public.get_current_precio_empaque(integer) set search_path = public, pg_temp;
alter function public.get_current_precio_servicio(integer) set search_path = public, pg_temp;
alter function public.resolver_tarifa_por_peso(integer, numeric) set search_path = public, pg_temp;
alter function public.trg_hitos_recalc_dtr() set search_path = public, pg_temp;
alter function public.update_updated_at() set search_path = public, pg_temp;
