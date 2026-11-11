# Tasks: Refactor del flujo — lotes ↔ clientes/fincas ↔ órdenes ↔ tueste ↔ catación

**Feature**: `004-refactor-flujo-lotes` | **Input**: [spec.md](./spec.md) + [plan.md](./plan.md)
**Estado**: en curso · rama `feat/flujo-lotes` (sin commit) · `typecheck` 0 · `lint` 0 err · `test` 191/191

> Protocolo: plan → aprobado → ejecutar → evidencia por tarea. Migraciones vía MCP (de a una); `.sql` versionado.

## Fase 1 — Fincas

- [x] **T1. `0038_fincas.sql`** (aplicada vía MCP) — 8 columnas · 3 policies · RLS on.
- [x] **T2. Zod `fincas` + API `/api/fincas`** (GET por `cliente_id`+search, POST 23505→409/23503→400; `[id]` GET/PUT/DELETE soft).
- [x] **T3. UI fincas** — se resuelve inline en `LoteForm` y en "Nueva Orden" (crear finca con `cliente_id` + `altura`).

## Fase 2 — Lote

- [x] **T4. `0039_lotes_cliente_finca_proceso.sql`** (aplicada) — `lotes_cafe.id_cliente/id_finca/proceso_cafe`; `ordenes_trabajo.id_finca`; `enproceso` + `'En Catación'`.
- [x] **T5. Zod + API `/api/lotes`** — `id_cliente`/`id_finca` obligatorios; GET embebe `clientes` y `fincas(altura, zonas)`; filtro `id_finca`; `[id]` embebe y lee `orden_lotes`.
- [x] **T6. UI `LoteForm`** — combobox Productor (clientes) → combobox Finca (del cliente) → altura auto read-only + "+ Crear finca" inline. Lista/detalle/nueva actualizados a `clientes`/`fincas`.

## Fase 3 — Orden

- [x] **T7. `0040_orden_lotes.sql`** (aplicada) — tabla N:M + 3 policies.
- [x] **T8. API `/api/ordenes`** — `id_finca` + `lotes[]` en el schema; el handler asocia después de la RPC `crear_orden_completa` (sin tocar la transacción).
- [x] **T9. UI crear orden** — selector de Finca (+ crear finca) y tarjeta de Lotes (multi-select con `nlote` + cliente · finca).

## Fase 4 — Catación + backfill + drop legacy

- [x] **T10. `0041_backfill_relaciones.sql`** (aplicada) — 2 lotes enlazados, 2 fincas, `orden_lotes` (43→1, 645 kg), 0 sin-match. Incluye fix de secuencia `clientes` (estaba en 1, max 5).
- [x] **T11. Catación** — selector de lote (con `nlote`+finca+productor), estado `'En Catación'` al guardar / `'Vendido'` al completar; embed en `/api/cataciones`.
  - Migración **`0042_catacion_lote_estado.sql`** (aplicada vía MCP): `guardar_catacion` ahora (a) deriva `nlote` desde `orden_lotes` con fallback a `orden_lotes_externos`, (b) toma `nlote` del lote cuando viene `id_lote` (fuente de verdad) y (c) transiciona `lotes_cafe.enproceso` → `'En Catación'`, o `'Vendido'` con `finalizada=true`; editar una catación de un lote vendido no lo degrada.
  - Evidencia DB: prueba transaccional temporal (revertida, `tests_registrados=0`) → `TEST_OK [paso1] En Catación + nlote derivado · [paso2] Vendido · [paso3] sin degradar · [paso4] excepción controlada`; `lotes_cafe` sigue `En Secado` (2 cataciones, 6 rondas intactas).
  - Zod `lib/schemas/catacion.ts`: `perfil_tueste_ref` opcional (FR-012) + `superRefine` "perfil o lote"; `finalizada` booleana (default `false`).
  - API: GET de `/api/cataciones` y `/[id]` embeben `lotes_cafe!catacion_tueste_id_lote_fkey(... clientes, fincas)`; sintaxis PostgREST verificada (HTTP 200).
  - UI: `CatacionForm` con select de lote (`nlote · finca · productor (estado)`), info de finca/altura/productor, checkbox "Catación finalizada → Vendido"; `FormValues` anidado y `reset` ya precarga la catación al editar. Lista y detalle muestran finca/productor/estado.
  - Tests: 194/194 (`catacion.schema.test.ts` +3: lote sin perfil, sin perfil y sin lote, `finalizada` default).
- [x] **T15. Dashboard por fase** — apartado por servicio/fase (`ENPROCESO_LOTE`) con los lotes de ese estado, cliente y finca, y enlace al lote.
- [ ] **T12. `0042_drop_legacy.sql`** — DROP `lotes_cafe.nproductor/nfinca/zona/altura`, `ordenes_trabajo.zona_finca`, `clientes.zona_procedencia`, `orden_lotes_externos`; `SET NOT NULL` en `lotes_cafe.id_cliente/id_finca`. **Requiere:** quitar `zona_finca` de `crear_orden_completa` (RPC), del schema de orden y de la UI de nueva orden.

## Fase 5 — Verificación

- [x] **T13.** `typecheck` 0 · `lint` 0 err (41 warnings preexistentes) · `test` 194/194 · `build` OK.
- [ ] **T14.** Demo de trazabilidad `cliente → finca → lote → orden → perfil → catación`; actualizar `docs/` + `CHANGELOG`; commit.
