# Feature Specification: Refactor del flujo — lotes ↔ clientes/fincas ↔ órdenes ↔ tueste ↔ catación

**Feature Branch**: `004-refactor-flujo-lotes`
**Created**: 2026-11-11
**Status**: Approved (decisiones D1–D9 y P1–P6 cerradas con el dueño)
**Input**: `docs/CORRECCIONES_BASE_CAFETRACK.md` · `specs/002-fusion-cbf` (mergeada) · plan aprobado 2026-11-11

## Objetivo

Unificar las relaciones del flujo de CaféTrack que hoy viven como texto libre (`nproductor`,
`nfinca`, `zona`, `zona_finca`, `zona_procedencia`) y enlazar por `id` todo el pipeline
cliente → finca → lote → orden → tueste → catación.

## User Scenarios & Testing

### User Story 1 — Fincas por cliente (Priority: P1)
Un cliente puede tener N fincas; cada finca tiene nombre, altura obligatoria (masl) y zona opcional.
**Independent Test**: crear/listar/editar/desactivar fincas sin tocar lotes ni órdenes.

Acceptance Scenarios:
1. **Given** un cliente, **When** creo una finca con `nombre` + `altura`, **Then** 201 y aparece en el listado de fincas del cliente.
2. **Given** finca sin `altura`, **When** creo, **Then** `422` con el campo culpable.
3. **Given** dos fincas con el mismo nombre para el mismo cliente, **When** creo la segunda, **Then** `409`.
4. **Given** Admin, **When** desactiva una finca, **Then** soft-delete y deja de listarse.

### User Story 2 — Lote con productor y finca (Priority: P1)
Al crear un lote, el **productor** se elige desde `clientes` (combobox); al elegirlo se listan sus
fincas, y la **altura** se rellena sola (read-only) desde la finca.
**Independent Test**: crear un lote solo con id de cliente + id de finca.

Acceptance Scenarios:
1. **Given** cliente con 2 fincas, **When** elijo el cliente en el combobox, **Then** el selector de finca muestra solo esas 2.
2. **Given** cliente sin fincas, **When** creo lote, **Then** opción "crear finca" (exige altura).
3. **Given** lote con finca de altura 1450, **When** lo abro, **Then** muestra altura 1450 (leída de `fincas`, no editada en el lote).
4. **Given** GET `/api/lotes`, **Then** embebe `clientes(nombre_completo)` y `fincas(nombre, altura, zonas(nombre))`.

### User Story 3 — Orden con finca y lotes (Priority: P1)
Al crear una orden puedo (opcionalmente) elegir una **finca** (cualquiera del sistema) y **seleccionar
uno o más lotes**. El enlace lote↔orden es N:M por `id` (tabla `orden_lotes`).
**Independent Test**: crear una orden con 2 lotes y verificar las 2 filas en `orden_lotes`.

Acceptance Scenarios:
1. **Given** crear orden, **When** selecciono lotes A y B, **Then** se crean 2 filas en `orden_lotes(id_orden, id_lote)`.
2. **Given** una orden de servicio externo, **When** la creo sin lote ni finca, **Then** 201 (ambos opcionales).
3. **Given** reenviar el mismo `(id_orden, id_lote)`, **Then** no duplica (PK compuesta).

### User Story 4 — Catación elige lote (Priority: P2)
En catación, además de elegir perfil de tueste, puedo elegir un **lote**; se muestra finca y productor;
al guardar, el lote pasa a `enproceso='En Catación'` y al terminar → `'Vendido'`.
**Independent Test**: catación asociada a un lote sin perfil sigue funcionando (y viceversa).

Acceptance Scenarios:
1. **Given** lotes existentes, **When** abro el selector de lote en catación, **Then** listan con `nlote` + finca + productor.
2. **Given** guardo catación con lote, **When** reviso el lote, **Then** `enproceso='En Catación'`.
3. **Given** completo la catación, **When** cierro, **Then** el lote pasa a `'Vendido'`.

### User Story 5 — Proceso editable en trilla y bodega (Priority: P2)
El lote gana `proceso_cafe` (enum Lavado/Honey/Natural/Otro); editable en las etapas de trilla y bodega.
Los 5 booleans de despulpado permanecen como están (paridad CBF FR-010).
**Independent Test**: cambiar `proceso_cafe` de un lote en trilla y verlo persistido.

Acceptance Scenarios:
1. **Given** un lote en trilla, **When** cambio `proceso_cafe` de Honey a Lavado, **Then** persiste.
2. **Given** un lote en bodega, **When** cambio `proceso_cafe`, **Then** persiste sin tocar los booleans de despulpado.

### User Story 6 — Dashboard por fase/servicio (Priority: P1)
El dashboard muestra un apartado por cada fase/servicio (Acopio, Secado, Trilla, Bodega, Tueste,
Catación) con los lotes que están en ese estado (`enproceso`), con `nlote`, finca y productor, y un
enlace al lote.
**Independent Test**: mover un lote a "En Trilla" y verlo aparecer en el apartado de Trilla.

Acceptance Scenarios:
1. **Given** un lote con `enproceso='En Secado'`, **When** abro el dashboard, **Then** aparece en el apartado "Secado".
2. **Given** un lote en "En Catación", **When** abro el dashboard, **Then** aparece en el apartado "Catación".
3. **Given** una fase sin lotes, **When** abro el dashboard, **Then** el apartado se muestra vacío (no oculto).

## Requirements

- **FR-001**: `fincas` (id, cliente_id NOT NULL, nombre, zona_id NULL, altura NOT NULL, soft-delete) con RLS (SELECT authenticated; INSERT/UPDATE/DELETE rol ∈ {Recepción, Admin}).
- **FR-002**: `lotes_cafe.id_cliente` (→ clientes) y `id_finca` (→ fincas) con FK; `id_finca` NOT NULL tras backfill.
- **FR-003**: `lotes_cafe.proceso_cafe` enum nullable; editable en trilla/bodega.
- **FR-004**: `enproceso` CHECK suma `'En Catación'`; al completar catación → `'Vendido'`.
- **FR-005**: `ordenes_trabajo.id_finca` (→ fincas, nullable) para la finca de la orden.
- **FR-006**: `orden_lotes(id_orden CASCADE, id_lote CASCADE, peso_kg NULL)` PK compuesta + RLS; reemplaza `orden_lotes_externos`.
- **FR-007**: altura leída en vivo desde `fincas.altura` (no se duplica en lote/orden).
- **FR-008**: backfill idempotente (clientes por nombre desde `nproductor`; fincas desde `nfinca`/`zona`; `orden_lotes` desde `orden_lotes_externos` por `nlote`); sin-match → reporte, nunca descarte silencioso.
- **FR-009**: columnas legacy (`nproductor`, `nfinca`, `zona`, `lotes_cafe.altura`, `ordenes_trabajo.zona_finca`, `clientes.zona_procedencia`) se droppean tras validar backfill.
- **FR-010**: cada migración vía MCP con evidencia (patrón 0023–0037); `.sql` versionado.
- **FR-011**: la cadena lote→tueste se deduce solo vía orden (`perfiles_tueste.id_orden`), sin FK directa.
- **FR-012**: catación puede asociarse a lote, a perfil, o a ambos (compatibilidad con `002`).

- **FR-013**: UI con **comboboxes**: en crear/editar lote, Productor (clientes) y Finca (fincas del cliente, altura auto read-only); en catación, selector de lote mostrando `nlote` + finca + productor.
- **FR-014**: Dashboard con **un apartado por fase/servicio** (Acopio, Secado, Trilla, Bodega, Tueste, Catación) listando los lotes en ese `enproceso`, con navegación al lote.

## Success Criteria

- **SC-001**: demo trazable `cliente → finca → lote → orden → perfil → catación` por `id`, con finca+productor visibles en catación.
- **SC-002**: backfill sin pérdida: conteos antes/después + smoke (FK resueltas, sin-match reportado).
- **SC-003**: `typecheck` 0 · `lint` 0 err · `test` verde · `build` OK.
- **SC-004**: advisors de Supabase sin hallazgos críticos nuevos.
- **SC-005**: cero API abierta (todo endpoint nuevo con `requireRole`).

## Assumptions

- Datos reales CBF: **decisión diferida** (migración posterior, rotación C1 previa). El refactor aplica sobre el esquema y los datos de demo existentes.
- `orden_lotes_externos` se reemplaza por `orden_lotes` (id-based); el campo `origen` desaparece.
- El enlace lote↔orden es **opcional en ambos sentidos** (D5/P4): lote requiere finca; orden no requiere finca ni lotes.
- Se trabaja en `feat/flujo-lotes` desde `main`.
