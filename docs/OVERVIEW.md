# OVERVIEW — Resumen Ejecutivo

> **Permalink base:** [`80b1dd5`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/tree/80b1dd5) · Rama `main` al 2026-08-20.

## 1. Resumen Ejecutivo

SCACR es un sistema integral de gestión de torrefacción para el Centro Agrícola Cantonal de Desamparados (CAC) que centraliza el ciclo completo del café —desde la recepción de órdenes de trabajo hasta la trazabilidad de curvas de tueste— sobre una arquitectura **Next.js 16 (App Router, Turbopack) + Supabase (PostgreSQL + Auth + RLS)**, con sincronización offline vía IndexedDB. Evidencia: [`README.md:1-4`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/README.md#L1-L4), [`package.json:1-16`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/package.json#L1-L16).

## 2. Público Objetivo

| Rol | Necesidades | Artefactos clave |
|-----|-------------|------------------|
| **Operaciones (Recepción / Tostador / Operador)** | Crear y ejecutar órdenes, registrar temperaturas/hitos/métricas, generar PDF de perfil, trabajar sin conectividad | `app/(dashboard)/ordenes/**`, `app/(dashboard)/tueste/[perfilId]/**`, `lib/offline/**` |
| **Administración** | Gestionar catálogo de servicios (tarifas por intervalo de peso) y empaques (precios versionados) | `app/(dashboard)/admin/servicios/**`, `app/(dashboard)/admin/empaques/**`, `app/api/admin/**` |
| **Desarrolladores** | Extender dominio, corregir RLS, mantener CI y tests | `lib/`, `app/api/`, `supabase/migrations/`, `vitest.config.ts`, `.github/workflows/ci.yml` |

## 3. Alcance Funcional Esencial

- **Clientes y zonas de finca:** CRUD con validación Zod y RLS por rol. Evidencia: [`lib/schemas/clientes.ts`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/schemas/clientes.ts), [`supabase/migrations/0003_zonas_finca.sql`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/supabase/migrations/0003_zonas_finca.sql).
- **Órdenes de trabajo:** flujo secuencial con pasos (`orden_pasos`), cálculo de tarifas por intervalo de peso, gestión de mermas y empaques. Evidencia: [`lib/services/orquestador.ts`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/services/orquestador.ts), [`lib/services/resolver-tarifa.ts`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/services/resolver-tarifa.ts), [`lib/schemas/ordenes.ts`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/schemas/ordenes.ts).
- **Perfiles de tueste:** trazabilidad minuto a minuto, hitos térmicos, métricas y ajustes, generación de PDF con `jspdf` + `html-to-image` bajo demanda. Evidencia: [`app/(dashboard)/tueste/[perfilId]/hooks/usePDF.ts`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/app/(dashboard)/tueste/[perfilId]/hooks/usePDF.ts), [`supabase/migrations/0015_granularidad_tiempo.sql`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/supabase/migrations/0015_granularidad_tiempo.sql).
- **Servicios/Empaques maestros:** catálogo administrable con intervalos de precio (`NUMERIC(10,2)`) y precios versionados (`valid_from`/`valid_to`). Evidencia: [`supabase/migrations/0017_servicios_maestro_empaques.sql`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/supabase/migrations/0017_servicios_maestro_empaques.sql), [`lib/schemas/servicios-maestro.ts`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/schemas/servicios-maestro.ts).
- **Offline-first:** cola de sincronización en IndexedDB (`idb`) para temperaturas, hitos y métricas. Evidencia: [`lib/offline/db.ts`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/offline/db.ts), [`lib/offline/sync.ts`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/offline/sync.ts).

## 4. Stack Técnico (Evidencia: `package.json`)

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | Next.js (App Router, Turbopack) | `16.2.10` |
| UI | React 19, Tailwind, shadcn/ui, lucide-react | `19.2.4` / `4.x` |
| Estado/Data | TanStack Query 5, React Hook Form + Zod | `5.101.2` / `4.4.3` |
| Backend | Supabase (PostgreSQL, Auth, RLS) | `ssr 0.12.0`, `supabase-js 2.110.0` |
| Gráficos/PDF | recharts, jspdf, html-to-image (code-split dinámico) | `3.9.1` / `4.2.1` / `1.11.13` |
| Tests | Vitest 4, Testing Library, jsdom, @vitest/coverage-v8 | `4.1.10` |
| Tooling | TypeScript 5, ESLint 9 (flat config), Supabase CLI | `5.x` / `9.39.4` |

## 5. Estado Actual y Riesgos Conocidos

- **Ramas activas:** `main` integra 22 migraciones y 8 fixes de seguridad/performance documentados. Modelo actual: `fix/general`, `feat/develop`, `test/security` como ramas de larga vida (ver [`docs/CONTRIBUTING.md`](./CONTRIBUTING.md)).
- **Riesgo histórico mitigado:** `SUPABASE_SERVICE_ROLE_KEY` aislada en [`lib/supabase/service-role.ts`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/supabase/service-role.ts) (`server-only`); `scripts/apply-migration.mjs` contenía credenciales hardcodeadas en el historial — requiere rotación (ver [`docs/SECURITY.md`](./SECURITY.md)).
- **Cobertura y CI:** workflow en [`.github/workflows/ci.yml`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/.github/workflows/ci.yml) con `check-secrets`, `lint`, `typecheck`, `test:coverage` y `gitleaks`; Dependabot semanal.

## 6. Estructura de Documentación

Consultar [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) para la vista de componentes y flujo de datos, [`docs/SETUP_AND_RUN.md`](./SETUP_AND_RUN.md) para puesta en marcha, [`docs/API_REFERENCE.md`](./API_REFERENCE.md) para endpoints, [`docs/DB_SCHEMA.md`](./DB_SCHEMA.md) para esquema y RLS, y [`docs/SECURITY.md`](./SECURITY.md) para prácticas y checklist.

## 7. Glosario Mínimo

- **Orden de trabajo:** entidad central que agrupa servicios ejecutados y especificaciones.
- **Paso (`orden_pasos`):** unidad secuencial de ejecución con tarifa por intervalo de peso y costo versionado.
- **Intervalo de precio:** rango `[peso_min, peso_max)` en kg con `precio_por_kg` (`NUMERIC(10,2)`).
- **Perfil de tueste:** registro de curva térmica con trazabilidad, hitos y métricas.
