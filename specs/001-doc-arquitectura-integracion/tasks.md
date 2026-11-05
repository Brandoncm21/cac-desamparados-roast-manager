# Tasks: Documento técnico de integración CafeTrack ↔ CoffeeBeanFlow

**Feature**: `001-doc-arquitectura-integracion` | **Input**: [spec.md](./spec.md) + [research.md](./research.md)

> Salida única: `ARQUITECTURA_Y_DATOS_INTEGRACION.md` (raíz). Reglas transversales: español, sin secretos, evidencia citable, hipótesis marcadas, Mermaid renderizable.

- [ ] **T1. §1 Visión General y Stack**
  - [ ] Propósito del documento y audiencia
  - [ ] Tabla de stack exacto (Next.js 16.2.10, React 19.2.4, Supabase SSR/RLS, Zod 4, RHF, Tailwind 4, Vitest; nota TanStack Query instalado sin adoptar)
  - [ ] Diagrama Mermaid de capas (Browser → Middleware → API → Services → Supabase; rama cliente anónimo sin sesión; rama IndexedDB → `/api/sync`)
  - [ ] Fila de contexto: middleware redirige `/api/*` (salvo `/api/auth`) a `/login` con 307 HTML (sin 401 JSON); sin CORS (same-origin); sin webhooks ni Realtime consumido
- [ ] **T2. §2 Base de Datos (CRÍTICO)**
  - [ ] ER `erDiagram` 16 tablas con cardinalidades y ON DELETE reales
  - [ ] Catálogo columna a columna de las 16 tablas (tipo, NULL, default, PK/FK/UNIQUE/CHECK/EXCLUDE, índices) con trazabilidad por nº de migración
  - [ ] Enums: 9 (4 huérfanos verificados + nota de delta); 3 convenciones de estado coexistiendo
  - [ ] RLS por tabla (44 políticas) + `get_empleado_rol()` + divergencia `admin/empaques` (service_role) vs `admin/servicios` (RLS)
  - [ ] Tabla de funciones expuestas con privilegios `anon`/`authenticated` verificados (énfasis `soft_delete_row` → propuesta de eliminación)
  - [ ] Triggers vigentes (9) + eliminados + 5 RPCs de `0024` (INVOKER, auto-cierre)
  - [ ] Estado/historial: `deleted_at` (3 tablas) vs `activo` vs `valid_from/valid_to` vs snapshots
  - [ ] Índices (57): los 10 de `0023`, parciales, trgm, duplicados señalados, EXCLUDE GiST de `0025`
- [ ] **T3. §3 Lógica de Negocio**
  - [ ] Flujo A: orden → pasos secuenciales (`crear_orden_completa` → iniciar con tarifa `[min,max)` → cerrar/`confirmar_tueste_paso` → auto-cierre) + `sequenceDiagram` Mermaid
  - [ ] Flujo B: perfil tueste → series → DTR/resumen
  - [ ] Flujo C: sync offline (IndexedDB `scacr-offline` v2 → single-flight chunks 200 → DLQ, backoff 5s·2ⁿ cap 5min, 3 reintentos)
  - [ ] Reglas invariables (Zod por schema + CHECK/EXCLUDE DB)
  - [ ] Tabla de inconsistencias entre capas (RLS vs API, `PATCH /estado` sin transiciones, `OMITIDO` sin endpoint, DELETE con service_role)
- [ ] **T4. §4 Matriz de Integración (Crossover)**
  - [ ] 4.1 Contraparte CBF: stack, ER compacto (19 tablas), inventario de endpoints por controller (62 verificados), convenciones, tabla de las 16 discrepancias con destino en la fusión
  - [ ] 4.2 Mapeo semántico entidad↔entidad (tabla completa)
  - [ ] 4.3 Claves y conectores K1–K6 (`numero_lote` explícitamente descartado)
  - [ ] 4.4 Plan de Adaptación por FUSIÓN + mini-ADR (alternativas cross-system rechazadas)
  - [ ] 4.5 Catálogo de las 47 combinaciones método+ruta de CafeTrack + contrato de serialización/errores vs CBF
  - [ ] 4.6 Desafíos T1–T16 (obligatorios T5, T6, T8, T12, T13, T14, T15, T16)
  - [ ] 4.7 Pipeline unificado bidireccional (Mermaid) con eventos de enlace
  - [ ] 4.8 Prerrequisitos de seguridad pre-integración (C1, C2, A1, A2–A3, A5)
- [ ] **T5. Anexos A–F**
  - [ ] A: glosario de enums; B: índices; C: códigos de error CafeTrack vs CBF; D: referencias (migración y archivo:línea); E: timeline de migraciones (0001–0025); F: deriva documentación↔código
- [ ] **T6. Verificación final**
  - [ ] Conteos: 24 migraciones, 16 tablas, 47 handlers/29 archivos, 62 endpoints CBF, 16 discrepancias, 9 enums
  - [ ] ≥5 Mermaid renderizables; 0 secretos; `numero_lote` descartado como clave
  - [ ] `npx tsc --noEmit` + `npm run lint` pasan; longitud 1200–1600 líneas
