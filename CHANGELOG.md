# Changelog

Todas las notas de versión de SCACR.

## [Unreleased]

### Added — Imprimir/Descargar factura al cerrar el flujo de órdenes
- **Flujo de pasos**: al quedar todos los pasos completados aparecen “Imprimir Factura” y “Descargar PDF” junto al total acumulado.
- **PDF**: nueva factura jsPDF con encabezado CACD y el mismo lenguaje visual de perfiles/recibido; incluye cliente, finca, lotes, servicios/empaques y total.
- **Impresión**: plantilla HTML de orden corregida a A4, con filas de tabla sin cortes y sin sidebar/botones.
- **Datos**: el detalle de la orden incorpora `empaques(nombre)` y los lotes asociados vía `orden_lotes`.

### Added — Perfiles de tueste con lotes selectivos (0062)
- **DB `0062`**: tabla `perfil_tueste_lotes` (N:M, 0..N lotes por perfil) y RPC `crear_perfil_tueste` que inserta perfil + lotes de forma transaccional.
- **Modal Crear Nuevo Perfil**: factura opcional (solo órdenes con servicio Tueste) y lotes como selección independiente múltiple, con proceso visible. Se puede crear el perfil solo con lotes.
- **Compatibilidad**: se conserva `perfiles_tueste.numero_lote` como fallback del primer lote; encabezado, PDF, listado y detalle priorizan la relación nueva.

### Changed — Trilla compacta en 6 cajitas (0060)
- **UI**: formulario dedicado con Trilla, Peso teórico, Peso verde sin selección, Mediciones de humedad, Porcentaje en calidades y Peso en verde exportación.
- **DB `0060`**: se agregan `pruebas_fisicas_trilla` y `peso_en_verde_final_inferior`; `guardar_trilla` las persiste.
- **Validación**: `peso_verde_final` pasa a opcional; `peso_verde_final` y `peso_en_verde_final` se mantienen como columnas distintas.
- **Etiquetas**: “Cataduras” conserva la propiedad `porcentaje_cataduras`.

### Changed — Bodegaje compacto en 3 cajitas (0059)
- **UI**: formulario dedicado con las cajitas Bodegaje, Peso y Mediciones de humedad; unidades `kg` y `%` visibles.
- **Eliminado del formulario, Zod y payload**: densidades de pergamino/bellota y las condiciones ambientales (humedad relativa, temperatura interna/externa). Se conserva la etiqueta correcta “Peso bellota”.
- **DB `0059`**: `guardar_bodega` deja de escribir esas columnas; se mantienen en `bodega_lote` como legado nullable, sin migración destructiva.

### Changed — Secado: formulario por bloques y tiempo automático (0058)
- **DB `0058`**: se eliminan `humedad_6`/`tem_6`; se quita el CHECK de orden de fechas; `guardar_secado` calcula `dias_secado` y `tiempo_secado` desde las fechas y los persiste.
- **UI**: formulario dedicado en 4 bloques (datos de secado, tipo de secado, mediciones y pesos), lote de solo lectura, tiempo calculado en vivo, advertencia si la fecha final es anterior y hasta 5 pares humedad/temperatura.
- **Validación**: `secadoSchema` queda totalmente opcional y ya no bloquea fechas invertidas; el tiempo calculado queda vacío en ese caso.

### Changed — Caracterización de materia prima (0057)
- **DB `0057`**: se eliminan `escala_maduracion`, `rango_optimo_madurez`, `muestreo_tabla` y los 5 `pct_*`; se agrega `proceso_otro` y CHECK del catálogo compartido; `guardar_caracterizacion` actualizada.
- **UI**: formulario dedicado en 4 bloques (datos generales, cerezas, densidad/flotación y refractómetro) con fecha/hora actual editable, lote de solo lectura, proceso heredado del recibo y promedios °Bx en vivo.
- **Cerezas**: se conservan los 5 estados existentes (`semimaduras` se muestra como “Inmaduras o semimaduras”) y los porcentajes se calculan en vivo sin persistirse.
- **Reutilización**: combo de proceso compartido con Recibido (`ProcesoSelect`) y `InputConUnidad` para `g`, `g/ml` y `°Bx`.

### Added — Recibido de Café: estado, PDF, requeridos y limpieza (0055–0056)
- **DB `0055`**: `lotes_cafe.estado_lote` (`proceso/disponible/vendido`) con sincronización de `disponible`/`vendido`; `proceso_otro`; `% segundas/daños mecánicos/pulpa pergamino/pergamino en pulpa`; densidades de fruta/pergamino húmedo; `proceso` ampliado (`Miel`, `Semilavado`, `Anaeróbico`); se eliminan `ph_miel` y rangos de maduración; triggers de numeración `L-00001`/`R-00001`.
- **DB `0056`**: snapshot `zona_finca`/`altura_finca`; limpieza numérica `% puro/impuro/limpio/sucio`; factura automática `FC-00001` (distinta de `F-0001` de órdenes); CHECK de varietal no vacío; se retiran `puro_impuro`/`limpio_sucio`.
- **UI**: formulario con factura/zona/altura automáticas, obligatorios marcados, sección **Limpieza** y recuadro central rojo-anaranjado con campos faltantes; detalle con tarjeta de limpieza, edición de pruebas y PDF con encabezado CACD estilo perfil.
- **API**: `POST /api/recibido` deriva zona/altura y bloquea fincas incompletas; `PUT` acepta `estado_lote` y pruebas; `PGRST204/PGRST205` se mapean a 422/404.

### Changed — Pivote Beneficiado / Acopio (005, fases F0–F6)
- **DB `0050`**: nueva tabla `productores` (6 filas migradas desde `clientes` conservando `public_id` como conector K2) y `fincas.productor_id`; `fincas.cliente_id` queda deprecada.
- **DB `0051`**: se elimina el dominio legacy de lotes (`v_lotes_catacion`, 8 funciones y `DROP TABLE lotes_cafe CASCADE`). Nota: `CASCADE` no borra tablas hijas; las 10 huérfanas se borran explícitamente.
- **DB `0052`**: `lotes_cafe` rediseñada (nacimiento en **Recibido de Café**, `numero_lote`/`numero_recibo`, productor y finca, varietal, cajuelas/cuartillos, % flote/broca/vano/verde/secos, `ph_miel`, `proceso`, `enproceso` con 7 estados, `disponible`/`vendido`, `fecha_recibido`) + 1:1 `caracterizacion_lote`, `secado_lote`, `bodega_lote`, `trilla_lote`, `catacion_tueste` y `orden_lotes` sin `peso_kg`.
- **DB `0052b`/`0052c`**: RPCs `guardar_caracterizacion`, `guardar_secado`, `guardar_bodega`, `guardar_trilla` y `guardar_catacion` (con chequeo de rol), helpers internos, avance de estado solo hacia adelante y hardening (`SET search_path`, `REVOKE` a `anon`).
- **DB `0053`**: se elimina `fincas.cliente_id` y sus índices; quedan `productor_id` + UNIQUE `(productor_id, nombre)`.
- **API**: nuevas rutas `/api/recibido` (GET/POST), `/api/recibido/[id]` (GET/PUT/DELETE), las 5 etapas (`GET` fila / `PUT` RPC) y `/api/productores`; `/api/fincas` pasa a `productor_id`. Se retiran `/api/lotes/**` y `/api/cataciones/**`.
- **UI**: módulos `/beneficio/{recibido,caracterizacion,secado,bodegaje,trilla,catacion}` y grupo colapsable **Beneficiado / Acopio** en el sidebar; `/lotes/**` redirige a `/beneficio/recibido`. El dashboard y el alta de órdenes consumen el nuevo catálogo (`numero_lote`, `productores`).
- **Fincas**: formulario, listado, detalle y selector migrados a `productor_id`; el alta de órdenes usa el selector sin filtro de productor (la finca de la orden sigue siendo opcional).
- **Verificación**: `typecheck` 0 · `lint` 0 errores · 301 tests · `build` OK · `check-secrets` OK · cobertura 85.44% stmts / 79.06% branches / 82.95% funcs / 86.14% lines.

### Added — Calificación de café arábiga (006, verde y tostado)
- **DB `0054`**: tabla `calificacion_lote` (1:1 con el lote) con bloque verde (humedad, densidad, defectos primarios/secundarios, % verde) y tostado (puntaje SCA 0–100, fragancia, acidez, cuerpo, dulzor, balance, notas). Se agrega el estado `Calificado` al CHECK de `lotes_cafe.enproceso` (entre `Catado` y `Vendido`).
- **RPC**: `guardar_calificacion(p_id_lote, p_calificacion)` (`SECURITY INVOKER`, `SET search_path`) con chequeo de rol y avance a `Calificado`; el tostado exige humedad del verde (FR-003).
- **API**: `GET/PUT /api/recibido/[id]/calificacion`; detalle de lote incluye `etapas.calificacion`.
- **UI**: `/beneficio/calificacion` pasa de placeholder a etapa real (EtapaPage) con campos declarativos verde/tostado.
- **Verificación**: `typecheck` 0 · `lint` 0 errores · 309 tests · `build` OK.

### Changed — Catación mínima: lote + catado + notas (0048–0049)
- **DB `0048`**: `catacion_tueste` se reduce a `id_catacion_tueste`, `id_lote`, `catado`, `notas_catacion` y auditoría (`created_at`/`updated_at`/`deleted_at`). Se retiran **49 columnas** heredadas de CBF (físico-visual, defectos C1/C2, zarandas, Agtron, `perfil_tueste_ref`, `nlote`, `ffreposo`, `pfinales`, `producto_analizado`) y se dropea la tabla `catacion_rondas`.
- **Regla de negocio**: `id_lote` pasa a `NOT NULL` con FK `ON DELETE RESTRICT` y un índice único parcial (`WHERE deleted_at IS NULL`): una catación viva por lote. La RPC `guardar_catacion(jsonb)` hace upsert por lote y mueve el lote a `En Catación` (o lo devuelve a `No` al desmarcar).
- **DB `0049`**: vista `v_lotes_catacion` (`security_invoker`) que devuelve lotes con su estado de catación; es la que alimenta la lista.
- **API**: `GET /api/cataciones` ahora pagina **lotes** con filtro `estado=todos|si|no` y búsqueda por `nlote`; `POST` y `PUT` validan el schema mínimo.
- **UI**: la lista se reemplaza por lotes con filtro rápido *Todos / Catados / No catados*; el formulario queda en lote + casilla "El lote fue catado" + notas (máx. 2000).
- **Tipos**: `lib/schemas/catacion.ts` baja de 48 atributos + rondas a 4 campos; nuevo `lib/api/cataciones.ts`; `leerJsonPaginado()` en `lib/api/http.ts` expone la meta de paginación.
- **Trazabilidad**: `trazabilidad-panel` lee el nuevo contrato (lote + `catado`) en lugar de `pfinales`.

### Changed — Refactor de módulos (M1–M6)
- **M1 · Cliente HTTP único** (`lib/api/http.ts`): `ApiError` con `status`/`code`/`fieldErrors`/`formErrors`, `leerJson()` (acepta `issues` como ZodError serializado o aplanado) y `detalleDeError()` para toasts. Módulos tipados por recurso: `lib/api/{ordenes,lotes,servicios,perfiles-tueste}.ts`; `lib/fincas.ts` deja de duplicar su `leerJson`.
- **M2 · Estados y formato** (`lib/estados.ts`, `components/ui/estado-badge.tsx`, `lib/format.ts`): una sola fuente para los mapas de estado — elimina las 4 copias de `estadoBadge()` y el prop-drilling de `clientes/[id]` hacia `OrdenesTab`. Clases Tailwind idénticas: sin cambio visual. `formatearColones/Peso/Porcentaje` unifican el marcador de ausencia.
- **M3 · Alta de órdenes** (670 → 105 líneas): `hooks/{useOrdenFormulario,useNuevaOrden}.ts` + 9 secciones en `components/`. La carga inicial pasa a una sola tanda paralela y el resumen de confirmación se carga con `next/dynamic`. Las reglas de `onSubmit` y del resumen salen a `lib/services/orden-validacion.ts` (puras y testeadas).
- **M4 · Flujo de pasos** (562 → 71 líneas): `pasos/{usePasosOrden,PasoCard,DialogoPaso}`. El diálogo se monta solo con una acción activa, así que arranca limpio sin efecto de reinicio. `lib/services/pasos-orden.ts` concentra `seleccionarPasoActual`, `calcularTotalAcumulado` y `prepararEnvioPaso`; `ejecutarAccionPaso()` sustituye el `fetch` suelto.
- **M5 · Detalle de orden** (541 → 55 líneas): `hooks/useOrdenDetalle.ts` + `components/{AccionesOrden,OrdenImprimible,SeccionTueste,ResumenTueste}`. La cascada `orden → perfil → resumen + métricas` baja de tres a dos rondas porque perfil y resumen son la misma fila: **4 → 3 peticiones** al abrir el detalle. `calcularRendimiento` y `totalServicios` pasan a `lib/services/orden-detalle.ts`.
- **Tests**: 102 nuevos en 9 archivos (`api-http`, `api-recursos`, `fincas-client`, `estados`, `estado-badge`, `format`, `orden-validacion`, `pasos-orden`, `orden-detalle`). Suite: **200 → 302**.
- **Docs**: `ARCHITECTURE.md` y `diagrams/system_arch.mmd` ya no citan `lib/services/orquestador.ts`, eliminado en la fusión.

### Fixed — Refactor de módulos
- **`/ordenes/[id]` · "Peso facturable" mostraba `true kg`**: `paso.peso_facturable_kg ?? paso.peso_inicial_kg != null` se evaluaba como `peso_facturable_kg ?? (peso_inicial_kg != null)`. Ahora usa `formatearPeso(peso_facturable ?? inicial)`.

### Added — Módulo de Fincas y correcciones del alta de lotes (005-fincas-crud)
- **CRUD de Fincas** en `/fincas` (lista con búsqueda, filtro por productor y paginación), `/fincas/nueva`, `/fincas/[id]` (datos, resumen y lotes de la finca) y `/fincas/[id]/editar`; entrada **Fincas** en el sidebar.
- **`fincas.ubicacion`** (texto libre ≤ 200) y **`altura` opcional** (0046): antes era `NOT NULL`.
- **`FincaForm`** con productor, nombre, altura, zona del catálogo (con "+ Nueva zona" inline) y ubicación.
- **Fuente única de fincas/zonas** (`lib/fincas.ts` + `FincaSelect`): la usan el alta de lote, el alta de orden y el módulo de fincas.
- **`GET /api/fincas/[id]`** devuelve `lotes[]`, `ordenes_count` y `tiene_dependencias`; `PUT`/`DELETE` responden **409** con lotes u órdenes asociados (no se orfanan datos).
- **Datos demo** (0047): 5 fincas para los productores 2–5 con zona, ubicación y altura — Cooperativa Los Santos con 2 para mostrar 1 cliente → N fincas. Idempotente y reversible.

### Fixed — Alta de lotes (005)
- **El trigger de los `Select` mostraba el `id`**: Base UI renderiza el `value` crudo si el Root no recibe `items`. Se pasan `items` en productor, finca, perfil/lote de catación, servicios, responsable y finca de la edición de orden.
- **"Solo el primer cliente tenía fincas"**: los clientes demo 2–5 no tenían fincas registradas (no era un permiso). El selector ahora avisa, ofrece **+ Crear finca** inline y el módulo `/fincas` permite administrarlas.
- **Selector de finca reactivo al productor** y con la misma fuente que Crear Órdenes (mismo componente y endpoint).
- **Altura automática**: al elegir la finca se completa sola (read-only) y viaja en el payload del lote; el API la valida contra `fincas.altura` (400 si no coincide) y la devuelve en el reporte con la finca.

### Added — Refactor del flujo de lotes (004-refactor-flujo-lotes)
- **Trazabilidad por `id`**: cadena `cliente → finca → lote → orden → perfil de tueste → catación` (reemplaza el texto libre `nproductor`/`nfinca`/`zona`/`zona_finca`/`zona_procedencia`).
- **Tabla `fincas`** (0038): finca por cliente con `altura`, zona opcional (`zonas_finca`), UNIQUE parcial por nombre y RLS con 3 policies.
- **Lote enlazado** (0039): `lotes_cafe.id_cliente`/`id_finca` (FK), `proceso_cafe` (enum `Lavado/Honey/Natural/Otro`) y `enproceso` con `'En Catación'` y `'Vendido'`; `ordenes_trabajo.id_finca`.
- **`orden_lotes`** (0040): relación N:M lote↔orden con `peso_kg`, PK compuesta y RLS (escritura `Admin`/`Recepción`); reemplaza `orden_lotes_externos`.
- **Backfill** (0041): clientes desde `nproductor`, fincas desde `(nfinca, zona)` con altura, propagación a lotes y migración de `orden_lotes_externos → orden_lotes` por `nlote` (0 sin-match); corrige la secuencia `clientes_id_cliente_seq`.
- **Catación con lote** (0042): `guardar_catacion` deriva `nlote` de `orden_lotes` y transiciona el lote a `'En Catación'` al guardar, o `'Vendido'` con `finalizada=true`; editar una catación de un lote vendido no lo degrada.
- **API**: `/api/fincas` (GET paginado por `cliente_id` + búsqueda, POST `23505→409`/`23503→400`, `[id]` GET/PUT/DELETE soft); `/api/lotes` con `id_cliente`/`id_finca` obligatorios y embeds; `/api/ordenes` acepta `id_finca` + `lotes[]` y enlaza tras la RPC; `/api/cataciones` embebe el lote con finca y productor.
- **UI**: combobox Productor → Finca con **altura auto** y "+ Crear finca" inline (lotes y órdenes); selector de **finca** y multi-select de **lotes** al crear una orden; selector de lote en catación (`nlote · finca · productor`) con checkbox "catación finalizada"; **dashboard con un apartado por fase** (`Acopio`, `Secado`, `Trilla`, `Bodega`, `Catación`, `Vendido`).
- **Spec** `specs/004-refactor-flujo-lotes/` (spec, plan, tasks) con decisiones D1–D9 y P1–P6 cerradas.

### Removed — Refactor del flujo de lotes (T12, 0044–0045)
- **Drop del texto libre legacy** (0044): `lotes_cafe.nproductor`/`nfinca`/`zona`/`altura`, `ordenes_trabajo.zona_finca`, `clientes.zona_procedencia` y la tabla puente `orden_lotes_externos`; `lotes_cafe.id_cliente`/`id_finca` pasan a **NOT NULL**. El esquema queda solo por `id`.
- `crear_orden_completa` inserta `id_finca` (adiós `zona_finca`); **e1** `crear_orden_desde_trilla` usa `id_cliente`/`id_finca` del lote (sin conciliación por nombre) e idempotencia por `orden_lotes`; `guardar_catacion` (0045) ya no tiene fallback a `orden_lotes_externos`.
- UI: se retira "Zona o Finca" del alta de orden (la finca es el selector `id_finca`, ahora también editable en `/ordenes/[id]/editar`) y "Zona de procedencia" del cliente; el detalle de orden muestra la finca con su altura.
- Nuevo índice `idx_fincas_nombre_trgm` (sustituye `idx_lotes_nproductor_trgm` para el combobox de fincas).

### Fixed — Refactor del flujo de lotes
- `CatacionForm` enviaba y reseteaba el formulario con una forma plana que no coincidía con `{ catacion, rondas }`: al editar no se precargaban los campos. Ahora `FormValues` es anidado y `reset` mapea las rondas (`id_catacion_ronda → id`).
- `guardar_catacion` ya no depende solo de `orden_lotes_externos` para derivar `nlote` (usa `orden_lotes` primero; desde 0045 ya no existe el fallback).
### Fixed — Correcciones post-fusión (003-correcciones-post-fusion)
- **DB `0036`**: `CHECK (estado IN ('Pendiente','Completado'))` en `perfiles_tueste` (espejo del enum Zod; última columna de estado sin constraint).
- **DB `0037`**: eliminados 4 enums huérfanos (`tipo_tueste_enum`, `tipo_molienda_enum`, `tipo_empaque_enum`, `tipo_servicio_enum`; 0 dependencias verificadas).
- **DB `0033`/`0034`/`0035`**: hardening de `search_path` en 9 funciones; 9 índices de FK + `empleados_lectura_propia` con `(select auth.uid())`; `REVOKE EXECUTE … FROM PUBLIC` de `get_empleado_rol()` (el `REVOKE … FROM anon` de `0026` era inefectivo) y 3 índices redundantes.
- **`/reportes`**: eliminado el N+1 (una consulta `.in("id_perfil", ids)` + agrupación en memoria).
- **`/tueste/[perfilId]`**: `RendimientosDialog` y `RegistroConfirmadoDialog` a `next/dynamic` con montaje condicional (chunk bajo demanda).
- **Fuentes self-hosted**: `next/font/google` (Inter, Montserrat, Geist Mono) → `next/font/local` con variable fonts subset latin en `app/fonts/`; el build deja de depender de Google Fonts.

### Added — Fusión CoffeeBeanFlow (002-fusion-cbf, Fases 0–4)
- **Módulo Lotes end-to-end** (0027): `lotes_cafe` (29 columnas, RLS 3 policies, índices incl. `idx_lotes_nlote_trgm`), API `/api/lotes` (GET paginado + búsqueda trgm + filtros, POST→RPC, 23505→409) y `/api/lotes/[id]` (GET con órdenes enlazadas K1, PUT, DELETE soft), UI completa (lista con debounce/estados/badges, nueva, detalle, editar) con RHF+Zod.
- **Etapas del lote** (0028–0031): `caracterizacion_lote`+3 RC (upsert por id de lote+tiempo), `secado_lote`+4 series débiles con RPCs de upsert dif sync, `bodega_lote`+N:M `secado_bodega` (sync con validación de pertenencia), `trilla_lote`+`peso_verde_trilla` 1:1 (toggle off → soft-delete). UI de 4 pestañas en `/lotes/[id]`.
- **Catación pipeline** (0032): `catacion_tueste` (48 atributos del snapshot real de CBF incl. `c2cortado`, `dfueste` g/ml) + `catacion_rondas` (solo `valor_calidad`) con K3 materializada (`perfil_tueste_ref` FK a `public_id`), FK `id_lote` y FK `nlote` materializadas; RPC `guardar_catacion` (autoderiva `nlote` vía K1; perfil no-Completado rechazado); API `/api/cataciones` GET/POST/PUT + UI completa (6 secciones, rondas FormArray, selector de perfiles `Completado`).
- **e1 `crear_orden_desde_trilla`**: RPC que convierte una trilla completada (requiere `wverde_final>0`) en orden de CafeTrack — idempotente por lote (K5), K4 concilia productor→cliente o 400 con pedido de conciliación, 7 `orden_pasos` de la planta, puente K1 con peso verde; botón "Enviar a proceso" en Trilla Panel.
- **e2 flujo de catación**: selector de perfiles `Completado` (FR-014) + `Puntaje Final` + trazabilidad.
- **Pestaña "Trazabilidad Integral"** en `/lotes/[id]`: timeline de 9 etapas (Acopio→…→Vendido) con estados reales, resumen por etapa y enlaces directos a la orden (e1) y cataciones (e2).
- **Conectores** (0026): K1 `orden_lotes_externos` (RLS 3 policies, PK compuesta), K2 `public_id` en orden/perfiles/clientes, K4 `clientes.external_ref`; índice `idx_catacion_nlote`; `REVOKE EXECUTE` de `get_empleado_rol` a `anon` (linter 0028).
- **RPCs transaccionales de la fusión** (todas INVOKER, EXECUTE solo `authenticated`): `guardar_caracterizacion`, `guardar_secado` (+2 helpers de serie), `guardar_bodega`, `guardar_trilla`, `guardar_catacion`, `crear_orden_desde_trilla` (los lotes se crean por inserción directa con RLS).
- **Demo SC-003 persistente** (datos de demostración para aceptación): lote `LT-E2E-001` (Finca San Luis) con caracterización → secado (dsecado=2, 3 humedades) → bodega (10 sacos) → trilla (wverde_final 645) → e1 orden **#43 / F-0043** → perfil **#27 "TQ-E2E-01"** Completado → catación **#2** (pfinales 85.25, rtostado 88, dfueste 0.68 g/ml, promedio rondas 87.0). Consultable con la SQL de trazabilidad del doc raíz §5.

### Changed — Fusión CB
- `crear_orden_completa` (0024): cast de `proceso_cafe` al enum y `hora_cierre` a `time` (dos bugs de casting latentes, solo eran invisibles con proceso NULL).
- Helpers de serie (`upsert_serie_secado`, `upsert_serie_camas`, `guardar_catacion`): el soft-delete de "no-enviados" ahora preserva los ids recién insertados sin id (`v_nuevos int[]` + `NOT IN (SELECT unnest(...))`); el patrón viejo `<> ALL (subquery)` mataba ítems nuevos del mismo pase.

### Security — Fusión CB
- Todos los endpoints nuevos con JWT + `requireRole` (regla 5 de porteo): `guardar_*`/`crear_orden_desde_trilla` solo `authenticated`; RLS en las 15 tablas nuevas (3 policies c/u) con REVOKE a `anon`.

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
- Flujo de creación de órdenes reordenado: card de Humedad propia tras Servicios, molienda condicionada, Empaque condicionado y Encabezado al final (`feat/refactor-flujo-orden-tueste`).
- Registro de temperaturas con pasos ajustados al perfil (0.5/1/2) e intervalo personalizado persistente; diálogo de confirmación con auto-cierre.
- Modal de **Rendimientos** al finalizar tueste (peso obligatorio, humedad pre-llenada, resumen y acceso directo a la orden).
- Paginación server-side en listados (`{ data, pagination }`, `pageSize` ≤ 100) con proyecciones explícitas y sanitización de búsqueda.
- Módulo offline v2: sync bulk idempotente vía `/api/sync`, backoff exponencial, single-flight y dead-letter queue en IndexedDB con badge de reintento.
- Observabilidad: `lib/observability.ts` (logs estructurados con redacción de secretos), `x-correlation-id` en errores y timing en `withErrorHandler`.
- Escenarios k6 de carga (`performance/`, 6 módulos) y plan de crecimiento de datos.
- RPCs transaccionales (0024): `crear_orden_completa`, `crear_servicio_con_precios`, `actualizar_servicio_con_precios`, `cerrar_paso_orden`, `confirmar_tueste_paso` (INVOKER, EXECUTE solo `authenticated`).
- Migración `0023` con 10 índices de performance (+ extensión `pg_trgm`).
- Migración `0025`: constraint `EXCLUDE` con `numrange('[)')` que impide traslapes de tarifas a nivel de base de datos (reemplaza al trigger).
- Endpoint `POST /api/perfiles-tueste/[id]/hitos` para registro en lote (sync offline).
- Escáner de secretos v2 (`npm run check-secrets`) con 6 categorías de patrones y suite propia.
- Documentación nueva: `OBSERVABILITY`, `PERFORMANCE_TESTING`, `PERFORMANCE_INDEXES`, `DATA_GROWTH_PLAN`, `LEGACY_MIGRATION_PLAN`.

### Changed
- `servicios_ejecutados.tipo_servicio` pasó de enum a TEXT para soportar nombres arbitrarios de servicios del maestro.
- Constraint UNIQUE de `servicios_ejecutados` ahora es `(id_orden, tipo_servicio, empaque_id)` (permite mismo servicio con distintos empaques).
- Formulario de nueva orden usa el catálogo del maestro con auto-completado y cálculo en tiempo real.
- Detalle de orden muestra precio/kg, precio de empaque y total por línea.
- Escrituras multi-tabla de la API migradas de rollbacks manuales a RPCs transaccionales; eliminado el orquestador client-side (`lib/services/orquestador.ts`).
- Sincronización offline consolidada en la capa API; lecturas de listados migradas de Supabase directo al API.
- Cobertura global: 66.07% → 79.86% stmts (160 tests, 17 suites).

### Fixed
- Columna inexistente `empleados.auth_user_id` corregida a `id_auth` en rutas `iniciar` y RPCs.
- `scripts/apply-migration.mjs` ya no usa credenciales hardcodeadas (sólo `process.env`).
- Los intervalos de precio contiguos (p. ej. `[500, 1000)` y `[1000, 1500)`) ya no son rechazados por validación traslape.

### Security
- **CREDENCIALES EXPUESTAS (histórico)**: commits anteriores exponen `PROJECT_REF`, `DB_PASSWORD` y un token `sbp_*` en el historial de git. El código fuente actual ya no las contiene (PR #37). Pendiente manual: rotar `DB_PASSWORD`, revocar el token `sbp_*` y, con autorización del equipo, reescribir historial (`git filter-repo`). Detalle en `docs/SECURITY.md` y `docs/RUNBOOK.md`.
