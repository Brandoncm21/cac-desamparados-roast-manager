-- ============================================================================
-- 0023_indices_performance.sql
-- Índices de performance para consultas reales del sistema (Fase 2 auditoría).
--
-- Criterios:
--   - Solo índices para patrones de consulta verificados en código/API.
--   - Parciales (WHERE ...) cuando el filtro es permanente (deleted_at IS NULL,
--     activo = true) para reducir tamaño y costo de mantenimiento.
--   - NO se duplican índices ya cubiertos por constraints UNIQUE/PK ni por
--     índices existentes (ver docs/PERFORMANCE_INDEXES.md para el inventario).
--   - Idempotente: todo con IF NOT EXISTS. Forward-only (sin down).
-- ============================================================================

-- pg_trgm para búsquedas ilike '%texto%' en catálogos (clientes).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ----------------------------------------------------------------------------
-- ordenes_trabajo — listado principal y filtros del dashboard / API
-- ----------------------------------------------------------------------------

-- Listado principal: filas activas ordenadas por fecha (GET /api/ordenes,
-- app/(dashboard)/ordenes/page.tsx).
CREATE INDEX IF NOT EXISTS idx_ordenes_activas_fecha
  ON ordenes_trabajo (fecha_orden DESC, id_orden DESC)
  WHERE deleted_at IS NULL;

-- Filtro por estado + orden cronológico (filtro "Estado" del dashboard).
CREATE INDEX IF NOT EXISTS idx_ordenes_estado_fecha
  ON ordenes_trabajo (estado_orden, fecha_orden DESC, id_orden DESC)
  WHERE deleted_at IS NULL;

-- Filtro por cliente + orden cronológico (filtro id_cliente, historial).
CREATE INDEX IF NOT EXISTS idx_ordenes_cliente_fecha
  ON ordenes_trabajo (id_cliente, fecha_orden DESC)
  WHERE deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- clientes — búsqueda por nombre/teléfono y orden alfabético
-- ----------------------------------------------------------------------------

-- Búsqueda ilike '%...%' sobre activos (GET /api/clientes?search=).
CREATE INDEX IF NOT EXISTS idx_clientes_nombre_trgm
  ON clientes USING gin (nombre_completo gin_trgm_ops)
  WHERE deleted_at IS NULL;

-- Orden alfabético de activos (paginado por nombre_completo).
CREATE INDEX IF NOT EXISTS idx_clientes_nombre_activos
  ON clientes (nombre_completo)
  WHERE deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- empleados — catálogos ordenados por nombre
-- ----------------------------------------------------------------------------

-- Selectores de responsable/tostador (solo activos, ordenados).
CREATE INDEX IF NOT EXISTS idx_empleados_nombre_activos
  ON empleados (nombre)
  WHERE activo = true;

-- Nota: empleados(id_auth) ya está cubierto por la UNIQUE de 0001 (btree
-- implícito). No se crea índice adicional.

-- ----------------------------------------------------------------------------
-- perfiles_tueste — lookup por orden
-- ----------------------------------------------------------------------------

-- Perfil de tueste de una orden activa (PasosPanel, Ver Orden, tueste/[id]).
CREATE INDEX IF NOT EXISTS idx_perfiles_orden_activos
  ON perfiles_tueste (id_orden)
  WHERE deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- orden_pasos — primer paso pendiente y FKs de join/cascade
-- ----------------------------------------------------------------------------

-- Primer paso pendiente de una orden (obtenerPasoActual, PasosPanel).
CREATE INDEX IF NOT EXISTS idx_orden_pasos_pendientes
  ON orden_pasos (id_orden, prioridad, id_paso)
  WHERE estado NOT IN ('COMPLETADO', 'OMITIDO');

-- Lookups por FK sin índice dedicado (joins y checks ON DELETE).
CREATE INDEX IF NOT EXISTS idx_orden_pasos_tarifa
  ON orden_pasos (tarifa_id);

CREATE INDEX IF NOT EXISTS idx_orden_pasos_perfil_tueste
  ON orden_pasos (id_perfil_tueste);

-- ----------------------------------------------------------------------------
-- Notas de no-duplicación (documentado en docs/PERFORMANCE_INDEXES.md)
-- ----------------------------------------------------------------------------
-- Cubiertos por UNIQUE existentes (btree implícito, no se crean):
--   metricas_tueste(id_perfil, tipo_metrica), ajustes_tueste(id_perfil, orden_secuencia),
--   hitos_termicos(id_perfil, tipo_hito), especificaciones_orden(id_orden),
--   trazabilidad_temperatura(id_perfil, minuto), empaques(nombre),
--   servicio_precios(id_servicio), empaque_precios(id_empaque, valid_to parcial),
--   empleados(id_auth), servicios_ejecutados(id_orden), ordenes_trabajo(numero_factura).
