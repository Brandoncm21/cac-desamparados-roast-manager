# SCACR - Sistema de Gestión de Torrefacción

Sistema completo de gestión para el Centro Agrícola Cantonal de Desamparados (CAC).
Administra órdenes de trabajo, clientes, empleados y perfiles de tueste de café.

## 🚀 Quick Start

### Requisitos
- Node.js 18+
- npm o yarn
- Cuenta Supabase

### Instalación

```bash
# Clonar repositorio
git clone <repo-url>
cd cac-desamparados-roast-manager

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales de Supabase

# Ejecutar migrations (si aplica)
npx supabase db push

# Iniciar servidor de desarrollo
npm run dev
```

Abre http://localhost:3016

## 📋 Variables de Entorno Requeridas

```bash
# Supabase — públicas (NEXT_PUBLIC_*), disponibles en cliente y servidor
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# App
NEXT_PUBLIC_APP_URL=http://localhost:3016
NODE_ENV=development
```

> ⚠️ **SERVER-ONLY**: `SUPABASE_SERVICE_ROLE_KEY` **no debe** ser
> `NEXT_PUBLIC_*`. Sólo la consumen módulos server-side.
>
> Acceso desde código:
>
> ```ts
> // server-only: marca el archivo; rompe builds en cliente.
> import { createAdminClient } from "@/lib/supabase/service-role";
> import { createAdminClientWithRoleCheck } from "@/lib/supabase/admin";
> ```
>
> El script `npm run check-secrets` falla el build si detecta
> `NEXT_PUBLIC_*` con `SERVICE_ROLE` en `.env*` versionados, en
> `process.env`, o literales hardcodeados con patrón de service role.

## 📁 Estructura del Proyecto

```
app/
  ├── (auth)/          # Rutas de autenticación
  ├── (dashboard)/     # Rutas protegidas
  └── api/             # API REST endpoints

lib/
  ├── supabase/        # Clientes Supabase
  ├── services/        # Lógica de negocio
  ├── schemas/         # Validaciones Zod
  ├── offline/         # IndexedDB + sync offline
  ├── env.ts           # Validación de variables de entorno
  ├── error-handler.ts # Manejo de errores tipados
  └── api-helpers.ts   # Helpers para APIs

components/
  ├── ui/              # Componentes Shadcn/ui
  ├── forms/           # Formularios del dominio
  └── layout/          # Componentes de layout
```

## 🏗️ Arquitectura

### Flujo de datos
```
Client Browser
    ↓
Middleware (Autenticación)
    ↓
API Route (/api/*)
    ↓
Service Layer (Lógica)
    ↓
Supabase (PostgreSQL + Auth)
```

### Validación en capas
- **Frontend:** Validación Zod en formularios
- **API:** Validación Zod en request body
- **Database:** Constraints SQL y RLS policies

## 📚 API Endpoints

Todas las rutas `/api/*` requieren autenticación mediante Supabase Auth.

### Clientes
- `GET /api/clientes` - Listar clientes
- `POST /api/clientes` - Crear cliente
- `GET /api/clientes/[id]` - Obtener cliente
- `PUT /api/clientes/[id]` - Actualizar cliente

### Órdenes de Trabajo
- `GET /api/ordenes` - Listar órdenes
- `POST /api/ordenes` - Crear orden
- `GET /api/ordenes/[id]` - Obtener orden
- `PUT /api/ordenes/[id]` - Actualizar orden
- `POST /api/ordenes/[id]/servicios` - Agregar servicios
- `PUT /api/ordenes/[id]/estado` - Cambiar estado
- `POST /api/ordenes/[id]/especificaciones` - Agregar especificaciones

### Perfiles de Tueste
- `GET /api/perfiles-tueste/[id]` - Obtener perfil
- `POST /api/perfiles-tueste` - Crear perfil
- `GET /api/perfiles-tueste/[id]/temperaturas` - Obtener temperaturas
- `POST /api/perfiles-tueste/[id]/temperaturas` - Registrar temperaturas
- `PUT /api/perfiles-tueste/[id]/hitos/[tipoHito]` - Registrar hito
- `PUT /api/perfiles-tueste/[id]/metricas/[tipoMetrica]` - Registrar métrica
- `POST /api/perfiles-tueste/[id]/ajustes` - Registrar ajuste

### Otros
- `GET /api/empleados` - Listar empleados
- `GET /api/zonas` - Listar zonas de finca
- `POST /api/sync` - Sincronizar datos offline

### Administración (solo Admin)
- `GET/POST /api/admin/servicios` - Listar/crear servicios (con intervalos de precio)
- `GET/PUT/DELETE /api/admin/servicios/[id]` - Obtener/actualizar/desactivar servicio e intervalos
- `GET/POST /api/admin/empaques` - Listar/crear empaques
- `GET/PUT/DELETE /api/admin/empaques/[id]` - Obtener/actualizar/desactivar empaque
- `GET/POST /api/admin/empaques/[id]/precios` - Historial/nuevo precio de empaque
- `GET /api/servicios-activos` - Servicios activos con sus intervalos y empaques activos con precio vigente

## 📦 Módulo Productos/Servicios y Empaques

El módulo permite al Admin gestionar un catálogo maestro de servicios con **tarifas por intervalo de peso** y empaques con precios vigentes.

### Cómo crear/editar un servicio
1. En **Admin → Servicios → Nuevo Servicio**.
2. Complete `nombre`, `descripcion` (opcional), `prioridad` (orden en el proceso, único) y `tipo`:
   - **General**: proceso regular (chancado, trillado, molido, etc.).
   - **Tueste**: paso especial que requiere confirmación manual del operador.
   - **Empacado**: paso especial que solicita selección de empaque.
3. Agregue uno o más **intervalos de precio**:
   - `peso_min_kg` (inclusive), `peso_max_kg` (exclusivo; vacío = sin límite superior), `precio_por_kg`.
4. Validaciones: mínimo 1 intervalo, `peso_min < peso_max`, `precio > 0`, sin solapes entre intervalos del mismo servicio.
5. Guarde: el servicio y sus intervalos se persisten juntos.
6. Para editar, desde la lista pulse el lápiz: puede modificar datos, agregar/editar/eliminar intervalos y **desactivar** (soft delete) el servicio.

### Cómo funcionan los intervalos de precio
- El precio se aplica por **rango de peso**: `peso_min_kg <= peso < peso_max_kg`.
- Al iniciar un paso de la orden, el sistema busca la tarifa que corresponda al peso inicial.
- Los intervalos no pueden solaparse (validado en frontend, API y base de datos con un trigger).
- Los intervalos inactivos no se consideran al cotizar ni al resolver la tarifa.

### Flujo de creación de órdenes
1. El formulario de nueva orden carga los servicios activos (con sus intervalos) desde `/api/servicios-activos`.
2. El operador selecciona los servicios; el costo se calculará por intervalo al ejecutar cada paso en la orden.

### Datos iniciales (seed)
La migración `0021` inserta servicios base (Chancado, Trillado, Clasificación Mecánica/Manual, Tueste, Molido, Empacado) con **3 intervalos de ejemplo cada uno** (Chancado usa rangos más amplios).

> **Importante:** estos precios son valores **de referencia iniciales**, totalmente editables por el Admin desde la UI. No representan tarifas fijas de mercado.

### Nota sobre unidades
Los pesos se almacenan en **kilogramos** usando `NUMERIC(10,2)` (nunca FLOAT) para evitar errores de precisión.

## 🔐 Autenticación

Utiliza Supabase Auth con política de sesión basada en cookies. El middleware verifica automáticamente cada request y redirige a `/login` si es necesario.

Las APIs requieren autenticación mediante `requireAuth()` en cada handler.

### Cookies de sesión
Las cookies emitidas por Supabase SSR se reescriben a través de
`lib/cookies.ts`, que garantiza flags homogéneos en todas las respuestas:

| Flag        | Desarrollo | Producción | Razón                                                                 |
|-------------|------------|------------|-----------------------------------------------------------------------|
| `httpOnly`  | `true`     | `true`     | Impide que JavaScript del cliente lea tokens de sesión.              |
| `secure`    | `false`    | `true`     | Sólo sobre HTTPS en producción para que funcione en `localhost`.      |
| `sameSite`  | `lax`      | `lax`      | Mitigación CSRF para flujos de navegación top-level.                 |
| `path`      | `/`        | `/`        | Disponible en toda la app.                                            |

El middleware también aplica `Cache-Control: private, no-store` (más
`Pragma: no-cache` y `Expires: 0`) para evitar que CDNs o proxies
cacheen respuestas con tokens de sesión.

## 🔐 Seguridad

### Service Role Key
- `SUPABASE_SERVICE_ROLE_KEY` es un secreto con privilegios elevados y bypassa
  RLS. Sólo la consumen módulos server-side (`lib/supabase/service-role.ts`,
  `lib/supabase/admin.ts`). El módulo `service-role.ts` marca el archivo con
  `import "server-only";` para impedir su importación desde cliente.
- El script `npm run check-secrets` se ejecuta antes del build
  (`prebuild`) y falla si detecta:
  - variables `NEXT_PUBLIC_*` con `SERVICE_ROLE` en `.env*` versionados o
    en `process.env`;
  - literales hardcodeados con patrón de service role key en código
    rastreado.

### Rotación de credenciales históricas
> ⚠️ `scripts/apply-migration.mjs` contiene credenciales de Supabase
> (`PROJECT_REF`, `DB_PASSWORD`) **hardcodeadas en el historial de git**.
> Como tarea separada de este PR, se recomienda:
>
> 1. Rotar la `DB_PASSWORD` del proyecto Supabase.
> 2. Mover las credenciales a variables de entorno (por ejemplo
>    `.env.local`, no versionado) o a un secret manager.
> 3. Reescribir el historial con `git filter-repo` o crear una rama sin
>    la credencial y reemplazar `main` con `force-push` coordinado con el
>    equipo.
>
> No se imprimen ni se exponen valores de secretos en logs del PR.

## ✅ CI / Seguridad

[![CI](https://github.com/Brandoncm21/cac-desamparados-roast-manager/actions/workflows/ci.yml/badge.svg)](https://github.com/Brandoncm21/cac-desamparados-roast-manager/actions/workflows/ci.yml)

El pipeline `.github/workflows/ci.yml` se ejecuta en cada `push` y `pull_request` a `main`:

| Job | Comando | Descripción |
|-----|---------|-------------|
| `check-secrets` | `npm run check-secrets` | Falla si existe `NEXT_PUBLIC_*SERVICE_ROLE` en `.env*` o `process.env`. |
| `lint` | `npm run lint` | ESLint 9 (flat config, `eslint.config.mjs`). |
| `typecheck` | `npm run typecheck` | `tsc --noEmit`. |
| `test` | `npm run test` | Vitest en `jsdom`. |
| `coverage` | `npm run test:coverage` | `@vitest/coverage-v8`, artifact `coverage/`. |
| `audit` | `npm audit --audit-level=moderate` | Reporta vulnerabilidades (actualmente 12, `continue-on-error` hasta resolver `postcss`/`sharp`/`undici`). |
| `secret-scan` | `gitleaks` | Escaneo de secretos en el historial. |

Dependabot (`.github/dependabot.yml`) abre PRs semanales para `npm` y `github-actions`.

### Configurar secretos en CI
Nunca commitear `.env.local`. En GitHub: `Settings → Secrets and variables → Actions → New repository secret` para `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

## 🛠️ Comandos de Desarrollo

```bash
# Iniciar servidor de desarrollo
npm run dev

# Build de producción
npm run build

# Linting
npm run lint

# Verificar TypeScript
npx tsc --noEmit

# Tests y cobertura
npm run test
npm run test:coverage
```

## 📄 Licencia

MIT
