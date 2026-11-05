# Feature Specification: Documento técnico `ARQUITECTURA_Y_DATOS_INTEGRACION.md` (Crossover CafeTrack ↔ CoffeeBeanFlow)

**Feature Branch**: `001-doc-arquitectura-integracion`

**Created**: 2026-11-04

**Status**: Draft

**Input**: Documento Markdown autosuficiente que sirva de base estructural para fusionar CoffeeBeanFlow (CBF) dentro de CafeTrack/SCACR, producido mediante flujo spec-driven con verificación contra código real y esquema aplicado.

**Decisión de diseño (NO renegociable)**: FUSIÓN de módulos en CafeTrack. Las 6 etapas de CBF (acopio, caracterización, secado, bodega, trilla, catación) se portan como módulos nuevos dentro del stack de CafeTrack (Next.js + Supabase). Las opciones cross-system (API dedicada, vistas de lectura, outbox/webhook) solo se mencionan como apéndice de contingencia, NO como plan principal.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Documento base verificado (§1-§4) (Priority: P1)

Un arquitecto/lead técnico abre `ARQUITECTURA_Y_DATOS_INTEGRACION.md` en la raíz del repo y encuentra: (§1) visión general y stack con diagrama de capas; (§2) catálogo completo columna a columna de las 16 tablas de CafeTrack con ER Mermaid, RLS, funciones expuestas, triggers/RPCs, historial de estado e índices; (§3) la lógica de negocio (flujos A/B/C, reglas Zod, inconsistencias entre capas); (§4) la matriz de integración orientada a FUSIÓN (contraparte CBF, mapeo semántico, claves K1-K6, plan de adaptación, catálogo de APIs, desafíos, pipeline unificado, prerrequisitos de seguridad). Cada dato es trazable a una migración o `archivo:línea`, y los conteos coinciden con el código fuente.

**Why this priority**: Es el entregable central; sin §1-§4 completo y verificado, el documento no sirve de base estructural para la fusión.

**Independent Test**: Se puede verificar leyendo el documento y contrastando cada sección contra el repo (conteos, migraciones citadas, diagramas renderizables) sin necesidad de las secciones P2/P3.

**Acceptance Scenarios**:

1. **Given** el documento en la raíz del repo, **When** se contrasta el catálogo de §2 contra un PostgreSQL con las 24 migraciones aplicadas, **Then** las 16 tablas, sus columnas, constraints e índices coinciden (trazabilidad por número de migración).
2. **Given** la sección §4.4 (Plan de Adaptación por FUSIÓN), **When** un lector la interpreta, **Then** no puede confundirla con una integración cross-system: el plan principal es portar los módulos CBF a CafeTrack, con las alternativas cross-system solo como apéndice de contingencia.

---

### User Story 2 - Mapeo semántico y desafíos (Priority: P2)

Un ingeniero de datos usa las matrices de §4 para planificar la migración de datos: mapeo entidad↔entidad (CafeTrack ↔ CBF), catálogo de endpoints de ambos sistemas, y la tabla de desafíos técnicos T1-T16 con los casos críticos (heurística de capacidades, zona horaria, solapamiento de trilla, legacy `servicios_ejecutados`).

**Why this priority**: Depende de §1-§4 (P1) pero es el puente operativo para ejecutar la fusión.

**Independent Test**: Se puede verificar cruzando el mapeo semántico contra ambos esquemas (16 + 19 tablas) y los inventarios de endpoints (47 handlers CafeTrack; inventario CBF fila a fila).

**Acceptance Scenarios**:

1. **Given** la tabla de mapeo semántico, **When** se revisa la fila de `numero_lote`, **Then** aparece explícitamente descartado como clave compartida (con la justificación y la alternativa K1).
2. **Given** la tabla de desafíos, **When** se buscan T5, T6, T8, T12, T13, T14, T15 y T16, **Then** están presentes con su impacto y mitigación.

---

### User Story 3 - Anexos de referencia (Priority: P3)

Un desarrollador consulta los anexos para trabajo diario: glosario de enums, índices, códigos de error CafeTrack vs CBF, referencias (migración y archivo:línea), timeline de migraciones (0001-0025) y deriva documentación↔código.

**Why this priority**: Valor de consulta; no bloquea la decisión de fusión.

**Independent Test**: Se puede verificar que los anexos existen, son navegables y sus referencias apuntan a archivos/migraciones reales.

**Acceptance Scenarios**:

1. **Given** el anexo de deriva, **When** se contrasta con `docs/` y el código, **Then** cada desviación listada es reproducible (p. ej. `PUT` vs `PATCH` en `/estado`, 28+/37 vs 47 rutas).

---

### Edge Cases

- ¿Qué pasa si un conteo del código real difiere del número esperado (p. ej. endpoints CBF 62 vs "63" del checklist de la spec externa)? → El documento reporta el número real verificado con nota explícita del delta (regla de evidencia).
- ¿Qué pasa si el esquema aplicado difiere de producción (drift)? → Se anota como drift en §2, sin alterar la fuente primaria (migraciones).
- ¿Qué pasa si un dato no es verificable en repo ni en spec CBF? → Se marca como **(hipótesis)** o **(confirmar con responsable)**.
- ¿Qué pasa si hay secretos en archivos citados? → Nunca se incluyen valores; se referencia el issue de seguridad documentado.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El documento DEBE existir en la raíz del repo (`ARQUITECTURA_Y_DATOS_INTEGRACION.md`) con las 4 secciones obligatorias (§1-§4) y anexos.
- **FR-002**: §2 DEBE catalogar las 16 tablas columna a columna (tipo, NULL, default, PK/FK/UNIQUE/CHECK, índices), con trazabilidad por **número de migración** (p. ej. `0017`, `0025`); citar líneas donde aplique.
- **FR-003**: §2 DEBE incluir `erDiagram` Mermaid con cardinalidades y ON DELETE reales.
- **FR-004**: §4 DEBE incluir la contraparte CBF con **ER compacto Mermaid (19 tablas)** y matriz de mapeo semántico.
- **FR-004b**: §4 DEBE incluir el **inventario de los endpoints CBF por controller** (conteo real verificado fila a fila; el checklist de la spec externa afirma 63) y la tabla de las **16 discrepancias conocidas de CBF**.
- **FR-005**: Todo diagrama Mermaid DEBE ser sintácticamente renderizable (GitHub).
- **FR-006**: El documento NO DEBE contener secretos ni credenciales (ver README §"Rotación de credenciales históricas").
- **FR-007**: Idioma: español (consistente con `docs/` existente).
- **FR-008**: §2 o §4 DEBE incluir sección **"Prerrequisitos de seguridad pre-integración"** (hallazgos C1/C2/A1/A5 + capas de autorización).
- **FR-009**: Debe existir anexo de **deriva documentación↔código** (README/docs vs comportamiento real).
- **FR-010**: El conector de lotes DEBE ser la **tabla puente `orden_lotes_externos` + `public_id` UUID** (K1-K6). **PROHIBIDO** proponer `perfiles_tueste.numero_lote` como clave compartida: es un identificador de lote de tueste de 20 caracteres sin FK, no el lote de café de CBF.
- **FR-011**: §4.4 DEBE ser el **Plan de Adaptación por FUSIÓN** con mini-ADR (decisión, alternativas rechazadas, consecuencias).

### Metodología de verificación (obligatoria)

- Las 24 migraciones (`0001`-`0025`, no existe `0008`) DEBEN aplicarse sobre un PostgreSQL limpio (con *stubs* de `auth.users`, `auth.uid()` y roles, o equivalente controlado) y el catálogo final DEBE leerse del sistema (`information_schema`, `pg_constraint`, `pg_indexes`, `pg_policies`, `pg_proc`), no solo de la lectura de archivos.
- Cada función `SECURITY DEFINER` DEBE verificar `has_function_privilege('anon', ...)` y `has_function_privilege('authenticated', ...)`.
- El proyecto Supabase real se usa SOLO para anotar drift, nunca como fuente primaria.
- El código fuente (29 `route.ts` con 47 handlers, `lib/schemas/**`, `lib/offline/**`, `lib/services/**`, `middleware.ts`, `lib/api-helpers.ts`) DEBE verificarse directamente, sin confiar ciegamente en el contexto inyectado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 16/16 tablas CafeTrack documentadas con todas sus columnas y cascadas, trazables a número de migración.
- **SC-002**: 19/19 tablas CBF en ER compacto + inventario de endpoints CBF (conteo real fila a fila) + 16 discrepancias listadas.
- **SC-003**: ≥5 diagramas Mermaid renderizables (capas, ER CafeTrack, ER CBF compacto, secuencia crear orden, pipeline unificado bidireccional).
- **SC-004**: Conteos verificados contra código real: 24 migraciones (sin 0008), 47 handlers en 29 archivos `route.ts`, 9 enums (3 huérfanos), 5 RPCs transaccionales.
- **SC-005**: Mapeo semántico completo; `numero_lote` explícitamente descartado como clave compartida (K1 puente como alternativa).
- **SC-006**: §4.8 de prerrequisitos de seguridad presente; 0 secretos; 0 discrepancias silenciadas; tabla de funciones expuestas con privilegios `anon`/`authenticated` verificados.
- **SC-007**: `npx tsc --noEmit` y `npm run lint` siguen pasando (no se tocó código).
- **SC-008**: Extensión 1200-1600 líneas; exactitud priorizada sobre brevedad en §2.

## Assumptions

- La spec externa CBF (`ESPECIFICACION_RECONSTRUCCION.md`, Escritorio) es la fuente de verdad única de la contraparte; NO existe código CBF en el workspace (no se busca).
- El PostgreSQL de verificación puede ser local (Docker) con stubs mínimos de `auth`; el objetivo es la fidelidad del esquema final, no el entorno Supabase completo.
- Contexto de negocio: "Nº de Beche" y terminología similar no verificable se marca como (hipótesis)/(confirmar con responsable).
- Solo se escribe: `ARQUITECTURA_Y_DATOS_INTEGRACION.md` (raíz) + artifacts en `specs/`. Cero cambios de código, migraciones o configuración.
