# FUSION_CBF_COMPARISON — CoffeeBeanFlow vs CafeTrack fusionado

> **Fecha:** 2026-11-07 · **Rama:** `002-fusion-cbf` · **Merge:** `97c0023` · **Fuente de verdad del mapeo:** [`ARQUITECTURA_Y_DATOS_INTEGRACION.md`](../ARQUITECTURA_Y_DATOS_INTEGRACION.md) §4.1–§4.7.

Este documento responde a una pregunta concreta: **¿mejoró CoffeeBeanFlow (CBF) al reconstruirse dentro de CafeTrack?** La respuesta corta es sí, con costos documentados. La comparación se basa en el código real de ambos proyectos, no en el resumen de la spec.

## 1. Línea base — qué era CoffeeBeanFlow

| Aspecto | Estado en CBF |
|---|---|
| Stack | ASP.NET Core (10 controllers, **62 endpoints**) + EF Core (**19 entidades**, **9 migraciones**) + frontend Angular |
| Autenticación/autorización | **Ninguna** (sin JWT, sin roles, sin RLS) |
| Secretos | Credenciales PostgreSQL en `appsettings.json`; `baseUrl` hardcodeada a una IP LAN |
| Paginación | Inexistente en todos los listados |
| Facturación | **No factura** (0 campos de precio en sus 19 tablas) |
| Tests | Sin suite automatizada |
| Integridad de escrituras | `PUT` de secado reemplazaba colecciones completas (perdía ids) |
| Modelo de proceso | 5 booleanos (`lavado/natural/miel/semilavado/anaerobico`) + `otro` texto |
| Enlaces | `catacion.nlote` sin FK física; `perfiles_tueste.numero_lote` usado como si fuera el lote de acopio |
| Código muerto | Endpoints declarados pero inexistentes (`TrillaService` peso-verde); columnas fantasma (`calidad`) |

## 2. Comparativa por dimensión

### 2.1 Integridad de datos

| CBF | CafeTrack fusionado |
|---|---|
| `PUT` replace-all: un guardado concurrente podía destruir series | 6 RPCs transaccionales + 2 helpers con upsert por id y soft-delete dirigido; preserva ids insertados en el mismo pase (`v_nuevos int[]` + `NOT IN (SELECT unnest(...))`) |
| `nlote` sin FK | FK materializadas: `catacion_tueste.nlote → lotes_cafe(nlote)`, `id_lote → lotes_cafe(id_lote)`, K1 `orden_lotes_externos` |
| Fechas guardadas como `numeric` (`ffinal_reposo`) | `timestamptz` coherente |
| Enum disfrazado de booleanos | Enum de proceso en la orden (`Lavado/Honey/Natural/Otro`) + booleanos solo en el lote de acopio (fidelidad CBF) |
| Sin CHECKs de rango | CHECK `catacion_rangos` + Zod por capa + UNIQUEs (`nlote`, `(id_lote, tiempo)`, `(caracterizacion_id, tipo_rc)`) |

### 2.2 Seguridad

| CBF | CafeTrack fusionado |
|---|---|
| Anónimo total | JWT + `requireRole` por endpoint; RLS en 31 tablas (15 de la fusión con 3 políticas c/u) |
| Credenciales en repo | `check-secrets` + `gitleaks`; service_role aislada con `server-only` |
| Sin roles | `Admin/Tostador/Recepción/Operador` con matriz de escritura por módulo |
| Sin protección de funciones | RPCs `SECURITY INVOKER`, `EXECUTE` solo `authenticated`; `get_empleado_rol` revocado de `anon` |

### 2.3 Coherencia de negocio

| CBF | CafeTrack fusionado |
|---|---|
| Etapas aisladas (acopio→trilla→catación sin conexión a producción) | Pipeline `lote → caracterización → secado → bodega → trilla → **e1 orden** → tueste → **e2 catación**`, con timeline de 9 etapas en la UI |
| Sin facturación | Orden de trabajo con 7 pasos, tarifas por intervalo y `numero_factura` |
| Catación huérfana | K3 `perfil_tueste_ref → perfiles_tueste.public_id`; exige perfil `Completado` |
| Productor como texto suelto | K4 `clientes.external_ref` con conciliación explícita (400 si no concilia) |
| Sin idempotencia | e1 idempotente por lote (K5 `reused:true`) |

### 2.4 Calidad de ingeniería

| CBF | CafeTrack fusionado |
|---|---|
| 0 tests | **189 tests** en 20 suites; cobertura **81.56%** global y **100%** en schemas |
| Sin paginación | `apiPaginado` + búsqueda sanitizada + índices trgm |
| Errores ad hoc | Contrato `{data}`/`{error.code}` + `x-correlation-id`; 23505→409, 23503→400, 23514→422 |
| Sin documentación de esquema | `docs/DB_SCHEMA.md` §3ter, `docs/API_REFERENCE.md` §2.6, este documento |

### 2.5 Corrección de las discrepancias CBF (17 + 1)

| Destino | Cantidad | Detalle |
|---|---|---|
| Implementadas en el port | 11 | varchar(100), `l_asignado` en UI, timestamptz, fecha de acopio, NOT NULL consciente, paginación, 200 con lista vacía, `{cantidad_sacos}`, FK de `nlote`, snake_case, RPC sin replace-all |
| No portar (código muerto/irrelevante) | 4 | endpoints inexistentes, IP LAN, credenciales en `appsettings`, cifra "63" |
| Decididas con evidencia | 2 | `c2cortado` (campo UI existente), `pfinales` (sí existe en el proyecto real) |
| Errata de conteo de la spec | 1 | "8 migraciones EF" vs 9 reales; "63 endpoints" vs 62 reales |

## 3. Traducciones de dominio aplicadas

- **Proceso de despulpado:** 5 booleanos CBF → enum `Lavado|Honey|Natural|Otro`. `miel`↔`Honey`; `semilavado`/`anaerobico`/multiselección ⇒ `Otro` (**pérdida de granularidad documentada**, aplicada en la carga).
- **Trilla (fuente de verdad por tipo de dato):** peso facturado → `orden_pasos` (e1); rendimientos/clasificación → `trilla_lote` portado. CBF no factura, por lo que no hay doble importe.
- **Catación:** `rtostado` = rendimiento (`100 − porcentaje_diferencia`); `dfueste` = g/ml canónico (evidencia: "Densidad de Tueste (g/ml)", escala 0.65–0.75).
- **Rondas:** solo `valor_calidad` (0–100), sin rondas SCA.
- **Beche:** bache de tostadora; nunca clave de lote (prohibido `perfiles_tueste.numero_lote` como identificador compartido).

## 4. Costos y pendientes honestos

1. **Pérdida de granularidad de proceso** (semilavado/anaeróbico ⇒ `Otro`), registrada como decisión de carga.
2. **Migración de datos reales CBF no ejecutada** — decisión diferida; requiere **C1** (rotación de credenciales) primero.
3. **Deuda heredada de CafeTrack** (no introducida por la fusión): `search_path` mutable en 9 funciones legacy, leaked-password protection deshabilitada, índices sin uso.
4. **Demo SC-003** permanece como evidencia de aceptación; debe limpiarse cuando el propietario lo decida (`docs/RUNBOOK.md` §7bis.2).

## 5. Veredicto

CBF era un prototipo funcional con modelo de datos razonable y ejecución frágil (sin seguridad, sin transacciones, sin tests, sin facturación). La fusión no lo "reconstruyó" desde cero: lo **absorbió y endureció**, añadiendo el andamiaje que le faltaba (RLS/roles, RPCs atómicas, Zod, paginación, observabilidad, facturación) y corrigiendo sus 17+1 discrepancias. El resultado es estrictamente superior a ambos sistemas por separado; el único punto donde CBF "gana" es la simplicidad de despliegue, que era incidental y no un beneficio de diseño.

## 6. Evidencia

- Esquema: [`docs/DB_SCHEMA.md`](./DB_SCHEMA.md) §3ter · API: [`docs/API_REFERENCE.md`](./API_REFERENCE.md) §2.6 · Arquitectura: [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) §4.4.
- Mapeo y discrepancias: [`ARQUITECTURA_Y_DATOS_INTEGRACION.md`](../ARQUITECTURA_Y_DATOS_INTEGRACION.md) §4.1.4, §4.2, §4.3, §4.7.
- Cierre y criterios: [`ARQUITECTURA_Y_DATOS_INTEGRACION.md`](../ARQUITECTURA_Y_DATOS_INTEGRACION.md) §4.0.1.
- Demo end-to-end: `docs/RUNBOOK.md` §7bis.1.
