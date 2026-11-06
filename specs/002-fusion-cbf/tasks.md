# Tasks: Fusion CBF into CafeTrack

**Feature**: `002-fusion-cbf` | **Input**: [spec.md](./spec.md) + [plan.md](./plan.md)

> Reglas transversales: cada migración vía MCP con evidencia · contrato errores Anexo C · español · sin secretos · protocolo plan→aprobado→ejecutar→evidencia por tarea.

## Fase 1 — Seguridad + conectores (bloqueante)
- [x] **T1. Migración `0026_seguridad_conectores.sql`** (aplicada vía MCP 2026-11-06, reintentos tras 520 de Cloudflare; estado previo verificado = 0 efectos parciales)
  - [x] `DROP FUNCTION IF EXISTS soft_delete_row(TEXT, TEXT, INTEGER)` (C2 — sin usos, verificado en Paso 6)
  - [x] K2: `public_id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE` en `ordenes_trabajo`, `perfiles_tueste`, `clientes` + backfill por default
  - [x] K1: tabla `orden_lotes_externos` PK compuesta `(id_orden, nlote, origen)` + `idx_ole_origen_nlote` + RLS (SELECT/INSERT/DELETE según role) + `REVOKE anon`/`GRANT authenticated`
  - [x] K4: `clientes.external_ref varchar(100)` + `idx_clientes_external_ref` parcial
  - [x] Estandarización divergencia admin: `/api/admin/empaques/**` (3 archivos) → requireRole+createClient (RLS), service_role retirado
- [x] **T2. Verificación MCP de T1**: `soft_delete_row` = **0 filas en pg_proc** · tablas 17 · políticas 47 · 3 `public_id` + `external_ref` + 2 índices · grants anon K1 = 0 · migración registrada · advisors: hallazgo C2 **desaparecido** (WARNs restantes preexistentes: search_path×9, extensiones en public×2, `get_empleado_rol` defininer-ejecutable — seguimiento aparte) · `tsc`=0 · `lint`=0 err / 36 warn preexistentes

## Fase 2 — P1 Slice vertical: LOTES end-to-end
- [ ] **T3. Migración `0027_lotes_cafe.sql`** (incluye índices: `idx_lotes_nlote_trgm` + parcial por fecha)
  - [ ] `lotes_cafe`: `id_lote serial PK` · `nlote varchar(100) NOT NULL UNIQUE` · `public_id uuid K2` · `nrecibo int NOT NULL` · `nproductor varchar(100) NOT NULL` · `nfinca varchar(100) NOT NULL` · `zona varchar(100)` · `altura numeric` · `robjetivo/rtotal numeric` · `disponible numeric` · `vendido bool NOT NULL DEFAULT false` · `enproceso varchar(50) NOT NULL DEFAULT 'No' CHECK IN ('No','En Secado','En Trilla','En Bodega','Vendido')` · 5 booleans despulpado + `otro varchar(100)` · 6 pruebas físicas/densidad numeric · `fecha_acopio timestamptz NOT NULL DEFAULT now()` · `created_at/updated_at` + trigger · `deleted_at`
  - [ ] RLS: SELECT `true` / INSERT+UPDATE `rol∈{Recepción,Admin}` / DELETE no policy (soft) · índices: `(fecha_acopio DESC) WHERE deleted_at IS NULL`, `(nproductor)` trgm `WHERE deleted_at IS NULL`
- [ ] **T4. Zod `lib/schemas/lotes.ts`** (crear/actualizar/listar: fronteras reales — `enproceso` enum, booleans, nums ≥0, `nlote` ≤100 obligatorio; `deleted_at` solo via endpoint)
- [ ] **T5. API `/api/lotes`** (con withErrorHandler): `GET` paginado+search trgm+estado+desde/hasta · `POST` · `[id]` `GET/PUT/DELETE`(soft) — 5 handlers, roles según FR-001
- [ ] **T6. UI**: sidebar "Lotes" · `/lotes` (tabla paginada+filtros, patrón de órdenes) · `/lotes/nueva` + `/lotes/[id]/editar` (secciones: principal, maduración, estado, despulpado, pruebas) · `/lotes/[id]` (detalle base + placeholder pestañas etapas)
- [ ] **T7. Tests**: `lotes.schema.test.ts` + `lotes.api.test.ts` (409 nlote dup, 403 rol, soft-delete)
- [ ] **T8. Verificación Fase 2**: MCP counts (18 tablas, ~50 policies) · `tsc`+`lint`+test · curl dev: flujo 201→409→403→soft

## Fase 3 — P2 Etapas del lote (subdivisible 3a–3d)
- [ ] **T9 (3a). `0028_caracterizacion.sql` + RPC `guardar_caracterizacion`** — `caracterizacion_lote(id_lote FK, tiempo timestamptz NOT NULL, proceso, l_asignado, 21 campos físico-químicos, created/updated/deleted)` UNIQUE `(id_lote, tiempo)` + 3 RC en `caracterizacion_rc(tipo_rc CHECK ('maduras','inmaduras','sobremaduras'), gbx, promedio, observaciones)` UNIQUE `(caracterizacion_id, tipo_rc)` — cierra disp. 3 (exponer `l_asignado`), 10 (NOT NULL consciente), 15 (nombres snake_case), 16 (upsert)
- [ ] **T10 (3b). `0029_secado.sql` + RPC `guardar_secado`** — `secado_lote(id_lote FK, finicio timestamptz, ffinal, dsecado int)` + 4 series débiles CASCADE (`secado_humedad(fecha,humedad)`, `secado_ambiente(fecha,temp Ambiente,humedad_ambiente)`, `secado_temperatura(fecha,temp)`, `secado_camas(numero_cama text)`) — RPC upsert con diff (no borra ids — disp. 16); validación Zod: humedad 0–100, temp ambiente −50–70
- [ ] **T11 (3c). `0030_bodega.sql` + RPC `guardar_bodega`** — `bodega_lote(id_lote FK, pesos, humedades, densidades g/ml, pruebas masa, finicio_reposo)` + `secado_bodega(id_secado,id_bodega,cantidad_sacos) PK comp` — disp. 13 (objeto `{cantidad_sacos}` + Zod) y 12/6 (ffinal_reposo timestamptz)
- [ ] **T12 (3d). `0031_trilla.sql` + RPC `guardar_trilla`** — `trilla_lote(id_lote FK, 20 campos rendimientos/clasificación, ffinal_reposo timestamptz)` + `peso_verde_trilla(id_trilla PK/FK 1:1)` — T8: los pesos facturados ya viven en `orden_pasos`; aquí se capturan los rendimientos completos
- [ ] **T13. UI pestañas** en `/lotes/[id]`: Caracterización · Secado (FormArray series) · Bodega · Trilla (+toggle peso verde) — RHF+Zod, señales de estado del lote (enproceso por etapa)
- [ ] **T14. Tests por etapa** + verificación MCP (22 tablas, ~60 policies; RPCs con EXECUTE authenticated únicamente)

## Fase 4 — P3 Catación + pipeline (e1/e2)
- [ ] **T15. `0032_catacion_pipeline.sql`** — `catacion_tueste(perfil_tueste_ref uuid K3 FK→perfiles_tueste.public_id, nlote texto, 48 atributos del snapshot real (incluye `c2cortado`, `c2negrop`, `c2agriop`), pfinales numeric derivado)` + `catacion_rondas(id_catacion FK CASCADE, valor_calidad)` + RPC `guardar_catacion` (upsert rondas sincronizadas por id) — cierra disp. 4 (`calidad`→derivado de rondas), 14 (FK materializada K3), 15 (nombres snake), 2 (`c2cortado` con campo)
- [ ] **T16. e1 RPC `crear_orden_desde_trilla(p_id_trilla)`** — rol Admin/Recepción; exige trilla `ffinal` presente y sin orden existente (K1+K5 UNIQUE); crea `ordenes_trabajo` (id_cliente desde la concordancia K4 por productor; si no existe → 400 solicitando conciliación manual) + `orden_pasos` por servicios activos + fila `orden_lotes_externos(nlote, peso_kg=wverde_final, origen='fusion')` + deriva `proceso_cafe` (FR-010)
- [ ] **T17. API + UI catación**: `/api/cataciones` (POST/GET/PUT, roles Tostador/Admin) + `/cataciones` (lista) + form (secciones: principal, calidad/tostado, C1, C2, zarandas 3/16–20, Agtron 25–95, rondas FormArray) + botón e1 "Enviar a proceso" en trilla completada + selector e2 de perfiles `Completado`
- [ ] **T18. Tests** + **demo e2e** (SC-003): seed → lote → caracterización → secado → bodega → trilla → e1 orden F-XXXX → iniciar/cerrar pasos → perfil tueste Completado → e2 catación; evidencia screenshots/curl + `nlote → numero_factura → catación` SQL trazable

## Fase 5 — Cierre
- [ ] **T19. Verificación final**: checklist §4.0 (6/6) · advisors security+performance · `tsc`+`lint`+`test:coverage` · conteos MCP finales · CHANGELOG.md · doc raíz: marcar "implementado" + estado de las 18 discrepancias y decisiones diferidas (migración datos CBF — decidir con propietario; C1 rotación antes de migrar datos)
- [ ] **T20. Aprobación de merge** a `main` por el propietario (commits/PR solo bajo petición explícita)
