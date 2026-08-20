# DB_SCHEMA — Esquema de Base de Datos

> **Permalink base:** [`80b1dd5`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/tree/80b1dd5) · 22 migraciones en [`supabase/migrations/`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/tree/80b1dd5/supabase/migrations)

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
- **Intervalos:** trigger `trg_no_solape_intervalos` valida que `[peso_min, peso_max)` no se solapen por servicio ([`0019_flujo_secuencial_tarifas_intervalo.sql`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/supabase/migrations/0019_flujo_secuencial_tarifas_intervalo.sql) + validación Zod en [`lib/schemas/servicios-maestro.ts:12-64`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/schemas/servicios-maestro.ts#L12-L64)).

## 3. Triggers

| Trigger | Tabla | Función |
|---------|-------|---------|
| `trg_no_solape_intervalos` | `servicio_precios` | Rechaza `INSERT/UPDATE` si `peso_min < max_existente && max > min_existente` |
| `trg_orden_pasos_prioridad` | `orden_pasos` | Valida secuencia por `prioridad` |

## 4. Row Level Security (RLS)

Habilitado en todas las tablas de dominio (`ENABLE ROW LEVEL SECURITY`). Patrones:

- **Lectura:** `FOR SELECT TO authenticated USING (deleted_at IS NULL)` — cualquier usuario autenticado ve filas no eliminadas. Ejemplo: [`0012:41`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/supabase/migrations/0012_update_rls_soft_delete.sql#L41) (`ordenes_select`).
- **Escritura:** `WITH CHECK (get_empleado_rol() IN (...))` — solo roles permitidos. Ejemplo: [`0012:27`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/supabase/migrations/0012_update_rls_soft_delete.sql#L27) (`clientes_insert` requiere `Recepción` o `Admin`).
- **Función `get_empleado_rol()`:** `SECURITY DEFINER` que lee `empleados.rol` por `auth.uid()` → `id_auth`, evitando recursión RLS ([`0007_fix_empleados_rls.sql:4`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/supabase/migrations/0007_fix_empleados_rls.sql#L4)).
- **Admin bypass:** endpoints `admin/*` usan `service_role` que bypassa RLS, pero verifican rol vía `requireRole` antes ([`lib/supabase/admin.ts:19`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/supabase/admin.ts#L19)).

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
