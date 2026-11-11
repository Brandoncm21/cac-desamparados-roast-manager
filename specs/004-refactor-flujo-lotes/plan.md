# Plan: Refactor del flujo — lotes ↔ clientes/fincas ↔ órdenes ↔ tueste ↔ catación

**Feature**: `004-refactor-flujo-lotes` | **Input**: [spec.md](./spec.md)

## Decisiones cerradas (dueño, 2026-11-11)

| # | Decisión | Resultado |
|---|---|---|
| D1 | Fincas vs zonas | `fincas` nueva + `zona_id → zonas_finca` |
| D2 | Cliente ↔ finca | 1 cliente → N fincas (`fincas.cliente_id`) |
| D3 | Productor | `lotes_cafe.id_cliente → clientes` |
| D4 | Lote ↔ orden | N:M por id (`orden_lotes`) |
| D5 | Obligatoriedad | opcional en ambos sentidos |
| D6 | Lote ↔ tueste | solo vía orden |
| D7 | Catación ↔ lote | elige lote + estado catación |
| D8 | Altura | en vivo desde `fincas.altura` |
| D9 | Proceso en trilla/bodega | `proceso_cafe` editable |
| P1 | Estado catación | `'En Catación'` en `enproceso`; al terminar → `'Vendido'` |
| P2 | Proceso | enum `proceso_cafe` en lote; booleans quedan como despulpado |
| P3 | Finca en orden | cualquier finca (sin filtrar por cliente) |
| P4 | Finca obligatoria | lote: sí · orden: no |
| P5 | Backfill productores | crear clientes automáticamente por nombre |
| P6 | Rama | `feat/flujo-lotes` |

## Fases

1. **Fase 1 — Fincas** (`0038`): tabla `fincas` + RLS + Zod + API + UI.
2. **Fase 2 — Lote** (`0039`): `lotes_cafe` + `id_cliente`/`id_finca`/`proceso_cafe` + `'En Catación'`; API/UI.
3. **Fase 3 — Orden** (`0040`): `orden_lotes` + `ordenes_trabajo.id_finca`; API/UI.
4. **Fase 4 — Catación + backfill** (`0041`, `0042`): backfill de datos, selector de lote, drop legacy.
5. **Fase 5 — Verificación**: suite completa + demo de trazabilidad + docs.

Cada fase termina con evidencia (MCP para migraciones, typecheck/lint/test para código).
