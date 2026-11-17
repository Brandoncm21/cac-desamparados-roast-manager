# Tasks: Correcciones post-fusión

**Feature**: `003-correcciones-post-fusion` | **Input**: [spec.md](./spec.md) + [plan.md](./plan.md)

> Protocolo: plan → aprobado → ejecutar → evidencia por tarea. Migraciones vía MCP con evidencia
> inmediata; `.sql` versionado en `supabase/migrations/`.

## Fase 1 — DB

- [x] **T1. Verificación previa B1** (2026-11-11): `SELECT DISTINCT estado FROM perfiles_tueste` → `Completado`, `Pendiente`. Seguro.
- [x] **T2. `0036_check_estado_perfil.sql`** (aplicada vía MCP `0036_check_estado_perfil`):
  - Evidencia: `pg_constraint` → `perfiles_tueste_estado_check` con `CHECK ((estado)::text = ANY (ARRAY['Pendiente','Completado']))`.
  - Prueba negativa: `UPDATE … estado='En Proceso'` → **23514 check_violation** (fila intacta).
- [x] **T3. Verificación previa B6** (2026-11-11): `pg_depend` → los 4 enums con **0 dependencias**. Seguro.
- [x] **T4. `0037_drop_enums_huerfanos.sql`** (aplicada vía MCP `0037_drop_enums_huerfanos`):
  - Evidencia: `pg_type` → **0 filas** para `tipo_tueste_enum`, `tipo_molienda_enum`, `tipo_empaque_enum`, `tipo_servicio_enum`.

## Fase 2 — Código

- [x] **T5. C2 — `/reportes` sin N+1** (`app/(dashboard)/reportes/page.tsx`): reemplazado el
  `Promise.all(perfiles.map(…))` por una consulta `.in("id_perfil", ids)` + `Map` de agrupación.
  Evidencia: `typecheck` 0 · `lint` 0 err · 189/189 tests.
- [x] **T6. C1 — lazy dialogs** (`app/(dashboard)/tueste/[perfilId]/page.tsx`): `RendimientosDialog` y
  `RegistroConfirmadoDialog` ahora `next/dynamic({ ssr:false })` **y con montaje condicional**
  (`{rendimientosOpen && …}` / `{ultimoRegistro && …}`) para que el chunk se pida solo al abrir.
  Evidencia: `typecheck` 0 · `lint` 0 err · 189/189 tests.
- [x] **T7. P2 — Fuentes self-hosted** (2026-11-11): `app/layout.tsx` → `next/font/local` con 3 **variable fonts**
  subset latin recuperadas del build previo (`app/fonts/`: Inter 48 KB, Montserrat 35 KB, Geist Mono 23 KB).
  Evidencia: `.next/static/media` del build de producción tiene **solo 3 woff2** (ya no descarga Google).

## Fase 3 — Verificación

- [x] **T8. Checks locales** (2026-11-11): `check-secrets` limpio · `lint` **0 errors** (41 warnings preexistentes) · `typecheck` **0** · `test` **189/189** (20 archivos).
- [x] **T9.** `npm run build` — **OK** tras T7 (`BUILD_ID fumt98ZNRRJsyDVP_jNZ0`): 0 dependencia de Google Fonts; rutas `○`/`ƒ` generadas; 3 woff2 locales en el output.
- [x] **T10.** Documentos actualizados: `docs/CORRECCIONES_BASE_CAFETRACK.md` con estado de ejecución; spec/tasks con evidencia por tarea.
