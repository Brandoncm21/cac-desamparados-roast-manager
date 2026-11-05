# Changelog

Todas las notas de versión de SCACR.

## [Unreleased]

### Added
- Módulo maestro de Servicios (`servicios_maestro` + `servicio_precios`) con CRUD administrable por Admin.
- Módulo maestro de Empaques (`empaques` + `empaque_precios`) con CRUD administrable por Admin.
- Endpoints admin protegidos (`/api/admin/servicios/**`, `/api/admin/empaques/**`) con `createAdminClientWithRoleCheck`.
- Endpoint público `GET /api/servicios-activos` para el formulario de órdenes.
- Snapshots de precios en `servicios_ejecutados` (`snapshot_precio_por_kg`, `snapshot_precio_empaque`, `linea_total`).
- Cálculo automático de `linea_total = peso_kg * precio_por_kg + precio_empaque`.
- Override de precios con motivo (auditoría) en el formulario de órdenes.
- Precios históricos versionados (`valid_from`/`valid_to`) que no alteran órdenes existentes.
- Sidebar con sección de Administración visible solo para rol Admin.
- Tests unitarios de cálculo de precios y schemas del módulo maestro.
- Migraciones `0017` (estructura) y `0018` (backfill de datos existentes).
- Flujo de creación de órdenes reordenado: card de Humedad propia tras Servicios, molienda condicionada, Empaque condicionado y Encabezado al final (`feat/refactor-flujo-orden-tueste`).
- Registro de temperaturas con pasos ajustados al perfil (0.5/1/2) e intervalo personalizado persistente; diálogo de confirmación con auto-cierre.
- Modal de **Rendimientos** al finalizar tueste (peso obligatorio, humedad pre-llenada, resumen y acceso directo a la orden).
- Paginación server-side en listados (`{ data, pagination }`, `pageSize` ≤ 100) con proyecciones explícitas y sanitización de búsqueda.
- Módulo offline v2: sync bulk idempotente vía `/api/sync`, backoff exponencial, single-flight y dead-letter queue en IndexedDB con badge de reintento.
- Observabilidad: `lib/observability.ts` (logs estructurados con redacción de secretos), `x-correlation-id` en errores y timing en `withErrorHandler`.
- Escenarios k6 de carga (`performance/`, 6 módulos) y plan de crecimiento de datos.
- RPCs transaccionales (0024): `crear_orden_completa`, `crear_servicio_con_precios`, `actualizar_servicio_con_precios`, `cerrar_paso_orden`, `confirmar_tueste_paso` (INVOKER, EXECUTE solo `authenticated`).
- Migración `0023` con 10 índices de performance (+ extensión `pg_trgm`).
- Migración `0025`: constraint `EXCLUDE` con `numrange('[)')` que impide traslapes de tarifas a nivel de base de datos (reemplaza al trigger).
- Endpoint `POST /api/perfiles-tueste/[id]/hitos` para registro en lote (sync offline).
- Escáner de secretos v2 (`npm run check-secrets`) con 6 categorías de patrones y suite propia.
- Documentación nueva: `OBSERVABILITY`, `PERFORMANCE_TESTING`, `PERFORMANCE_INDEXES`, `DATA_GROWTH_PLAN`, `LEGACY_MIGRATION_PLAN`.

### Changed
- `servicios_ejecutados.tipo_servicio` pasó de enum a TEXT para soportar nombres arbitrarios de servicios del maestro.
- Constraint UNIQUE de `servicios_ejecutados` ahora es `(id_orden, tipo_servicio, empaque_id)` (permite mismo servicio con distintos empaques).
- Formulario de nueva orden usa el catálogo del maestro con auto-completado y cálculo en tiempo real.
- Detalle de orden muestra precio/kg, precio de empaque y total por línea.
- Escrituras multi-tabla de la API migradas de rollbacks manuales a RPCs transaccionales; eliminado el orquestador client-side (`lib/services/orquestador.ts`).
- Sincronización offline consolidada en la capa API; lecturas de listados migradas de Supabase directo al API.
- Cobertura global: 66.07% → 79.86% stmts (160 tests, 17 suites).

### Fixed
- Columna inexistente `empleados.auth_user_id` corregida a `id_auth` en rutas `iniciar` y RPCs.
- `scripts/apply-migration.mjs` ya no usa credenciales hardcodeadas (sólo `process.env`).
- Los intervalos de precio contiguos (p. ej. `[500, 1000)` y `[1000, 1500)`) ya no son rechazados por validación traslape.

### Security
- **CREDENCIALES EXPUESTAS (histórico)**: commits anteriores exponen `PROJECT_REF`, `DB_PASSWORD` y un token `sbp_*` en el historial de git. El código fuente actual ya no las contiene (PR #37). Pendiente manual: rotar `DB_PASSWORD`, revocar el token `sbp_*` y, con autorización del equipo, reescribir historial (`git filter-repo`). Detalle en `docs/SECURITY.md` y `docs/RUNBOOK.md`.
