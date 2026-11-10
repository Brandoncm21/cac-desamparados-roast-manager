# Research: Documento técnico de integración CafeTrack ↔ CoffeeBeanFlow

**Feature**: `001-doc-arquitectura-integracion` | **Fecha**: 2026-11-04

## 1. Metodología de verificación aplicada

### 1.1 PostgreSQL limpio (fuente primaria del esquema)

- **Entorno**: contenedor Docker `postgres:17` (PostgreSQL 17.10, Debian) con nombre `scacr-verify`, puerto host `54329`.
- **Stubs mínimos** (replican solo lo que las migraciones asumen de Supabase):
  - Roles `anon`, `authenticated`, `service_role` (NOLOGIN; `service_role` con `BYPASSRLS`).
  - `SCHEMA auth` + tabla `auth.users(id uuid PRIMARY KEY, email text)` + funciones `auth.uid()` (retorna NULL) y `auth.role()` (retorna `'authenticated'`).
- **Migraciones aplicadas**: 24 archivos (`0001`–`0025`, **no existe `0008`**) en orden lexical/numérico con `ON_ERROR_STOP=1` — **todas OK, cero errores**.
- **Introspección**: consultas al catálogo del sistema (`pg_class`, `information_schema.columns`, `pg_constraint`, `pg_indexes`, `pg_policies`, `pg_proc`, `pg_trigger`, `pg_enum`, `pg_extension`, `has_function_privilege`), ejecutadas con `psql -A -F ' | '`. Resultado completo en `resultado.txt` (873 líneas, fuera del repo por restricción de la misión).

### 1.2 Contraste con producción (solo drift)

Consultas de solo lectura al proyecto Supabase real (`nwnldvzoxjjsmfeyouaw`) vía MCP:

| Métrica | PG limpio (17.10) | Producción (17.6) | Drift |
|---|---|---|---|
| Políticas RLS en `public` | 44 | 44 | ninguno |
| Índices en `public` | 57 | 57 | ninguno |
| `has_function_privilege('anon', soft_delete_row, EXECUTE)` | true | **true** | ninguno (riesgo activo en ambos) |
| `has_function_privilege('anon', crear_orden_completa, EXECUTE)` | false | false | ninguno |
| Grants de tablas a `anon/authenticated/service_role` | 0 | (no verificado fila a fila) | n/a — en PG limpio no existen los default privileges de Supabase; los GRANT reales provienen de defaults del proyecto host. No afecta la definición de políticas. |

**Conclusión de drift**: el esquema aplicado coincide con producción en lo relevante (políticas, índices, privilegios de funciones); la única diferencia es la versión menor de PostgreSQL (17.6 vs 17.10) y el estado de GRANTs de tabla (artifact del stub).

### 1.3 Código real verificado (no confiar en contexto inyectado)

- `app/api/**/route.ts`: **29 archivos, 47 handlers** — verificado con enumeración `Get-ChildItem -Recurse -Filter route.ts` + patrón `export\s+(const|async function)\s+(GET|POST|PUT|PATCH|DELETE)\b`. Los handlers usan la forma `export const GET = withErrorHandler(async ...)` (por eso un grep de `export async function` da 0).
- `lib/api-helpers.ts`, `middleware.ts`, `lib/pagination.ts`, `lib/observability.ts`: leídos completos.
- `lib/offline/db.ts`, `sync.ts`, `sync-utils.ts`, `schemas.ts`, `sync-server.ts`: constantes y contratos extraídos.
- `lib/services/visibilidad.ts`, `resolver-tarifa.ts`, `empacado.ts`: exports verificados.
- `lib/schemas/orden-pasos.ts` y afines: reglas Zod extraídas.
- Migraciones arqueológicas: `0005`, `0009`, `0015`, `0021`, `0022`, `0013`, `0024`, `0025` leídas para trazabilidad.

## 2. Conteos verificados (fuente: catálogo PG + código)

| Concepto | Esperado (misión) | Verificado | Delta |
|---|---|---|---|
| Migraciones | 24 (sin `0008`) | 24 ✓ | — |
| Tablas `public` | 16 | 16 ✓ (RLS habilitado en 16/16; FORCE RLS en 0) | — |
| Enums | 9 (3 huérfanos) | 9 enums; **4 sin columna asociada** | **+1 huérfano**: además de los 3 de `0002` (nunca aplicados a `especificaciones_orden`, que nació VARCHAR(100) en `0001`), `tipo_servicio_enum` quedó sin uso desde `0017` cuando `servicios_ejecutados.tipo_servicio` pasó a `text` |
| Handlers API | 47 en 29 archivos | 47 ✓ / 29 ✓ | — |
| RPCs transaccionales | 5 | 5 ✓ (0024) | — |
| Triggers | — | **9 vigentes** (5× `update_updated_at`, `trg_numero_factura_auto`, `trg_hitos_dtr`, `trg_metricas_diferencia`, `trg_perfiles_fechas`) | No existe `trg_orden_pasos_prioridad` (inexactitud de `docs/DB_SCHEMA.md` confirmada) |
| Tablas CBF | 19 (177 columnas) | 19 ✓ / 177 ✓ (checklist de la spec externa, verificado contra §2.1–2.19) | — |
| Endpoints CBF | "63" | **62 filas en el inventario §4.1** (incluye `GET /api/health`) | **−1** vs checklist ("8/8 controllers → 63 endpoints (+ health)" es ambiguo; el conteo fila a fila da 62) |
| Discrepancias CBF | 16 | 16 ✓ (§4.4, numeradas 1–16) | — |

## 3. Hallazgos de esquema (evidencia citable)

### 3.1 Funciones expuestas (privilegios verificados con `has_function_privilege`)

| Función | SECURITY DEFINER | anon EXECUTE | authenticated EXECUTE | service_role EXECUTE | Origen |
|---|---|---|---|---|---|
| `soft_delete_row(text,text,integer)` | **sí** | **true** | true | true | `0011` |
| `get_empleado_rol()` | sí (STABLE, `search_path=public`) | true | true | true | `0001` |
| `crear_orden_completa(jsonb,jsonb,jsonb)` | no (INVOKER) | **false** | true | false | `0024` |
| `crear_servicio_con_precios(jsonb,jsonb)` | no | false | true | false | `0024` |
| `actualizar_servicio_con_precios(int,jsonb,jsonb)` | no | false | true | false | `0024` |
| `cerrar_paso_orden(int,numeric,int,text)` | no | false | true | false | `0024` |
| `confirmar_tueste_paso(int,numeric,text)` | no | false | true | false | `0024` |
| `calc_dtr_perfil(integer)` | no | true | true | true | `0001` (refactor por `trg_hitos_dtr`) |
| `calc_fechas_trazabilidad()` | no | true | true | true | `0001` (trigger `trg_perfiles_fechas`) |
| `calc_porcentaje_diferencia()` | no | true | true | true | `0001` (trigger `trg_metricas_diferencia`) |
| `trg_hitos_recalc_dtr()` | no | true | true | true | trigger handler |
| `generar_numero_factura()` | no (definida, usada por trigger) | true | true | true | `0009` |

- **C2 (crítico confirmado)**: `soft_delete_row` es `SECURITY DEFINER` **sin `SET search_path`**, sin chequeo de rol interno, y con `EXECUTE` a `anon` (default de `PUBLIC`): cualquier llamador anónimo puede soft-deletear cualquier fila de cualquier tabla pasando nombres de tabla/columna. `format('%I')` mitiga inyección SQL de identificadores, no el abuso de autorización. → Propuesta: migración de eliminación (los endpoints ya hacen soft-delete directo con role-check).
- Las 5 RPCs de `0024` están correctamente endurecidas (`SECURITY INVOKER`, `SET search_path = public`, `REVOKE ... FROM PUBLIC/anon` + `GRANT EXECUTE TO authenticated`).
- `get_empleado_rol()` es `SECURITY DEFINER` con `search_path` fijado (patrón correcto); expuesto a `anon` porque lo usan políticas evaluadas para cualquier rol.

### 3.2 Políticas RLS (44) — casos especiales verificados

| Caso | Evidencia (catálogo) | Consecuencia |
|---|---|---|
| `especificaciones_update` **sin `WITH CHECK` explícito** | policy UPDATE con `with_check` vacío | Un usuario puede reasignar la fila a otra orden vía UPDATE (el `USING` filtra filas visibles; sin WITH CHECK la nueva versión no se re-valida) |
| `empleados_admin_full` (`FOR ALL`, USING y WITH CHECK = rol Admin) | policy con ambos predicados `get_empleado_rol()='Admin'` | Correcto: no es `true` |
| `empleados_lectura_propia` con **roles `{public}`** | policy SELECT TO public, USING `id_auth = auth.uid()` | Aplica a todos los roles; para `anon` `auth.uid()` es NULL y no matchea filas (id_auth NULL no matchea: `NULL = NULL` es NULL) |
| `zonas_insert` `WITH CHECK(true)` | policy INSERT con `true` | Cualquier autenticado puede crear zonas (decisión consciente, catálogo sin FK) |
| Catálogo admin con `FOR ALL` | `empaques`, `empaque_precios`, `servicios_maestro`, `servicio_precios`: ALL USING rol Admin WITH CHECK true | Incluye DELETE **físico** a nivel DB (el código hace soft-delete/estado) |
| `ordenes_update` condicional | Admin siempre; Recepción/Tostador solo si estado ∈ {Pendiente, En Proceso} | El DELETE de la API (service_role) salta esta condición |
| `servicios_delete` con EXISTS | DELETE solo si orden en `Pendiente` | Único DELETE por policy con subconsulta |

### 3.3 Convenciones de estado (3 conviviendo)

1. **Enum Title Case**: `ordenes_trabajo.estado_orden` → `estado_orden_enum` ('Pendiente', 'En Proceso', 'Completado', 'Cancelado') — default `'Pendiente'`.
2. **VARCHAR UPPER_SNAKE con CHECK**: `orden_pasos.estado` → 'PENDIENTE'/'EN_PROCESO'/'COMPLETADO'/'OMITIDO' — default 'PENDIENTE'; `OMITIDO` no tiene endpoint (solo alcanzable por… ninguno en el código actual).
3. **VARCHAR Title Case sin CHECK**: `perfiles_tueste.estado` VARCHAR(20) DEFAULT 'Pendiente' (`0013`; `0022` añadió `peso_facturable_kg` y quitó UNIQUE de prioridad).
4. CBF usa `enproceso` VARCHAR con catálogo de UI ('No'/'En Secado'/'En Trilla'/'En Bodega'/'Vendido') + flag `vendido`.

### 3.4 Historial/estado de filas

- `deleted_at`: solo `clientes`, `ordenes_trabajo`, `perfiles_tueste` (3 tablas; `empleados` usa `activo`, **no** `deleted_at` — segunda inexactitud de `docs/DB_SCHEMA.md` confirmada).
- `activo`: `empleados.activo`, `empaques.activo`, `servicios_maestro.activo`, `servicio_precios.activo`.
- Versionado de precios: solo `empaque_precios` (`valid_from`/`valid_to`); `servicio_precios` perdió el versionado en `0021` (dropped `valid_from/valid_to/creado_por`) y usa `activo` + EXCLUDE.
- Snapshots en `orden_pasos` (tarifa_id, snapshot_precio_kg, snapshot_precio_empaque, etc.) y en `servicios_ejecutados` (snapshot_precio_por_kg/empaque, linea_total, override_*).

### 3.5 Índices (57) — señalamientos

- Duplicados funcionales: `idx_ordenes_numero_factura` (btree `numero_factura`) vs UNIQUE `ordenes_numero_factura_unique` (el UNIQUE ya cubre consultas de igualdad); `idx_trazabilidad_perfil_minuto` vs UNIQUE `trazabilidad_temperatura_id_perfil_minuto_key`.
- Parciales activos: `idx_clientes_*_activos`, `idx_empleados_nombre_activos`, `idx_ordenes_*` (WHERE deleted_at IS NULL), `idx_orden_pasos_pendientes` (WHERE estado NOT IN COMPLETADO/OMITIDO), `idx_empaque_precios_vigente` (WHERE valid_to IS NULL), `idx_perfiles_orden_activos`.
- trigram: `idx_clientes_nombre_trgm` (GIN `gin_trgm_ops`, parcial) — requiere `pg_trgm` (`0023`).
- GiST EXCLUDE: `servicio_precios_no_traslape` = `gist (id_servicio WITH =, numrange(min_weight_kg, max_weight_kg, '[)') WITH &&) WHERE activo` (`0025`, requiere `btree_gist` 1.7).
- El EXCLUDE crea su propio índice (no se puede DROP separado).

### 3.6 Arqueología de columnas (ordinales con gaps)

- `ordenes_trabajo` (posiciones 2 y 4 faltantes): `0009` dropeó `num_talonario_fisico` y `num_factura`, consolidó en `numero_factura VARCHAR(20)` + trigger `trg_numero_factura_auto`/`generar_numero_factura()` (secuencia iniciada en 454 en `0005`, luego eliminada por `0009`).
- `servicios_maestro` (posiciones 2, 5): `0021` dropeó `codigo` y `default_peso_kg`; añadió `tipo VARCHAR(30)` con CHECK ('general'/'tueste'/'empacado') y `prioridad`.
- `servicio_precios` (posiciones 4, 5, 6): `0021` dropeó `valid_from`, `valid_to`, `creado_por` (fin del versionado) y añadió `activo`.
- `especificaciones_orden`: columnas `tipo_tueste/molienda/empaque` VARCHAR(100) desde `0001` (los enums de `0002` nunca se vincularon).
- `trazabilidad_temperatura.minuto`: SMALLINT → NUMERIC(5,2) en `0015` (granularidad sub-minuto); CHECK 0 ≤ minuto; CHECK 70–220 °C en `temperatura_registrada`.
- `perfiles_tueste.numero_lote`: VARCHAR(20), nullable, **sin FK y sin UNIQUE** (solo índice no-único `idx_perfiles_lote` de `0023`) → base del descarte FR-010.
- `ordenes_trabajo.fecha_orden` DATE DEFAULT CURRENT_DATE y `perfiles_tueste.fecha_tueste` DATE DEFAULT CURRENT_DATE → **UTC** en la DB (T6 zona horaria).

### 3.7 FKs y cascadas reales (catálogo)

| FK | ON UPDATE | ON DELETE |
|---|---|---|
| ordenes_trabajo.id_cliente → clientes | NO ACTION | **RESTRICT** |
| ordenes_trabajo.id_empleado_recibe/entrega → empleados | NO ACTION | NO ACTION |
| empleados.id_auth → auth.users | NO ACTION | SET NULL |
| especificaciones_orden.id_orden → ordenes_trabajo | NO ACTION | CASCADE (1:1 via UNIQUE) |
| servicios_ejecutados.id_orden → ordenes_trabajo | NO ACTION | CASCADE |
| servicios_ejecutados.servicio_id → servicios_maestro | NO ACTION | NO ACTION |
| servicios_ejecutados.empaque_id → empaques | NO ACTION | NO ACTION |
| servicios_ejecutados.id_operador → empleados | NO ACTION | NO ACTION |
| orden_pasos.id_orden → ordenes_trabajo | NO ACTION | CASCADE |
| orden_pasos.servicio_id → servicios_maestro | NO ACTION | NO ACTION |
| orden_pasos.tarifa_id → servicio_precios | NO ACTION | NO ACTION |
| orden_pasos.empaque_id → empaques | NO ACTION | NO ACTION |
| orden_pasos.id_operador_inicio/cierre → empleados | NO ACTION | NO ACTION |
| orden_pasos.id_perfil_tueste → perfiles_tueste | NO ACTION | NO ACTION |
| perfiles_tueste.id_orden → ordenes_trabajo | NO ACTION | SET NULL |
| perfiles_tueste.id_tostador → empleados | NO ACTION | NO ACTION |
| trazabilidad_temperatura/metricas_tueste/hitos_termicos/ajustes_tueste.id_perfil → perfiles_tueste | NO ACTION | CASCADE |
| servicio_precios.id_servicio → servicios_maestro | NO ACTION | CASCADE |
| empaque_precios.id_empaque → empaques | NO ACTION | CASCADE |
| empaque_precios.creado_por → auth.users | NO ACTION | NO ACTION |

### 3.8 RPCs de `0024` (definiciones clave verificadas)

- Todas `SECURITY INVOKER`, `SET search_path = public`, RAISE EXCEPTION en español, grants solo `authenticated`.
- `crear_orden_completa`: valida rol (Admin/Recepción), cliente existente, servicios activos, inserta orden + `orden_pasos` por servicio (prioridad secuencial) + `especificaciones_orden`.
- `cerrar_paso_orden`: general (peso_final opcional) o empacado (empaque_id): **heurística T5** `CASE WHEN e.capacidad_kg >= 100 THEN e.capacidad_kg / 1000 ELSE e.capacidad_kg END` para normalizar g→kg; `v_cantidad := ceil(v_peso_base / v_capacidad)`; estado COMPLETADO; **auto-cierre** de la orden (estado 'Completado') si no quedan pasos no terminados.
- `confirmar_tueste_paso`: idem auto-cierre; calcula merma.
- `actualizar_servicio_con_precios`: reemplaza intervalos activos; limpiar `descripcion` requiere clave explícita (comportamiento verificado en Fase 4 previa).

## 4. Catálogo de la API CafeTrack (47 handlers / 29 archivos)

Forma estándar: `export const METHOD = withErrorHandler(async ...)`; envoltura `withErrorHandler` añade correlationId + log estructurado; éxito `{ data }`, error `{ error: { code, message, issues?, correlationId? } }`; validación 422.

| # | Archivo (ruta) | Métodos | Capa de autorización | Schemas Zod |
|---|---|---|---|---|
| 1 | `app/api/admin/empaques/route.ts` | GET, POST | `createAdminClientWithRoleCheck` (service_role) | `empaquesSchema` (servicios-maestro.ts) |
| 2 | `app/api/admin/empaques/[id]/route.ts` | GET, PUT, DELETE | service_role | ídem |
| 3 | `app/api/admin/empaques/[id]/precios/route.ts` | GET, POST | service_role | `empaquePreciosSchema` |
| 4 | `app/api/admin/servicios/route.ts` | GET, POST | `requireRole([Admin])` + RPC 0024 | `servicioConPreciosSchema` |
| 5 | `app/api/admin/servicios/[id]/route.ts` | GET, PUT, DELETE | requireRole + RPC (PUT) | ídem |
| 6 | `app/api/clientes/route.ts` | GET, POST | requireRole(Admin,Recepción) + RLS | `clientesSchema`, `clientesQuery` (paginado) |
| 7 | `app/api/clientes/[id]/route.ts` | GET, PUT, DELETE | requireRole | ídem |
| 8 | `app/api/empleados/route.ts` | GET | requireRole(Admin) | query params |
| 9 | `app/api/ordenes/route.ts` | GET, POST | GET: 3 roles; POST: Admin,Recepción → RPC `crear_orden_completa` | `crearOrdenSchema`, filtros |
| 10 | `app/api/ordenes/[id]/route.ts` | GET, PUT, DELETE | GET/PUT requireRole; **DELETE con service_role** (role-check Admin,Recepción,Tostador) | `actualizarOrdenSchema` |
| 11 | `app/api/ordenes/[id]/servicios/route.ts` | POST | requireRole(Recepción,Admin) + RLS | `serviciosEjecutadosSchema` |
| 12 | `app/api/ordenes/[id]/especificaciones/route.ts` | PUT | requireRole(Recepción,Admin) | `especificacionesSchema` |
| 13 | `app/api/ordenes/[id]/estado/route.ts` | PATCH | requireRole(3 roles) | `cambiarEstadoOrdenSchema` — **sin transiciones** |
| 14 | `app/api/ordenes/[id]/pasos/route.ts` | GET | requireRole(3 roles) | query |
| 15 | `app/api/ordenes/[id]/pasos/[pasoId]/iniciar/route.ts` | POST | requireRole(3 roles) | `iniciarPasoSchema` (peso>0) + `resolverTarifaPorPeso` `[min,max)` |
| 16 | `app/api/ordenes/[id]/pasos/[pasoId]/cerrar/route.ts` | POST | requireRole(3 roles) | `cerrarGeneralSchema`/`cerrarEmpacadoSchema` → RPC `cerrar_paso_orden` |
| 17 | `app/api/ordenes/[id]/pasos/[pasoId]/confirmar-tueste/route.ts` | POST | requireRole(3 roles) | `confirmarTuesteSchema` → RPC `confirmar_tueste_paso` |
| 18 | `app/api/perfiles-tueste/route.ts` | POST | requireRole(Tostador,Admin) | `crearPerfilSchema` |
| 19 | `app/api/perfiles-tueste/[id]/route.ts` | GET, PUT, DELETE | requireRole(Tostador,Admin) | `actualizarPerfilSchema` (estado enum Pendiente/Completado), DELETE→soft |
| 20 | `app/api/perfiles-tueste/[id]/temperaturas/route.ts` | GET, POST | requireRole(Tostador,Admin) | `temperaturaSchema` (70–220, minuto ≥0) |
| 21 | `app/api/perfiles-tueste/[id]/hitos/route.ts` | POST | requireRole(Tostador,Admin) | `bulkHitosSchema` (upsert en lote) |
| 22 | `app/api/perfiles-tueste/[id]/hitos/[tipoHito]/route.ts` | PUT | requireRole(Tostador,Admin) | `hitoSchema` (enum tipo_hito) |
| 23 | `app/api/perfiles-tueste/[id]/metricas/[tipoMetrica]/route.ts` | PUT | requireRole(Tostador,Admin) | `metricaSchema` (enum tipo_metrica) |
| 24 | `app/api/perfiles-tueste/[id]/ajustes/route.ts` | POST | requireRole(Tostador,Admin) | `ajusteSchema` |
| 25 | `app/api/perfiles-tueste/[id]/resumen/route.ts` | GET | requireRole(3 roles) | — (calc_dtr_perfil + lecturas) |
| 26 | `app/api/servicios-activos/route.ts` | GET | requireAuth (RLS select público autenticado) | — |
| 27 | `app/api/servicios/[idServicio]/route.ts` | PUT, DELETE | requireRole(Admin) | desactivar (soft) servicio |
| 28 | `app/api/sync/route.ts` | POST | requireAuth | `syncBatchSchema`; límite 500 items; respuesta `{accepted:[{tempId,recordId}],rejected:[{tempId,code,message}]}`; log `sync.batch` |
| 29 | `app/api/zonas/route.ts` | GET, POST | requireAuth + RLS (INSERT abierto) | `zonaSchema` |

## 5. Módulo offline (verificado)

- IndexedDB `scacr-offline` **v2**, stores: `temperaturas`, `hitos`, `pending_sync`, `dead_letter`; `tempId = crypto.randomUUID()`.
- `sync-utils.ts`: `BATCH_SIZE = 200`, `MAX_RETRIES = 3`, `BACKOFF_BASE_MS = 5000`, `BACKOFF_MAX_MS = 5*60*1000`; `backoffMs = min(5000 · 2^min(retries,6), 5min)`; `chunk`, `agruparPorTabla`, `dedupePorClave` (last-write-wins), `claveNatural`.
- `sync.ts`: single-flight; en fallo tras `MAX_RETRIES` → `moveToDeadLetter` (nunca se descarta automáticamente); `reintentarDeadLetter()` manual.
- `/api/sync` (server): bulk upsert con `onConflict`, waterfall por item si el bulk falla, log `sync.batch` con conteo por tabla.

## 6. Contraparte CBF (fuente: `ESPECIFICACION_RECONSTRUCCION.md`, 835 líneas)

- Stack: ASP.NET Core 9 + EF Core 9/Npgsql + Angular 21 + PostgreSQL local; API abierta sin auth; CORS a 3 orígenes; Swagger en Dev; `GET /api/health`.
- 19 tablas (§2.1–2.19): `area_acopio` (raíz, PK `nlote` varchar(50)), `secado` + débiles `humedad/termo_higrometria/temperatura_secado/ncama`, `bodega`, `guardar_cafe` (N:M con `cantidad_sacos`), `trilla`, `peso_verde` (1:1 identificadora), `formulario_caracterizacion` (PK `tiempo` timestamptz) + `rc_maduras/rc_inmaduras/rc_sobremaduras` (1:1 UNIQUE), `catacion` (48 col) + `rondas`, N:M `enviar_muestras` (attr `ffinal_reposo` numeric) y `suministra`.
- Convenciones: camelCase JSON, nulos omitidos (`WhenWritingNull`), sin `created_at/updated_at`, sin soft-delete, borrados físicos con RESTRICT/CASCADE, PKs compuestas en N:M, IDENTITY BY DEFAULT, sin CHECKs ni defaults en DB (los aplica la app), credenciales en `appsettings.json`, `baseUrl` hardcodeada.
- Endpoints: **62 filas** en §4.1 (Health + AreaAcopio 5 + Secado 6 + Bodega 8 + Trilla 6 + Caracterización 12 + Catación 11 + EnviarMuestras 7 + Suministra 6). El checklist interno dice "63 (+ health)": el conteo fila a fila es 62 — se documenta el número real.
- Discrepancias: 16 (§4.4) — se transcriben y se les asigna destino en la fusión (§4.1 del documento principal).
- Flujo: acopio → caracterización → secado (4 series) → bodega (N:M guardar_cafe) → trilla (peso_verde 1:1) → catación (rondas; `nlote` sin FK); N:M gestionadas solo por API.

## 7. Regla de evidencia aplicada

- Todo dato del documento principal cita migración, policy, función, ruta o `archivo:línea`.
- Datos no verificables: marcados **(hipótesis)** o **(confirmar con responsable)**. Ejemplos: terminología "Nº de Beche" (no aparece en la spec CBF §3 como campo de BD — se marca), HEAD/etiquetas del repo remoto CBF (no verificable).
- Deltas vs el contexto inyectado: 4 huérfanos (vs 3), 62 endpoints CBF (vs "63"), 9 triggers (sin `trg_orden_pasos_prioridad`), `deleted_at` solo en 3 tablas (docs atribuyen a `empleados` erróneamente).
