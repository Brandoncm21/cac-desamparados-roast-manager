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

### Changed
- `servicios_ejecutados.tipo_servicio` pasó de enum a TEXT para soportar nombres arbitrarios de servicios del maestro.
- Constraint UNIQUE de `servicios_ejecutados` ahora es `(id_orden, tipo_servicio, empaque_id)` (permite mismo servicio con distintos empaques).
- Formulario de nueva orden usa el catálogo del maestro con auto-completado y cálculo en tiempo real.
- Detalle de orden muestra precio/kg, precio de empaque y total por línea.

### Security
- **CREDENCIALES EXPUESTAS**: `scripts/apply-migration.mjs` contiene `PROJECT_REF` y `DB_PASSWORD` hardcodeados. Se recomienda rotar la contraseña de la BD y mover las credenciales a variables de entorno antes de desplegar en producción.
