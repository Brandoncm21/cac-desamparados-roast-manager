# Plan: Correcciones post-fusión

**Feature**: `003-correcciones-post-fusion` | **Input**: [spec.md](./spec.md)

## Decisiones bloqueadas (dueño, 2026-11-11)

| Decisión | Resultado |
|---|---|
| B2 (triple ref catación) | **Retirada** — `disp.14` de la fusión |
| B3 (5 booleans proceso) | **Retirada** — `FR-010` |
| B4 (id_lote directo) | **No hacer** — modelo K1 vigente |
| B1 (CHECK estado) | **Aplicar** |
| B6 (enums huérfanos) | **Droppear los 4** |
| C1 (lazy dialogs) | **Editar** |
| C2 (N+1 reportes) | **Editar** |
| P2 (font local) | **Editar** — bloqueado por falta de archivos de fuente |

## Fases

1. **Fase 1 — DB (bloqueante, reversible):** migraciones `0036` (CHECK) y `0037` (DROP TYPE),
   aplicadas vía MCP + verificación en catálogo.
2. **Fase 2 — Código:** C2 (reportes), C1 (lazy dialogs), en ese orden (C2 no depende de assets).
3. **Fase 3 — P2:** Montserrat local — **se desbloquea cuando el dueño aporte los archivos**.
4. **Fase 4 — Verificación:** `check-secrets` → `lint` → `typecheck` → `test` → `build` (con red).
