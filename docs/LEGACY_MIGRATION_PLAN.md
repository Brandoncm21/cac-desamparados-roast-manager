# LEGACY_MIGRATION_PLAN — `servicios_ejecutados` → `orden_pasos`

> **Actualización:** 2026-10-27 · **Rama:** `feat/audit-hardening` (Fase 4 — Transacciones y consistencia)
> **Commit auditado:** rama `feat/audit-hardening` sobre `edc284b`
> **Cambios:** análisis de coexistencia entre `orden_pasos` (tabla activa del flujo) y `servicios_ejecutados` (legacy), con plan de migración por etapas. **No se elimina ni modifica la tabla legacy.**
> **Limitaciones:** la migración de datos requiere criterios de negocio (ver §5); sin ellos solo se documenta.
> **Pendiente:** decidir la fuente de verdad de totales de orden (§4) y ejecutar el backfill (§6).

## 1. Estado actual

| Aspecto | `orden_pasos` (activa) | `servicios_ejecutados` (legacy) |
|---|---|---|
| Creada en | 0019 (flujo secuencial con tarifas por intervalo) | 0001 (modelo original de líneas de orden) |
| Se escribe en | `crear_orden_completa` (RPC 0024), `iniciar`, `cerrar_paso_orden` (RPC 0024), `confirmar_tueste_paso` (RPC 0024) | **Ningún endpoint del flujo la escribe hoy** (solo `PUT/DELETE /api/servicios/[idServicio]` y seed) |
| Semántica | 1 fila por paso con snapshots de tarifa, merma, costos | 1 fila por línea de servicio (con `override_precio`) |
| Constraint única | `(id_orden, prioridad)` **eliminada en 0022** (prioridad duplicable; orden determinista por `prioridad, id_paso`) | `(id_orden, tipo_servicio, empaque_id)` desde 0017 — no bloquea duplicados con `empaque_id NULL` |
| Estado | CHECK `PENDIENTE\|EN_PROCESO\|COMPLETADO\|OMITIDO` | sin estado; histórica |

## 2. Consumidores verificados

### Leen `servicios_ejecutados`
| Consumidor | Uso | Nota |
|---|---|---|
| `app/(dashboard)/ordenes/[id]/page.tsx` | Tabla "Servicios" y **cálculo del total de la orden** (`linea_total`) | Fuente de totales principal de la vista |
| `app/(dashboard)/ordenes/[id]/page.tsx` (tieneTueste) | Detecta tueste por `tipo_servicio === "Tueste"` **O** pasos | Doble fuente de verdad |
| `components/forms/select-orden-dialog.tsx` | Lista órdenes con sus servicios | Join directo |
| `GET /api/ordenes/[id]` | `servicios_ejecutados(*)` en el shape de detalle | Contrato de API |
| `GET /api/ordenes` (listado) | No (proyección explícita desde Fase 2) | — |
| `PUT/DELETE /api/servicios/[idServicio]` | Edita/borrado de líneas | Único escritor restante |
| `POST /api/sync` | Enum en `TABLAS_SYNC` | Legado del schema de sync; hoy no se encola |
| `lib/calculo-precios.ts` | Cálculos sobre líneas | — |

### Leen `orden_pasos`
| Consumidor | Uso |
|---|---|
| `components/ordenes/pasos-panel.tsx` | Flujo de proceso + **Total acumulado** (pasos COMPLETADO) |
| `RPCs cerrar_paso_orden / confirmar_tueste_paso` | Escrituras + cierre de orden |
| `POST /api/ordenes` (RPC 0024) | Creación de pasos |

## 3. Riesgos de divergencia

1. **Totales distintos:** la vista de orden suma `servicios_ejecutados.linea_total` (base para facturación impresa) mientras PasosPanel suma `orden_pasos.costo_total_paso`. Ambos pueden diferir cuando hay `override_precio` (legacy) o pasos con snapshots recalculados.
2. **Detección de tueste por dos vías** (`tipo_servicio === "Tueste"` texto vs `servicios_maestro.tipo === 'tueste'`): una orden con tueste registrado solo en pasos la detecta la vista; un reporte que solo lea legacy, no.
3. **`empaque_id` NULL** en la UNIQUE legacy permite duplicar (id_orden, tipo_servicio) sin empaque — el flujo nuevo no la usa, pero validaciones de datos sobre legacy deben conocerlo.

## 4. Decisión pendiente (requiere dominio)

¿Quién es la fuente de verdad del **total facturable** de una orden?
- **Opción A (recomendada):** `orden_pasos` — snapshots inmutables + merma + empaques; `servicios_ejecutados` se vuelve derivada/reportes.
- **Opción B:** mantener legacy como fuente de facturación y `orden_pasos` como ejecución.

Sin decisión, **no reescribir** el cálculo de totales de la vista de orden.

## 5. Plan de migración por etapas (propuesto)

| Etapa | Alcance | Reversibilidad |
|---|---|---|
| E1 (hecho) | Escrituras 100% en `orden_pasos` vía RPCs (0024); lecturas legacy intactas | alta |
| E2 | Backfill: derivar `servicios_ejecutados` para órdenes creadas con el flujo nuevo (o marcar "no aplica") mediante migración idempotente y consulta de divergencia | alta (datos nuevos) |
| E3 | Vista de orden lee totales de `orden_pasos` (feature-flag/doc); legacy se congela (solo lectura) | alta |
| E4 | Reportes + `GET /api/ordenes/[id]` migrados; tests de consistencia entre ambas | media |
| E5 | Retiro: dejar tabla legacy sin escrituras ni lecturas (o archivada); **breaking MAJOR** según `docs/CHANGELOG_GUIDE.md` | baja — requiere versión mayor |

## 6. Criterios para retirar `servicios_ejecutados`

- [ ] 0 lecturas en código (`grep servicios_ejecutados` solo en migraciones históricas)
- [ ] Backfill verificado: `SELECT` de divergencia de totales devuelve 0 filas por ≥2 semanas
- [ ] Reportes migrados y comparados con datos históricos
- [ ] Decisión documentada de E4 aplicada en producción ≥ 1 ciclo de facturación
- [ ] Backup previo + nota de breaking change en `CHANGELOG.md` (MAJOR)

## 7. Consultas/reports a actualizar en E4

- `app/(dashboard)/ordenes/[id]/page.tsx` (tabla Servicios + total + tieneTueste)
- `components/forms/select-orden-dialog.tsx` (join de servicios)
- `GET /api/ordenes/[id]` (shape de detalle)
- `PUT/DELETE /api/servicios/[idServicio]` (retirar o reconvertir)
- `POST /api/sync` — retirar `servicios_ejecutados` de `TABLAS_SYNC` cuando su backfill esté completo
- `supabase/seed.sql` (seed de demostración)
