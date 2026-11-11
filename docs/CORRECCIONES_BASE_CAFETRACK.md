# Correcciones a la base de datos — CaféTrack (estado post-fusión CBF)

> **Fecha:** 2026-11-11 · **Método:** lectura del catálogo vivo (PostgreSQL 17 vía Supabase) + migraciones `supabase/migrations/*.sql` + `ARQUITECTURA_Y_DATOS_INTEGRACION.md`.
> **Estado (actualizado 2026-11-11):** ✅ **A1, A2, A3, B1 y B6 ejecutadas y verificadas** (ver §Estado de ejecución). **B2 y B3 retiradas** por decisión de la fusión (`disp.14`, `FR-010`). **B4 no se hace** (modelo `K1` vigente). **P2 resuelto**: las 3 fuentes quedaron self-hosted y el build ya no depende de Google.
> **Compañero de lectura:** `ARQUITECTURA_Y_DATOS_INTEGRACION.md` (fuente de verdad del plan de fusión) y `docs/LEGACY_MIGRATION_PLAN.md`.

---

## Estado de ejecución al 2026-11-11

Rama de trabajo: `fix/general` (creada desde `main`; CONTRIBUTING mencionaba `fix/general` pero no existía en el clone ni en `origin`). Spec: `specs/003-correcciones-post-fusion/`.

| Ítem | Estado | Evidencia |
|---|---|---|
| **A1** `ANALYZE` | ✅ ejecutado | 15 tablas con `reltuples=-1` ahora con estadísticas |
| **A2** 3 índices redundantes | ✅ droppeados | `idx_ordenes_numero_factura`, `idx_orden_pasos_orden`, `idx_servicios_orden` ausentes |
| **A3** grant `get_empleado_rol` | ✅ corregido | ACL sin `=X` (PUBLIC); `anon_can_exec=false`; advisor `anon…` desaparecido |
| **B1** CHECK `estado` | ✅ migración `0036` | `perfiles_tueste_estado_check`; UPDATE inválido → 23514 |
| **B6** 4 enums huérfanos | ✅ migración `0037` | 0 filas en `pg_type` |
| **B2** triple ref catación | ⛔ retirada | decisión de fusión `disp.14` (K3 + id_lote + nlote) |
| **B3** 5 booleans proceso | ⛔ retirada | `FR-010` (paridad CBF) |
| **B4** `id_lote` en perfiles | ⛔ no se hace | modelo `K1`/`orden_lotes_externos` vigente |
| **B5** empaques capacidad | ⏸ diferido | deuda documentada (T5) |
| **P2** fuentes local (3) | ✅ resuelto | `next/font/local` + 3 variable fonts recuperadas del build previo; `npm run build` OK (solo 3 woff2, sin Google) |

Además, en la misma sesión: `0033` (hardening `search_path`), `0034` (índices FK + RLS initplan), `0035` (grant fix + índices redundantes).

## 0. Por qué NO ejecutamos todavía (gate de seguridad)

La base ya **no es solo CafeTrack**. Las migraciones `0026–0032` portaron los módulos de
CoffeeBeanFlow (CBF): acopio (`0027_lotes_cafe`), caracterización (`0028`), secado (`0029`),
bodega (`0030`), trilla (`0031`) y catación (`0032`). El esquema de esas tablas **es el contrato
del port**: el código CBF integrado, los schemas Zod, las RPCs transaccionales, el sync offline
(IndexedDB) y las políticas RLS apuntan a columnas concretas.

**Regla:** una corrección que altera la *forma* de una tabla CBF (renombrar, partir, eliminar
columnas) puede compilar pero romper el flujo en runtime. Por eso cada ítem de abajo lleva:

- **Origen**: ¿tabla nativa de CafeTrack (`0001–0025`) o módulo portado de CBF (`0026–0032`)?
- **Acoplamiento**: qué toca (rutas API, RPC, Zod, sync offline, RLS).
- **Verificación previa**: qué confirmar antes de tocar.
- **Veredicto**: `Seguro` / `Verificar` / `Coordinar con fusión` / `Ya documentado`.

---

## 1. Resumen ejecutivo

- La base está **sana y por encima del promedio**: 31 tablas, 43 FK con `ON DELETE` correcto,
  9 enums, ~12 RPCs transaccionales, precios con snapshot. No hay problema de rendimiento *hoy*
  (2–36 filas por tabla).
- Los defectos de modelado más grandes (`catacion_tueste` de 54 columnas, `lotes_cafe` con 5
  booleanos de proceso) **son módulos CBF portados**, no bugs de CafeTrack: normalizarlos
  unilateralmente rompería el port.
- Lo que sí es seguro y urgente: `ANALYZE`, 3 índices redundantes, y **un `REVOKE` inefectivo
  que deja `get_empleado_rol()` ejecutable por `anon`** pese a la migración `0026`.

---

## 2. Catálogo de correcciones

### A. Seguras y reversibles (aplicables tras verificación mínima)

| ID | Corrección | Evidencia | Riesgo app | Verificación previa |
|---|---|---|---|---|
| **A1** | `ANALYZE;` global | 15 tablas con `reltuples = -1` (nunca analizadas); el planner estima a ciegas; `list_tables` reporta 2 filas donde `count(*)` da 36 | Nulo (no toca datos) | Ninguna. Cualquier cambio de estadística no altera resultados, solo planes |
| **A2** | `DROP INDEX` de 3 índices redundantes: `idx_ordenes_numero_factura` (duplica `ordenes_numero_factura_unique`), `idx_orden_pasos_orden` (prefijo de `idx_orden_pasos_orden_prioridad`), `idx_servicios_orden` (prefijo de `servicios_ejecutados_orden_servicio_empaque_key`) | Catálogo `pg_indexes` | Bajo (solo escrituras; el planner usa el índice más largo) | `grep` de cada nombre en `app/` y `lib/` (hints de índice no existen en Postgres; es check de caja) |
| **A3** | Endurecer `get_empleado_rol()`: el `REVOKE EXECUTE … FROM anon` de `0026` **no surte efecto** porque `PUBLIC` conserva el `EXECUTE` y `anon` hereda de `PUBLIC`. SQL correcto: `REVOKE EXECUTE ON FUNCTION get_empleado_rol() FROM PUBLIC; GRANT EXECUTE ON FUNCTION get_empleado_rol() TO authenticated;` | El advisor `anon_security_definer_function_executable` sigue activo tras `0026`; semántica de grants de Postgres | Bajo (la función filtra por `auth.uid()`, no filtra datos) | Confirmar que ningún flujo invoca la función *antes* de login (grep de `get_empleado_rol` en `middleware.ts` y rutas `/api/auth`) |

> Nota A3: esta función es `SECURITY DEFINER` a propósito y **no debe** pasarse a `SECURITY INVOKER`
> (la policy `empleados_admin_full` la llama → recursión de políticas). Solo se corrige el grant.

### B. Requieren verificación de acoplamiento antes de ejecutar

| ID | Corrección | Origen | Acoplamiento | Verificación previa | Veredicto |
|---|---|---|---|---|---|
| **B1** | `perfiles_tueste.estado` es `varchar(20)` **sin CHECK** (la restricción vive en Zod). Añadir `CHECK (estado IN ('Pendiente','Completado'))` o enum | Nativo `0013` | `app/api/perfiles-tueste`, Zod `perfilEstado`, sync offline no escribe estado | Leer `lib/offline/schemas.ts` y los handlers; confirmar el conjunto cerrado de valores | Verificar |
| **B2** | `catacion_tueste` tiene **3 referencias al lote** (`id_lote` int, `nlote` varchar FK, `perfil_tueste_ref` uuid → `perfiles_tueste.public_id`). Consolidar a `id_lote` + `id_perfil` (int) | CBF `0032` | `guardar_catacion`, UI de catación, `FUSION_CBF_COMPARISON.md` | Localizar el generador de `perfil_tueste_ref` y el SELECT que resuelve `nlote`; confirmar qué campo escribe la app | Coordinar con fusión |
| **B3** | `lotes_cafe` modela el proceso con 5 booleanos (`semilavado,natural,anaerobico,miel,lavado`) + `otro` + `enproceso`, mientras `ordenes_trabajo.proceso_cafe` usa enum. Una sola fuente de verdad | CBF `0027` | `guardar_caracterizacion`, UI acopio, `enproceso` como catálogo de UI | Confirmar el catálogo de `enproceso` y si CBF distingue procesos simultáneos (anaeróbico+laminado) que el enum no cubre | Coordinar con fusión |
| **B4** | `perfiles_tueste.numero_lote` (varchar) no tiene FK a `lotes_cafe`; la trazabilidad lote→tueste es por texto. El puente correcto ya existe en parte: `orden_lotes_externos` (K1) | Nativo + CBF | `resumen`, reportes, catación | Leer `002-fusion-cbf` (K1/K2) y `FUSION_CBF_COMPARISON.md`; decidir si el vínculo es `orden→lote` o `perfil→lote` | Coordinar con fusión |
| **B5** | `empaques` con `unit_weight_kg` **y** `capacidad_kg` (semántica solapada; heurística T5 en `cerrar_paso_orden`) | Nativo `0017/0020` | RPC `cerrar_paso_orden`, Zod `cerrarEmpacadoSchema`, seed `0020` | Ya documentado como T5; no tocar sin revalidar la heurística `capacidad_kg>=100 → /1000` y sus tests | Ya documentado (T5) |
| **B6** | `especificaciones_orden` usa 3 `varchar` (`tipo_tueste`, `tipo_molienda`, `tipo_empaque`) cuando existen 3 enums huérfanos. Re-vincular enums o `DROP TYPE` | Nativo `0001/0002` | `crear_orden_completa`, Zod `crearOrdenSchema` | Ya listado en doc §2.3 como "4 enums huérfanos"; decidir re-vincular vs eliminar | Ya documentado |

### C. Ya resueltas o con plan existente (no duplicar)

| Ítem | Estado | Referencia |
|---|---|---|
| `soft_delete_row` SECURITY DEFINER sin rol | **Eliminada** en `0026` | `0026_seguridad_conectores.sql:9` |
| `servicios_ejecutados` legacy vs `orden_pasos` | **Plan E1–E5** vigente; no re-proponer | `docs/LEGACY_MIGRATION_PLAN.md` (T13) |
| `idx_trazabilidad_perfil_minuto` duplica el UNIQUE | **Ya señalado** | doc §2.8 |
| `especificaciones_update` sin `WITH CHECK` | **Resuelta** en `0014_fix_update_with_check` | `0014` |
| 4 enums huérfanos (`tipo_servicio/tueste/molienda/empaque`) | **Ya señalados** | doc §2.3 |
| `upsert_serie_secado(p_tabla text)` — riesgo de SQL dinámico | **Verificado seguro**: whitelist `IN ('secado_humedad','secado_ambiente','secado_temperatura')` + `RAISE EXCEPTION` | lectura de `pg_get_functiondef` |

---

## 3. Matriz de acoplamiento (qué toca qué)

Tablas CBF portadas → sus consumidores actuales (a verificar antes de cualquier DDL):

| Tabla / objeto | Rutas API | RPC | Zod | Sync offline |
|---|---|---|---|---|
| `lotes_cafe` | `app/api/lotes/**` | `guardar_caracterizacion`, `guardar_secado`, `guardar_trilla`, `guardar_bodega` | `loteSchema` (validar) | — (acopio es online) |
| `secado_*` | `app/api/lotes/[id]/secado` | `guardar_secado`, `upsert_serie_secado`, `upsert_serie_camas` | schemas de secado | — |
| `catacion_tueste`, `catacion_rondas` | `app/api/cataciones/**` | `guardar_catacion` | `catacionSchema` | — |
| `perfiles_tueste` | `app/api/perfiles-tueste/**` | `confirmar_tueste_paso` | `perfilSchema`, `perfilEstado` | `temperaturas`, `hitos` (IndexedDB) |
| `orden_pasos` | `app/api/ordenes/**` | `cerrar_paso_orden`, `confirmar_tueste_paso` | `iniciarPaso`, `cerrar*`, `confirmarTueste` | — |
| `ordenes_trabajo` | `app/api/ordenes/**` | `crear_orden_completa` | `crearOrdenSchema` | — |

**Regla de seguridad antes de cada DDL:** la tabla afectada se busca por nombre **y por columna**
en `app/`, `lib/`, `supabase/migrations/` y `specs/`; si aparece en una ruta API, se valida su Zod;
si aparece en `lib/offline/`, se valida que el store de IndexedDB no espere la columna.

---

## 4. Checklist de verificación previo a ejecutar (obligatorio)

1. `git log --oneline` de `supabase/migrations/` — confirmar que `0026–0032` están mergeadas en el branch de trabajo.
2. `grep -rn "<objeto>" app/ lib/ specs/` (tabla y columnas tocadas).
3. Si toca RPC: leer `pg_get_functiondef` y sus tests (`scripts/__tests__`, `app/**/__tests__`).
4. Si toca una tabla con sync offline: validar `lib/offline/db.ts` (stores) y `schemas.ts`.
5. Si toca RLS: re-correr `get_advisors (security)` y comparar con el snapshot previo.
6. Confirmar en el MCP `list_migrations` que la migración quedó registrada (nombre semántico, no timestamp suelto).

---

## 5. Orden de ataque propuesto (cuando se autorice)

1. **A1 + A2 + A3** — cero acoplamiento funcional, reversibles, y A3 cierra un agujero de grants
   que `0026` intentó cerrar sin éxito. *(Batch seguro.)*
2. **B1** — una línea de DDL + actualizar el Zod como espejo.
3. **B2–B4** — tras decisión de diseño con el responsable de `002-fusion-cbf` (afectan trazabilidad
   y el port CBF; no son hotfix).

**No tocar sin decisión expresa:** `catacion_tueste` (normalización EAV), `lotes_cafe` (procesos),
`empaques` (capacidad), y el plan de `servicios_ejecutados` (ya gobernado por `LEGACY_MIGRATION_PLAN.md`).

---

*Generado por el agente a partir del análisis de la base en vivo y el catálogo de migraciones.
No se ejecutó ningún DDL derivado de este documento.*
