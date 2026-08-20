# CONTRIBUTING — Guía de Contribución

> **Permalink base:** [`80b1dd5`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/tree/80b1dd5)

## 1. Modelo de Ramas

| Rama | Propósito | Base |
|------|-----------|------|
| `main` | Integración / estable | — |
| `fix/general` | Correcciones generales, refactors, perf | `origin/main` |
| `feat/develop` | Nuevas funcionalidades | `origin/main` |
| `test/security` | Tests, CI, tooling, seguridad | `origin/main` |

Las 3 ramas son **de larga vida**: el trabajo diario se commitea en ellas y se integra a `main` vía PR cuando está listo. No borrar ramas viejas hasta orden explícita.

Evidencia de ramas actuales: `fix/general` (2 commits de hidratación/cookies), `feat/develop` y `test/security` vacías desde `80b1dd5`.

## 2. Flujo de Trabajo

```bash
git fetch origin --prune
git checkout fix/general && git pull --ff-only origin fix/general
# ... hacer cambios ...
npm run check-secrets && npm run lint && npm run typecheck && npm run test
git add <archivos>
git commit -m "fix: descripción concisa"
# Esperar confirmación antes de push (regla del repo)
git push -u origin fix/general
# Crear PR en GitHub: fix/general → main
```

## 3. Estilo y Convenciones

- **Mensajes de commit:** Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`, `perf:`, `ci:`) — ver [`CHANGELOG.md`](../CHANGELOG.md) como referencia.
- **TypeScript:** `strict: true` ([`tsconfig.json`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/tsconfig.json)) — `noImplicitAny`, `strictNullChecks`, etc.
- **Componentes:** `"use client"` solo donde sea necesario (formularios, gráficos); Server Components por defecto.
- **Validación:** Zod en `lib/schemas/**` + `safeParse` en API; nunca confiar en validación solo del cliente.
- **Pesos:** siempre `NUMERIC(10,2)` en kg, nunca `FLOAT`.

## 4. Validaciones Pre-PR (Checklist Local)

```bash
npm run check-secrets  # 0 hallazgos
npm run lint           # 0 errors, warnings documentados
npm run typecheck      # sin errores
npm run test           # 90 tests
npm run test:coverage  # anotar % en docs/TESTS_AND_CI.md si cambia
npm run build          # Compiled successfully + Generating static pages
```

Si añades tests, verifica que `vitest.config.ts` aliasa `@` y `server-only` →[`vitest.stub.server-only.ts`](https://github.com/Brandoncm21/cac-desamparados-roast-manager/blob/80b1dd5/vitest.stub.server-only.ts).

## 5. Pre-commit Hooks (Recomendado)

No hay hooks configurados en el repo. Para añadir localmente:

```bash
npx mrm@2 lint-staged  # o husky + lint-staged
# .husky/pre-commit: npm run lint && npm run typecheck && npm run test
```

## 6. Cómo Proponer Cambios

1. Crear rama desde `origin/main` con prefijo `fix/`, `feat/` o `test/` según tabla.
2. Commits atómicos (ej. `docs: add ARCHITECTURE.md`, `fix(auth): ...`).
3. Abrir PR con título `tipo: descripción` y cuerpo con: resumen, archivos cambiados, evidencia, checklist de seguridad (`npm run check-secrets`).
4. Etiqueta `documentation` para docs (manual en GitHub, `gh` no autenticado).
5. Pedir review a `@owner` (definir equipo en `CODEOWNERS` si aplica).

## 7. Documentación

Toda nueva funcionalidad debe actualizar `docs/` y `README.md` (sección Documentation) con permalinks SHA y ejemplos de uso.

## 8. Reporte de Issues

Si falta información (ej. detalles de despliegue en producción, provider, variables secretas), crear issue con: contexto, información exacta requerida y bloqueo del PR hasta respuesta.
