# Feature Specification: Fusion CoffeeBeanFlow into CafeTrack

**Feature Branch**: `002-fusion-cbf`
**Created**: 2026-11-06
**Status**: Approved (decisions locked: slice vertical Lotes · seguridad C2+K · MCP producción · datos diferidos)
**Input**: `ARQUITECTURA_Y_DATOS_INTEGRACION.md` (§4.0-§4.8, base auditada) · decisiones de dominio del Paso 5 · proyecto real CBF (Escritorio) como referencia de código

## User Scenarios & Testing

### User Story 1 — Lote de café end-to-end (Priority: P1)
Recepción registra un lote en acopio (`lotes_cafe`: `nlote`, productor/finca, rango maduración, despulpado 5 booleans + otro, pruebas físicas/densidad, estado y disponibilidad) y lo visualiza en el listado paginado con búsqueda, lo edita y lo da de baja (soft).

**Why this priority**: es la raíz de todo el pipeline; valida el patrón vertical completo (migración+RLS+Zod+API+UI+tests) que replican las demás etapas.
**Independent Test**: desde la UI es posible crear/editar/listar/desactivar un lote sin tocar las fases siguientes.

Acceptance Scenarios:
1. **Given** sesión de Recepción, **When** crea lote con `nlote` nuevo, **Then** 201 y aparece en `/lotes`.
2. **Given** `nlote` duplicado, **When** crea, **Then** `409 CONFLICT` con recurso en `details`.
3. **Given** Recepción, **When** busca "LOTE-2024" en `/lotes`, **Then** resultados paginados (trgm) con orden determinista.
4. **Given** Tostador, **When** abre `/lotes`, **Then** lectura permitida; **PUT/POST/DELETE** quedan 403.
5. **Given** Admin, **When** desactiva un lote, **Then** soft-delete (`deleted_at`) y deja de listarse.

### User Story 2 — Etapas del lote en el detalle (Priority: P2)
Desde `/lotes/[id]`, el rol correspondiente registra por pestaña: **Caracterización** (con 3 RC), **Secado** (4 series: humedad, ambiente, temperatura, camas), **Bodega** (pesos/humedades/densidades + vínculo N:M `secado_bodega`) y **Trilla** (+`peso_verde` 1:1). Las escrituras compuestas son RPCs atómicas **upsert** (nunca replace-all).

**Why this priority**: es el núcleo de captura de datos de CBF con paridad total (criterio §4.0-6).
**Independent Test**: cada pestaña funciona independientemente sobre un lote existente.

Acceptance Scenarios:
1. **Given** Recepción, **When** guarda caracterización con 2 RC incluidos, **Then** la RPC persiste cabecera+RC en una transacción; al reeditar con 1 RC solo, queda 1 (upsert, no huérfanos).
2. **Given** secado con series, **When** reenvía el PUT con series modificadas, **Then** la RPC aplica diff/upsert sin perder ids (discrepancia 16 cerrada).
3. **Given** bodega, **When** asocia un secado con `cantidad_sacos` 10, **Then** fila `secado_bodega`; duplicado → 409.
4. **Given** trilla con `wverde_final`, **When** guarda, **Then** `peso_verde_trilla` (1:1) se crea si viene en payload.

### User Story 3 — Catación y pipeline unificado (Priority: P3)
Tostador registra **catación** de un perfil de tueste `Completado` (`catacion_tueste.perfil_tueste_ref` uuid K3 + 48 atributos + rondas). Desde la trilla completada, botón **"Enviar a proceso"** (e1): RPC `crear_orden_desde_trilla` crea la orden CafeTrack con pasos, `peso_inicial_kg = wverde_final` y fila `orden_lotes_externos` (K1, idempotente K5). Demo trazable `nlote → orden F-XXXX → perfil → catación`.

**Why this priority**: cierra el pipeline bidireccional (§4.7) y el criterio §4.0-3.
**Independent Test**: demo end-to-end replicable con el seed de datos.

### Edge Cases
- Sesión vencida en API nueva → `401 UNAUTHORIZED` JSON (contrato Anexo C; el middleware 307 aplica solo a rutas de página).
- K1 idempotencia: reenvío del mismo `origen+nlote+id_orden` no duplica (UNIQUE).
- `perfil_tueste_ref` inválido → `400 INVALID_INPUT` con campo culpable.
- Fechas: todas las columnas nuevas `timestamptz` (T6); display en `America/Costa_Rica`.
- `dfueste` se valida/documenta en **g/ml** (Anexo C + proyecto real); conversión `g/L ÷ 1000` documentada si la planta lo aporta.

## Requirements

### Functional Requirements (reglas de porteo §4.4, no negociables)
- **FR-001**: Cada tabla nueva DEBE tener RLS por rol (matriz §4.4.1: Recepción/Admin escriben lote→trilla; Tostador/Admin catación; Tostador lectura de lotes).
- **FR-002**: TODO endpoint nuevo DEBE validar con Zod en `lib/schemas/` + `validateIdParam`; errores = contrato unificado del Anexo C (`{data}`/`{error.code}`+`x-correlation-id`, 422+issues, mapeo PG `23505→409`, `23503→400`, `23514→422`, `23P01→409`).
- **FR-003**: Escrituras compuestas DEBEN ser RPCs transaccionales **upsert** (`guardar_caracterizacion`, `guardar_secado`, `guardar_bodega`, `guardar_trilla`, `guardar_catacion`) — prohibido delete-all+insert-all en la app (discrepancia 16).
- **FR-004**: Auditoría añadida: `created_at/updated_at` (trigger `update_updated_at`) en todas las tablas nuevas + soft-delete (`deleted_at`) en registros de negocio.
- **FR-005**: NINGÚN endpoint nuevo sin `requireAuth`/`requireRole` (JWT Supabase; cero API abierta).
- **FR-006**: Listados con `apiPaginado` (`page≥1`, `pageSize≤100`, orden determinista + trgm en búsqueda de lotes).
- **FR-007**: Las 18 discrepancias del §4.1.4 DEBEN quedar cerradas (implementadas o con decisión documentada) — ver mapa por tabla en tasks.md.
- **FR-008**: Conectores: K1 `orden_lotes_externos` (PK compuesta + RLS) · K2 `public_id uuid UNIQUE` en `ordenes_trabajo`, `perfiles_tueste`, `clientes` (backfill) · K3 `perfil_tueste_ref` en `catacion_tueste` · idempotencia K5 (`origen+external_ref` UNIQUE).
- **FR-009**: Pre-requisito de seguridad: migración 0026 con **C2** (`DROP FUNCTION soft_delete_row`, nadie la usa) + **estandarización** `admin/empaques` → requireRole+RPC. **C1 (rotación de credenciales) es acción manual del propietario, obligatoria ANTES de migrar datos reales** (decisión diferida).
- **FR-010**: `lotes_cafe` DEBE conservar los 5 booleans de despulpado + `otro` (paridad §4.0-6); al crear una orden se deriva `proceso_cafe` (miel→Honey; semilavado/anaeróbico/multi ⇒ Otro, con log de conversión).
- **FR-011**: Fechas nuevas `timestamptz` (T6); estados del lote espejan CBF pero con CHECK (`'No','En Secado','En Trilla','En Bodega','Vendido'` + `vendido bool`).
- **FR-012**: Cada migración se aplica vía **MCP a producción** con evidencia inmediata (privilegios/counts/advisors) — patrón 0023-0025.
- **FR-013**: e1 idempotente: `crear_orden_desde_trilla` exige trilla completada + `wverde_final>0`, no duplica orden/lote (K1+K5), crea pasos según catálogo vigente.
- **FR-014**: e2: catación exige `perfil_tueste_ref` de un perfil con `estado='Completado'` o Admin permite (regla UI); K3 índice.

## Success Criteria (§4.0)
- **SC-001**: Cero API abierta (verificación de roles en todos los endpoints nuevos).
- **SC-002**: Cero replace-all en app (solo RPCs).
- **SC-003**: Demo trazable `nlote → orden (numero_factura) → perfil Completado → catación` usando solo tablas del esquema fusionado.
- **SC-004**: Sin discrepancias heredadas: 18/18 cerradas.
- **SC-005**: Prerrequisitos §4.8 completados: C2 eliminado (verificado) + C1 rotada antes de datos reales.
- **SC-006**: Paridad de captura: series (4), N:M (1), RC (3), 48 col catación y `pfinales` capturables tras la fusión.
- **SC-007**: `tsc --noEmit` + `npm run lint` + `npm run test` en verde tras cada fase.
- **SC-008**: Advisors de Supabase sin hallazgos críticos nuevos al cierre.

## Assumptions
- Datos reales CBF: **decisión diferida** (al cierre del P3 se decide migrar o arrancar vacío); antes de migrar: rotación C1.
- Proyecto real CBF (Escritorio) = referencia de código para nombres/semántica de los 48 atributos de catación y series, sin copiar su BD abierta.
- Los 47 handlers y 5 RPCs existentes de CafeTrack no cambian de contrato.
- UI en español, patrón shadcn/RHF+Zod existente; evolución del modelo en rama `002-fusion-cbf`.
