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

## 2. Gestión de Secretos

### 2.1 Variables

| Variable | Alcance | Dónde se lee |
|----------|---------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Público (cliente+servidor) | [`lib/env-client.ts:3`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/env-client.ts#L3) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Público | [`lib/env-server.ts:7`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/env-server.ts#L7) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only** | [`lib/supabase/service-role.ts:12`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/supabase/service-role.ts#L12) — nunca `NEXT_PUBLIC_*` |

### 2.2 Reglas

- **Nunca** exponer `SUPABASE_SERVICE_ROLE_KEY` en props, JSON, logs, headers o variables `NEXT_PUBLIC_*`.
- **Nunca** importar `service-role.ts` desde `components/` o código `"use client"`.
- Uso correcto: `import { createAdminClient } from "@/lib/supabase/service-role"` solo en `app/api/**` tras `requireRole(["Admin"])`.

### 2.3 `check-secrets`

```bash
npm run check-secrets  # también corre como prebuild
```

Detecta: `NEXT_PUBLIC_*SERVICE_ROLE` en `.env*` versionados y `process.env`, y literales `eyJ...` hardcodeados en `app/`, `lib/`, `components/`. Falla con exit 1 sin imprimir valores.

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
| 1 | `scripts/apply-migration.mjs` con `PROJECT_REF` y `DB_PASSWORD` hardcodeados en historial git | **Alto** — acceso a DB si se filtra | Rotar `DB_PASSWORD` en Supabase Dashboard → mover a `DATABASE_URL` en `.env.local` → `git filter-repo` + force-push coordinado. **No imprimir valores en docs/PR** | Pendiente — ver `docs/RUNBOOK.md#rotacion` |
| 2 | 2 empleados en `seed.sql` con `id_auth = null` (María, Pedro) | Medio — no pueden loguearse ni resolver rol | Crear usuarios Auth y vincular `id_auth`, o documentar que solo Admin/Tostador están operativos | Documentado en `docs/SETUP_AND_RUN.md` |
| 3 | 12 vulnerabilidades `npm audit` (postcss, sharp, undici) | Medio | `npm audit fix` cuando `next@16.3.1` sea compatible; CI con `continue-on-error: true` hasta resolver | Tracking en CI |
| 4 | `middleware` deprecation (`middleware.ts` → `proxy.ts` en Next 16) | Bajo | Migrar a `proxy.ts` según https://nextjs.org/docs/messages/middleware-to-proxy | Backlog |
| 5 | `SUPABASE_SERVICE_ROLE_KEY` podría filtrarse si se importa en cliente | Alto | `server-only` ya lo previene; `check-secrets` lo detecta pre-build | Mitigado |

## 5. Checklist de Verificación

- [ ] `npm run check-secrets` pasa (0 `NEXT_PUBLIC_*SERVICE_ROLE`, 0 literales)
- [ ] `npm run typecheck` y `npm run lint` sin errores (warnings documentados)
- [ ] `npm run test:coverage` ejecutado y % anotado en `docs/TESTS_AND_CI.md`
- [ ] CI verde: `gitleaks` sin hallazgos, `audit` revisado
- [ ] `.env.local` no commiteado (en `.gitignore`)
- [ ] RLS verificado: `SELECT` como `authenticated` + `deleted_at IS NULL`, escritura por rol
- [ ] Cookies: `httpOnly` no forzado, `secure` en prod, `sameSite:lax`
- [ ] Service role solo vía `admin.ts` + `requireRole`

## 6. Referencias

- Supabase SSR: https://supabase.com/docs/guides/auth/server-side
- OWASP Cookie flags: https://owasp.org/www-community/controls/SecureCookieAttribute
- Gitleaks: https://github.com/gitleaks/gitleaks
