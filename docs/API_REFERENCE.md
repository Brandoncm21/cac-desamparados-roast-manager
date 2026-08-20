# API_REFERENCE — Referencia de Endpoints

> **Permalink base:** [`80b1dd5`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/tree/80b1dd5) · Base URL local: `http://localhost:3016`

Todas las rutas bajo `app/api/**` usan `withErrorHandler` y requieren autenticación Supabase. Errores tipados: `401 UNAUTHORIZED` (sin sesión), `403 FORBIDDEN` (rol insuficiente), `422 VALIDATION_ERROR` (Zod), `500 INTERNAL_ERROR`.

Helpers: [`lib/api-helpers.ts:57-87`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/api-helpers.ts#L57-L87) (`requireAuth`, `requireRole`), [`lib/supabase/admin.ts:19-23`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/supabase/admin.ts#L19-L23) (`createAdminClientWithRoleCheck`).

## 1. Resumen de Rutas

| # | Método | Ruta | Auth | Descripción |
|---|--------|------|------|-------------|
| 1 | GET | `/api/zonas` | `Recepción, Tostador, Admin` | Listar zonas de finca |
| 2 | POST | `/api/zonas` | `Recepción, Admin` | Crear zona |
| 3 | GET | `/api/empleados` | `Recepción, Admin` | Listar empleados (filtro `?rol=`) |
| 4 | GET | `/api/clientes` | `Recepción, Tostador, Admin` | Listar clientes (`?search=`) |
| 5 | POST | `/api/clientes` | `Recepción, Admin` | Crear cliente |
| 6 | GET | `/api/clientes/[id]` | `Recepción, Tostador, Admin` | Obtener cliente + historial de órdenes |
| 7 | PUT | `/api/clientes/[id]` | `Admin` | Actualizar cliente |
| 8 | DELETE | `/api/clientes/[id]` | `Recepción, Admin` | Soft delete |
| 9 | GET | `/api/ordenes` | `Recepción, Tostador, Admin` | Listar órdenes (filtros `estado, cliente, desde, hasta`) |
| 10 | POST | `/api/ordenes` | `Recepción, Admin` | Crear orden + pasos (`crearPasosOrden`) |
| 11 | GET | `/api/ordenes/[id]` | `Recepción, Tostador, Admin` | Obtener orden con perfiles |
| 12 | PUT | `/api/ordenes/[id]` | `Recepción, Tostador, Admin` | Actualizar orden |
| 13 | DELETE | `/api/ordenes/[id]` | `Recepción, Tostador, Admin` | Soft delete (admin client) |
| 14 | POST | `/api/ordenes/[id]/servicios` | `Recepción, Admin` | Agregar servicio ejecutado |
| 15 | PUT | `/api/ordenes/[id]/estado` | `Recepción, Tostador, Admin` | Cambiar `estado_orden` |
| 16 | PUT | `/api/ordenes/[id]/especificaciones` | `Recepción, Tostador, Admin` | Upsert especificaciones |
| 17 | GET | `/api/ordenes/[id]/pasos` | `Recepción, Tostador, Admin` | Listar pasos de la orden |
| 18 | POST | `/api/ordenes/[id]/pasos/[pasoId]/iniciar` | `Recepción, Tostador, Admin` | Iniciar paso (captura `peso_inicial_kg`, resuelve tarifa) |
| 19 | POST | `/api/ordenes/[id]/pasos/[pasoId]/cerrar` | `Recepción, Tostador, Admin` | Cerrar paso general/empacado |
| 20 | POST | `/api/ordenes/[id]/pasos/[pasoId]/confirmar-tueste` | `Recepción, Tostador, Admin` | Confirmar tueste (merma) |
| 21 | GET | `/api/servicios-activos` | `Recepción, Tostador, Admin` | Servicios activos con intervalos + empaques con precio vigente |
| 22 | PUT | `/api/servicios/[idServicio]` | `Recepción, Admin` | Editar servicio ejecutado |
| 23 | DELETE | `/api/servicios/[idServicio]` | `Recepción, Admin` | Eliminar servicio (solo Pendiente) |
| 24 | POST | `/api/perfiles-tueste` | `Tostador, Admin` | Crear perfil |
| 25 | GET | `/api/perfiles-tueste/[id]` | `Recepción, Tostador, Admin` | Obtener perfil con temperaturas/hitos/métricas/ajustes |
| 26 | PUT/DELETE | `/api/perfiles-tueste/[id]` | `Tostador, Admin` | Actualizar / soft delete |
| 27 | GET/POST | `/api/perfiles-tueste/[id]/temperaturas` | `Tostador, Admin` | Listar / bulk upsert temperaturas |
| 28 | PUT | `/api/perfiles-tueste/[id]/hitos/[tipoHito]` | `Tostador, Admin` | Upsert hito |
| 29 | PUT | `/api/perfiles-tueste/[id]/metricas/[tipoMetrica]` | `Tostador, Admin` | Upsert métrica |
| 30 | POST | `/api/perfiles-tueste/[id]/ajustes` | `Tostador, Admin` | Crear ajuste |
| 31 | GET | `/api/perfiles-tueste/[id]/resumen` | `Tostador, Admin` | Resumen + métricas |
| 32 | POST | `/api/sync` | `Recepción, Tostador, Admin` | Sincronizar cola offline |
| 33 | GET/POST | `/api/admin/servicios` | **Admin** | Listar/crear servicio maestro con intervalos |
| 34 | GET/PUT/DELETE | `/api/admin/servicios/[id]` | **Admin** | Obtener/actualizar/desactivar servicio + intervalos |
| 35 | GET/POST | `/api/admin/empaques` | **Admin** | Listar/crear empaque |
| 36 | GET/PUT/DELETE | `/api/admin/empaques/[id]` | **Admin** | Obtener/actualizar/desactivar empaque |
| 37 | GET/POST | `/api/admin/empaques/[id]/precios` | **Admin** | Historial / nuevo precio versionado |

> **Admin-only:** rutas 33-37 usan `createAdminClientWithRoleCheck(["Admin"])` que bypassa RLS con `service_role` ([`lib/supabase/admin.ts:19`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/supabase/admin.ts#L19)).

## 2. Detalle por Grupo

### 2.1 Zonas y Empleados

**`GET /api/zonas`** — [`app/api/zonas/route.ts:5-15`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/app/api/zonas/route.ts#L5-L15)
- Auth: `requireRole(["Admin","Recepción","Tostador"])`
- Response 200: `{ data: [{ id_zona, nombre }] }`

**`POST /api/zonas`** — [`app/api/zonas/route.ts:17-33`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/app/api/zonas/route.ts#L17-L33)
- Auth: `requireRole(["Admin","Recepción"])`
- Body: `{ nombre: string }` (trim, requerido)
- Response 201: `{ data: { id_zona, nombre } }`

**`GET /api/empleados?rol=Admin`** — [`app/api/empleados/route.ts:5-21`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/app/api/empleados/route.ts#L5-L21)
- Auth: `requireRole(["Admin","Recepción"])`
- Query: `rol` opcional

### 2.2 Clientes

**`POST /api/clientes`** — [`app/api/clientes/route.ts:29-45`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/app/api/clientes/route.ts#L29-L45)
- Auth: `requireRole(["Admin","Recepción"])`
- Body validado por [`lib/schemas/clientes.ts:3`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/schemas/clientes.ts#L3) (`crearClienteSchema`)
```json
{ "nombre_completo": "Finca X", "telefono": "8888-0000", "zona_procedencia": "Tarrazú" }
```
- Response 201: cliente creado.

**`PUT /api/clientes/[id]`** — solo `Admin`; **`DELETE`** — `Admin, Recepción` (soft delete `deleted_at`).

### 2.3 Órdenes

**`POST /api/ordenes`** — [`app/api/ordenes/route.ts:32-86`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/app/api/ordenes/route.ts#L32-L86)
- Auth: `requireRole(["Admin","Recepción"])`
- Body: [`lib/schemas/ordenes.ts:5`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/schemas/ordenes.ts#L5) (`crearOrdenSchema`) — incluye `servicios: [{servicio_id, tipo_servicio}]` (min 1)
- Flujo: inserta en `ordenes_trabajo` → `crearPasosOrden` (obtiene prioridades de `servicios_maestro`, ordena estable) → inserta `especificaciones_orden` si hay datos.
- Rollback manual si falla `crearPasosOrden`.

**`GET /api/ordenes?estado=Pendiente&cliente=1`** — lista con join `clientes(nombre_completo)`.

**`PUT /api/ordenes/[id]`** — `Recepción, Tostador, Admin` con `actualizarOrdenSchema`.

**`POST /api/ordenes/[id]/pasos/[pasoId]/iniciar`** — [`app/api/ordenes/[id]/pasos/[pasoId]/iniciar/route.ts:11-104`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/app/api/ordenes/[id]/pasos/[pasoId]/iniciar/route.ts#L11-L104)
- Body: `iniciarPasoSchema` (`peso_inicial_kg >0`)
- Valida que sea el primer paso no completado (orden `prioridad ASC, id_paso ASC`)
- Resuelve tarifa con [`lib/services/resolver-tarifa.ts:9`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/services/resolver-tarifa.ts#L9) (`pesoKg >= min && pesoKg < max`)

### 2.4 Servicios/Empaques Maestros (Admin)

**`POST /api/admin/servicios`** — [`app/api/admin/servicios/route.ts:20-62`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/app/api/admin/servicios/route.ts#L20-L62)
- Auth: `createAdminClientWithRoleCheck(["Admin"])`
- Body: `crearServicioSchema` (`nombre, prioridad, tipo, intervalos[]` con `peso_min < peso_max`, sin solapes)
- Inserta `servicios_maestro` + `servicio_precios` (trigger valida solapes).

**`GET /api/servicios-activos`** — [`app/api/servicios-activos/route.ts:5-66`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/app/api/servicios-activos/route.ts#L5-L66) — usado por el formulario de órdenes; retorna servicios con `servicio_precios(activo=true)` y empaques con precio vigente (`valid_to IS NULL`).

### 2.5 Perfiles de Tueste

**`POST /api/perfiles-tueste/[id]/temperaturas`** — bulk upsert con `onConflict: "id_perfil, minuto"` ([`app/api/perfiles-tueste/[id]/temperaturas/route.ts:35-50`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/app/api/perfiles-tueste/[id]/temperaturas/route.ts#L35-L50)), validado por `bulkTemperaturasSchema` (`temperatura 70-220`).

**`POST /api/sync`** — [`app/api/sync/route.ts:6-84`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/app/api/sync/route.ts#L6-L84) — cola offline: `POST {items: [{tempId, table, data}]}` con `table` enum (`trazabilidad_temperatura`, `hitos_termicos`, `ajustes_tueste`, `metricas_tueste`, `servicios_ejecutados`). Respuesta `{idMap}`.

## 3. Códigos de Error Comunes

| Status | Código | Cuándo |
|--------|--------|--------|
| 401 | `UNAUTHORIZED` | Sin sesión (`requireAuth`/`requireRole` sin user) |
| 403 | `FORBIDDEN` | Rol no permitido o `roles=[]` mal configurado |
| 422 | `VALIDATION_ERROR` | Zod `safeParse` falla |
| 404 | `RESOURCE_NOT_FOUND` | `single()` sin fila |
| 409 | `CONFLICT` | `23505` unique violation (ej. servicio duplicado) |

## 4. Ejemplo Completo (Crear Orden)

```bash
curl -X POST http://localhost:3016/api/ordenes \
  -H "Cookie: sb-xxx-auth-token=..." \
  -H "Content-Type: application/json" \
  -d '{
    "id_cliente": 1,
    "id_empleado_recibe": 1,
    "servicios": [{"servicio_id": 1, "tipo_servicio": "general"}],
    "zona_finca": "Tarrazú",
    "proceso_cafe": "Lavado"
  }'
# 201 { data: { id_orden: 4, estado_orden: "Pendiente", ... } }
```

Fuente: [`lib/schemas/ordenes.ts:5`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/schemas/ordenes.ts#L5) + [`app/api/ordenes/route.ts:37-61`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/app/api/ordenes/route.ts#L37-L61).
