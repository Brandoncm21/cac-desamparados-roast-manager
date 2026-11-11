# Feature Specification: Correcciones post-fusión (DB + rendimiento + reproducibilidad)

**Feature Branch**: `003-correcciones-post-fusion`
**Created**: 2026-11-11
**Status**: Draft — pendiente de aprobación
**Input**: `docs/CORRECCIONES_BASE_CAFETRACK.md` · `auditoria-bundles-cafetrack.md` · `HANDOFF.md` · `specs/002-fusion-cbf` (mergeada, commit `97c0023`)

> **Alcance acotado por decisión de dueño (2026-11-11):** B2/B3/B4 se **retiran** — son decisiones
> ya mergeadas de la fusión (`disp.14`, `FR-010`, `K1`/`K3`). Este spec solo cubre lo que la fusión
> **no** resolvió: integridad de `estado`, enums huérfanos, N+1 en reportes, lazy-load de diálogos,
> y fuente self-hosted.

## User Scenarios & Testing

### User Story 1 — Integridad del estado de tueste (Priority: P1)
Un perfil de tueste solo puede estar `Pendiente` o `Completado`. Hoy la DB acepta cualquier
`varchar(20)`; la única validación vive en Zod. Se añade un `CHECK` en la base.

**Why this priority**: es la última columna de estado con semántica cerrada que no está protegida en DB.
**Independent Test**: un `UPDATE` directo a un valor inválido es rechazado por la base (23514).

Acceptance Scenarios:
1. **Given** un perfil con `estado='Pendiente'`, **When** `UPDATE … SET estado='Completado'`, **Then** aceptado.
2. **Given** un perfil, **When** `UPDATE … SET estado='En Proceso'`, **Then** `23514 check_violation`.
3. **Given** datos existentes, **When** se aplica la migración, **Then** no falla (valores actuales ∈ {Pendiente, Completado}).

### User Story 2 — Eliminar enums huérfanos (Priority: P1)
Cuatro enums (`tipo_tueste_enum`, `tipo_molienda_enum`, `tipo_empaque_enum`, `tipo_servicio_enum`)
no referencian ninguna columna (verificado en catálogo; `especificaciones_orden` usa `varchar`,
`servicios_ejecutados.tipo_servicio` usa `text`). Se droppean.

**Why this priority**: elimina catálogo muerto que confunde al fusionar y a los advisors.
**Independent Test**: `DROP TYPE` no falla (sin dependencias) y `tsc` sigue en verde.

Acceptance Scenarios:
1. **Given** catálogo, **When** `SELECT typname FROM pg_type WHERE typname IN (…)`, **Then** 0 filas tras la migración.
2. **Given** la app, **When** corre `typecheck`, **Then** 0 errores (ningún código los referencia).

### User Story 3 — Reportes sin N+1 (Priority: P1)
`/reportes` hoy hace una consulta por perfil para traer sus temperaturas. Se reemplaza por una
sola consulta con `.in("id_perfil", ids)` y agrupación en memoria.

**Why this priority**: el costo crece lineal con el número de perfiles, independiente del bundle.
**Independent Test**: la curva comparativa muestra los mismos datos; `query_logs` registra 2 consultas (perfiles + temperaturas) en vez de N+1.

Acceptance Scenarios:
1. **Given** 3 perfiles con temperaturas, **When** se abre `/reportes`, **Then** se renderiza igual que antes.
2. **Given** 0 perfiles, **When** se abre `/reportes`, **Then** lista vacía sin error.
3. **Given** un perfil sin temperaturas, **When** se abre, **Then** se muestra sin curva (no rompe).

### User Story 4 — Diálogos bajo demanda en tueste (Priority: P2)
`/tueste/[perfilId]` importa `RendimientosDialog` y `RegistroConfirmadoDialog` estáticamente. Se
convierten a `next/dynamic` (mismo patrón que `LiveChart` en el archivo).

**Why this priority**: reduce el JS inicial de la ruta más pesada.
**Independent Test**: la ruta carga sin ambos diálogos en el chunk inicial; abrirlos los carga a demanda.

Acceptance Scenarios:
1. **Given** `/tueste/[perfilId]`, **When** carga, **Then** los diálogos no están en el bundle síncrono.
2. **Given** se abre "Rendimientos", **When** carga, **Then** funciona (incl. export PDF via `usePDF`).
3. **Given** se abre "Registro confirmado", **When** carga, **Then** funciona foco/teclado.

### User Story 5 — Montserrat self-hosted (Priority: P2, BLOQUEADO)
`next/font/google` rompe el build sin red. Se migra a `next/font/local`.

**Why this priority**: build reproducible en CI/offline; un request menos a un tercero.
**Independent Test**: `next build` compila sin acceso a Google Fonts.

Acceptance Scenarios:
1. **Given** los archivos de fuente locales, **When** `next build` sin red, **Then** compila.
2. **Given** la app, **When** renderiza, **Then** tipografía Montserrat idéntica.

> ⚠️ **Bloqueante**: `next/font/local` exige los archivos `woff2`/`ttf` en el repo. No hay red en
> este entorno para descargarlos. Se requiere que el dueño aporte los archivos o autorice su descarga.

## Requirements

- **FR-001**: `perfiles_tueste.estado` DEBE tener `CHECK (estado IN ('Pendiente','Completado'))`.
- **FR-002**: Los 4 enums huérfanos DEBEN droppearse solo tras verificar en catálogo que ninguna columna/function los referencia.
- **FR-003**: `/reportes` DEBE usar una consulta por tabla (máx. 2 round-trips), agrupando en memoria.
- **FR-004**: `RendimientosDialog` y `RegistroConfirmadoDialog` DEBEN cargarse con `next/dynamic` + placeholder estable.
- **FR-005**: Montserrat DEBE servirse desde `next/font/local` (bloqueado hasta disponer de los archivos).
- **FR-006**: Todo cambio de esquema se aplica vía MCP con evidencia inmediata (patrón 0023–0035) y su `.sql` se versiona en `supabase/migrations/`.
- **FR-007**: Sin cambios de contrato de API; Zod se mantiene como espejo de las constraints nuevas.
- **FR-008**: Ningún cambio en tablas/columnas portadas de CBF (paridad FR-010/011 de la fusión).

## Success Criteria

- **SC-001**: `UPDATE estado` inválido → rechazado en DB; `typecheck` y `test` en verde.
- **SC-002**: 4 enums ausentes del catálogo; advisors sin hallazgos nuevos por enums.
- **SC-003**: `/reportes` resuelve con ≤2 queries; verificado en `query_logs`.
- **SC-004**: chunk inicial de `/tueste/[perfilId]` sin los dos diálogos.
- **SC-005**: `check-secrets` + `lint` + `typecheck` + `test` en verde tras el merge.
- **SC-006**: Migraciones `0036`/`0037` presentes en repo y en historial remoto MCP.

## Assumptions

- La fusión `002` está mergeada en `main` (`97c0023`); este spec no la modifica.
- Datos reales: 36 órdenes; estados de perfiles ∈ {Pendiente, Completado}.
- Se trabaja en rama `fix/general` (CONTRIBUTING §1); push solo con confirmación del dueño.
- P2 (fuente) se desbloquea cuando el dueño aporte los archivos Montserrat.
