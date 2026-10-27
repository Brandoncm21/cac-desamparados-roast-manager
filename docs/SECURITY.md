# SECURITY — Prácticas de Seguridad

> **Permalink base:** [`80b1dd5`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/tree/80b1dd5)

## 1. Prácticas Actuales Detectadas

| Área | Implementación | Evidencia |
|------|----------------|-----------|
| **Auth** | Supabase Auth (JWT en cookies). Middleware verifica con `getUser()` (no `getSession`). | [`middleware.ts:25-32`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/middleware.ts#L25-L32) |
| **Autorización** | `requireRole(roles)` server-side con validación de `roles` no vacío y mensaje 403 genérico (no filtra roles) | [`lib/api-helpers.ts:68-87`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/api-helpers.ts#L68-L87) |
| **RLS** | `ENABLE ROW LEVEL SECURITY` en 12+ tablas; `TO authenticated USING (deleted_at IS NULL)` para lectura; escritura con `get_empleado_rol()` | [`supabase/migrations/0012_update_rls_soft_delete.sql:21`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/supabase/migrations/0012_update_rls_soft_delete.sql#L21) |
| **Service Role** | Aislada en `server-only` module (`import "server-only"`), solo vía `createAdminClientWithRoleCheck` | [`lib/supabase/service-role.ts:1-12`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/supabase/service-role.ts#L1-L12), [`lib/supabase/admin.ts:19`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/supabase/admin.ts#L19) |
| **Validación** | Zod en API (`safeParse` → 422) y en DB (constraints + trigger anti-solape) | [`lib/schemas/servicios-maestro.ts:30-64`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/schemas/servicios-maestro.ts#L30-L64) |
| **Cookies** | `applySecureCookies` preserva `httpOnly` del upstream (Supabase SSR requiere JS-legible), `secure` en prod, `sameSite:lax`, `Cache-Control: private, no-store` | [`lib/cookies.ts:24-70`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/cookies.ts#L24-L70) |
| **Secret Scanning** | `scripts/check-secrets.mjs` (pre-build) + `gitleaks` en CI | [`scripts/check-secrets.mjs`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/scripts/check-secrets.mjs), [`.github/workflows/ci.yml:36,65`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/.github/workflows/ci.yml#L36) |
| **Hidratación** | Strip de `bis_skin_checked` (Bitdefender) con `MutationObserver({attributes:true})` | [`app/layout.tsx:50-71`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/app/layout.tsx#L50-L71) |
| **RPCs transaccionales** | Escrituras multi-tabla atómicas SECURITY INVOKER con rol interno y EXECUTE solo `authenticated` (revocado de PUBLIC/anon) | [`supabase/migrations/0024_rpc_transaccionales.sql`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/supabase/migrations/0024_rpc_transaccionales.sql) (Fase 4) |

## 2. Gestión de Secretos

### 2.1 Variables

| Variable | Alcance | Dónde se lee |
|----------|---------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Público (cliente+servidor) | [`lib/env-client.ts:3`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/env-client.ts#L3) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Público | [`lib/env-server.ts:7`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/env-server.ts#L7) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only** | [`lib/supabase/service-role.ts:12`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/supabase/service-role.ts#L12) — nunca `NEXT_PUBLIC_*` |
| `DATABASE_URL` | **Server-only** (scripts/CLI locales) | `scripts/apply-migration.mjs` — solo vía `process.env`, nunca hardcodeado |
| `SUPABASE_PROJECT_REF` / `SUPABASE_DB_PASSWORD` | **Server-only** (scripts locales) | `scripts/apply-migration.mjs` — solo vía `process.env` |
| `SUPABASE_MCP_TOKEN` | **Solo entorno local** (tooling OpenCode, no app) | `opencode.json` lo referencia como `{env:SUPABASE_MCP_TOKEN}` — nunca el valor en el repo |

### 2.2 Reglas

- **Nunca** exponer `SUPABASE_SERVICE_ROLE_KEY` en props, JSON, logs, headers o variables `NEXT_PUBLIC_*`.
- **Nunca** importar `service-role.ts` desde `components/` o código `"use client"`.
- Uso correcto: `import { createAdminClient } from "@/lib/supabase/service-role"` solo en `app/api/**` tras `requireRole(["Admin"])`.
- **Nunca** hardcodear `DB_PASSWORD`, `PROJECT_REF`, tokens `sbp_*` ni passwords en connection strings dentro de archivos rastreados por git. Todo secreto vive en `.env.local` (ignorado) o en variables del shell (`SUPABASE_MCP_TOKEN` para tooling MCP).
- El identificador de proyecto en query params (`?project_ref=...` en la config MCP) es un identificador funcional, no un secreto; el scanner lo ignora deliberadamente en ese contexto pero reporta asignaciones y URLs de dashboard con valores reales.

### 2.3 `check-secrets`

```bash
npm run check-secrets  # también corre como prebuild
```

Cobertura (scripts/check-secrets.mjs): `NEXT_PUBLIC_*SERVICE_ROLE` en `.env*` versionados y `process.env`; literales `eyJ...` de service role; tokens `sbp_*`; `DB_PASSWORD`/`DATABASE_URL` con valor real; `PROJECT_REF` con valor real (asignaciones y URLs de dashboard); connection strings postgres con password embebido. Alcance: `app/`, `lib/`, `components/`, `middleware.ts`, `scripts/`, `docs/`, `.specify/`, `README.md`, `CHANGELOG.md`, `opencode.json`, `.env.example`. Excluye `__tests__`/`__fixtures__`, ignora placeholders (`your_*`, `xxxx`, `<...>`, `changeme`) y lecturas `process.env.*`. Falla con exit 1 sin imprimir valores.

## 3. Cookies y Sesión

| Flag | Valor | Razón | Evidencia |
|------|-------|-------|-----------|
| `httpOnly` | **Preservado del upstream** (no forzado) | Supabase SSR requiere cookies legibles por JS (`createBrowserClient` lee `document.cookie`) | [`lib/cookies.ts:75-81`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/cookies.ts#L75-L81) |
| `secure` | `true` en prod, `false` en dev | Funciona en `localhost` sin HTTPS | [`lib/cookies.ts:60`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/cookies.ts#L60) |
| `sameSite` | `lax` | Mitigación CSRF | [`lib/cookies.ts:61`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/cookies.ts#L61) |
| `Cache-Control` | `private, no-store, no-cache` | Evita cache de tokens en CDNs | [`middleware.ts:43`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/middleware.ts#L43) |

## 4. Riesgos Detectados y Recomendaciones

| # | Riesgo | Impacto | Recomendación | Estado |
|---|--------|---------|---------------|--------|
| 1 | `DB_PASSWORD`/`PROJECT_REF` hardcodeados en `scripts/apply-migration.mjs` (valores vivos en historial git) | **Alto** — acceso a DB si se filtra | Valores eliminados del working tree (script ahora solo lee `process.env`); `check-secrets` cubre `scripts/`/`docs/`. **Pendiente manual:** rotar `DB_PASSWORD` en Dashboard y reescribir historial con `git filter-repo` + force-push coordinado (requiere autorización explícita; aún no ejecutado). **No imprimir valores en docs/PR** | Parcialmente mitigado — ver `docs/RUNBOOK.md#rotacion` |
| 1b | Token de management API `sbp_*` en `opencode.json` local (archivo gitignorado, nunca rastreado) | **Medio** — el valor existió en texto plano local y en historiales de conversación | Token movido a variable de entorno (`opencode.json` usa `{env:SUPABASE_MCP_TOKEN}`). **Recomendado:** revocar el token anterior en Dashboard → Account → Access Tokens, crear uno nuevo y exportarlo en el shell (`export SUPABASE_MCP_TOKEN=...`) antes de iniciar OpenCode. Sin esta variable, el MCP Supabase falla la autenticación | Parcialmente mitigado |
| 2 | 2 empleados en `seed.sql` con `id_auth = null` (María, Pedro) | Medio — no pueden loguearse ni resolver rol | Crear usuarios Auth y vincular `id_auth`, o documentar que solo Admin/Tostador están operativos | Documentado en `docs/SETUP_AND_RUN.md` |
| 3 | 12 vulnerabilidades `npm audit` (postcss, sharp, undici) | Medio | `npm audit fix` cuando `next@16.3.1` sea compatible; CI con `continue-on-error: true` hasta resolver | Tracking en CI |
| 4 | `middleware` deprecation (`middleware.ts` → `proxy.ts` en Next 16) | Bajo | Migrar a `proxy.ts` según https://nextjs.org/docs/messages/middleware-to-proxy | Backlog |
| 5 | `SUPABASE_SERVICE_ROLE_KEY` podría filtrarse si se importa en cliente | Alto | `server-only` ya lo previene; `check-secrets` lo detecta pre-build | Mitigado |

## 5. Checklist de Verificación

- [ ] `npm run check-secrets` pasa (0 secretos en código/docs/scripts rastreados)
- [ ] `npm run typecheck` y `npm run lint` sin errores (warnings documentados)
- [ ] `npm run test:coverage` ejecutado y % anotado en `docs/TESTS_AND_CI.md`
- [ ] CI verde: `gitleaks` sin hallazgos, `audit` revisado
- [ ] `.env.local` no commiteado (en `.gitignore`)
- [ ] RLS verificado: `SELECT` como `authenticated` + `deleted_at IS NULL`, escritura por rol
- [ ] Cookies: `httpOnly` no forzado, `secure` en prod, `sameSite:lax`
- [ ] Service role solo vía `admin.ts` + `requireRole`
- [ ] `SUPABASE_MCP_TOKEN` exportada en el shell (tooling MCP); valor nunca en el repo

## 6. Referencias

- Supabase SSR: https://supabase.com/docs/guides/auth/server-side
- OWASP Cookie flags: https://owasp.org/www-community/controls/SecureCookieAttribute
- Gitleaks: https://github.com/gitleaks/gitleaks
- OpenCode MCP env vars: https://opencode.ai/docs/mcp-servers/

## 7. Historial de cambios (Fase 1 — Seguridad)

- **Fecha:** 2026-10-27 · **Rama:** `feat/audit-hardening` (Fase 1)
- **Cambios:** `apply-migration.mjs` sin valores hardcodeados (solo `process.env`); `check-secrets.mjs` ampliado a `scripts/`, `docs/`, `.specify/`, `README.md`, `CHANGELOG.md`, `opencode.json`, `.env.example` con patrones `sbp_*`, `DB_PASSWORD`/`DATABASE_URL`, `PROJECT_REF`, URLs de dashboard y connection strings (+12 tests); token MCP movido a `{env:SUPABASE_MCP_TOKEN}`; `.env.example` con placeholders de `DATABASE_URL`/`PROJECT_REF`/`DB_PASSWORD`.
- **Limitaciones:** el scanner no detecta secretos ya rotados en binarios ni fuera de las extensiones escaneadas; `gitleaks` en CI sigue siendo la segunda línea.
- **Pendiente (manual):** rotar `DB_PASSWORD` y revocar token `sbp_*` expuesto; reescribir historial con `git filter-repo` solo con autorización explícita del equipo.

## 8. Acceso directo desde cliente: estado (Fase 4)

- Las escrituras del navegador se migraron a API (PATCH estado de orden, POST perfiles de tueste, PUT contexto de perfil, POST hitos bulk; sync vía `POST /api/sync`).
- Lecturas directas **conservadas intencionalmente** (documentadas en `docs/ARCHITECTURE.md` §3.2 y `docs/LEGACY_MIGRATION_PLAN.md`): auth (`getUser/signOut`), cargas de formularios (catálogos pequeños), lecturas del módulo de tueste con fallback offline (IndexedDB), dashboard stats y select-orden-dialog. RLS limita todo acceso directo a filas visibles por rol.
- Riesgo residual: un atacante autenticado puede escribir directamente vía PostgREST lo que sus políticas RLS permitan; `requireRole` añade la capa de negocio en la API, pero RLS es el límite duro real. Mitigación activa: políticas con `WITH CHECK` revisadas (0014/0016).
