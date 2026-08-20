# RUNBOOK — Operaciones

> **Permalink base:** [`80b1dd5`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/tree/80b1dd5) · Entorno local: `http://localhost:3016`, producción: ver `.env.example` y proveedor de despliegue (Vercel u otro — si falta, crear issue).

## 1. Despliegue

### 1.1 Pre-requisitos

- Node 20, `npm ci` limpio, `.env.local` con secretos de producción (nunca commiteado, en `.gitignore`).
- Supabase project vinculado: `npx supabase link --project-ref <ref>` (ver `supabase/.temp/linked-project.json` local, no versionado).

### 1.2 Pasos

```bash
# 1. Verificar rama
git checkout main && git pull --ff-only origin main

# 2. Validaciones (bloquean deploy si fallan)
npm run check-secrets
npm run lint && npm run typecheck && npm run test && npm run test:coverage
npm run build   # prebuild (check-secrets) + next build

# 3. Migraciones
npx supabase db push   # aplica supabase/migrations/0001-0022

# 4. Deploy (ej. Vercel)
vercel --prod   # o git push origin main si el deploy es automático por GitHub
```

Evidencia de build: [`package.json:7-8`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/package.json#L7-L8) (`prebuild` → `check-secrets`).

### 1.3 Variables de Entorno en Producción

Configurar en el provider (Vercel → Settings → Environment Variables) y en GitHub Actions (`Settings → Secrets`):

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (públicas)
- `SUPABASE_SERVICE_ROLE_KEY` (server-only, rotar periódicamente)
- `NEXT_PUBLIC_APP_URL` (URL canónica)

Nunca exponer `SUPABASE_SERVICE_ROLE_KEY` como `NEXT_PUBLIC_*` (detecta `check-secrets`).

## 2. Rollback

### 2.1 Código

```bash
# Opción A: revert del commit en main
git revert <sha> --no-edit && git push origin main

# Opción B: redeploy del commit anterior (Vercel → Deployments → Promote previous)
```

### 2.2 Base de Datos

Las migraciones son **forward-only** (no hay down). Para revertir un cambio de esquema:

1. Crear nueva migración que deshaga el cambio: `npx supabase migration new revert_<nombre>`
2. `npx supabase db push`

Para datos: restaurar desde backup de Supabase (Dashboard → Database → Backups) o re-ejecutar `supabase/seed.sql` (solo si las tablas están vacías; no es idempotente para datos de producción).

## 3. Rotación de Claves

### 3.1 Caso Histórico Detectado

`scripts/apply-migration.mjs` contenía `PROJECT_REF` y `DB_PASSWORD` hardcodeados en el historial git (ver [`CHANGELOG.md`](../CHANGELOG.md) y [`docs/SECURITY.md`](./SECURITY.md)). **No imprimir valores.**

### 3.2 Pasos de Rotación

```bash
# 1. Supabase Dashboard → Project Settings → Database → Reset database password
#    Generar nueva DB_PASSWORD y anotarla en vault (1Password, etc.)

# 2. Actualizar .env.local y secretos del provider/CI
#    DATABASE_URL=postgresql://postgres:<NUEVA_PASSWORD>@db.<ref>.supabase.co:5432/postgres

# 3. Mover credenciales de apply-migration.mjs a env
#    Editar scripts/apply-migration.mjs para leer process.env.DATABASE_URL
#    (no commitear valores)

# 4. Reescribir historial (coordinar con equipo, requiere force-push)
git filter-repo --path scripts/apply-migration.mjs --invert-paths  # o --replace-text con regex
# Alternativa: BFG Repo-Cleaner
git push --force-with-lease origin main  # ¡avisar al equipo!

# 5. Rotar SUPABASE_SERVICE_ROLE_KEY si estuvo expuesta
#    Dashboard → Project Settings → API → Reset service_role key → actualizar envs
```

Ver [`docs/SECURITY.md`](./SECURITY.md) para checklist.

## 4. Restaurar DB desde Seed

```bash
# Solo para entornos de desarrollo/testing vacíos
psql "$DATABASE_URL" -f supabase/seed.sql
# Contenido: 4 empleados, 5 clientes, 3 órdenes, perfiles con curvas (trazabilidad_temperatura, hitos_termicos, metricas_tueste)
# Evidencia: supabase/seed.sql:6-10 (empleados), :21-34 (órdenes y servicios)
```

Para producción vacía: ejecutar seed solo si las tablas de dominio están vacías; de lo contrario, usar backups.

## 5. Investigación de Incidentes de Auth

### 5.1 Síntomas y Causas Conocidas

| Síntoma | Causa probable | Verificación |
|---------|---------------|--------------|
| Dashboard vacío, admin oculto, sin errores | Cookie `sb-*-auth-token` con `httpOnly` (bug pre-80b1dd5) bloquea `createBrowserClient` | DevTools → Application → Cookies → verificar `httpOnly` en `sb-*`; borrar cookies `sb-*` y re-login como Admin SCACR |
| `hydration mismatch bis_skin_checked` | Extensión Bitdefender inyecta atributo | Ya mitigado en [`app/layout.tsx:50-71`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/app/layout.tsx#L50-L71) con `MutationObserver({attributes:true})` |
| 401 en `/api/*` | Sin sesión o `requireRole` con rol no permitido | Verificar `empleados.id_auth` vinculado y rol (`Admin\|Tostador\|Recepción\|Operador`) |
| 403 en admin | Usuario no es `Admin` | Sidebar solo muestra Administración si `userRole === "Admin"` ([`components/layout/sidebar.tsx:118`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/components/layout/sidebar.tsx#L118)) |

### 5.2 Pasos de Diagnóstico

```bash
# 1. Verificar sesión server-side (service_role bypass RLS: debe ver datos)
node -e "
import {createClient} from '@supabase/supabase-js';
import fs from 'fs';
const env=Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim()]}));
const c=createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const {count}=await c.from('ordenes_trabajo').select('*',{count:'exact',head:true});
console.log('ordenes count (service_role):', count);
"

# 2. Verificar RLS como anon (debe ser 0 sin sesión)
# 3. Verificar middleware: GET / sin cookie → 307 a /login (ver middleware.ts:34-36)
# 4. Verificar cookies: con httpOnly preservado del upstream, document.cookie debe contener sb-*
```

### 5.3 Mitigación Rápida

- **Cookies atascadas:** DevTools → borrar `sb-*` → login de nuevo. O probar en incógnito.
- **Rol no vinculado:** `UPDATE empleados SET id_auth = '<auth.users.id>' WHERE id_empleado = X` (solo Admin/Tostador tienen auth vinculado en seed).

## 6. Monitoreo y Logs

- **CI:** badge en README, Actions → workflow `CI` (check-secrets, lint, typecheck, test, coverage, audit, gitleaks).
- **Logs de app:** `handleApiError` loguea en `development` ([`lib/error-handler.ts:27`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/error-handler.ts#L27)).
- **Supabase:** Dashboard → Logs (Postgres, Auth, API).

## 7. Contacto y Escalamiento

Definir en `CODEOWNERS` o en la descripción del PR quién revisa (actualmente `@owner` / revisión manual).
