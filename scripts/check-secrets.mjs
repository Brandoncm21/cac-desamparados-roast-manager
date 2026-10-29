#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * check-secrets.mjs
 *
 * Auditoría de secretos en el repositorio y en el entorno del proceso.
 *
 * Objetivos:
 *   1. Detectar variables `NEXT_PUBLIC_*` que contengan `SERVICE_ROLE`
 *      en archivos `.env*` del repositorio.
 *   2. Detectar el mismo patrón en `process.env` para evitar builds
 *      inseguros en CI o local.
 *   3. Detectar literales hardcodeados en código/docs/scripts rastreados:
 *      - service role key de Supabase (eyJ... con longitud característica)
 *      - tokens de management API (sbp_...)
 *      - contraseñas de base de datos (DB_PASSWORD / DATABASE_URL con valor real)
 *      - PROJECT_REF con valor real (forma asignación o URL de dashboard)
 *      - connection strings postgres con password embebido
 *
 * Garantías:
 *   - Nunca imprime el valor de una variable o secreto.
 *   - Finaliza con exit code 0 si no hay hallazgos.
 *   - Finaliza con exit code 1 si detecta al menos un hallazgo.
 *
 * Notas de diseño:
 *   - Los placeholders (`your_*`, `xxxx`, `<...>`, `changeme`, `example`,
 *     `...`, `***`) y las lecturas `process.env.*` nunca se reportan.
 *   - El identificador de proyecto en query params (`?project_ref=...`, usado
 *     por la config MCP de OpenCode) es un identificador funcional, no un
 *     secreto, y no se reporta. Sí se reportan asignaciones y URLs de dashboard.
 *   - Los directorios `__tests__` / `__fixtures__` se excluyen (fixtures dummy).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

const REPO_ROOT = process.cwd();
const SERVICE_ROLE_PATTERN = /SERVICE_ROLE/i;
const PUBLIC_ENV_FILE_PATTERNS = [/^\.env(\.|$)/i];

const SCANNED_EXTENSIONS = [".ts", ".tsx", ".js", ".mjs", ".json", ".md"];

const SCANNED_INCLUDE_DIRS = [
  "app",
  "lib",
  "components",
  "middleware.ts",
  "scripts",
  "docs",
  ".specify",
];

const SCANNED_INCLUDE_FILES = [
  "README.md",
  "CHANGELOG.md",
  "opencode.json",
  ".env.example",
  "AGENTS.md",
];

const SCANNED_SKIP_DIRS = [
  "node_modules",
  ".next",
  ".git",
  "coverage",
  "dist",
  "build",
  ".opencode",
  "__tests__",
  "__fixtures__",
];

const PLACEHOLDER_PATTERN =
  /your_|xxxx|XXXX|changeme|example|placeholder|\.\.\.|<|>|\*\*\*/;

const ENV_READ_PATTERN = /^process\.env\b/;

function isPlaceholderOrEnvRead(value) {
  return PLACEHOLDER_PATTERN.test(value) || ENV_READ_PATTERN.test(value);
}

const findings = [];

function record(category, location, key) {
  findings.push({ category, location, key });
}

function safeExecLines(command) {
  try {
    const stdout = execSync(command, {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function safeExecNullDelimited(command) {
  try {
    const stdout = execSync(command, {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return stdout.split("\0").filter(Boolean);
  } catch {
    return [];
  }
}

function scanEnvFiles() {
  const lines = safeExecNullDelimited(`git ls-files -z -- ".env*"`);

  for (const relPath of lines) {
    const fileName = relPath.split("/").pop() || relPath;
    if (!PUBLIC_ENV_FILE_PATTERNS.some((re) => re.test(fileName))) {
      continue;
    }

    const fullPath = resolve(REPO_ROOT, relPath);
    let content;
    try {
      content = readFileSync(fullPath, "utf8");
    } catch {
      continue;
    }

    content.split(/\r?\n/).forEach((line, index) => {
      const match = line.match(/^\s*(NEXT_PUBLIC_[A-Z0-9_]*)\s*=/);
      if (!match) return;
      const key = match[1];
      if (!SERVICE_ROLE_PATTERN.test(key)) return;
      record("env-file", `${relPath}:${index + 1}`, key);
    });
  }
}

function scanProcessEnv() {
  for (const [key, value] of Object.entries(process.env)) {
    if (!key.startsWith("NEXT_PUBLIC_")) continue;
    if (!SERVICE_ROLE_PATTERN.test(key)) continue;
    if (typeof value !== "string" || value.length === 0) continue;
    record("process-env", "process.env", key);
  }
}

function isScannedFile(relPath) {
  const segments = relPath.split("/");
  if (SCANNED_SKIP_DIRS.some((skip) => segments.includes(skip))) {
    return false;
  }
  const extOk = SCANNED_EXTENSIONS.some((ext) => relPath.endsWith(ext));
  if (!extOk) return false;
  if (SCANNED_INCLUDE_FILES.includes(relPath)) return true;
  return SCANNED_INCLUDE_DIRS.some(
    (dir) => relPath === dir || relPath.startsWith(`${dir}/`)
  );
}

function scanTrackedFiles() {
  const files = safeExecNullDelimited(
    `git ls-files -z -- ${SCANNED_EXTENSIONS.map((ext) => `*${ext}`).join(" ")}`
  ).filter(isScannedFile);

  for (const relPath of files) {
    const fullPath = resolve(REPO_ROOT, relPath);
    let content;
    try {
      content = readFileSync(fullPath, "utf8");
    } catch {
      continue;
    }

    content.split(/\r?\n/).forEach((line, index) => {
      const location = `${relPath}:${index + 1}`;

      // 1. Service role key hardcodeada (eyJ... largo asignado).
      if (
        /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*['"]?(eyJ[a-zA-Z0-9._-]{40,})['"]?/.test(
          line
        )
      ) {
        record(
          "hardcoded-literal",
          location,
          "SUPABASE_SERVICE_ROLE_KEY"
        );
      }

      // 2. Personal Access Token de Supabase (sbp_...).
      if (/sbp_[A-Za-z0-9]{20,}/.test(line)) {
        record("supabase-pat", location, "sbp_* token");
      }

      // 3. Contraseña de BD con valor real (no placeholder).
      const dbMatch = line.match(
        /(DB_PASSWORD|DATABASE_URL)\s*[:=]\s*["']?([^\s"'#;]+)/
      );
      if (dbMatch && !isPlaceholderOrEnvRead(dbMatch[2])) {
        record("db-password", location, dbMatch[1]);
      }

      // 4. PROJECT_REF con valor real en forma de asignación.
      //    Se excluye el contexto de query param (?project_ref= / &project_ref=),
      //    que es un identificador funcional (p. ej. config MCP).
      const refMatch = line.match(
        /(?<![?&])(SUPABASE_)?PROJECT_REF\s*[:=]\s*["']?([A-Za-z0-9]{15,})["']?/i
      );
      if (refMatch && !isPlaceholderOrEnvRead(refMatch[2])) {
        record("project-ref", location, "PROJECT_REF");
      }

      // 5. URL de dashboard con project ref real.
      if (/dashboard\/project\/[a-z0-9]{20}\//.test(line)) {
        record("dashboard-url", location, "dashboard project URL");
      }

      // 6. Connection string postgres con password embebido real.
      if (
        /postgres(ql)?:\/\/[^/\s:]+:[^@\s/]+@/.test(line) &&
        !PLACEHOLDER_PATTERN.test(line)
      ) {
        record("connection-string", location, "postgres URL");
      }
    });
  }
}

function main() {
  scanEnvFiles();
  scanProcessEnv();
  scanTrackedFiles();

  if (findings.length === 0) {
    console.log("✅ check-secrets: no se detectaron exposiciones de secretos.");
    process.exit(0);
  }

  console.error("❌ check-secrets: se detectaron posibles exposiciones:");
  for (const f of findings) {
    console.error(`  - [${f.category}] ${f.location} -> ${f.key}`);
  }
  console.error(
    "\nLas credenciales (service role, sbp_*, DB_PASSWORD, PROJECT_REF) no deben existir en archivos rastreados. Usa variables de entorno."
  );
  process.exit(1);
}

main();
