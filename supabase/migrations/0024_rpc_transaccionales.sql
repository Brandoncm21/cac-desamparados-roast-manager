-- ============================================================================
-- 0024_rpc_transaccionales.sql
-- RPCs transaccionales para operaciones multi-tabla (Fase 4 auditoría).
--
-- Reemplaza escrituras encadenadas desde Route Handlers con rollbacks
-- manuales por funciones atómicas:
--   - crear_orden_completa: orden + orden_pasos + especificaciones_orden
--   - crear_servicio_con_precios: servicios_maestro + servicio_precios
--   - actualizar_servicio_con_precios: maestro + reemplazo atómico de intervalos
--   - cerrar_paso_orden: orden_pasos + ordenes_trabajo (general/empacado)
--   - confirmar_tueste_paso: orden_pasos + ordenes_trabajo (tueste)
--
-- Seguridad:
--   - SECURITY INVOKER: RLS se evalúa con el rol del llamador (nunca bypass).
--   - Verificación de rol adicional dentro de cada función vía
--     get_empleado_rol() (defensa en profundidad; el cliente no puede
--     invocar con más permisos de los que RLS otorga).
--   - EXECUTE revocado de PUBLIC/anon y otorgado solo a `authenticated`.
--   - Las funciones devuelven errores en español con RAISE EXCEPTION;
--     PostgREST los mapea a error.message (los Route Handlers los relanzan
--     como apiError 400/500 según mensaje).
--   - Corrige el bug de código que consultaba `empleados.auth_user_id`
--     (columna inexistente; la real es `id_auth`).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Crear orden completa (orden + pasos + especificaciones)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.crear_orden_completa(
  p_orden jsonb,
  p_servicios jsonb,
  p_especificaciones jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
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
    id_empleado_recibe,
    id_empleado_entrega,
    zona_finca,
    descripcion_producto,
    proceso_cafe,
    porcentaje_humedad_entrada,
    firma_aprobacion_cliente,
    fecha_orden,
    hora_cierre,
    estado_orden
  ) VALUES (
    (p_orden->>'id_cliente')::int,
    (p_orden->>'id_empleado_recibe')::int,
    NULLIF(p_orden->>'id_empleado_entrega', '')::int,
    NULLIF(p_orden->>'zona_finca', ''),
    NULLIF(p_orden->>'descripcion_producto', ''),
    NULLIF(p_orden->>'proceso_cafe', ''),
    NULLIF(p_orden->>'porcentaje_humedad_entrada', '')::numeric,
    COALESCE((p_orden->>'firma_aprobacion_cliente')::boolean, false),
    CURRENT_DATE,
    to_char(now(), 'HH24:MI'),
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
$$;

-- ----------------------------------------------------------------------------
-- 2. Crear servicio con intervalos de precios
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.crear_servicio_con_precios(
  p_servicio jsonb,
  p_intervalos jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_servicio_id int;
  v_rol text;
BEGIN
  v_rol := get_empleado_rol();
  IF v_rol <> 'Admin' THEN
    RAISE EXCEPTION 'Solo Admin puede crear servicios';
  END IF;

  IF p_intervalos IS NULL OR jsonb_array_length(p_intervalos) = 0 THEN
    RAISE EXCEPTION 'Debe definir al menos un intervalo de precio';
  END IF;

  INSERT INTO servicios_maestro (
    nombre, descripcion, tipo, prioridad, activo
  ) VALUES (
    p_servicio->>'nombre',
    NULLIF(p_servicio->>'descripcion', ''),
    COALESCE(p_servicio->>'tipo', 'general'),
    (p_servicio->>'prioridad')::int,
    COALESCE((p_servicio->>'activo')::boolean, true)
  ) RETURNING id_servicio_maestro INTO v_servicio_id;

  INSERT INTO servicio_precios (
    id_servicio, min_weight_kg, max_weight_kg, precio_por_kg, activo
  )
  SELECT v_servicio_id, i.min_weight_kg, i.max_weight_kg, i.precio_por_kg, true
  FROM jsonb_to_recordset(p_intervalos) AS i(
    min_weight_kg numeric, max_weight_kg numeric, precio_por_kg numeric
  );

  RETURN (
    SELECT to_jsonb(s)
    FROM servicios_maestro s
    WHERE s.id_servicio_maestro = v_servicio_id
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. Actualizar servicio y reemplazar intervalos de forma atómica
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.actualizar_servicio_con_precios(
  p_id_servicio int,
  p_datos jsonb,
  p_intervalos jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_fila record;
  v_intervalo record;
  v_rol text;
BEGIN
  v_rol := get_empleado_rol();
  IF v_rol <> 'Admin' THEN
    RAISE EXCEPTION 'Solo Admin puede actualizar servicios';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM servicios_maestro WHERE id_servicio_maestro = p_id_servicio
  ) THEN
    RAISE EXCEPTION 'Servicio no encontrado';
  END IF;

  IF p_datos IS NOT NULL AND p_datos <> '{}'::jsonb THEN
    UPDATE servicios_maestro SET
      nombre = COALESCE(p_datos->>'nombre', nombre),
      descripcion = CASE
        WHEN p_datos ? 'descripcion' AND p_datos->>'descripcion' IS NULL THEN NULL
        ELSE COALESCE(NULLIF(p_datos->>'descripcion', ''), descripcion)
      END,
      prioridad = COALESCE((p_datos->>'prioridad')::int, prioridad),
      tipo = COALESCE(p_datos->>'tipo', tipo),
      activo = COALESCE((p_datos->>'activo')::boolean, activo)
    WHERE id_servicio_maestro = p_id_servicio;
  END IF;

  IF p_intervalos IS NOT NULL AND jsonb_array_length(p_intervalos) > 0 THEN
    -- Desactivar todos los intervalos activos y reemplazarlos dentro de la
    -- misma transacción: ningún consumidor ve el estado intermedio.
    UPDATE servicio_precios SET activo = false
    WHERE id_servicio = p_id_servicio AND activo = true;

    FOR v_intervalo IN
      SELECT * FROM jsonb_to_recordset(p_intervalos) AS i(
        id_precio int, min_weight_kg numeric, max_weight_kg numeric,
        precio_por_kg numeric
      )
    LOOP
      IF v_intervalo.id_precio IS NOT NULL THEN
        UPDATE servicio_precios SET
          min_weight_kg = v_intervalo.min_weight_kg,
          max_weight_kg = v_intervalo.max_weight_kg,
          precio_por_kg = v_intervalo.precio_por_kg,
          activo = true
        WHERE id_precio = v_intervalo.id_precio
          AND id_servicio = p_id_servicio;
      ELSE
        INSERT INTO servicio_precios (
          id_servicio, min_weight_kg, max_weight_kg, precio_por_kg, activo
        ) VALUES (
          p_id_servicio, v_intervalo.min_weight_kg, v_intervalo.max_weight_kg,
          v_intervalo.precio_por_kg, true
        );
      END IF;
    END LOOP;
  END IF;

  RETURN (
    SELECT to_jsonb(s) || jsonb_build_object(
      'servicio_precios', COALESCE(
        (SELECT jsonb_agg(to_jsonb(sp))
         FROM servicio_precios sp
         WHERE sp.id_servicio = p_id_servicio AND sp.activo = true),
        '[]'::jsonb
      )
    )
    FROM servicios_maestro s
    WHERE s.id_servicio_maestro = p_id_servicio
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. Cerrar paso (general / empacado) + cerrar orden si no quedan pendientes
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cerrar_paso_orden(
  p_id_paso int,
  p_peso_final_kg numeric DEFAULT NULL,
  p_empaque_id int DEFAULT NULL,
  p_observaciones text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_paso orden_pasos%ROWTYPE;
  v_tipo text;
  v_operador int;
  v_peso_base numeric;
  v_capacidad numeric;
  v_precio_empaque numeric;
  v_cantidad int;
  v_costo_empaques numeric;
  v_subtotal numeric;
  v_costo_total numeric;
  v_merma numeric;
  v_rol text;
BEGIN
  v_rol := get_empleado_rol();
  IF v_rol NOT IN ('Admin', 'Recepción', 'Tostador') THEN
    RAISE EXCEPTION 'No tiene permisos para cerrar pasos';
  END IF;

  SELECT * INTO v_paso
  FROM orden_pasos
  WHERE id_paso = p_id_paso
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Paso no encontrado';
  END IF;

  IF v_paso.estado <> 'EN_PROCESO' THEN
    RAISE EXCEPTION 'El paso debe estar en proceso para cerrarse';
  END IF;

  SELECT tipo INTO v_tipo
  FROM servicios_maestro
  WHERE id_servicio_maestro = v_paso.servicio_id;

  IF v_tipo = 'tueste' THEN
    RAISE EXCEPTION 'El paso de tueste se confirma con su propia acción';
  END IF;

  SELECT id_empleado INTO v_operador
  FROM empleados
  WHERE id_auth = auth.uid()
  LIMIT 1;

  v_subtotal := COALESCE(v_paso.subtotal_servicio, 0);

  IF v_tipo = 'empacado' THEN
    IF p_empaque_id IS NULL THEN
      RAISE EXCEPTION 'Debe seleccionar un empaque';
    END IF;

    v_peso_base := COALESCE(v_paso.peso_facturable_kg, v_paso.peso_inicial_kg);
    IF v_peso_base IS NULL OR v_peso_base <= 0 THEN
      RAISE EXCEPTION 'El paso no tiene un peso base definido para empacar';
    END IF;

    SELECT
      CASE WHEN e.capacidad_kg >= 100 THEN e.capacidad_kg / 1000 ELSE e.capacidad_kg END,
      ep.precio
    INTO v_capacidad, v_precio_empaque
    FROM empaques e
    LEFT JOIN empaque_precios ep
      ON ep.id_empaque = e.id_empaque AND ep.valid_to IS NULL
    WHERE e.id_empaque = p_empaque_id
    ORDER BY ep.valid_from DESC NULLS LAST
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Empaque no encontrado';
    END IF;
    IF v_precio_empaque IS NULL THEN
      RAISE EXCEPTION 'El empaque no tiene precio vigente';
    END IF;
    IF v_capacidad IS NULL OR v_capacidad <= 0 THEN
      RAISE EXCEPTION 'El empaque no tiene capacidad definida en kg. Edítelo en el módulo de empaques.';
    END IF;

    v_cantidad := ceil(v_peso_base / v_capacidad);
    v_costo_empaques := v_cantidad * v_precio_empaque;
    v_costo_total := v_subtotal + v_costo_empaques;

    UPDATE orden_pasos SET
      estado = 'COMPLETADO',
      empaque_id = p_empaque_id,
      cantidad_empaques = v_cantidad,
      snapshot_precio_empaque = v_precio_empaque,
      costo_empaques = v_costo_empaques,
      costo_total_paso = v_costo_total,
      id_operador_cierre = v_operador,
      fecha_fin = now(),
      observaciones = p_observaciones,
      updated_at = now()
    WHERE id_paso = p_id_paso
    RETURNING * INTO v_paso;

  ELSE
    -- General (chancado, trillado, molido, clasificación): el cobro quedó
    -- definido al iniciar. peso_final es opcional (trazabilidad de merma).
    IF p_peso_final_kg IS NOT NULL AND v_paso.peso_inicial_kg IS NOT NULL THEN
      v_merma := v_paso.peso_inicial_kg - p_peso_final_kg;
    ELSE
      v_merma := NULL;
    END IF;
    v_costo_total := v_subtotal;

    UPDATE orden_pasos SET
      estado = 'COMPLETADO',
      peso_final_kg = p_peso_final_kg,
      merma_kg = v_merma,
      costo_total_paso = v_costo_total,
      id_operador_cierre = v_operador,
      fecha_fin = now(),
      observaciones = p_observaciones,
      updated_at = now()
    WHERE id_paso = p_id_paso
    RETURNING * INTO v_paso;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM orden_pasos
    WHERE id_orden = v_paso.id_orden
      AND estado IN ('PENDIENTE', 'EN_PROCESO')
  ) THEN
    UPDATE ordenes_trabajo SET
      estado_orden = 'Completado',
      updated_at = now()
    WHERE id_orden = v_paso.id_orden;
  END IF;

  RETURN to_jsonb(v_paso);
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. Confirmar tueste (paso + orden) — igual atomicidad que cerrar_paso
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.confirmar_tueste_paso(
  p_id_paso int,
  p_peso_final_kg numeric,
  p_observaciones text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_paso orden_pasos%ROWTYPE;
  v_tipo text;
  v_operador int;
  v_merma numeric;
  v_rol text;
BEGIN
  v_rol := get_empleado_rol();
  IF v_rol NOT IN ('Admin', 'Recepción', 'Tostador') THEN
    RAISE EXCEPTION 'No tiene permisos para confirmar tuestes';
  END IF;

  SELECT p.* INTO v_paso
  FROM orden_pasos p
  JOIN servicios_maestro m ON m.id_servicio_maestro = p.servicio_id
  WHERE p.id_paso = p_id_paso AND m.tipo = 'tueste'
  FOR UPDATE OF p;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Paso de tueste no encontrado';
  END IF;

  IF v_paso.estado <> 'EN_PROCESO' THEN
    RAISE EXCEPTION 'El paso debe estar en proceso para confirmarse';
  END IF;

  IF v_paso.peso_inicial_kg IS NULL THEN
    RAISE EXCEPTION 'El paso de tueste no tiene peso inicial registrado';
  END IF;

  IF p_peso_final_kg IS NULL OR p_peso_final_kg <= 0 THEN
    RAISE EXCEPTION 'El peso final debe ser mayor a 0';
  END IF;

  v_merma := v_paso.peso_inicial_kg - p_peso_final_kg;

  SELECT id_empleado INTO v_operador
  FROM empleados
  WHERE id_auth = auth.uid()
  LIMIT 1;

  UPDATE orden_pasos SET
    estado = 'COMPLETADO',
    peso_final_kg = p_peso_final_kg,
    merma_kg = v_merma,
    id_operador_cierre = v_operador,
    fecha_fin = now(),
    observaciones = p_observaciones,
    updated_at = now()
  WHERE id_paso = p_id_paso
  RETURNING * INTO v_paso;

  IF NOT EXISTS (
    SELECT 1 FROM orden_pasos
    WHERE id_orden = v_paso.id_orden
      AND estado IN ('PENDIENTE', 'EN_PROCESO')
  ) THEN
    UPDATE ordenes_trabajo SET
      estado_orden = 'Completado',
      updated_at = now()
    WHERE id_orden = v_paso.id_orden;
  END IF;

  RETURN to_jsonb(v_paso);
END;
$$;

-- ----------------------------------------------------------------------------
-- Permisos: solo authenticated; revocar de PUBLIC/anon (default EXECUTE a PUBLIC)
-- ----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.crear_orden_completa(jsonb, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.crear_orden_completa(jsonb, jsonb, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.crear_orden_completa(jsonb, jsonb, jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.crear_servicio_con_precios(jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.crear_servicio_con_precios(jsonb, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.crear_servicio_con_precios(jsonb, jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.actualizar_servicio_con_precios(int, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.actualizar_servicio_con_precios(int, jsonb, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.actualizar_servicio_con_precios(int, jsonb, jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.cerrar_paso_orden(int, numeric, int, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cerrar_paso_orden(int, numeric, int, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.cerrar_paso_orden(int, numeric, int, text) TO authenticated;

REVOKE ALL ON FUNCTION public.confirmar_tueste_paso(int, numeric, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirmar_tueste_paso(int, numeric, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.confirmar_tueste_paso(int, numeric, text) TO authenticated;
