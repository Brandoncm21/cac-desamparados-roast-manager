# PERFORMANCE_TESTING — Pruebas de carga (k6)

> **Actualización:** 2026-10-27 · **Rama:** `feat/audit-hardening` (Fase 5 — Pruebas de carga)
> **Commit auditado:** rama `feat/audit-hardening` sobre `edc284b` + Fases 1–4
> **Cambios:** carpeta `performance/` con 6 escenarios k6 y README de referencia.
> **Limitaciones:** no ejecutan credenciales reales; requieren cookie de sesión exportada por el usuario. Los resultados locales dependen del hardware y del branch de Supabase activo.
> **Pendiente:** ejecutar contra staging/branch con datos representativos y registrar líneas base.

## 1. Requisitos

```bash
# k6 vía npx (no es devDependency del proyecto)
npx k6 version
```

Variables de entorno requeridas (NUNCA commitear valores):

| Variable | Descripción |
|---|---|
| `BASE_URL` | URL de la app (default `http://localhost:3016`) |
| `COOKIES` | Cookie de sesión autenticada (`sb-<ref>-auth-token=...`). Obtener desde DevTools → Application → Cookies tras login |
| `CLIENTE_ID`, `EMPLEADO_ID`, `SERVICIO_ID`, `PERFIL_ID` | IDs válidos según escenario (defaults 1/1/5/1) |

## 2. Cómo ejecutar

```bash
# Local (dev server corriendo)
COOKIES="sb-xxx-auth-token=..." npx k6 run performance/ordenes_listado.js

# Contra branch de Supabase / staging
COOKIES="..." BASE_URL="https://staging.example.com" npx k6 run performance/sync_bulk_temperaturas.js
```

Escenarios: ver `performance/README.md` (6 scripts mapeados a los flujos críticos).

## 3. Qué observar

- `http_req_duration` — p(95) por escenario (thresholds definidos por escenario).
- `http_req_failed` — tasa de error (debe ser < 5% salvo escenarios de conflicto).
- `checks` — proporción de verificaciones pasadas.
- En el destino de logs: correlación entre picos de duración y errores PostgreSQL (`event:"api.request"` con `pgError`), y métricas `sync.batch` (ratio rejected).

## 4. Umbrales recomendados (puntos de partida)

| Escenario | p(95) objetivo | Tasa de fallo |
|---|---|---|
| Listados paginados | < 800 ms | < 5% |
| Búsqueda clientes | < 500 ms | < 5% |
| Creación de órdenes | < 1500 ms | < 10% |
| Bulk sync (100 items) | < 2000 ms | < 2% |
| Lectura perfiles | < 700 ms | < 5% |
| Tarifas concurrentes | sin umbral de duración | expectativa mixta 200/409 |

Ajustar tras obtener líneas base reales; estos valores asumen volúmenes pequeños.

## 5. Limitaciones de pruebas locales

- El dev server (Turbopack) compila bajo demanda: la primera request de cada ruta incluye compilación — descartar el primer run o hacer warmup.
- Sin proveedor de producción definido, `BASE_URL` local mide el dev server, no el rendimiento productivo.
- Los datos del branch de Supabase son una copia fresca sin volumen; los resultados con poca data sobreestiman el rendimiento (seq scans ganan por definición en tablas diminutas).

## 6. Ejecución contra staging

1. Desplegar la rama en un entorno con `NODE_ENV=production`.
2. Aplicar migraciones `0023`–`0025` en un branch de Supabase equivalente.
3. Sembrar volumen representativo (ver `docs/DATA_GROWTH_PLAN.md` §3) antes de medir.
4. Registrar resultados (comando, fecha, valores p50/p95/max) en este documento como líneas base.
