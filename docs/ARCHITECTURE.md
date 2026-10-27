# ARCHITECTURE — Arquitectura del Sistema

> **Permalink base:** [`80b1dd5`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/tree/80b1dd5)

## 1. Diagrama de Alto Nivel

![Diagrama de Arquitectura](./diagrams/system_arch.mmd)

```mermaid
%% Ver archivo fuente: docs/diagrams/system_arch.mmd
graph TB
    Browser[Browser - React 19 / Next.js App Router]
    Middleware[Middleware - Auth + Cookies]
    API[API Routes - requireAuth/requireRole + Zod]
    Services[Services - resolver-tarifa, empacado, orquestador]
    DB[(PostgreSQL - RLS + Triggers)]
    SupabaseClient[Supabase Browser Client - anon]
    OfflineDB[(IndexedDB - idb)]
    Sync[Sync Queue - POST /api/sync]
    Browser --> Middleware --> API --> Services --> DB
    Browser --> SupabaseClient --> DB
    Browser --> OfflineDB --> Sync --> API
```

Fuente editable: [`docs/diagrams/system_arch.mmd`](./diagrams/system_arch.mmd) — diagrama Mermaid renderizable en GitHub.

## 2. Componentes Principales

| Componente | Ubicación | Responsabilidad | Evidencia |
|------------|-----------|-----------------|-----------|
| **Client (Browser)** | `app/(dashboard)/**`, `components/**` | Renderizado React 19, formularios con RHF+Zod, gráficos `recharts` (code-split), PDF `jspdf`/`html-to-image` bajo demanda | [`app/layout.tsx:50-72`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/app/layout.tsx#L50-L72), [`app/(dashboard)/tueste/[perfilId]/hooks/usePDF.ts:47`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/app/(dashboard)/tueste/[perfilId]/hooks/usePDF.ts#L47) |
| **Middleware** | [`middleware.ts`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/middleware.ts) | `createServerClient` con `applySecureCookies`; `getUser()` server-side; redirección `!auth → /login` y `auth + /login → /`; headers `Cache-Control: private, no-store` | [`middleware.ts:8-48`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/middleware.ts#L8-L48) |
| **API Routes** | `app/api/**` (28 handlers) | `withErrorHandler`, `requireAuth`/`requireRole`, validación Zod, `createClient` o `createAdminClientWithRoleCheck` | [`lib/api-helpers.ts:57-87`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/api-helpers.ts#L57-L87) |
| **Services** | `lib/services/**` | Lógica de dominio pura: `resolverTarifaPorPeso` (intervalo `[min,max)`), `calcularEmpaques` (normalización gramos→kg), `orquestador` (orden estable por `prioridad, id`) | [`lib/services/resolver-tarifa.ts:9-20`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/services/resolver-tarifa.ts#L9-L20), [`lib/services/orquestador.ts:21-25`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/services/orquestador.ts#L21-L25) |
| **Schemas** | `lib/schemas/**` | Contratos Zod: `crearOrdenSchema`, `crearServicioSchema` (intervalos + anti-solape), `bulkTemperaturasSchema` | [`lib/schemas/servicios-maestro.ts:12-64`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/schemas/servicios-maestro.ts#L12-L64) |
| **Supabase** | `lib/supabase/**`, `supabase/**` | `client.ts` (browser anon), `server.ts` (SSR anon+cookies), `service-role.ts` (`server-only`, service_role), `admin.ts` (`requireRole` + service_role) | [`lib/supabase/service-role.ts:1-15`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/supabase/service-role.ts#L1-L15) |
| **Offline** | `lib/offline/**` | IndexedDB (`idb`) para cola de temperaturas/hitos/métricas; `POST /api/sync` con `upsert` | [`lib/offline/db.ts`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/offline/db.ts), [`lib/offline/sync.ts:6-44`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/offline/sync.ts#L6-L44) |
| **Seguridad** | `lib/cookies.ts`, `lib/env-*.ts`, `scripts/check-secrets.mjs` | `applySecureCookies` (preserva `httpOnly` de Supabase, `secure` en prod, `sameSite:lax`), `check-secrets` pre-build | [`lib/cookies.ts:24-70`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/cookies.ts#L24-L70) |

## 3. Flujo de Datos

### 3.1 Request Típico (Página Protegida)
```text
1. Browser → GET /ordenes
2. Middleware: createServerClient(getAll/setAll → applySecureCookies)
   → supabase.auth.getUser() [verifica JWT contra Auth server]
   → si !user && !isPublicRoute → 307 /login
   → si user && /login → 307 /
   → set Cache-Control: private, no-store
3. Route Handler (ej. GET /api/ordenes): requireRole(['Admin','Recepción','Tostador']) → supabase.from('ordenes_trabajo').select() [RLS: TO authenticated USING (deleted_at IS NULL)]
4. Services (si aplica): resolverTarifaPorPeso() / calcularEmpaques() / ordenarPorPrioridadEstable()
5. Response JSON → Browser render
```

Evidencia del flujo: [`middleware.ts:8-40`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/middleware.ts#L8-L40) + [`lib/api-helpers.ts:68-87`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/api-helpers.ts#L68-L87) + [`app/api/ordenes/route.ts`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/app/api/ordenes/route.ts).

### 3.2 Flujo Offline (Fase 3, rama `feat/audit-hardening`)

```text
Browser offline → lib/offline/db.ts (IndexedDB) encola {tempId, table, data, retries, next_attempt_at}
    ↓ (vuelve online: evento 'online' en TopBar, o próxima acción del usuario)
lib/offline/sync.ts → single-flight (sin syncAll concurrentes) → chunks ≤200
    ↓ POST /api/sync {items: [{tempId, table, data}]} (máx 500, Zod por tabla)
API: valida cada item → agrupa por tabla → bulk upsert con onConflict
     (claves naturales: (id_perfil,minuto), (id_perfil,tipo_hito),
      (id_perfil,orden_secuencia), (id_perfil,tipo_metrica))
    ↓ fallback por item si el bulk falla (waterfall para aislar el error)
Respuesta {data: {accepted: [{tempId, recordId}], rejected: [{tempId, code, message}]}}
    ↓ accepted → marca synced local + removeFromSyncQueue
      rejected → retry con backoff exponencial (5s·2^n, cap 5min); a los 3 fallos → dead_letter
```

- **Idempotencia:** server = upsert sobre constraints UNIQUE existentes; reprocesar el mismo batch no duplica (dedupe last-write-wins por clave natural antes del bulk).
- **Nada se pierde:** agotados los reintentos el item va a `dead_letter` (IndexedDB, con `last_error`) — nunca se borra silenciosamente. Recuperación manual: badge en TopBar → "Reintentar" reencola todo y dispara `syncAll()`; ver `docs/RUNBOOK.md` (diagnóstico sync/DLQ).
- **Sin secretos en errores:** el servidor trunca mensajes de PG a 200 chars; el cliente guarda `last_error` sin tokens.
- **Limitación conocida:** `procesarItemsParaSync` no tiene test contra BD real; la lógica (bulk/fallback/mapeo) está cubierta con DB falsa (`sync-server.test.ts`) y el upsert idempotente se valida en el branch de Supabase. `servicios_ejecutados` (legacy, sin clave natural) se inserta por item.

## 4. Módulos y Clases Clave

### 4.1 Autenticación y Autorización
- **Roles:** `Admin | Tostador | Recepción | Operador` ([`lib/auth-helpers.ts:3`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/auth-helpers.ts#L3)).
- **Client:** `getCurrentUserRole()` — solo `use client` ([`lib/auth-helpers.ts:10-23`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/auth-helpers.ts#L10-L23)).
- **Server:** `requireAuth()` (401 si no hay user) y `requireRole(roles)` (403 si rol no permitido, valida `roles` no vacío) ([`lib/api-helpers.ts:57-87`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/api-helpers.ts#L57-L87)).
- **Admin:** `createAdminClientWithRoleCheck(roles)` — verifica rol y luego crea cliente con `service_role` que bypassa RLS ([`lib/supabase/admin.ts:19-23`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/supabase/admin.ts#L19-L23)).

### 4.2 Validación en Capas
| Capa | Mecanismo | Ejemplo |
|------|-----------|---------|
| Frontend | Zod en RHF (`@hookform/resolvers`) | `crearOrdenSchema` en [`app/(dashboard)/ordenes/nueva/page.tsx`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/app/(dashboard)/ordenes/nueva/page.tsx) |
| API | `safeParse` + `apiValidationError` (422) | [`app/api/admin/servicios/route.ts:24-25`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/app/api/admin/servicios/route.ts#L24-L25) |
| DB | Constraints + trigger anti-solape + RLS | [`supabase/migrations/0019_flujo_secuencial_tarifas_intervalo.sql:119-135`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/supabase/migrations/0019_flujo_secuencial_tarifas_intervalo.sql#L119-L135) |

### 4.3 Manejo de Errores
`AppError` tipado con `code` y `status` ([`lib/error-handler.ts:1-60`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/error-handler.ts#L1-L60)), `handleApiError` centraliza 401/403/422/500, `withErrorHandler` envuelve handlers.

### 4.3bis Transacciones (Fase 4, rama `feat/audit-hardening`)
- Las escrituras multi-tabla son **funciones SQL atómicas** (`supabase/migrations/0024_rpc_transaccionales.sql`): `crear_orden_completa`, `crear_servicio_con_precios`, `actualizar_servicio_con_precios`, `cerrar_paso_orden`, `confirmar_tueste_paso`.
- `SECURITY INVOKER` (RLS intacto) + verificación de rol interna vía `get_empleado_rol()` + `EXECUTE` solo para `authenticated`.
- Los Route Handlers validan con Zod en la frontera y llaman a la RPC — **sin rollbacks manuales** ni estados parciales.
- El anti-solape de tarifas es la constraint declarativa `servicio_precios_no_traslape` (`EXCLUDE USING gist` + `numrange`, `0025`) — sin race condition.
- Orquestador TS eliminado (lo suplantaron las RPCs); `resolver_tarifa_por_peso()` SQL existe pero la resolución en TS (iniciar) se mantiene por ahora (documento: divergencia aceptada, revisar en E4 de `docs/LEGACY_MIGRATION_PLAN.md`).

### 4.4 Hidratación y Cookies
- **Hidratación:** script inline en [`app/layout.tsx:50-72`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/app/layout.tsx#L50-L72) elimina `bis_skin_checked` (extensión Bitdefender) con `MutationObserver({attributes:true, attributeFilter:["bis_skin_checked"]})`.
- **Cookies:** [`lib/cookies.ts`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/cookies.ts) preserva `httpOnly` del upstream (Supabase SSR requiere cookies legibles por JS para `createBrowserClient`).

## 5. Decisiones Arquitectónicas Relevantes

- **Service Role aislada:** [`lib/supabase/service-role.ts`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/lib/supabase/service-role.ts) con `import "server-only"` — impide importación desde cliente (build falla).
- **Pesos en `NUMERIC(10,2)`:** nunca `FLOAT` para evitar errores de precisión monetaria ([`supabase/migrations/0017_servicios_maestro_empaques.sql`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/supabase/migrations/0017_servicios_maestro_empaques.sql)).
- **Precios versionados:** `empaque_precios(valid_from, valid_to)` y `servicio_precios(activo)` preservan historial sin alterar órdenes existentes.
- **Code-splitting:** `recharts` y `jspdf`/`html-to-image` cargados con `next/dynamic` + `import()` dinámico ([`app/(dashboard)/tueste/[perfilId]/hooks/usePDF.ts:47`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/app/(dashboard)/tueste/[perfilId]/hooks/usePDF.ts#L47)).
