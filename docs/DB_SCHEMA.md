# DB_SCHEMA — Esquema de Base de Datos

> **Permalink base:** [`80b1dd5`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/tree/80b1dd5) · 32 migraciones (0026–0032: fusión CoffeeBeanFlow) en [`supabase/migrations/`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/tree/80b1dd5/supabase/migrations)

> **Actualización 2026-11-07 (fusión CoffeeBeanFlow):** la rama `002-fusion-cbf` (merge `97c0023`) añade las migraciones **0026–0032** y **15 tablas nuevas** (ver §3ter). Estado verificado en producción: **32 migraciones, 31 tablas, 89 políticas RLS**.

## 1. Tablas Principales

| Tabla | Propósito | Clave | Campos Relevantes | Evidencia |
|-------|-----------|-------|-------------------|-----------|
| `empleados` | Usuarios del sistema | `id_empleado` | `nombre`, `rol` (`Admin\|Tostador\|Recepción\|Operador`), `id_auth` (FK a `auth.users`), `activo`, `deleted_at` | [`0001_schema_inicial.sql:250`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/supabase/migrations/0001_schema_inicial.sql#L250) |
| `clientes` | Fincas / cooperativas | `id_cliente` | `nombre_completo`, `telefono`, `zona_procedencia`, `deleted_at` | [`0001:267`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/supabase/migrations/0001_schema_inicial.sql#L267) |
| `zonas_finca` | Catálogo de zonas | `id_zona` | `nombre` (unique) | [`0003_zonas_finca.sql:8`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/supabase/migrations/0003_zonas_finca.sql#L8) |
| `ordenes_trabajo` | Orden central | `id_orden` | `id_cliente`, `numero_factura` (talonario auto), `estado_orden` (`Pendiente\|En Proceso\|Completado`), `porcentaje_humedad_entrada`, `proceso_cafe` (enum), `deleted_at` | [`0005_talonario_auto.sql`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/supabase/migrations/0005_talonario_auto.sql), [`0011_add_soft_delete.sql`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/supabase/migrations/0011_add_soft_delete.sql) |
| `servicios_maestro` | Catálogo de servicios | `id_servicio_maestro` | `nombre`, `descripcion`, `tipo` (`general\|tueste\|empacado`), `prioridad` (int), `activo` | [`0017_servicios_maestro_empaques.sql:116`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/supabase/migrations/0017_servicios_maestro_empaques.sql#L116) |
| `servicio_precios` | Tarifas por intervalo | `id_precio` | `id_servicio`, `min_weight_kg` (`NUMERIC(10,2)`), `max_weight_kg` (nullable → sin límite), `precio_por_kg`, `activo` | [`0019_flujo_secuencial_tarifas_intervalo.sql`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/supabase/migrations/0019_flujo_secuencial_tarifas_intervalo.sql) |
| `empaques` | Catálogo de empaques | `id_empaque` | `nombre`, `capacidad_kg`, `unit_weight_kg`, `activo` | [`0017:136`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/supabase/migrations/0017_servicios_maestro_empaques.sql#L136) |
| `empaque_precios` | Precios versionados | `id_precio` | `id_empaque`, `precio`, `valid_from`, `valid_to` (null=vigente), `creado_por` | [`0017:146`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/supabase/migrations/0017_servicios_maestro_empaques.sql#L146) |
| `orden_pasos` | Ejecución secuencial | `id_paso` | `id_orden`, `servicio_id`, `prioridad`, `estado` (`PENDIENTE\|EN_PROCESO\|COMPLETADO\|OMITIDO`), `peso_inicial_kg`, `peso_final_kg`, `tarifa_id`, snapshots de precio | [`0019:119`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/supabase/migrations/0019_flujo_secuencial_tarifas_intervalo.sql#L119) |
| `servicios_ejecutados` | Líneas legacy de orden | `id_servicio` | `id_orden`, `tipo_servicio` (TEXT), `peso_inicial`, `precio`, snapshots | [`0017:158`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/supabase/migrations/0017_servicios_maestro_empaques.sql#L158) |
| `perfiles_tueste` | Perfil de tueste | `id_perfil` | `id_orden`, `numero_lote`, `fecha_tueste`, `id_tostador`, `deleted_at` | [`0001:324`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/supabase/migrations/0001_schema_inicial.sql#L324) |
| `trazabilidad_temperatura` | Curva minuto a minuto | `id_registro` | `id_perfil`, `minuto`, `temperatura_registrada` (70-220 via Zod) | [`0015_granularidad_tiempo.sql`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/supabase/migrations/0015_granularidad_tiempo.sql) |
| `hitos_termicos` | Hitos (Turning Point, Crack) | `id_hito` | `id_perfil`, `tipo_hito`, `tiempo_min`, `temperatura` | [`0001:348`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/supabase/migrations/0001_schema_inicial.sql#L348) |
| `metricas_tueste` | Métricas peso/humedad/densidad | `id_metrica` | `id_perfil`, `tipo_metrica`, `valor_antes/después` | [`0001:360`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/supabase/migrations/0001_schema_inicial.sql#L360) |
| `ajustes_tueste` | Ajustes de máquina | `id_ajuste` | `id_perfil`, `orden_secuencia`, `llama/aire/temperatura` | [`0001:372`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/supabase/migrations/0001_schema_inicial.sql#L372) |

## 2. Tipos y Constraints Relevantes

- **Pesos y precios:** `NUMERIC(10,2)` en `servicio_precios(min_weight_kg, max_weight_kg, precio_por_kg)`, `empaque_precios(precio)`, `trazabilidad_temperatura(temperatura_registrada)`. Evita errores de `FLOAT` para cálculos monetarios. Evidencia: [`0017:114-135`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/supabase/migrations/0017_servicios_maestro_empaques.sql#L114-L135).
- **Soft delete:** `deleted_at TIMESTAMPTZ` en `clientes`, `ordenes_trabajo`, `perfiles_tueste`, `empleados`; políticas RLS filtran `deleted_at IS NULL` ([`0012_update_rls_soft_delete.sql:21`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/supabase/migrations/0012_update_rls_soft_delete.sql#L21)).
- **Talonario:** `numero_factura` auto-incremental con función `next_numero_factura()` ([`0005_talonario_auto.sql`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/supabase/migrations/0005_talonario_auto.sql)).
- **Unique constraints:** `servicios_ejecutados(id_orden, tipo_servicio, empaque_id)` permite mismo servicio con distintos empaques ([`0010_add_unique_constraints.sql`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/supabase/migrations/0010_add_unique_constraints.sql)).
- **Intervalos (Fase 4):** la constraint declarativa `servicio_precios_no_traslape` (`EXCLUDE USING gist` con `numrange(min,max,'[)')`, solo `activo=true`, [`0025_tarifas_exclusion.sql`](../../supabase/migrations/0025_tarifas_exclusion.sql)) reemplazó al trigger check-then-insert, que tenía race condition bajo concurrencia. Semántica preservada: min inclusivo, max exclusivo, `NULL` = sin límite. CHECK `servicio_precios_rango_valido` (`min >= 0` y `max > min` o NULL). La validación Zod previa se mantiene ([`lib/schemas/servicios-maestro.ts:12-64`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/schemas/servicios-maestro.ts#L12-L64)).
- **Índices de performance (Fase 2):** 10 índices nuevos en [`0023_indices_performance.sql`](../../supabase/migrations/0023_indices_performance.sql) — listado activo de órdenes por fecha, filtros estado/cliente, trigram `pg_trgm` para búsquedas `ilike` de clientes, catálogos activos por nombre, primer paso pendiente parcial y FKs de `orden_pasos`. Motivo y validación `EXPLAIN`: [`docs/PERFORMANCE_INDEXES.md`](./PERFORMANCE_INDEXES.md).

## 3. Triggers

| Trigger | Tabla | Función |
|---------|-------|---------|
| ~~`trg_no_solape_intervalos`~~ | `servicio_precios` | **Eliminado en 0025** — reemplazado por la constraint EXCLUDE declarativa |
| `trg_orden_pasos_prioridad` | `orden_pasos` | Valida secuencia por `prioridad` |

## 3bis. RPCs transaccionales (Fase 4, [`0024_rpc_transaccionales.sql`](../../supabase/migrations/0024_rpc_transaccionales.sql))

| RPC | Firma | Atomicidad | Permisos |
|---|---|---|---|
| `crear_orden_completa` | `(p_orden jsonb, p_servicios jsonb, p_especificaciones jsonb) → jsonb` | orden + orden_pasos + especificaciones_orden | INVOKER; rol `Admin/Recepción` interno; `GRANT EXECUTE TO authenticated` (revocado de PUBLIC/anon) |
| `crear_servicio_con_precios` | `(p_servicio jsonb, p_intervalos jsonb) → jsonb` | servicios_maestro + servicio_precios | INVOKER; rol `Admin` interno |
| `actualizar_servicio_con_precios` | `(p_id_servicio int, p_datos jsonb, p_intervalos jsonb) → jsonb` | maestro + desactivación/reemplazo atómico de intervalos | ídem |
| `cerrar_paso_orden` | `(p_id_paso int, p_peso_final_kg numeric, p_empaque_id int, p_observaciones text) → jsonb` | paso + cierre de orden si no quedan pendientes; `SELECT ... FOR UPDATE` | INVOKER; `Admin/Recepción/Tostador` |
| `confirmar_tueste_paso` | `(p_id_paso int, p_peso_final_kg numeric, p_observaciones text) → jsonb` | ídem (rama tueste) | ídem |

Notas: corrige el bug de código que consultaba `empleados.auth_user_id` (columna real: `id_auth`); RLS se mantiene (SECURITY INVOKER); sin tabla de recibos de sync — idempotencia por claves naturales + UNIQUEs; la dead-letter queue vive en IndexedDB del cliente (sin tabla server).

## 3ter. Fusión CoffeeBeanFlow (0026–0032, rama `002-fusion-cbf`)

Portado desde CoffeeBeanFlow (CBF, ASP.NET Core + EF Core, 19 entidades). Las tablas nuevas conviven con las 16 originales; el enlace con CafeTrack se hace por los conectores K1–K4 ([`ARQUITECTURA_Y_DATOS_INTEGRACION.md`](../ARQUITECTURA_Y_DATOS_INTEGRACION.md) §4.3).

| Tabla | Propósito | Clave | Campos relevantes | Migración |
|---|---|---|---|---|
| `orden_lotes_externos` | **K1** puente orden↔lote CBF | `(id_orden, nlote, origen)` | `peso_kg`, `origen` (`fusion`), `created_at` | 0026 |
| `lotes_cafe` | Lote de café (acopio) | `id_lote` | `nlote` UNIQUE, `public_id`, `nproductor`, `nfinca`, `zona`, `altura`, `disponible`, `vendido`, `enproceso`, proceso por booleanos (`lavado/natural/miel/semilavado/anaerobico/otro`), `fecha_acopio`, `deleted_at` | 0027 |
| `caracterizacion_lote` | Caracterización 1:N con el lote (upsert por `(id_lote, tiempo)`) | `id_caracterizacion` | humedad, `densidad`, `m_tabla`, `e_maduracion`, `broca`, `pc_*`, `c_*`, `dr_maduras`, `l_asignado`, `deleted_at` | 0028 |
| `caracterizacion_rc` | Series RC comparativas (1 por tipo) | `id_caracterizacion_rc` (UNIQUE `(caracterizacion_id, tipo_rc)`) | `vanos`, `secos`, conteos | 0028 |
| `secado_lote` | Registro de secado | `id_secado` | `dsecado`, `finicio`, `ffinal`, `deleted_at` | 0029 |
| `secado_humedad` / `secado_ambiente` / `secado_temperatura` / `secado_camas` | 4 series débiles de secado (CASCADE) | `id_serie`, `id_secado` | upsert vía `upsert_serie_secado(p_id_secado, p_items, p_tabla)` y `upsert_serie_camas` | 0029 |
| `bodega_lote` | Entrada a bodega | `id_bodega` | `cantidad_sacos`, `w_bellota`, `w_pergamino`, `hinicial/hfinal`, `d_bellota/d_pergamino`, `pmh_relativa`, `pmt_interna/externa`, `finicio_reposo`, `deleted_at` | 0030 |
| `secado_bodega` | N:M secado↔bodega | `(id_secado, id_bodega)` | `cantidad_sacos` (validación de pertenencia en RPC) | 0030 |
| `trilla_lote` | Trilla (rendimientos y clasificación) | `id_trilla` | `hinicial/hfinal`, `rfinal_*`, `rteorico_*`, `wverde_teorico/final`, 9 porcentajes (`psegundas`…`pinferiores`), `ffinal_reposo`, `deleted_at` | 0031 |
| `peso_verde_trilla` | 1:1 con trilla (peso verde) | `id_trilla` | `winferiores`, `wfinal`, `wfinal_inferiores`, `deleted_at` (toggle off ⇒ soft-delete) | 0031 |
| `catacion_tueste` | Catación (48 atributos del snapshot real de CBF) | `id_catacion_tueste` | `pfinales`, `rtostado` (rendimiento), `dfueste` (g/ml), `nlote`, `id_lote`, **K3** `perfil_tueste_ref → perfiles_tueste(public_id)`, defectos `c1*`/`c2*`, `tonagton_*`, `deleted_at` | 0032 |
| `catacion_rondas` | Rondas de catación (solo calidad) | `id_catacion_ronda` | `catacion_id`, `valor_calidad` (0–100), `deleted_at` | 0032 |

**RPCs de la fusión** (todas `SECURITY INVOKER`, `EXECUTE` solo `authenticated`, rol verificado con `get_empleado_rol()`):

| RPC | Firma verificada | Atomicidad |
|---|---|---|
| `guardar_caracterizacion` | `(p_id_lote int, p_datos jsonb, p_rcs jsonb DEFAULT NULL) → jsonb` | caracterización + RC |
| `guardar_secado` | `(p_id_lote int, p_secado jsonb, p_humedades jsonb, p_ambientes jsonb, p_temperaturas jsonb, p_camas jsonb) → jsonb` | secado + 4 series |
| `upsert_serie_secado` | `(p_id_secado int, p_items jsonb, p_tabla text) → void` | helper interno (preserva ids nuevos) |
| `upsert_serie_camas` | `(p_id_secado int, p_items jsonb) → void` | helper interno |
| `guardar_bodega` | `(p_id_lote int, p_bodega jsonb, p_secados_guardados jsonb DEFAULT NULL) → jsonb` | bodega + N:M |
| `guardar_trilla` | `(p_id_lote int, p_trilla jsonb) → jsonb` | trilla + peso verde 1:1 |
| `guardar_catacion` | `(p_catacion jsonb, p_rondas jsonb DEFAULT NULL) → jsonb` | catación + rondas; autoderiva `nlote` vía K1 y, desde 0042, vía `orden_lotes` (ver 3quater); exige perfil `Completado` **solo si** se envía `perfil_tueste_ref` |
| `crear_orden_desde_trilla` | `(p_id_trilla int) → jsonb` | **e1**: trilla → orden + 7 `orden_pasos` + K1; idempotente (K5 `reused:true`), K4 concilia productor→cliente |

> `lotes_cafe` se crea/edita por inserción directa vía API (no hay `guardar_lote`); RLS restringe la escritura a `Admin/Recepción`.

**Conectores:** K1 `orden_lotes_externos` (transporta `wverde_final` como `peso_inicial_kg` del primer paso) · K2 `public_id` en `ordenes_trabajo`/`perfiles_tueste`/`clientes` · K3 `catacion_tueste.perfil_tueste_ref` · K4 `clientes.external_ref` (productor CBF → cliente).

**Índices nuevos:** `idx_lotes_nlote_trgm`, `idx_lotes_nproductor_trgm`, `idx_lotes_activos_fecha`, `idx_lotes_enproceso`, `idx_ole_origen_nlote`, `idx_caracterizacion_lote_idx`, `idx_caracterizacion_rc_caract`, `idx_secado_lote_idx`, `idx_secado_humedad_idx`, `idx_secado_ambiente_idx`, `idx_secado_temperatura_idx`, `idx_secado_camas_idx`, `idx_bodega_lote_idx`, `idx_secado_bodega_bodega`, `idx_trilla_lote_idx`, `idx_trilla_pesos_verdes`, `idx_catacion_ref`, `idx_catacion_lote`, `idx_catacion_nlote`, `idx_catacion_rondas_idx`.

## 3quater. Refactor del flujo de lotes (0033–0042, rama `feat/flujo-lotes`)

Objetivo (spec [`004-refactor-flujo-lotes`](../specs/004-refactor-flujo-lotes/spec.md)): enlazar **por `id`** toda la cadena
`cliente → finca → lote → orden → perfil de tueste → catación`, reemplazando el texto libre (`nproductor`, `nfinca`,
`zona`, `zona_finca`, `zona_procedencia`).

| Objeto | Cambio | Migración |
|---|---|---|
| `fincas` | **Tabla nueva**: `id_finca`, `cliente_id → clientes` (RESTRICT), `nombre` (1–150), `zona_id → zonas_finca` (SET NULL), `altura numeric(10,2) NOT NULL ≥ 0`, `deleted_at`; UNIQUE parcial `(cliente_id, nombre) WHERE deleted_at IS NULL`; RLS 3 policies | 0038 |
| `lotes_cafe.id_cliente` / `id_finca` | FKs al productor y su finca; `id_finca` pasa a NOT NULL tras el backfill (T12) | 0039 / 0041 |
| `lotes_cafe.proceso_cafe` | Enum `Lavado / Honey / Natural / Otro` (nullable), editable en trilla y bodega. Los 5 booleanos de despulpado se conservan (paridad CBF `FR-010`) | 0039 |
| `lotes_cafe.enproceso` | CHECK ampliado: `No`, `En Secado`, `En Trilla`, `En Bodega`, **`En Catación`**, **`Vendido`** | 0039 |
| `ordenes_trabajo.id_finca` | FK nullable a `fincas` (finca de la orden, independiente del cliente) | 0039 |
| `orden_lotes` | **Tabla nueva N:M** lote↔orden con `peso_kg` opcional y PK `(id_orden, id_lote)`; reemplaza a `orden_lotes_externos`; RLS 3 policies (escritura `Admin`/`Recepción`) | 0040 |
| `guardar_catacion` | Deriva `nlote` del lote (o de `orden_lotes` y, como fallback, de `orden_lotes_externos`); con `id_lote` transiciona el lote a `En Catación`, o a `Vendido` si llega `finalizada=true` (no degrada un lote ya vendido) | 0042 |

**Reglas del modelo (decisiones cerradas con el dueño):**

- **D1/D2**: dos niveles geográficos — `fincas` y su `zona_id → zonas_finca`; **1 cliente → N fincas**.
- **D3/D8**: el lote referencia `cliente` y `finca`; la **altura se lee en vivo** de `fincas.altura` (no se duplica en lote ni orden).
- **D4**: relación N:M real (`orden_lotes`); una orden procesa N lotes y un lote puede pasar por varias órdenes.
- **D5**: el enlace es **opcional en ambos sentidos** (lote sin orden y orden sin lote son válidos).
- **D6/D7**: lote→tueste solo se deduce por la orden (`perfiles_tueste.id_orden`); la catación elige **perfil**, **lote** o ambos (`FR-012`).
- **D9**: `proceso_cafe` editable en trilla y bodega.

**Backfill (0041):** clientes desde `nproductor` (por nombre), fincas desde `(nfinca, zona)` con `altura`, propagación a
`lotes_cafe.id_cliente/id_finca`, y migración de `orden_lotes_externos → orden_lotes` por `nlote`. Incluye
`setval` de la secuencia `clientes_id_cliente_seq` (estaba desincronizada: `last_value=1` con `max=5`).

> **Deprecado, pendiente de DROP (T12 / `0043`+)**: `lotes_cafe.nproductor`, `nfinca`, `zona`, `altura`,
> `ordenes_trabajo.zona_finca`, `clientes.zona_procedencia` y la tabla `orden_lotes_externos`.

## 4. Row Level Security (RLS)

Habilitado en todas las tablas de dominio (**33 tablas**; las **15 de la fusión** y las **2 del refactor de lotes** —`fincas` y `orden_lotes`— tienen 3 políticas cada una — SELECT/INSERT/UPDATE-soft-delete). Patrones:

- **Lectura:** `FOR SELECT TO authenticated USING (deleted_at IS NULL)` — cualquier usuario autenticado ve filas no eliminadas. Ejemplo: [`0012:41`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/supabase/migrations/0012_update_rls_soft_delete.sql#L41) (`ordenes_select`).
- **Escritura:** `WITH CHECK (get_empleado_rol() IN (...))` — solo roles permitidos. Ejemplo: [`0012:27`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/supabase/migrations/0012_update_rls_soft_delete.sql#L27) (`clientes_insert` requiere `Recepción` o `Admin`).
- **Función `get_empleado_rol()`:** `SECURITY DEFINER` que lee `empleados.rol` por `auth.uid()` → `id_auth`, evitando recursión RLS ([`0007_fix_empleados_rls.sql:4`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/supabase/migrations/0007_fix_empleados_rls.sql#L4)).
- **Admin bypass:** endpoints `admin/*` usan `service_role` que bypassa RLS, pero verifican rol vía `requireRole` antes ([`lib/supabase/admin.ts:19`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/supabase/admin.ts#L19)).

- **Fusión CBF (0026–0032):** 15 tablas nuevas con RLS habilitado y 3 políticas cada una; `REVOKE EXECUTE ON FUNCTION get_empleado_rol() FROM anon` (linter `anon_security_definer_function_executable`); RPCs del pipeline con `EXECUTE` solo `authenticated`.

## 5. Seed de Datos Base

Migración [`0021_refactor_servicios_tipo_intervalos.sql`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/supabase/migrations/0021_refactor_servicios_tipo_intervalos.sql) + [`supabase/seed.sql`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/supabase/seed.sql):

```sql
-- Servicios base (3 intervalos cada uno, Chancado con rangos amplios)
INSERT INTO servicios_maestro (nombre, tipo, prioridad) VALUES
  ('Chancado', 'general', 1), ('Trillado', 'general', 2), ...;
INSERT INTO servicio_precios (id_servicio, min_weight_kg, max_weight_kg, precio_por_kg) VALUES
  (1, 1, 25, 2500), (1, 25, 100, 2200), (1, 100, NULL, 1900), ...;
-- Empleados, clientes, órdenes y perfiles de ejemplo en seed.sql
```

> Los precios son **valores de referencia editables** por Admin, no tarifas fijas de mercado.

## 6. Ejemplo de Consulta (Tarifa por Peso)

```sql
-- Resolver tarifa para 12kg en servicio 1
SELECT * FROM servicio_precios
WHERE id_servicio = 1 AND activo = true
  AND 12 >= min_weight_kg AND (max_weight_kg IS NULL OR 12 < max_weight_kg);
-- Equivalente en código: lib/services/resolver-tarifa.ts:15-17
```

## 7. Diagrama ER Simplificado

```
empleados 1--* ordenes_trabajo (id_empleado_recibe)
clientes 1--* ordenes_trabajo
ordenes_trabajo 1--* orden_pasos (prioridad, estado)
servicios_maestro 1--* servicio_precios (min/max/precio)
orden_pasos *--1 servicio_precios (tarifa_id)
empaques 1--* empaque_precios (valid_from/valid_to)
perfiles_tueste 1--* trazabilidad_temperatura / hitos / metricas / ajustes
```

## 8. Historial de cambios (Fases 2 y 4 — Índices, RPCs y constraints)

- **Fecha:** 2026-10-27 · **Rama:** `feat/audit-hardening`
- **Cambios:** migraciones `0023_indices_performance.sql` (10 índices + pg_trgm), `0024_rpc_transaccionales.sql` (5 RPCs), `0025_tarifas_exclusion.sql` (btree_gist + EXCLUDE numrange + CHECK, drop del trigger anti-solape). **Las 3 aplicadas y verificadas en producción (nwnldvzoxjjsmfeyouaw) el 2026-10-27:** 10/10 índices en `pg_indexes`; 5 RPCs con EXECUTE solo para `authenticated`; EXCLUDE rechaza traslape (`23P01`) y acepta contiguos; trigger eliminado; 0 filas de conflicto preexistentes.
- **Limitaciones:** EXPLAIN con volumen actual diminuto (Seq Scan legítimo); repetir con datos reales. Sin evidencia de volumen no se implementa particionamiento (`docs/DATA_GROWTH_PLAN.md` §4).
- **Pendiente:** EXPLAIN con volumen ≥1k órdenes; retiro de índices redundantes según `docs/PERFORMANCE_INDEXES.md` §3.
