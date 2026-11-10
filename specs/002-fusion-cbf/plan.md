# Implementation Plan: Fusion CBF into CafeTrack

**Branch**: `002-fusion-cbf` | **Date**: 2026-11-06 | **Spec**: [spec.md](./spec.md)

**Input**: spec aprobada + `ARQUITECTURA_Y_DATOS_INTEGRACION.md` §4.4 (mini-ADR), §4.4.1 (tabla de porteo), §4.8 (seguridad).

## Summary
Portar las 6 etapas de CBF como módulos nativos de CafeTrack en slices verticales (P1 Lotes primero), con RLS por rol, Zod, RPCs atómicas upsert, conectores K1-K3 y pipeline e1/e2. Migraciones vía MCP a producción con verificación por fase. Migración de datos CBF diferida al cierre.

## Technical Context
- **Lenguaje**: TypeScript 5 strict · SQL/PL-pgSQL (migraciones numeradas 0026+)
- **Dependencias primarias**: Next.js 16.2.10, `@supabase/ssr` 0.12, Zod 4, RHF, shadcn/ui, Vitest 4
- **Storage**: PostgreSQL 17 (Supabase, RLS + RPCs, sin ORM)
- **Testing**: Vitest + jsdom + fake-indexeddb (patrones `lib/__tests__/`)
- **Target Platform**: Node ≥20.9 · PWA tablet · puerto dev 3016
- **Constraints**: pageSize≤100 · batch sync ≤500 · REQ: `{data}/{error.code}`+`x-correlation-id` · fechas `timestamptz` (T6) · `dfueste` g/ml · `rtostado` rendimiento (=100−merma) · trilla: pesos→orden_pasos, rendimientos→módulos portados · `numero_lote` prohíbido como clave (FR-010 del doc 001); Beche=bache de tostadora.
- **Performance Goals**: listados paginados p95 <300ms con seed; búsqueda trgm en `/lotes`.

## Constitution Check (reglas de porteo §4.4)
| Regla | Cumplimiento |
|---|---|
| RLS por rol en cada tabla | ✓ FR-001 | 
| Zod + validateIdParam | ✓ FR-002 |
| RPCs atómicas upsert (no replace-all) | ✓ FR-003 |
| Auditoría `created_at/updated_at` + soft-delete | ✓ FR-004 |
| JWT en todo endpoint (cero API abierta) | ✓ FR-005 |
| API paginado | ✓ FR-006 |
| 18 discrepancias cerradas | ✓ FR-007 (mapa en tasks) |
| C2 antes de tablas nuevas | ✓ FR-009 (0026) |

## Project Structure

### Documentation (this feature)
```text
specs/002-fusion-cbf/
├── spec.md · plan.md · tasks.md
```

### Source Code (agregado al repo existente)
```text
supabase/migrations/
├── 0026_seguridad_conectores.sql     # C2 + K1 + K2(+backfill) + divergencia admin
├── 0027_lotes_cafe.sql               # P1: tabla+RLS+índices+trigger fechas
├── 0028_caracterizacion.sql          # P2a: cabecera+RC (+RPC guardar_caracterizacion)
├── 0029_secado.sql                   # P2b: secado + 4 series (+RPC guardar_secado)
├── 0030_bodega.sql                   # P2c: bodega + secado_bodega (+RPC guardar_bodega)
├── 0031_trilla.sql                   # P2d: trilla + peso_verde 1:1 (+RPC guardar_trilla)
└── 0032_catacion_pipeline.sql        # P3: catacion_tueste+rondas (K3) + guardar_catacion + crear_orden_desde_trilla (e1)
lib/schemas/  lotes.ts · caracterizacion.ts · secado.ts · bodega.ts · trilla.ts · catacion.ts
app/api/      lotes/ (+[id]) · lotes/[id]/{caracterizacion,secado,bodega,trilla} · cataciones/
app/(dashboard)/  lotes/ (lista+nueva+[id] con pestañas) · cataciones/
components/lotes/  · components/cataciones/
lib/__tests__/    lotes.schema.test.ts · sync-flow.test.ts (nuevos por módulo)
```

## Complexity Tracking
| Violación | Por qué es necesaria | Alternativa descartada |
|---|---|---|
| K2 backfill de `public_id` en tablas existentes | Las 3 tablas ya existen con PKs seriales (ids locales reasignables) | Reescribir PKs serial→uuid (rompería FKs y API existentes) |
| RPC separada por etapa (5 RPCs) | Cada etapa tiene shape propio y validación distinta | RPC genérica (pierde la validación específica de cada etapa) |

## Decisiones de diseño registradas
- `lotes_cafe` conserva **5 booleans despulpado + otro** (FR-010); deriva al `proceso_cafe` enum de la orden en `crear_orden_desde_trilla`.
- Mapeo snake_case de las 48 columnas de catación tomado del modelo real de CBF (referencia Desktop).
