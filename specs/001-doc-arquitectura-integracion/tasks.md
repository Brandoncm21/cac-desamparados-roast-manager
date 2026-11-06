# Tasks: Documento técnico de integración CafeTrack ↔ CoffeeBeanFlow

**Feature**: `001-doc-arquitectura-integracion` | **Input**: [spec.md](./spec.md) + [research.md](./research.md)

> Salida única: `ARQUITECTURA_Y_DATOS_INTEGRACION.md` (raíz). Reglas transversales: español, sin secretos, evidencia citable, hipótesis marcadas, Mermaid renderizable.
>
> **Estado**: tareas verificadas en el Paso 6 (2026-11-06) contra el doc raíz y la BD real (MCP: 16 tablas / 57 índices / 44 políticas / 9 enums). Nota de sincronización: el conteo real de endpoints CBF es **62** (61 de controllers + 1 health; el "63" del checklist de la spec es un error de su propio resumen) y las discrepancias CBF son ahora **17** (se añadió la #17 sobre ese error de conteo).

- [x] **T1. §1 Visión General y Stack**
  - [x] Propósito del documento y audiencia
  - [x] Tabla de stack exacto (Next.js 16.2.10, React 19.2.4, Supabase SSR/RLS, Zod 4, RHF, Tailwind 4, Vitest; nota TanStack Query instalado sin adoptar)
  - [x] Diagrama Mermaid de capas (Browser → Middleware → API → Services → Supabase; rama cliente anónimo sin sesión; rama IndexedDB → `/api/sync`)
  - [x] Fila de contexto: middleware redirige `/api/*` (salvo `/api/auth`) a `/login` con 307 HTML (sin 401 JSON); sin CORS (same-origin); sin webhooks ni Realtime consumido
- [x] **T2. §2 Base de Datos (CRÍTICO)**
  - [x] ER `erDiagram` 16 tablas con cardinalidades y ON DELETE reales
  - [x] Catálogo columna a columna de las 16 tablas (tipo, NULL, default, PK/FK/UNIQUE/CHECK/EXCLUDE, índices) con trazabilidad por nº de migración
  - [x] Enums: 9 (4 huérfanos verificados + nota de delta); 3 convenciones de estado coexistiendo
  - [x] RLS por tabla (44 políticas) + `get_empleado_rol()` + divergencia `admin/empaques` (service_role) vs `admin/servicios` (RLS)
  - [x] Tabla de funciones expuestas con privilegios `anon`/`authenticated` verificados (énfasis `soft_delete_row` → propuesta de eliminación)
  - [x] Triggers vigentes (9) + eliminados + 5 RPCs de `0024` (INVOKER, auto-cierre)
  - [x] Estado/historial: `deleted_at` (3 tablas) vs `activo` vs `valid_from/valid_to` vs snapshots
  - [x] Índices (57): los 10 de `0023`, parciales, trgm, duplicados señalados, EXCLUDE GiST de `0025`
- [x] **T3. §3 Lógica de Negocio**
  - [x] Flujo A: orden → pasos secuenciales (`crear_orden_completa` → iniciar con tarifa `[min,max)` → cerrar/`confirmar_tueste_paso` → auto-cierre) + `sequenceDiagram` Mermaid
  - [x] Flujo B: perfil tueste → series → DTR/resumen
  - [x] Flujo C: sync offline (IndexedDB `scacr-offline` v2 → single-flight chunks 200 → DLQ, backoff 5s·2ⁿ cap 5min, 3 reintentos)
  - [x] Reglas invariables (Zod por schema + CHECK/EXCLUDE DB)
  - [x] Tabla de inconsistencias entre capas (RLS vs API, `PATCH /estado` sin transiciones, `OMITIDO` sin endpoint, DELETE con service_role)
- [x] **T4. §4 Matriz de Integración (Crossover)**
  - [x] 4.1 Contraparte CBF: stack, ER compacto (19 tablas), inventario de endpoints por controller (62 verificados), convenciones, tabla de las 17 discrepancias con destino en la fusión
  - [x] 4.2 Mapeo semántico entidad↔entidad (tabla completa)
  - [x] 4.3 Claves y conectores K1–K6 (`numero_lote` explícitamente descartado)
  - [x] 4.4 Plan de Adaptación por FUSIÓN + mini-ADR (alternativas cross-system rechazadas)
  - [x] 4.5 Catálogo de las 47 combinaciones método+ruta de CafeTrack + contrato de serialización/errores vs CBF
  - [x] 4.6 Desafíos T1–T16 (obligatorios T5, T6, T8, T12, T13, T14, T15, T16)
  - [x] 4.7 Pipeline unificado bidireccional (Mermaid) con eventos de enlace (T8 fuente de verdad marcado "(por decidir)")
  - [x] 4.8 Prerrequisitos de seguridad pre-integración (C1, C2, A1, A2–A3, A5)
- [x] **T5. Anexos A–F**
  - [x] A: glosario de enums; B: índices; C: códigos de error CafeTrack vs CBF (+ propuesta de contrato unificado); D: referencias (migración y archivo:línea); E: timeline de migraciones (0001–0025); F: deriva documentación↔código
- [x] **T6. Verificación final** (Paso 6 — 2026-11-06)
  - [x] Conteos: 24 migraciones (sin 0008), 16 tablas, 47 handlers/29 archivos, **62** endpoints CBF, **17** discrepancias, 9 enums (4 huérfanos)
  - [x] 5 Mermaid estructuralmente válidos; 0 secretos; `numero_lote` descartado como clave
  - [x] `npx tsc --noEmit` (exit 0) + `npm run lint` (exit 0; 36 warnings preexistentes, 0 errores); longitud ~1220 líneas físicas
  - [x] Paso 5 cerrado (2026-11-06): 4 respuestas de dominio aplicadas y **validadas contra el proyecto CBF real** (Beche = bache de tostadora · trilla split por tipo de dato · `rtostado` = rendimiento con evidencia de etiqueta UI · `dfueste` = g/ml canónico según `FRONTEND_DOCUMENTATION.md:548`). Hallazgos derivados: discrepancia #4 reformulada (pfinales SÍ existe en el seed), delta #18 (9 migraciones, no 8), proyecto real descubierto como recurso de implementación. Pendientes operativos menores quedan "(por confirmar con la planta)" en el doc.
