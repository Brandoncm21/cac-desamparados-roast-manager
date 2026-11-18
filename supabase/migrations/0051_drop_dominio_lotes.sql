-- 0051_drop_dominio_lotes.sql
-- F2 · Pivote Beneficio/Acopio: destrucción del dominio legacy de lotes.
--
-- Decisión de producto (2026-11-17): los lotes actuales y sus dependientes se
-- descartan por completo. El lote se re-crea en 0052 naciendo en
-- "Recibido de Café" (productor + finca + atributos de entrada).
--
-- Pre-vuelo medido antes del drop (no hay respaldo, por decisión explícita):
--   lotes_cafe=2 · secado_lote=2 · bodega_lote=1 · trilla_lote=2
--   catacion_tueste=1 · orden_lotes=1 · caracterizacion_lote=0
--
-- OJO (verificado): en PostgreSQL, DROP TABLE ... CASCADE elimina las FKs y
-- vistas dependientes, NO las tablas que referencian. Por eso las tablas hijas
-- (caracterizacion_lote, caracterizacion_rc, secado_lote y sus 4 series,
-- secado_bodega, bodega_lote, trilla_lote, peso_verde_trilla, catacion_tueste,
-- orden_lotes) quedan huérfanas aquí y se eliminan explícitamente al inicio de
-- 0052, donde además se recrean con el esquema nuevo.
-- Las funciones NO se eliminan con CASCADE: se borran explícitamente.
-- ordenes_trabajo.id_finca NO se toca (se conserva por decisión de producto).

DROP VIEW IF EXISTS public.v_lotes_catacion;

DROP FUNCTION IF EXISTS public.guardar_catacion(jsonb);
DROP FUNCTION IF EXISTS public.guardar_caracterizacion(integer, jsonb, jsonb);
DROP FUNCTION IF EXISTS public.guardar_secado(integer, jsonb, jsonb, jsonb, jsonb, jsonb);
DROP FUNCTION IF EXISTS public.guardar_bodega(integer, jsonb, jsonb);
DROP FUNCTION IF EXISTS public.guardar_trilla(integer, jsonb);
DROP FUNCTION IF EXISTS public.crear_orden_desde_trilla(integer);
DROP FUNCTION IF EXISTS public.upsert_serie_secado(integer, jsonb, text);
DROP FUNCTION IF EXISTS public.upsert_serie_camas(integer, jsonb);

DROP TABLE IF EXISTS public.lotes_cafe CASCADE;
