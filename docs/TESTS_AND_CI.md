# TESTS_AND_CI — Pruebas y CI

> **Permalink base:** [`80b1dd5`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/tree/80b1dd5)

## 1. Cómo Ejecutar Pruebas

```bash
npm run test              # vitest run (jsdom, 90 tests)
npm run test:watch        # vitest watch
npm run test:coverage     # @vitest/coverage-v8 → coverage/
npm run typecheck         # tsc --noEmit
npm run lint              # eslint (flat config)
npm run check-secrets     # auditoría service_role
```

Configuración: [`vitest.config.ts`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/vitest.config.ts) (alias `@` → root, stub `server-only` para jsdom, `jsdom` + `globals`), [`vitest.setup.ts`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/vitest.setup.ts) (jest-dom).

## 2. Cobertura Actual

Ejecutado en `docs/complete-documentation` (80b1dd5) el 2026-08-20:

```
% Coverage report from v8
-------------------|---------|----------|---------|---------|-------------------
All files          |   66.07 |    61.53 |   55.81 |   68.18 |
 lib               |   77.46 |    74.24 |      60 |   77.14 |
  api-helpers.ts   |   51.61 |    60.71 |      25 |   51.61 |
  cookies.ts       |     100 |       80 |     100 |     100 |
  error-handler.ts |   92.85 |    83.33 |     100 |   92.85 |
 lib/schemas       |     100 |    85.29 |     100 |     100 |
 lib/services      |   31.66 |    37.68 |      35 |      34 |
  empacado.ts      |   73.33 |    71.42 |      40 |   71.42 |
  orquestador.ts   |    5.71 |     5.55 |   18.18 |     3.7  |
  resolver-tarifa.ts|     60 |       75 |      75 |   66.66 |
Statements : 66.07% (111/168)  Branches : 61.53%  Functions : 55.81%  Lines : 68.18%
```

Reporte HTML: `coverage/index.html` (generado tras `test:coverage`, ignorado en `.gitignore`, subido como artifact en CI).

**Objetivo:** >70% en módulos críticos (`lib/schemas/*` ya 100%, `lib/services/*` necesita ampliar `orquestador.ts` y `resolver-tarifa.ts`).

## 3. Suites Existentes (10 suites, 90 tests)

| Archivo | Qué cubre | Evidencia |
|---------|-----------|-----------|
| `lib/__tests__/servicios-maestro.schema.test.ts` | `crearServicioSchema`, `intervalosServicioSchema` (solapes, bordes), `resolverTarifaPorPeso` | [`lib/__tests__/servicios-maestro.schema.test.ts`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/__tests__/servicios-maestro.schema.test.ts) |
| `lib/__tests__/empacado.test.ts` | `calcularEmpaques`, `normalizarCapacidadKg` (gramos→kg) | [`lib/__tests__/empacado.test.ts`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/__tests__/empacado.test.ts) |
| `lib/__tests__/orquestador.test.ts` | `ordenarPorPrioridadEstable` | [`lib/__tests__/orquestador.test.ts`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/__tests__/orquestador.test.ts) |
| `lib/__tests__/cookies.test.ts` | `secureCookieOptions`, `applySecureCookies` (httpOnly preservado) | [`lib/__tests__/cookies.test.ts`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/__tests__/cookies.test.ts) |
| `lib/__tests__/api-helpers.auth.test.ts` | `requireAuth`/`requireRole` (401/403) con mocks de `supabase/server` | [`lib/__tests__/api-helpers.auth.test.ts`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/__tests__/api-helpers.auth.test.ts) |
| `scripts/__tests__/check-secrets.test.ts` | `check-secrets.mjs` (process.env y literales) | [`scripts/__tests__/check-secrets.test.ts`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/scripts/__tests__/check-secrets.test.ts) |

## 4. Cómo Agregar Nuevos Tests

1. Crear `lib/__tests__/mi-modulo.test.ts` (o `lib/services/__tests__/`).
2. Mockear `server-only` si el módulo lo importa: `vitest.config.ts` ya aliasa `server-only` → `vitest.stub.server-only.ts`.
3. Mockear `createClient` de Supabase: `vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))` (ver `api-helpers.auth.test.ts`).
4. Ejecutar `npm run test -- --run lib/__tests__/mi-modulo.test.ts` y verificar `npm run test:coverage`.

## 5. Workflow CI

Archivo: [`.github/workflows/ci.yml`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/.github/workflows/ci.yml) — triggers `push` a `main, feat/**, fix/**, perf/**, ci/**, test/**` y `pull_request` a `main`.

```yaml
jobs:
  ci:
    - npm ci
    - npm run check-secrets
    - npm run lint
    - npm run typecheck
    - npm run test
    - npm run test:coverage → upload-artifact coverage/
    - npm audit --audit-level=moderate (continue-on-error: true, 12 vulns conocidas)
    - gitleaks/gitleaks-action@v2
  secret-scan:
    - gitleaks (job paralelo)
```

Dependabot: [`.github/dependabot.yml`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/.github/dependabot.yml) — PRs semanales `npm` y `github-actions`.

Configurar secretos en CI: `Settings → Secrets and variables → Actions → New repository secret` para `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (nunca commitear `.env.local`).

## 6. Lectura de Reports

- **Terminal:** tabla `All files` tras `test:coverage`.
- **HTML:** `open coverage/index.html` → líneas no cubiertas (ej. `orquestador.ts:32-120`).
- **CI artifact:** pestaña Actions → run → `coverage` (7 días retención).
