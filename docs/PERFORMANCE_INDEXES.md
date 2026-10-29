# PERFORMANCE_INDEXES — Índices de la base de datos

> **Actualización:** 2026-10-27 · **Rama:** `feat/audit-hardening` (Fase 2 — Paginación e índices)
> **Commit auditado:** rama `feat/audit-hardening` sobre `edc284b`
> **Cambios:** migración `0023_indices_performance.sql` (11 índices + `pg_trgm`); inventario completo de índices existentes vs nuevos. **Aplicada a producción (nwnldvzoxjjsmfeyouaw) el 2026-10-27** vía MCP; 10/10 índices verificados en `pg_indexes`.
> **Limitaciones:** `EXPLAIN (ANALYZE, BUFFERS)` ejecutado con la base pequeña actual (34 órdenes → Seq Scan legítimo); repetir cuando haya volumen real. Sin datos suficientes no hay evidencia de uso en `pg_stat_user_indexes`.
> **Pendiente:** repetir EXPLAIN §4 con volumen (≥1k órdenes) y revisar uso §5 tras semanas de operación.

## 1. Inventario de índices existentes (previos a 0023)

| Índice | Tabla (columnas) | Origen | Cubre |
|---|---|---|---|
| `idx_clientes_telefono`, `idx_clientes_nombre` | clientes | 0001 | búsquedas exactas/prefijo |
| `idx_ordenes_cliente`, `idx_ordenes_estado` | ordenes_trabajo | 0001 | filtros simples de una columna |
| `idx_ordenes_numero_factura` | ordenes_trabajo(numero_factura) | 0009 | búsqueda por factura (UNIQUE además) |
| `idx_clientes_deleted_at`, `idx_ordenes_deleted_at`, `idx_perfiles_deleted_at` | parciales `WHERE deleted_at IS NULL` | 0011 | conteos de activos |
| `idx_perfiles_estado`, `idx_perfiles_orden`, `idx_perfiles_lote` | perfiles_tueste | 0001/0013 | lookups de perfil |
| `idx_trazabilidad_perfil_minuto` + UNIQUE `(id_perfil, minuto)` | trazabilidad_temperatura | 0001/0015 | curva de tueste, upsert idempotente |
| `idx_servicio_precios_servicio`, UNIQUEs `(id_perfil,tipo_metrica)`, `(id_perfil,tipo_hito)`, `(id_perfil,orden_secuencia)`, `especificaciones(id_orden)`, `empaques(nombre)`, `empleados(id_auth)`, `orden_pasos(id_orden,estado)`, `orden_pasos(id_orden,prioridad,id_paso)` | varias | 0001/0010/0017/0019/0021/0022 | joins y upserts (btree implícito de UNIQUE — **no se duplican**) |
| `idx_empaque_precios_vigente` | empaque_precios (parcial vigente) | 0017 | precio vigente |

## 2. Índices nuevos (migración 0023)

| # | Índice | Consulta que lo motiva | Riesgo que resuelve |
|---|---|---|---|
| 1 | `idx_ordenes_activas_fecha` `(fecha_orden DESC, id_orden DESC) WHERE deleted_at IS NULL` | `GET /api/ordenes` y listado del dashboard: activos ordenados por fecha | seq scan + sort de todo el historial en cada página |
| 2 | `idx_ordenes_estado_fecha` `(estado_orden, fecha_orden DESC, id_orden DESC) WHERE deleted_at IS NULL` | Filtro "Estado" del dashboard con orden cronológico | filtro por estado sin orden eficiente |
| 3 | `idx_ordenes_cliente_fecha` `(id_cliente, fecha_orden DESC) WHERE deleted_at IS NULL` | Filtro por cliente e historial por cliente | scan por cliente en historiales largos |
| 4 | `idx_clientes_nombre_trgm` GIN trigram parcial activos | `GET /api/clientes?search=` (`ilike '%...%'` en nombre) | `ilike` con comodín inicial no usa btree → seq scan |
| 5 | `idx_clientes_nombre_activos` parcial activos | `ORDER BY nombre_completo` paginado de activos | sort + filtro de eliminados |
| 6 | `idx_empleados_nombre_activos` parcial `activo=true` | Selectores de responsable/tostador (`ORDER BY nombre`) | scan de catálogo con filtro |
| 7 | `idx_perfiles_orden_activos` parcial activos | Perfil de tueste por orden (PasosPanel, Ver Orden) | lookup por orden sin índice parcial |
| 8 | `idx_orden_pasos_pendientes` parcial `estado NOT IN ('COMPLETADO','OMITIDO')` | Primer paso pendiente (`obtenerPasoActual`, orden determinista `prioridad, id_paso`) | scan de pasos completados históricos |
| 9 | `idx_orden_pasos_tarifa` | Joins a `servicio_precios` y checks `ON DELETE` en tarifas | FK sin índice → locks/checks lentos |
| 10 | `idx_orden_pasos_perfil_tueste` | Join paso → perfil de tueste | join sin índice |
| 11 | Extensión `pg_trgm` | Soporte para el índice GIN trigram (#4) | — |

## 3. Redundancias conocidas (no se eliminan en 0023)

- `idx_orden_pasos_orden(id_orden)` quedó subsumido por `idx_orden_pasos_orden_prioridad(id_orden,prioridad,id_paso)` (0022). Candidato a `DROP` tras validar uso en `pg_stat_user_indexes`.
- `idx_ordenes_cliente` / `idx_ordenes_estado` (una columna) quedan cubiertos parcialmente por los compuestos #2/#3. Se conservan por ser útiles para conteos simples; reevaluar con estadísticas reales.
- `idx_perfiles_orden` (total) vs `idx_perfiles_orden_activos` (parcial): conservar ambos hasta medir; el parcial sirve al 100% de las consultas actuales (todas filtran `deleted_at IS NULL`).

## 4. Cómo validar con EXPLAIN

Ejecutar en el SQL Editor del branch de Supabase (o staging con datos representativos):

```sql
-- 1. Listado principal de órdenes (usa idx_ordenes_activas_fecha)
EXPLAIN (ANALYZE, BUFFERS)
SELECT id_orden, numero_factura, fecha_orden, estado_orden
FROM ordenes_trabajo
WHERE deleted_at IS NULL
ORDER BY fecha_orden DESC, id_orden DESC
LIMIT 25;

-- 2. Búsqueda de clientes (usa idx_clientes_nombre_trgm)
EXPLAIN (ANALYZE, BUFFERS)
SELECT id_cliente, nombre_completo
FROM clientes
WHERE deleted_at IS NULL AND nombre_completo ILIKE '%tarra%'
ORDER BY nombre_completo
LIMIT 25;

-- 3. Primer paso pendiente (usa idx_orden_pasos_pendientes)
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM orden_pasos
WHERE id_orden = 1 AND estado NOT IN ('COMPLETADO', 'OMITIDO')
ORDER BY prioridad, id_paso
LIMIT 1;
```

Esperado: `Index Scan` / `Bitmap Heap Scan` sobre el índice correspondiente, sin `Sort` externo en #1/#3. Si aparece `Seq Scan`, revisar `enable_seqscan` de la sesión o selectividad (tablas diminutas usan seq scan legítimamente).

## 5. Cómo revisar uso con pg_stat_user_indexes

```sql
SELECT schemaname, relname, indexrelname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND indexrelname LIKE 'idx\_%'
ORDER BY idx_scan ASC;
```

- `idx_scan = 0` tras semanas de operación → candidato a eliminar.
- Comparar `idx_orden_pasos_orden` vs `idx_orden_pasos_orden_prioridad`: si el simple tiene 0 scans y el compuesto >0, hacer `DROP INDEX CONCURRENTLY idx_orden_pasos_orden`.
- Repetir para `idx_ordenes_cliente`/`idx_ordenes_estado` vs compuestos, y `idx_perfiles_orden` vs parcial.
- `DROP` siempre con `CONCURRENTLY` fuera de transacción y en ventana de bajo tráfico.
