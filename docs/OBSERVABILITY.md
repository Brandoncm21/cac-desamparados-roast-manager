# OBSERVABILITY — Logs estructurados y correlación

> **Actualización:** 2026-10-27 · **Rama:** `feat/audit-hardening` (Fase 5 — Observabilidad)
> **Commit auditado:** rama `feat/audit-hardening` sobre `edc284b` + Fases 1–4
> **Cambios:** `lib/observability.ts` (nuevo), correlación por request y logs estructurados integrados en `withErrorHandler` y en el flujo de sync.
> **Limitaciones:** los logs viven en la salida estándar del runtime (Dashboard → Logs si se despliega); no hay retención/agregación propia ni plataforma externa obligatoria.
> **Pendiente:** definir destino de logs en el provider de producción y alertas (ver `docs/RUNBOOK.md`).

## 1. Correlation ID por request

- Cada request a un endpoint envuelto con `withErrorHandler` genera un `correlationId` (UUID v4, `lib/observability.ts:newCorrelationId`).
- Se devuelve al cliente en el header **`x-correlation-id`** y, en errores (catch del wrapper), también dentro del body: `{ error: { ..., correlationId } }`.
- Uso: ante un reporte de fallo, pedir el `correlationId` visible en el toast/DevTools y filtrar los logs por ese valor.

## 2. Log de request (`api.request`)

Emisión automática al terminar cada request (éxito o excepción):

```json
{"ts":"2026-10-27T03:00:00.000Z","level":"info","event":"api.request","correlationId":"…","endpoint":"/api/ordenes","method":"GET","status":200,"durationMs":42}
```

| Campo | Descripción |
|---|---|
| `ts` | ISO 8601 UTC |
| `level` | `info` (2xx) · `warn` (4xx) · `error` (5xx) |
| `correlationId` | ID del request |
| `endpoint` / `method` | ruta y verbo HTTP |
| `status` | código de respuesta |
| `durationMs` | duración total del handler |
| `pgError.code/message` | solo en errores con código PostgreSQL conocido (sanitizado, ≤200 chars) |

## 3. Métricas de sync (`sync.batch`)

`POST /api/sync` emite por cada batch:

```json
{"ts":"…","level":"info","event":"sync.batch","batchSize":40,"tablas":{"trazabilidad_temperatura":35,"hitos_termicos":5},"accepted":38,"rejected":2}
```

- `batchSize`: items recibidos. `tablas`: distribución por tabla. `accepted`/`rejected`: resultado item-por-item.
- Alerta sugerida: ratio `rejected/batchSize` alto sostenido o `accepted=0` en batches grandes.

## 4. Redacción de datos sensibles

- `redactar()` elimina claves que contengan: `password`, `token`, `authorization`, `cookie`, `apikey`, `service_role`, `sbp_`, `secret` (case-insensitive) y las reemplaza por `[redacted]` recursivamente.
- Los mensajes de errores PostgreSQL se truncan a 200 caracteres antes de guardarse/loguearse (`lib/offline/sync-server.ts:mensajeSeguro`).
- **Nunca** loguear bodies completos de POST, cookies ni headers de autorización.
- El cliente offline guarda `last_error` (texto del mensaje, sin secretos) en IndexedDB.

## 5. Desarrollo vs producción

- Formato idéntico (JSON de una línea) en ambos entornos para poder grepear: `event:"api.request"`.
- En desarrollo los errores siguen apareciendo con stack en consola (`lib/error-handler.ts` loguea en development); en producción solo el JSON estructurado.
- Métricas disponibles sin infraestructura adicional: conteo de requests por `endpoint/method/status`, p95 de `durationMs` (calcular sobre logs), errores PG por `code`.

## 6. Notas

- `withErrorHandler` es el punto único de instrumentación: cualquier endpoint nuevo hereda correlación y logging gratis.
- El log `sync.batch` es fire-and-forget (no bloquea la respuesta).
- Si se introduce una plataforma externa (p. ej. Sentry), esta capa es el punto de integración: redactar SIEMPRE antes de enviar.
