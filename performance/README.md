# Escenarios disponibles (Fase 5, rama feat/audit-hardening)

| Script | Escenario | Rol requerido |
|---|---|---|
| `ordenes_listado.js` | Listado paginado de órdenes con ramping de VUs | Admin/Recepción/Tostador (cookie de sesión) |
| `clientes_busqueda.js` | Búsqueda paginada de clientes (constant arrival) | ídem |
| `ordenes_creacion.js` | Creación concurrente de órdenes (RPC 0024) | Admin/Recepción |
| `sync_bulk_temperaturas.js` | Bulk sync de temperaturas vía /api/sync (100 items por request) | Admin/Tostador |
| `perfiles_lectura.js` | Lectura de perfiles de tueste (constant arrival) | Admin/Recepción/Tostador |
| `tarifas_concurrentes.js` | Actualizaciones concurrentes de tarifas (verifica EXCLUDE 0025) | Admin |
