# DATA_GROWTH_PLAN — Retención y crecimiento de datos

> **Actualización:** 2026-10-27 · **Rama:** `feat/audit-hardening` (Fase 5 — Política de retención)
> **Commit auditado:** rama `feat/audit-hardening` sobre `edc284b` + Fases 1–4
> **Cambios:** plan de crecimiento por tabla, proyección con supuestos explícitos, estrategia para `trazabilidad_temperatura`, criterios para particionamiento/TimescaleDB y separación operación/analítica. **No se implementa archivado ni particionamiento todavía** (sin evidencia de volumen).
> **Limitaciones:** proyecciones basadas en volúmenes actuales pequeños (seed ~91 filas; producción real con 27 órdenes); deben recalibrarse con datos operativos.
> **Pendiente:** instrumentar conteos mensuales (SQL de §7) y decidir archivado cuando se alcancen los umbrales.

## 1. Tablas de mayor crecimiento

| Tabla | Filas por unidad de negocio | Tasa estimada | Prioridad |
|---|---|---|---|
| `trazabilidad_temperatura` | 1 por punto de curva (~15–40 por tueste a paso 0.5–3 min) | la mayor: crece con cada tueste | **Alta** |
| `hitos_termicos` | ≤ 8 por perfil | baja | media |
| `ajustes_tueste` | 0–5 por perfil | baja | media |
| `metricas_tueste` | ≤ 3 por perfil | muy baja | baja |
| `perfiles_tueste` | 1 por tueste | media | media |
| `orden_pasos` | ~1–7 por orden | media | media |
| `ordenes_trabajo`, `servicios_ejecutados` | 1 / 1–7 por orden | media | media |
| `empaque_precios` | ~1/mes por tipo de empaque | muy baja | baja |
| `clientes`, `empleados`, catálogos | — | muy baja | baja |

## 2. Proyección (supuestos explícitos)

Supuestos: 20 tuestes/día, 22 días/mes, curva promedio de 30 puntos por tueste.

| Tabla | Filas/mes | Filas/año | Filas en 3 años |
|---|---|---|---|
| `trazabilidad_temperatura` | ~13.200 | ~158.400 | ~475.000 |
| `perfiles_tueste` | ~440 | ~5.300 | ~15.800 |
| `orden_pasos` | ~2.600 | ~31.700 | ~95.000 |

Estos volúmenes son **holgadamente manejables por Postgres sin particionamiento** (índices parciales de 0023 reducen el costo del listado). La proyección escala linealmente: a 10× el volumen (200 tuestes/día) `trazabilidad_temperatura` llegaría a ~4.75M filas/año — todavía viable, pero ahí conviene revisar §4.

## 3. Estrategia para `trazabilidad_temperatura`

- **Corto plazo:** nada que hacer — UNIQUE `(id_perfil, minuto)` + índice `(id_perfil, minuto)` cubren curva y sync idempotente; el acceso es siempre por `id_perfil` (alta selectividad por lote).
- **Medio plazo (≥ 1M filas):** archivado de curvas de tuestes con más de N años (ver §5); reportes sobre datos archivados vía vista unificada.
- **Largo plazo (≥ 10M filas o partición > 20 GB):** particionamiento por rango de `fecha` derivada del `perfiles_tueste.fecha_tueste` (requiere introducir columna `fecha_tueste` desnormalizada o particionar por `id_perfil`/hash — decisión a tomar con EXPLAIN real).

## 4. Umbrales para decidir particionamiento (no antes)

- Tabla > **10M filas** o > **20 GB** en disco.
- Consultas de reportes (agregados sobre todo el historial) > **2s** con índices adecuados.
- `VACUUM`/autovacuum del unable a mantener con la ventana de mantenimiento disponible.
- `pg_stat_user_tables.n_dead_tup` sostenido alto tras tuning.

## 5. Política de archivado y retención

| Dato | Retención activa | Archivado |
|---|---|---|
| Órdenes activas/completadas | indefinida (soft delete preserva) | n/a |
| Curvas de tueste (3+ años) | consulta operativa | tabla `trazabilidad_temperatura_archivo` (misma estructura) + vista `UNION` para reportes |
| Datos de clientes eliminados (soft delete) | indefinida | revisar cumplimiento legal local antes de purgar |
| Logs de app | 30 días en destino de logs | según provider |

## 6. Vistas materializadas para reportes (propuesta, al alcanzar volumen)

- `mv_rendimiento_tueste`: rendimiento por lote (metricas + merma) — refresco diario/horario.
- `mv_ordenes_resumen`: totales por cliente/fecha para reportes — separa analítica de operación.
- Antes de crearlas, preferir consultas directas con índices; materializar solo cuando las consultas excedan ~1s.

## 7. Separación operación vs analítica

- **Operación (app):** solo tablas actuales con filtros `deleted_at IS NULL` / `activo = true` — índices parciales de 0023.
- **Analítica:** reportes deben leer datos históricos sin bloquear operación: vistas/materializadas en el mismo Postgres (suficiente hasta el umbral de §4), luego réplica de lectura o warehouse si Supabase lo permite.
- Nunca agregar índices "de analítica" a tablas operativas sin medir su costo de escritura.

## 8. Criterios para evaluar TimescaleDB u otra extensión

Evaluar solo si: curva de crecimiento sostenida > 10M filas/año en series de tiempo, necesidad de compresión nativa o continuos aggregates. Supabase permite extensiones; migrar `trazabilidad_temperatura` a hypertable exige rehacer la UNIQUE `(id_perfil, minuto)` incluyendo la dimensión temporal — costo no trivial, decisión con datos, no anticipada.

## 9. SQL de monitoreo mensual

```sql
SELECT relname, n_live_tup, pg_total_relation_size(relid) AS bytes
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;
```

Registrar el resultado mensualmente; recalibrar la proyección de §2 con los valores reales.
