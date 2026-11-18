# Feature Specification: Calificación de café Arábiga (verde y tostado)

**Feature Branch**: `feat/006-calificacion-cafe`
**Created**: 2026-11-17
**Status**: Borrador — pendiente de aprobación de 3 decisiones (ver §Decisiones abiertas)

## Contexto

El pivote Beneficiado (`0050`–`0053`) dejó el flujo en 7 etapas: `Recibido → En Caracterización →
En Secado → En Bodega → En Trilla → Catado → Vendido`. La etapa **Calificación** existe en el menú
(`/beneficio/calificacion`) pero es solo un placeholder: no tiene tabla ni lógica.

Esta feature implementa **la evaluación final del lote**: primero el café **verde** (análisis físico)
y luego el **tostado** (análisis físico y sensorial). Es el punto 7 del flujo pedido por el dueño.

> **Relación con `0048`.** La migración `0048` retiró de `catacion_tueste` los 48 atributos heredados
> de CBF y la tabla `catacion_rondas`, dejando la catación en `catado` + `notas_catacion`.
> Esta feature **no revive** ese modelo: crea una entidad propia y explícita de calificación, con los
> campos que el dueño confirme. La catación sigue siendo un registro mínimo y no se toca.

## Historias de usuario

### US1 — Registrar la calificación del café verde (P1)

Como tostador, registro el análisis físico del café verde de un lote para dejar constancia de su
calidad antes de tostar.

**Por qué P1**: sin el registro del verde, la etapa no aporta valor; es el primer corte del control.

**Test independiente**: sobre un lote en `Catado`, guardo humedad, densidad y defectos; al volver a
la pantalla los datos persisten y el lote queda marcado con calificación verde.

**Aceptación**
1. **Given** un lote existente, **When** abro su calificación, **Then** veo el formulario de verde
   con humedad (%), densidad (g/ml), defectos primarios y secundarios.
2. **Given** datos válidos, **When** guardo, **Then** el registro queda asociado al lote y se
   muestra la fecha de la última actualización.
3. **Given** un lote que ya tenía calificación verde, **When** vuelvo a guardar, **Then** se
   actualiza el mismo registro (no se duplica).

### US2 — Registrar la calificación del café tostado (P1)

Como tostador, registro el análisis del café ya tostado: puntaje y atributos sensoriales.

**Por qué P1**: es el resultado que el productor espera; cierra el ciclo de calidad.

**Test independiente**: sobre un lote con calificación verde, agrego puntaje SCA y atributos; el
registro queda completo y visible.

**Aceptación**
1. **Given** un lote con calificación verde, **When** abro la calificación, **Then** veo también el
   bloque de tostado (puntaje SCA 0–100 y atributos sensoriales).
2. **Given** un puntaje fuera de 0–100, **When** guardo, **Then** el API responde **422** con el
   detalle del campo.
3. **Given** un lote sin calificación verde, **When** intento calificar el tostado, **Then** el
   sistema lo impide y explica que primero va el verde.

### US3 — Consultar y editar la calificación (P2)

Como administración, consulto la calificación de un lote y corrijo un valor mal digitado.

**Aceptación**
1. **Given** `/beneficio/calificacion`, **When** busco por número de lote, **Then** veo el estado
   (`Sin calificar`, `Verde`, `Completa`) y el puntaje cuando exista.
2. **Given** un registro existente, **When** edito y guardo, **Then** se actualiza `updated_at` y
   queda el rastro de quién lo hizo.

### US4 — La calificación como etapa del flujo (P2)

Como operación, el lote refleja que ya fue calificado, para saber qué está listo para venderse.

**Aceptación**
1. **Given** un lote `Catado`, **When** se guarda su calificación completa, **Then** el lote pasa a
   `Calificado` (nuevo estado, ver §Decisiones abiertas D3).
2. **Given** un lote `Calificado`, **When** intento retroceder a `Catado`, **Then** el sistema lo
   rechaza (el flujo solo avanza, igual que en las otras etapas).

### Edge cases

- Lote **eliminado** (soft-delete): no se puede calificar; error claro.
- **Concurrencia**: dos pestañas guardando el mismo lote → gana la última escritura, sin duplicar
  filas (índice único parcial por lote).
- **Rango**: humedad 0–100 %, densidad > 0, defectos ≥ 0, puntaje SCA 0–100.
- **Valores vacíos**: los campos opcionales vacíos se guardan como `null`, no como `0`.
- Lote **vendido**: la calificación queda como solo lectura.

## Requirements

- **FR-001**: un lote tiene **como máximo una** calificación viva (índice único parcial por lote,
  igual que las otras etapas 1:1 de `0052`).
- **FR-002**: el lote referenciado DEBE existir y no estar eliminado (`id_lote` FK `RESTRICT`).
- **FR-003**: el bloque de **verde** y el de **tostado** viven en el mismo registro; el tostado
  requiere que el verde esté cargado.
- **FR-004**: rangos validados en **Zod (UI/API)** y en **constraints de base** (defensa en
  profundidad, como `fincas_altura_check`).
- **FR-005**: la escritura va por **RPC transaccional** (`guardar_calificacion(jsonb)`), con
  `get_empleado_rol()` y `EXECUTE` solo para `authenticated` — patrón de `0052b`/`0052c`.
- **FR-006**: la RLS de la tabla nueva replica las 3 políticas del flujo (`select` con
  `deleted_at IS NULL`, `insert`/`update` solo `Tostador`/`Admin`).
- **FR-007**: todo endpoint usa `requireRole` + Zod en la frontera y devuelve `error.fieldErrors`.
- **FR-008**: el avance de estado del lote solo ocurre **hacia adelante** (helper `_avanzar` de
  `0052b`), nunca degrada un lote ya `Calificado` o `Vendido`.
- **FR-009**: la UI usa `next/dynamic` para el formulario si supera ~200 líneas y sigue el patrón de
  `components/beneficio/etapa-page.tsx`.

### Key Entities

- **`calificacion_lote`** (1:1 con `lotes_cafe`): verde + tostado, `notas`, auditoría
  (`created_at`/`updated_at`/`deleted_at`) y **quién** calificó.
- **`lotes_cafe`**: gana el estado `Calificado` (D3).

## Success Criteria

- **SC-001**: un lote con calificación verde y tostado se completa en **menos de 3 minutos**.
- **SC-002**: **0** lotes pueden tener dos calificaciones vivas (lo garantiza el índice único).
- **SC-003**: **100 %** de los intentos con puntaje fuera de rango son rechazados con mensaje por
  campo, sin tocar la base.
- **SC-004**: la suite sigue verde (`typecheck` 0, `lint` 0 errores, tests nuevos para el schema).

## Decisiones abiertas (bloquean el plan)

| # | Pregunta | Propuesta por defecto |
|---|---|---|
| **D1** | ¿Qué campos exactos lleva cada bloque? | **Verde**: humedad %, densidad g/ml, defectos primarios y secundarios (conteo), `% verde`. **Tostado**: puntaje SCA 0–100 y 5 atributos 1–10 (fragancia, acidez, cuerpo, dulzor, balance) |
| **D2** | ¿Calificación de a **una** evaluación por lote (verde+tostado en la misma fila) o **dos filas** separadas? | Una sola fila con dos bloques: menos tablas y el tostado depende del verde |
| **D3** | ¿Se agrega el estado `Calificado` entre `Catado` y `Vendido`? | Sí: implica migrar el `CHECK` de `lotes_cafe.enproceso` y la UI de estados |

## Assumptions

- El **productor** no necesita un reporte propio en esta iteración; basta la vista interna y el
  detalle del lote.
- La calificación **no** genera PDF ni correo (fuera de alcance de la v1).
- Los umbrales de "aprobado" (p. ej. SCA ≥ 80) **no** se automatizan en v1: se muestra el puntaje
  sin semáforo, para no fijar una regla comercial sin decisión del dueño.
- Se reutiliza la tabla `empleados` para registrar quién calificó; no se crea un catálogo nuevo.
