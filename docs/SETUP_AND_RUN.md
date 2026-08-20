# SETUP_AND_RUN — Puesta en Marcha Local

> **Permalink base:** [`80b1dd5`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/tree/80b1dd5)

## 1. Requisitos Previos

| Requisito | Versión mínima | Verificación |
|-----------|---------------|--------------|
| Node.js | 18+ (recomendado 20) | `node -v` |
| npm | 9+ | `npm -v` |
| Supabase CLI | 2.x | `supabase --version` — evidencia: [`package.json:57`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/package.json#L57) depende de `supabase@^2.109.0` |
| Cuenta Supabase | — | Proyecto en https://supabase.com |

Evidencia de toolchain: [`package.json:5-15`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/package.json#L5-L15) define `dev` (puerto 3016), `build`, `typecheck`, `test:coverage`.

## 2. Clonación e Instalación

```bash
git clone https://github.com/Brandoncm21/cac-desamparados-roast-manager.git
cd cac-desamparados-roast-manager

# Usar Node 20 si está disponible (nvm)
nvm use 20  # opcional

npm ci          # instalación limpia según package-lock.json
```

## 3. Variables de Entorno

Plantilla: [`.env.example`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/.env.example) (8 líneas).

```bash
cp .env.example .env.local
# Editar .env.local con credenciales reales de tu proyecto Supabase:
# - Project URL y anon key: Supabase Dashboard → Project Settings → API
# - Service role key: Dashboard → Project Settings → API → service_role (¡server-only!)
```

| Variable | Origen | Uso |
|----------|--------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | Dashboard → API → Project URL | Cliente y servidor ([`lib/env-client.ts:3`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/env-client.ts#L3), [`lib/env-server.ts:3`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/env-server.ts#L3)) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Dashboard → API → anon public | Cliente y servidor anon |
| `SUPABASE_SERVICE_ROLE_KEY` | Dashboard → API → service_role | **Solo servidor** ([`lib/supabase/service-role.ts:12`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/supabase/service-role.ts#L12)) — nunca `NEXT_PUBLIC_*` |
| `NEXT_PUBLIC_APP_URL` | Local | `http://localhost:3016` por defecto ([`lib/env-server.ts:21`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/env-server.ts#L21)) |

Validación: `npm run check-secrets` falla si existe `NEXT_PUBLIC_*SERVICE_ROLE` en `.env*` o `process.env` ([`scripts/check-secrets.mjs`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/scripts/check-secrets.mjs)).

## 4. Base de Datos — Migrations y Seed

### 4.1 Supabase Local (opcional, recomendado para desarrollo aislado)

```bash
npx supabase init        # si no existe supabase/config.toml
npx supabase start       # levanta Postgres + Auth + Storage locales
npx supabase db push     # aplica las 22 migraciones en supabase/migrations/
```

Evidencia de migraciones: [`supabase/migrations/0001_schema_inicial.sql`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/supabase/migrations/0001_schema_inicial.sql) hasta [`0022_corregir_flujo_pasos.sql`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/supabase/migrations/0022_corregir_flujo_pasos.sql).

### 4.2 Supabase Cloud (proyecto existente)

```bash
# Vincular proyecto (una vez)
npx supabase link --project-ref <PROJECT_REF>

# Aplicar migraciones pendientes
npx supabase db push

# Seed de datos de prueba (opcional, idempotente si las tablas están vacías)
psql "$DATABASE_URL" -f supabase/seed.sql
# o desde Dashboard → SQL Editor → pegar supabase/seed.sql
```

Contenido de [`supabase/seed.sql`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/supabase/seed.sql): 4 empleados (Admin, Tostador, Recepción, Operador), 5 clientes, 3 órdenes, perfiles con curvas y métricas.

> **Nota:** `scripts/apply-migration.mjs` contiene credenciales hardcodeadas en el historial — no usar en producción (ver [`docs/SECURITY.md`](./SECURITY.md)).

## 5. Ejecución Local

```bash
# Desarrollo (Turbopack, puerto 3016)
npm run dev
# Abre http://localhost:3016 — login con usuario de Supabase Auth vinculado a empleados.id_auth

# Build de producción (ejecuta prebuild → check-secrets)
npm run build
npm run start   # sirve el build en el mismo puerto

# Validaciones
npm run typecheck   # tsc --noEmit
npm run lint        # eslint (flat config)
npm run test        # vitest run
npm run test:coverage  # @vitest/coverage-v8 → coverage/
npm run check-secrets  # auditoría de service_role
```

Evidencia de scripts: [`package.json:5-15`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/package.json#L5-L15), [`vitest.config.ts`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/vitest.config.ts), [`eslint.config.mjs`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/eslint.config.mjs).

## 6. Usuarios de Prueba (tras `seed.sql`)

| Empleado | Rol | id_auth | Acceso |
|----------|-----|---------|--------|
| Admin SCACR | Admin | `e6478190-...` vinculado | Todo, incluida Administración |
| Carlos Tostador | Tostador | `4ab2e32a-...` vinculado | Órdenes, tueste, perfiles |
| María Recepción | Recepción | `null` (sin auth) | Requiere vincular `id_auth` manualmente |
| Pedro Operador | Operador | `null` | Idem |

> Para probar Recepción/Operador: crear usuario en Supabase Auth y actualizar `empleados.id_auth`.

## 7. Problemas Comunes

| Síntoma | Causa | Solución |
|---------|-------|----------|
| `hydration mismatch bis_skin_checked` | Extensión Bitdefender inyecta atributo | Ya mitigado en [`app/layout.tsx:50-71`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/app/layout.tsx#L50-L71) con `MutationObserver({attributes:true})` |
| Dashboard vacío / admin oculto | Cookie httpOnly bloquea `createBrowserClient` | Corregido en [`lib/cookies.ts`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/cookies.ts) — borrar cookies `sb-*` y re-login |
| `SUPABASE_SERVICE_ROLE_KEY` faltante | No definida en `.env.local` | Definirla (server-only) o el build falla en [`lib/supabase/service-role.ts:12`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/supabase/service-role.ts#L12) |

## 8. Puertos y Entornos

- Dev: `http://localhost:3016` (configurado en [`package.json:6`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/package.json#L6) y [`lib/env-server.ts:21`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/env-server.ts#L21)).
- `NODE_ENV=production` activa `secure: true` en cookies ([`lib/cookies.ts:36`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/cookies.ts#L36)).
