-- 0044_drop_legacy.sql
-- Feature 004 (refactor flujo lotes) — T12
-- Cierra la migración al modelo por id: elimina el texto libre legacy y la tabla puente
-- K1 `orden_lotes_externos` (reemplazada por `orden_lotes`, 0040).
--
-- ORDEN: primero se reescriben las funciones que tocaban las columnas legacy y después
-- se dropea. `guardar_catacion` va en `0045` (su único cambio es quitar el fallback a
-- `orden_lotes_externos`, que ya no existe).

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) crear_orden_completa: `zona_finca` (texto) → `id_finca` (FK)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.crear_orden_completa(p_orden jsonb, p_servicios jsonb DEFAULT '[]'::jsonb, p_especificaciones jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_orden_id int;
  v_pasos_creados int;
  v_num_servicios int;
  v_rol text;
BEGIN
  v_rol := get_empleado_rol();
  IF v_rol NOT IN ('Admin', 'Recepción') THEN
    RAISE EXCEPTION 'Solo Admin o Recepción pueden crear órdenes';
  END IF;

  IF p_orden IS NULL OR p_servicios IS NULL THEN
    RAISE EXCEPTION 'Datos de orden o servicios faltantes';
  END IF;

  v_num_servicios := jsonb_array_length(p_servicios);
  IF v_num_servicios = 0 THEN
    RAISE EXCEPTION 'Debe seleccionar al menos un servicio';
  END IF;

  INSERT INTO ordenes_trabajo (
    id_cliente,
    id_finca,
    id_empleado_recibe,
    id_empleado_entrega,
    descripcion_producto,
    proceso_cafe,
    porcentaje_humedad_entrada,
    firma_aprobacion_cliente,
    fecha_orden,
    hora_cierre,
    estado_orden
  ) VALUES (
    (p_orden->>'id_cliente')::int,
    NULLIF(p_orden->>'id_finca', '')::int,
    (p_orden->>'id_empleado_recibe')::int,
    NULLIF(p_orden->>'id_empleado_entrega', '')::int,
    NULLIF(p_orden->>'descripcion_producto', ''),
    (NULLIF(p_orden->>'proceso_cafe', ''))::proceso_cafe_enum,
    NULLIF(p_orden->>'porcentaje_humedad_entrada', '')::numeric,
    COALESCE((p_orden->>'firma_aprobacion_cliente')::boolean, false),
    CURRENT_DATE,
    now()::time,
    'Pendiente'
  ) RETURNING id_orden INTO v_orden_id;

  INSERT INTO orden_pasos (id_orden, servicio_id, prioridad, estado)
  SELECT v_orden_id, s.id_servicio_maestro, s.prioridad, 'PENDIENTE'
  FROM servicios_maestro s
  JOIN jsonb_to_recordset(p_servicios) AS js(servicio_id int)
    ON s.id_servicio_maestro = js.servicio_id
  WHERE s.activo = true
  ORDER BY s.prioridad, s.id_servicio_maestro;

  GET DIAGNOSTICS v_pasos_creados = ROW_COUNT;
  IF v_pasos_creados <> v_num_servicios THEN
    RAISE EXCEPTION 'Uno o más servicios seleccionados no existen o están inactivos';
  END IF;

  IF p_especificaciones IS NOT NULL
     AND p_especificaciones <> 'null'::jsonb
     AND (p_especificaciones->>'tipo_tueste' IS NOT NULL
          OR p_especificaciones->>'tipo_molienda' IS NOT NULL
          OR p_especificaciones->>'tipo_empaque' IS NOT NULL
          OR p_especificaciones->>'observaciones' IS NOT NULL) THEN
    INSERT INTO especificaciones_orden (
      id_orden, tipo_tueste, tipo_molienda, tipo_empaque, observaciones
    ) VALUES (
      v_orden_id,
      NULLIF(p_especificaciones->>'tipo_tueste', ''),
      NULLIF(p_especificaciones->>'tipo_molienda', ''),
      NULLIF(p_especificaciones->>'tipo_empaque', ''),
      NULLIF(p_especificaciones->>'observaciones', '')
    );
  END IF;

  RETURN (
    SELECT to_jsonb(o) || jsonb_build_object(
      'clientes', jsonb_build_object('nombre_completo', c.nombre_completo)
    )
    FROM ordenes_trabajo o
    LEFT JOIN clientes c ON c.id_cliente = o.id_cliente
    WHERE o.id_orden = v_orden_id
  );
END;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) crear_orden_desde_trilla (e1): sin conciliación por nombre, sin K1 legacy.
--    Idempotencia K5 por `orden_lotes` (si el lote ya tiene orden, se reutiliza).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.crear_orden_desde_trilla(p_id_trilla integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_rol text := get_empleado_rol();
  v_trilla record;
  v_empleado_id integer;
  v_ref_existente integer;
  v_orden_nueva integer;
  v_resultado jsonb;
  v_servicios jsonb;
  v_proceso proceso_cafe_enum;
BEGIN
  IF v_rol NOT IN ('Admin', 'Recepción') THEN
    RAISE EXCEPTION 'Solo Recepción o Admin pueden enviar la trilla a proceso';
  END IF;

  SELECT t.*, l.nlote AS lote_nlote, l.id_lote AS lote_id,
         l.id_cliente, l.id_finca, l.proceso_cafe,
         l.lavado, l.miel, l."natural", l.anaerobico, l.semilavado, l.otro
    INTO v_trilla
    FROM trilla_lote t
    JOIN lotes_cafe l ON l.id_lote = t.id_lote
    WHERE t.id_trilla = p_id_trilla AND t.deleted_at IS NULL AND l.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trilla no encontrada';
  END IF;

  IF v_trilla.wverde_final IS NULL OR v_trilla.wverde_final <= 0 THEN
    RAISE EXCEPTION 'La trilla no tiene peso verde final registrado';
  END IF;

  -- K5: si el lote ya está enlazado a una orden, se reutiliza (no se duplica).
  SELECT ol.id_orden INTO v_ref_existente
    FROM orden_lotes ol
    WHERE ol.id_lote = v_trilla.lote_id
    ORDER BY ol.created_at DESC
    LIMIT 1;

  IF v_ref_existente IS NOT NULL THEN
    RETURN jsonb_build_object('reused', true,
      'id_orden', v_ref_existente,
      'orden', (SELECT to_jsonb(o2.*) FROM ordenes_trabajo o2 WHERE o2.id_orden = v_ref_existente));
  END IF;

  IF v_trilla.id_cliente IS NULL THEN
    RAISE EXCEPTION 'El lote "%" no tiene productor (cliente) asignado', v_trilla.lote_nlote;
  END IF;

  SELECT e.id_empleado INTO v_empleado_id
    FROM empleados e WHERE e.id_auth = auth.uid() LIMIT 1;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('servicio_id', s.id_servicio_maestro) ORDER BY s.prioridad), '[]'::jsonb)
    INTO v_servicios
    FROM servicios_maestro s WHERE s.activo;

  IF v_servicios = '[]'::jsonb THEN
    RAISE EXCEPTION 'No hay servicios activos en la planta';
  END IF;

  -- `proceso_cafe` del lote manda; si es NULL se deduce de los booleanos de despulpado.
  v_proceso := COALESCE(v_trilla.proceso_cafe, CASE
    WHEN v_trilla.miel AND v_trilla.lavado THEN 'Honey'::proceso_cafe_enum
    WHEN v_trilla.lavado  THEN 'Lavado'::proceso_cafe_enum
    WHEN v_trilla."natural" THEN 'Natural'::proceso_cafe_enum
    WHEN v_trilla.miel THEN 'Honey'::proceso_cafe_enum
    ELSE 'Otro'::proceso_cafe_enum
  END);

  v_resultado := crear_orden_completa(
    jsonb_build_object(
      'id_cliente', v_trilla.id_cliente,
      'id_finca', v_trilla.id_finca,
      'id_empleado_recibe', v_empleado_id,
      'proceso_cafe', v_proceso::text,
      'descripcion_producto', 'Fusión desde lote ' || v_trilla.lote_nlote
    ),
    v_servicios,
    NULL
  );

  v_orden_nueva := (v_resultado->>'id_orden')::integer;

  INSERT INTO orden_lotes (id_orden, id_lote, peso_kg)
  VALUES (v_orden_nueva, v_trilla.lote_id, v_trilla.wverde_final)
  ON CONFLICT (id_orden, id_lote) DO NOTHING;

  RETURN jsonb_build_object('created', true, 'orden', v_resultado);
END;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) Backfill completo → NOT NULL en las FKs del lote
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.lotes_cafe ALTER COLUMN id_cliente SET NOT NULL;
ALTER TABLE public.lotes_cafe ALTER COLUMN id_finca   SET NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) Drop del texto libre legacy
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.lotes_cafe
  DROP COLUMN nproductor,
  DROP COLUMN nfinca,
  DROP COLUMN zona,
  DROP COLUMN altura;

ALTER TABLE public.ordenes_trabajo DROP COLUMN zona_finca;
ALTER TABLE public.clientes DROP COLUMN zona_procedencia;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5) Drop del puente K1 legacy (reemplazado por `orden_lotes`)
-- ─────────────────────────────────────────────────────────────────────────────
DROP TABLE public.orden_lotes_externos;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6) Índice de búsqueda para el combobox de fincas (sustituye el trgm de nproductor)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_fincas_nombre_trgm
  ON public.fincas USING gin (nombre gin_trgm_ops)
  WHERE deleted_at IS NULL;
