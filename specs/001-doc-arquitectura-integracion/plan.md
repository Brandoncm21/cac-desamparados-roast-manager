# Implementation Plan: Documento técnico de integración CafeTrack ↔ CoffeeBeanFlow

**Branch**: `001-doc-arquitectura-integracion` | **Date**: 2026-11-04 | **Spec**: [spec.md](./spec.md)

## Summary

Producir `ARQUITECTURA_Y_DATOS_INTEGRACION.md` (raíz del repo, 1200–1600 líneas, español, sin secretos): documento de referencia técnica que cataloga el estado real de CafeTrack (esquema verificado aplicando las 24 migraciones sobre PostgreSQL limpio + código fuente) y define la matriz de integración con CoffeeBeanFlow (CBF), orientada a la FUSIÓN de módulos (decisión tomada, no renegociable), con mini-ADR, conectores K1–K6, desafíos T1–T16, pipeline unificado y prerrequisitos de seguridad.

## Technical Context

**Language/Version**: TypeScript 5.x (Next.js 16.2.10, React 19.2.4); SQL PostgreSQL 17 (verificación en contenedor `postgres:17`)

**Primary Dependencies**: Supabase SSR/RLS, Zod v4, Vitest (solo lectura; cero cambios de código)

**Storage**: PostgreSQL (fuente primaria: catálogo del sistema tras aplicar migraciones `0001`–`0025` sin `0008`)

**Testing**: verificación por conteos (`rg`/`Get-ChildItem` + SQL de introspección), renderizado sintáctico de Mermaid, `tsc --noEmit` + `npm run lint` para demostrar que no se tocó código

**Target Platform**: documento Markdown en la raíz del repo + artifacts en `specs/001-doc-arquitectura-integracion/`

**Constraints**: solo escribir el doc raíz y `specs/`; no secretos; español; evidencia citable (migración o `archivo:línea`); hipótesis marcadas; CBF solo desde `ESPECIFICACION_RECONSTRUCCION.md` (Escritorio, solo lectura)

## Constitution Check

| Principio | Aplicación aquí | Estado |
|---|---|---|
| I. Security First | El doc NO incluye secretos; documenta `soft_delete_row` expuesto a `anon` como hallazgo y propone su eliminación | ✓ |
| II. Single Source of Truth | La lógica documentada es la del servidor (RLS/RPC/Zod API); la deriva cliente se lista en anexo F | ✓ |
| VI. Migrations as Code | La trazabilidad del esquema es por número de migración; el estado final se lee del catálogo aplicado | ✓ |
| VIII. Test Critical Logic | n/a (feature documental); se preservan `tsc`/`lint` verdes | ✓ |
| Development Workflow | Usa el flujo speckit (`spec` → `research/plan` → `tasks` → `implement`) | ✓ |

## Project Structure

```text
specs/001-doc-arquitectura-integracion/
├── spec.md          # FR-001..FR-011, stories P1-P3, success criteria
├── research.md      # Metodología de verificación + evidencia (catálogo PG, código, CBF, drift)
├── data-model.md    # ER dual (16 + 19) + pipeline unificado + K1-K6
├── plan.md          # Este archivo
└── tasks.md         # 6 tareas de implementación del documento

ARQUITECTURA_Y_DATOS_INTEGRACION.md   # Entregable raíz (1200-1600 líneas)
```

**Structure Decision**: feature documental sin código; la única salida de repositorio es el doc raíz + artifacts de spec. La introspección y resultados intermedios viven fuera del repo (temp dir) para respetar la restricción de escritura.

## Tasks

Ver [tasks.md](./tasks.md). Resumen: (T1) §1 visión/stack/capas C4; (T2) §2 catálogo DB completo; (T3) §3 flujos e inconsistencias; (T4) §4 matriz de integración completa; (T5) anexos A–F; (T6) verificación final (conteos, Mermaid, secretos, tsc/lint).

## Complexity Tracking

Sin violaciones de constitución: la feature es de documentación; ningún patrón nuevo de código.
