# Tasks: Módulo de Fincas + correcciones del alta de lotes

**Feature**: `005-fincas-crud` | **Input**: [spec.md](./spec.md)
**Estado**: completa · rama `feat/flujo-lotes` · `typecheck` 0 · `lint` 0 err · `test` 200/200 · `build` OK

## Fase 1 — Datos

- [x] **T1. `0046_fincas_ubicacion_altura_opcional.sql`** (aplicada vía MCP) — `fincas.ubicacion varchar(200)`; `altura` deja de ser NOT NULL; comentarios de columna.

## Fase 2 — Fuente única (bug de etiquetas y de fincas por cliente)

- [x] **T2. `lib/fincas.ts`** — `listarFincas({clienteId, search})`, `crearFinca`, `actualizarFinca`, `obtenerFinca`, `eliminarFinca`, `listarZonas`, `etiquetaFinca`, `opcionesFinca`, `opcionesCliente`.
- [x] **T3. `components/fincas/finca-select.tsx`** — `Select items={…}` (arregla el trigger que mostraba el id), carga por productor, alta inline (nombre + altura opcional + zona), aviso cuando el productor no tiene fincas.
- [x] **T4. `LoteForm`** — productor con `items`, finca con `FincaSelect`, altura read-only desde la finca, `altura` incluida en el payload.
- [x] **T5. `ordenes/nueva`** — usa el mismo `FincaSelect` (se elimina el fetch global de fincas y el alta duplicada); `items` en servicios y responsable.

## Fase 3 — CRUD de Fincas

- [x] **T6. API `/api/fincas`** — POST devuelve embeds (productor, zona); `[id]` GET con `lotes[]`, `ordenes_count`, `tiene_dependencias`; PUT valida coherencia de productor; DELETE/PUT **409** con dependencias.
- [x] **T7. Páginas** — `/fincas` (búsqueda + filtro por productor + paginación + acciones por rol), `/fincas/nueva`, `/fincas/[id]` (datos, resumen y lotes), `/fincas/[id]/editar`.
- [x] **T8. `FincaForm`** — productor (bloqueado con dependencias), nombre, altura opcional, zona del catálogo con "+ Nueva zona", ubicación.
- [x] **T9. Sidebar** — entrada **Fincas** (MapPin) entre Lotes y Tueste.

## Fase 4 — Verificación

- [x] **T10. `lib/__tests__/fincas.schema.test.ts`** — 6 tests (productor, nombre, altura opcional/límites, zona/ubicación, update parcial).
- [x] **T11. `POST/PUT /api/lotes`** — `altura` se valida contra la finca (400 si no coincide), la finca debe existir y pertenecer al productor, y el reporte del lote devuelve la finca con su altura.
- [x] **T12. Etiquetas en catación y edición de orden** — `items` en perfil/lote (uuid e id) y en la finca de `/ordenes/[id]/editar`.
- [x] **T13.** `typecheck` 0 · `lint` 0 errores (44 warnings, 3 nuevos del patrón de carga usado en las páginas) · `test` 200/200 · `build` OK.
- [x] **T14. Docs** — `DB_SCHEMA` (§3quater), `API_REFERENCE` (fincas + `altura` en lotes), `CHANGELOG`.

## Pendiente / notas

- Las fincas de los clientes demo 2–5 no existen: se crean desde `/fincas` o con **+ Crear finca** en el alta de lote (no se inventan datos).
- Si el dueño quiere **histórico** de altura por lote (snapshot), requiere una columna nueva (`lotes_cafe.altura_msnm`); hoy la altura se lee en vivo (spec 004 D8).
