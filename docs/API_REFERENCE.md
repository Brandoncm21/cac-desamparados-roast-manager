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
| 38 | GET | `/api/productores` | `Recepción, Tostador, Admin` | Listar productores (paginado, `?search=`) |
| 39 | GET | `/api/recibido` | `Recepción, Tostador, Admin` | Listar lotes recibidos (`enproceso`, `productor_id`, `finca_id`, `desde/hasta`, `search`) |
| 40 | POST | `/api/recibido` | `Recepción, Admin` | Registrar lote recibido (`crearRecibidoSchema`) |
| 41 | GET | `/api/recibido/[id]` | `Recepción, Tostador, Admin` | Detalle del lote + `etapas` |
| 42 | PUT | `/api/recibido/[id]` | `Recepción, Admin` | Actualizar cabecera del lote |
| 43 | DELETE | `/api/recibido/[id]` | `Recepción, Admin` | Soft delete (`deleted_at`) |
| 44 | GET | `/api/recibido/[id]/caracterizacion` | `Recepción, Tostador, Admin` | Fila de caracterización |
| 45 | PUT | `/api/recibido/[id]/caracterizacion` | `Recepción, Admin` | Upsert → `guardar_caracterizacion` |
| 46 | GET | `/api/recibido/[id]/secado` | `Recepción, Tostador, Admin` | Fila de secado |
| 47 | PUT | `/api/recibido/[id]/secado` | `Recepción, Admin` | Upsert → `guardar_secado` |
| 48 | GET | `/api/recibido/[id]/bodegaje` | `Recepción, Tostador, Admin` | Fila de bodega |
| 49 | PUT | `/api/recibido/[id]/bodegaje` | `Recepción, Admin` | Upsert → `guardar_bodega` |
| 50 | GET | `/api/recibido/[id]/trilla` | `Recepción, Tostador, Admin` | Fila de trilla |
| 51 | PUT | `/api/recibido/[id]/trilla` | `Recepción, Admin` | Upsert → `guardar_trilla` (`peso_verde_final` > 0) |
| 52 | GET | `/api/recibido/[id]/catacion` | `Recepción, Tostador, Admin` | Fila de catación/tueste |
| 53 | PUT | `/api/recibido/[id]/catacion` | `Tostador, Admin` | Upsert → `guardar_catacion` |
| 54 | GET | `/api/recibido/[id]/calificacion` | `Recepción, Tostador, Admin` | Fila de calificación (verde + tostado) |
| 55 | PUT | `/api/recibido/[id]/calificacion` | `Tostador, Admin` | Upsert → `guardar_calificacion` |
| 56 | GET | `/api/fincas` | `Recepción, Tostador, Admin` | Listar fincas (`productor_id`, `search`, paginado) |
| 57 | POST | `/api/fincas` | `Recepción, Admin` | Crear finca (`crearFincaSchema`) |
| 58 | GET | `/api/fincas/[id]` | `Recepción, Tostador, Admin` | Detalle de finca |
| 59 | PUT | `/api/fincas/[id]` | `Recepción, Admin` | Actualizar finca |
| 60 | DELETE | `/api/fincas/[id]` | `Recepción, Admin` | Soft delete (`deleted_at`) |

> **Beneficiado / Acopio (spec 005/006):** las rutas 38–55 se detallan en §2.6 y usan el mismo contrato `{ data, pagination }` / `{ error: { code, message, issues } }`. Las rutas 56–60 (`fincas`) siguen el mismo contrato.

> **Admin-only:** rutas 33-37 usan `createAdminClientWithRoleCheck(["Admin"])` que bypassa RLS con `service_role` ([`lib/supabase/admin.ts:19`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/supabase/admin.ts#L19)).

## 2. Detalle por Grupo

### 2.0 Paginación de listados (Fase 2, rama `feat/audit-hardening`)

Todos los listados responden `{ data: [...], pagination: { page, pageSize, total, totalPages } }` vía `apiPaginado` ([`lib/pagination.ts`](../../lib/pagination.ts)).

```http
GET /api/ordenes?page=2&pageSize=10&estado=Pendiente&search=juan
```
```json
{
  "data": [{ "id_orden": 12, "numero_factura": "F-0012", "...": "..." }],
  "pagination": { "page": 2, "pageSize": 10, "total": 95, "totalPages": 10 }
}
```

- `page`: entero ≥ 1 (default 1). `pageSize`: entero 1–100 (default 25). Fuera de rango o no numérico → **422** con `{ error: { code, message, issues } }`.
- `search`: término sanitizado server-side (se eliminan `,%()` que romperían la sintaxis `.or()` de PostgREST).
- Filtros validados con Zod por endpoint (`estado` enum, `cliente` entero positivo, `desde`/`hasta` `YYYY-MM-DD`, `rol` enum). Inválidos → **422**.
- Orden determinista en todos los listados (`ORDER BY` + PK de desempate) para páginas estables.
- Listados paginados: `/api/ordenes`, `/api/clientes`, `/api/empleados`, `/api/admin/servicios`, `/api/admin/empaques`, `/api/admin/empaques/[id]/precios`.

### 2.1 Zonas y Empleados

**`GET /api/zonas`** — [`app/api/zonas/route.ts:5-15`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/app/api/zonas/route.ts#L5-L15)
- Auth: `requireRole(["Admin","Recepción","Tostador"])`
- Response 200: `{ data: [{ id_zona, nombre }] }`

**`POST /api/zonas`** — [`app/api/zonas/route.ts:17-33`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/app/api/zonas/route.ts#L17-L33)
- Auth: `requireRole(["Admin","Recepción"])`
- Body: `{ nombre: string }` (trim, requerido)
- Response 201: `{ data: { id_zona, nombre } }`

**`GET /api/empleados?rol=Admin`** — [`app/api/empleados/route.ts`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/app/api/empleados/route.ts)
- Auth: `requireRole(["Admin","Recepción"])`
- Query: `rol` opcional (enum `Operador|Tostador|Recepción|Admin`; inválido → 422), `page`/`pageSize` (ver §2.0)
- Proyección explícita: `id_empleado, nombre, rol, activo`; orden `nombre`; respuesta paginada

### 2.2 Clientes

**`GET /api/clientes?search=juan&page=1&pageSize=10`** — paginado (ver §2.0); `search` sanitizado y aplicado a `nombre_completo` y `telefono` (`ilike`); proyección explícita; orden `nombre_completo`.

**`POST /api/clientes`** — [`app/api/clientes/route.ts:29-45`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/app/api/clientes/route.ts#L29-L45)
- Auth: `requireRole(["Admin","Recepción"])`
- Body validado por [`lib/schemas/clientes.ts:3`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/schemas/clientes.ts#L3) (`crearClienteSchema`)
```json
{ "nombre_completo": "Finca X", "telefono": "8888-0000" }
```
- Response 201: cliente creado.

**`PUT /api/clientes/[id]`** — solo `Admin`; **`DELETE`** — `Admin, Recepción` (soft delete `deleted_at`).

### 2.3 Órdenes

**`POST /api/ordenes`** — [`app/api/ordenes/route.ts:32-86`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/app/api/ordenes/route.ts#L32-L86)
- Auth: `requireRole(["Admin","Recepción"])`
- Body: [`lib/schemas/ordenes.ts:5`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/schemas/ordenes.ts#L5) (`crearOrdenSchema`) — incluye `servicios: [{servicio_id, tipo_servicio}]` (min 1)
- Flujo: inserta en `ordenes_trabajo` → `crearPasosOrden` (obtiene prioridades de `servicios_maestro`, ordena estable) → inserta `especificaciones_orden` si hay datos.
- Rollback manual si falla `crearPasosOrden`.

**`GET /api/ordenes?estado=Pendiente&cliente=1&search=F-00`** — paginado (ver §2.0); join `clientes(nombre_completo)`; filtros `estado|cliente|desde|hasta` validados con Zod; `search` sanitizado sobre `numero_factura` y `clientes.nombre_completo`; proyección explícita; orden `fecha_orden DESC, id_orden DESC` (determinista).

**`PUT /api/ordenes/[id]`** — `Recepción, Tostador, Admin` con `actualizarOrdenSchema`.

**`POST /api/ordenes/[id]/pasos/[pasoId]/iniciar`** — [`app/api/ordenes/[id]/pasos/[pasoId]/iniciar/route.ts:11-104`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/app/api/ordenes/[id]/pasos/[pasoId]/iniciar/route.ts#L11-L104)
- Body: `iniciarPasoSchema` (`peso_inicial_kg >0`)
- Valida que sea el primer paso no completado (orden `prioridad ASC, id_paso ASC`)
- Resuelve tarifa con [`lib/services/resolver-tarifa.ts:9`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/services/resolver-tarifa.ts#L9) (`pesoKg >= min && pesoKg < max`)

### 2.4 Servicios/Empaques Maestros (Admin)

**`GET /api/admin/servicios?page=1&pageSize=10&search=tueste`** — paginado (ver §2.0); `search` opcional (`ilike` en `nombre`); proyección explícita + `servicio_precios(...)`; orden `prioridad`.

**`GET /api/admin/empaques?page=1&pageSize=10&search=bolsa`** — paginado (ver §2.0); `search` opcional; proyección explícita + `empaque_precios(precio, valid_from, valid_to)`; orden `nombre`.

**`GET /api/admin/empaques/[id]/precios`** — historial de precios paginado (ver §2.0); orden `valid_from DESC`.

**`POST /api/admin/servicios`** — [`app/api/admin/servicios/route.ts:20-62`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/app/api/admin/servicios/route.ts#L20-L62)
- Auth: `createAdminClientWithRoleCheck(["Admin"])`
- Body: `crearServicioSchema` (`nombre, prioridad, tipo, intervalos[]` con `peso_min < peso_max`, sin solapes)
- Inserta `servicios_maestro` + `servicio_precios` (trigger valida solapes).

**`GET /api/servicios-activos`** — [`app/api/servicios-activos/route.ts:5-66`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/app/api/servicios-activos/route.ts#L5-L66) — usado por el formulario de órdenes; retorna servicios con `servicio_precios(activo=true)` y empaques con precio vigente (`valid_to IS NULL`).

### 2.5 Perfiles de Tueste

**`POST /api/perfiles-tueste/[id]/temperaturas`** — bulk upsert con `onConflict: "id_perfil, minuto"` ([`app/api/perfiles-tueste/[id]/temperaturas/route.ts:35-50`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/app/api/perfiles-tueste/[id]/temperaturas/route.ts#L35-L50)), validado por `bulkTemperaturasSchema` (`temperatura 70-220`).

**`POST /api/sync`** — [`app/api/sync/route.ts`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/app/api/sync/route.ts) — cola offline (Fase 3, rama `feat/audit-hardening`).
- Auth: `requireRole(["Admin","Recepción","Tostador"])`.
- Request: `POST {items: [{tempId, table, data}]}` — `items` 1–500; `table` enum de 5 tablas; `data` validado con Zod **específico por tabla** (tipos, IDs, rangos: temperatura 70–220, minuto ≥ 0, etc.). JSON malformado o batch inválido → 422.
- Flujo server: validación por item → agrupación por tabla → **bulk upsert** con `onConflict` (claves naturales) + dedupe last-write-wins; si el bulk falla, waterfall por item para aislar el error. `servicios_ejecutados` (legacy, sin clave natural) se inserta por item.
- Response 200: `{data: {accepted: [{tempId, recordId}], rejected: [{tempId, code, message}]}}` con `code` en `VALIDATION_ERROR|CONFLICT|FOREIGN_KEY|CHECK_VIOLATION|NOT_NULL|DB_ERROR`.
- Idempotencia: reprocesar el mismo batch no duplica (upsert sobre UNIQUEs existentes).

### 2.6 Beneficiado / Acopio (spec 005)

Dominio nuevo tras las migraciones `0050`–`0053`: el lote nace en **Recibido de Café**, el productor es una entidad propia (`productores`) y las fincas cuelgan del productor. Se retiraron `/api/lotes/**` y `/api/cataciones/**` (F2/F5); `/lotes/**` redirige a `/beneficio/recibido`.

**Estados (`enproceso`):** `Recibido → En Caracterización → En Secado → En Bodega → En Trilla → Catado → Calificado → Vendido`. Las RPCs sólo avanzan hacia adelante (desmarcar catación devuelve el lote a `En Trilla`). `disponible` y `vendido` son flags; `CHECK NOT (vendido AND disponible)`.

**`GET /api/productores`** — paginado; `search` sobre `nombre_completo`; `deleted_at IS NULL`; orden por nombre.

**`GET /api/recibido`** — paginado; filtros Zod `enproceso`, `estado_lote`, `productor_id`, `finca_id`, `desde`/`hasta` (`YYYY-MM-DD`); `search` sobre `numero_lote`/`numero_recibo`; embebe `productores(nombre_completo)` y `fincas(nombre, altura, zonas_finca(nombre))`; orden `fecha_recibido DESC`.

**`POST /api/recibido`** — `crearRecibidoSchema` ([`lib/schemas/beneficio.ts`](../../lib/schemas/beneficio.ts)); exige `productor_id`, `finca_id`, `varietal`, `cajuelas` y `cuartillos`; la finca debe pertenecer al productor y tener zona/altura (si no → **422**). `numero_lote`, `numero_recibo` y `factura` se autogeneran (`L-`, `R-`, `FC-`); `zona_finca`/`altura_finca` se derivan en servidor. `numero_lote` UNIQUE → **409** (`23505`).

**`GET /api/recibido/[id]`** — lote + `etapas` (`caracterizacion`, `secado`, `bodegaje`, `trilla`, `catacion`, `calificacion`), consultadas en paralelo. **`PUT`** actualiza la cabecera (parcial; incluye `estado_lote` y pruebas opcionales; si cambia `finca_id` re-deriva zona/altura). **`DELETE`** hace soft delete.

**Etapas** (`GET` devuelve la fila 1:1; `PUT` llama a la RPC y responde `{data: {<etapa>: row, enproceso}}`):

| Ruta | Body (Zod) | RPC |
|---|---|---|
| `PUT /api/recibido/[id]/caracterizacion` | `caracterizacionSchema` | `guardar_caracterizacion(p_id_lote, p_datos)` |
| `PUT /api/recibido/[id]/secado` | `secadoSchema` (todos opcionales; tiempo calculado por la RPC) | `guardar_secado(p_id_lote, p_secado)` |
| `PUT /api/recibido/[id]/bodegaje` | `bodegajeSchema` | `guardar_bodega(p_id_lote, p_bodega)` |
| `PUT /api/recibido/[id]/trilla` | `trillaSchema` (todos opcionales; incluye `pruebas_fisicas_trilla` y `peso_en_verde_final_inferior`) | `guardar_trilla(p_id_lote, p_trilla)` |
| `PUT /api/recibido/[id]/catacion` | `guardarCatacionSchema` (`catado`, `notas_catacion`) | `guardar_catacion(p_catacion)` |
| `PUT /api/recibido/[id]/calificacion` | `guardarCalificacionSchema` (hoja SCA verde + tostado) | `guardar_hoja_calificacion(p_id_lote, p_datos)` |

- Escritura de etapas: `Admin`/`Recepción`; catación y calificación: `Tostador`/`Admin`. `GET`: `Admin`/`Recepción`/`Tostador`.
- **Caracterización (0057)**: `caracterizacionSchema` acepta `fecha_hora`, `proceso` (catálogo compartido), `proceso_otro`, conteos de cerezas, lecturas/promedios °Bx, `densidad_g_ml`, `g_vanos`/`g_secos`/`g_broca` y observaciones. Ya no acepta `escala_maduracion`, `rango_optimo_madurez`, `muestreo_tabla` ni `pct_*`.
- **Secado (0058)**: `secadoSchema` acepta fechas opcionales, `numero_cama`, `% solar/mecánico`, 5 pares `humedad_*`/`tem_*` y pesos. No acepta `tiempo_secado`/`dias_secado` (los calcula la RPC); ya no existe `humedad_6`/`tem_6`.
- **Bodegaje (0059)**: `bodegajeSchema` acepta `inicio_reposo`, `cantidad_sacos`, `peso_pergamino`, `peso_bellota`, `humedad_inicial` y `humedad_final`. Ya no acepta densidades ni condiciones ambientales; la RPC tampoco las escribe.
- **Trilla (0060)**: `trillaSchema` acepta `pruebas_fisicas_trilla` y `peso_en_verde_final_inferior`; `peso_verde_final` ya no es obligatorio. `peso_verde_final` y `peso_en_verde_final` son columnas distintas.
- **Calificación (0061)**: `GET/PUT /api/recibido/[id]/calificacion` leen/guardan la hoja SCA con `defectos` (16 tipos verdes), color, olor, quakers y grados. `GET /api/calificacion/catalogos` expone catálogo/opciones y `GET /api/calificacion` lista hojas.
- `guardar_catacion` es `SECURITY DEFINER` con chequeo de rol; desmarcar `catado` revierte a `En Trilla`. `guardar_hoja_calificacion` avanza el lote a `Calificado` cuando ambos grados están definidos.
- Mapeo de errores RPC: `P0002`→**404**, `42501`→**403**, `55000`→**409**, `22023`→**422**.

**`/api/fincas`** — fincas del productor: `GET` paginado con `productor_id` + `search` (`ilike nombre`), embebe `productores(nombre_completo)` y `zonas_finca(nombre)`; `POST` (`crearFincaSchema`: `productor_id`, `nombre`, `zona_id?`, `ubicacion?`, `altura?`; `23505`→**409**, `23503`→**400**) y `[id]` `GET` (incluye `lotes[]` del nuevo dominio, `ordenes_count` y `tiene_dependencias`), `PUT` y `DELETE` soft. `PUT` que cambie `productor_id` y `DELETE` con lotes/órdenes asociados → **409**. `fincas.cliente_id` fue eliminada en `0053`.

## 3. Códigos de Error Comunes

| Status | Código | Cuándo |
|--------|--------|--------|
| 401 | `UNAUTHORIZED` | Sin sesión (`requireAuth`/`requireRole` sin user) |
| 403 | `FORBIDDEN` | Rol no permitido o `roles=[]` mal configurado |
| 422 | `VALIDATION_ERROR` | Zod `safeParse` falla, CHECK (`23514`), trilla sin peso verde |
| 404 | `RESOURCE_NOT_FOUND` | `single()` sin fila |
| 409 | `CONFLICT` | `23505` unique violation (ej. servicio duplicado, `nlote` duplicado) |
| 400 | `BAD_REQUEST` | FK inválida (`23503`), p. ej. lote sin cliente asignado |

## 4. Ejemplo Completo (Crear Orden)

```bash
curl -X POST http://localhost:3016/api/ordenes \
  -H "Cookie: sb-xxx-auth-token=..." \
  -H "Content-Type: application/json" \
  -d '{
    "id_cliente": 1,
    "id_finca": 1,
    "lotes": [1],
    "id_empleado_recibe": 1,
    "servicios": [{"servicio_id": 1, "tipo_servicio": "general"}],
    "proceso_cafe": "Lavado"
  }'
# 201 { data: { id_orden: 4, estado_orden: "Pendiente", ... } }
```

Fuente: [`lib/schemas/ordenes.ts:5`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/schemas/ordenes.ts#L5) + [`app/api/ordenes/route.ts:37-61`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/app/api/ordenes/route.ts#L37-L61).
