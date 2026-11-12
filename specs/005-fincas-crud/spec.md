# Feature Specification: Módulo de Fincas + correcciones del alta de lotes

**Feature Branch**: `feat/flujo-lotes` (continúa 004)
**Created**: 2026-11-11
**Status**: Implementado y verificado

## Contexto

El refactor 004 dejó `fincas` como entidad propia (1 cliente → N fincas, `altura` usada por lotes y
órdenes). Faltaba un lugar para administrarlas y el alta de lotes tenía cuatro problemas de uso:
las etiquetas de los `Select` mostraban el `id`, solo el primer cliente tenía fincas (los demás
quedaban sin opciones y parecía un bloqueo), el selector de finca no era el mismo que el de
órdenes, y la altura no viajaba en el payload del lote.

## Historias de usuario

### US1 — Etiquetas legibles en los desplegables (P1)
Como recepción, al elegir productor o finca veo el **nombre**, no el id.

**Aceptación**
1. **Given** el alta de lote, **When** elijo un productor, **Then** el trigger muestra su nombre.
2. **Given** elijo una finca, **When** el trigger se cierra, **Then** muestra `Nombre — 1200 msnm · Zona`.

### US2 — Todos los productores pueden tener lotes (P1)
Como recepción, puedo crear un lote para cualquier productor con fincas.

**Aceptación**
1. **Given** un productor sin fincas, **When** abro el alta de lote, **Then** veo un aviso y el botón **+ Crear finca**.
2. **Given** creo la finca ahí mismo, **When** vuelve el listado, **Then** queda seleccionada y el lote se puede guardar.

### US3 — Misma fuente de fincas que Órdenes (P2)
El selector de finca de Lotes y el de Órdenes usan el mismo componente y endpoint.

**Aceptación**
1. **Given** una finca nueva, **When** abro Lotes u Órdenes, **Then** aparece en ambos sin recargar código.

### US4 — Altura automática y en el payload (P2)
**Aceptación**
1. **Given** una finca con `altura`, **When** la selecciono, **Then** el campo Altura se completa solo (read-only).
2. **Given** guardo el lote, **When** reviso el request, **Then** incluye `altura`; el API la valida contra `fincas.altura` (400 si no coincide).
3. **Given** una finca sin altura (0046), **When** la selecciono, **Then** el campo queda vacío con el aviso "La finca no tiene altura registrada".

### US5 — CRUD de Fincas (P1)
Como administración, creo, edito, listo y elimino fincas.

**Aceptación**
1. **Given** `/fincas`, **When** busco por nombre o filtro por productor, **Then** veo finca, productor, zona, ubicación y altura.
2. **Given** una finca con lotes u órdenes, **When** intento eliminarla o cambiarle el productor, **Then** el API responde **409** y la UI lo explica.

## Requirements

- **FR-001**: `<Select>` de Base UI DEBE recibir `items` para mostrar la etiqueta del ítem seleccionado (sin `items` muestra el `value` crudo).
- **FR-002**: alta/edición de lote y alta de orden DEBEN usar `components/fincas/finca-select.tsx` (fuente única `lib/fincas.ts`).
- **FR-003**: `fincas.altura` es opcional (`0046`); `fincas.ubicacion` es texto libre ≤ 200.
- **FR-004**: `POST/PUT /api/lotes` acepta `altura` derivada y la valida contra la finca (nunca la persiste: spec 004 D8).
- **FR-005**: `DELETE /api/fincas/[id]` y el cambio de `cliente_id` en `PUT` DEBEN fallar con **409** si hay lotes u órdenes.
- **FR-006**: `GET /api/fincas/[id]` devuelve `lotes[]`, `ordenes_count` y `tiene_dependencias`.
- **FR-007**: todo endpoint con `requireRole`; UI de escritura solo `Admin`/`Recepción`.

## Success Criteria

- **SC-001**: `typecheck` 0 · `lint` 0 errores · `test` 200/200 · `build` OK.
- **SC-002**: crear lote para un productor sin fincas es posible en < 3 clics (crear finca inline).
- **SC-003**: ningún `Select` del alta de lote/orden/catación muestra un `id` o `uuid`.
