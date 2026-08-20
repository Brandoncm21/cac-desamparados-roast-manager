# CHANGELOG_GUIDE — Mantenimiento de CHANGELOG y Releases

> **Permalink base:** [`80b1dd5`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/tree/80b1dd5) · Archivo: [`CHANGELOG.md`](../CHANGELOG.md)

## 1. Formato

Basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y [Semantic Versioning](https://semver.org/lang/es/).

```markdown
# Changelog

Todas las notas de versión de SCACR.

## [Unreleased]
### Added
- Módulo X con descripción y referencia a PR #123
### Changed
- Ajuste Y
### Fixed
- Corrección Z

## [1.2.0] - 2026-08-20
### Added
...
```

Categorías: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`.

Evidencia actual: [`CHANGELOG.md:1-35`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/CHANGELOG.md#L1-L35) ya sigue este formato para el módulo de Servicios/Empaques (0017-0018).

## 2. Cuándo Actualizar

- **Cada PR** que añada funcionalidad, cambie comportamiento, corrija bug o afecte seguridad/performance debe añadir entrada en `## [Unreleased]` en el mismo PR.
- No esperar al release para documentar; el `Unreleased` es el borrador vivo.

## 3. Política de Versiones (Semver)

| Cambio | Versión | Ejemplo |
|--------|---------|---------|
| Breaking (API/DB incompatible) | `MAJOR` | `1.0.0 → 2.0.0` (cambio de `servicios_ejecutados` a `orden_pasos`) |
| Feature compatible | `MINOR` | `1.1.0 → 1.2.0` (nuevo endpoint `/api/admin/servicios`) |
| Fix compatible | `PATCH` | `1.2.0 → 1.2.1` (fix de `bis_skin_checked` hydration) |

Prefijo de rama y tipo de commit ayudan a decidir: `feat:` → MINOR, `fix:`/`perf:` → PATCH, `feat!:` o `BREAKING CHANGE:` → MAJOR.

## 4. Plantilla de PR (Copiar)

```markdown
## Resumen
Descripción de 1-2 oraciones del cambio.

## Cambios
- Archivo: `lib/services/orquestador.ts` — descripción
- Archivo: `supabase/migrations/0023_...sql` — descripción

## Evidencia
- `lib/services/orquestador.ts:21` — orden estable por prioridad
- `supabase/migrations/0023_...sql:10` — trigger anti-solape

## Checklist
- [ ] `npm run check-secrets` pasa
- [ ] `npm run typecheck` y `npm run lint` sin errores
- [ ] `npm run test:coverage` % anotado
- [ ] `npm run build` OK
- [ ] `CHANGELOG.md` actualizado en `Unreleased`
- [ ] `docs/` actualizado con permalinks SHA

## Riesgo
Descripción y mitigación.

## Issues Relacionados
Closes #123
```

## 5. Proceso de Release

```bash
# 1. Asegurar main verde
git checkout main && git pull --ff-only origin main
npm run check-secrets && npm run lint && npm run typecheck && npm run test:coverage && npm run build

# 2. Versionar
# Editar CHANGELOG.md: mover Unreleased → [X.Y.Z] - YYYY-MM-DD
# Editar package.json: "version": "X.Y.Z"
git add CHANGELOG.md package.json package-lock.json
git commit -m "chore(release): vX.Y.Z"
git tag -a vX.Y.Z -m "vX.Y.Z - descripción"
git push origin main --follow-tags

# 3. GitHub Release
# GitHub → Releases → Draft a new release → tag vX.Y.Z → notas desde CHANGELOG.md → Publish

# 4. Post-release
# Crear rama fix/general o feat/develop para el siguiente ciclo
```

Evidencia de versión actual: [`package.json:3`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/package.json#L3) (`0.1.0` — pre-1.0).

## 6. Ejemplo Real del Repo

`CHANGELOG.md` actual documenta el módulo de Servicios/Empaques como `Added` con 10 bullets y referencia a migraciones `0017`/`0018` — seguir ese nivel de detalle para futuros módulos (ej. `orden_pasos` y `0021`/`0022` aún no están en el Changelog y deberían añadirse en próximo release).

## 7. Buenas Prácticas

- Una entrada por PR, no por commit.
- Enlazar PR/issue: `PR #23` o `Closes #45`.
- Para `Security`: no incluir valores de secretos, solo referencia al riesgo y mitigación (ej. "Rotación de DB_PASSWORD, ver docs/SECURITY.md").
- Mantener `Unreleased` siempre al tope, con fecha solo al liberar.
