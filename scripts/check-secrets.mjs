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
 *   3. Detectar literales hardcodeados de la service role key en
 *      código fuente rastreado (`.ts`, `.tsx`, `.js`, `.mjs`, `.json`).
 *
 * Garantías:
 *   - Nunca imprime el valor de una variable o secreto.
 *   - Finaliza con exit code 0 si no hay hallazgos.
 *   - Finaliza con exit code 1 si detecta al menos un hallazgo.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

const REPO_ROOT = process.cwd();
const SERVICE_ROLE_PATTERN = /SERVICE_ROLE/i;
const PUBLIC_ENV_FILE_PATTERNS = [/^\.env(\.|$)/i];

const SCANNED_EXTENSIONS = [".ts", ".tsx", ".js", ".mjs", ".json"];
const SCANNED_SKIP_DIRS = [
  "node_modules",
  ".next",
  ".git",
  "coverage",
  "dist",
  "build",
  ".opencode",
];

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

function scanTrackedFiles() {
  const files = safeExecNullDelimited(
    `git ls-files -z -- ${SCANNED_EXTENSIONS.map((ext) => `*${ext}`).join(" ")}`
  ).filter((relPath) => {
    return !SCANNED_SKIP_DIRS.some(
      (skip) => relPath === skip || relPath.startsWith(`${skip}/`)
    );
  });

  for (const relPath of files) {
    const fullPath = resolve(REPO_ROOT, relPath);
    let content;
    try {
      content = readFileSync(fullPath, "utf8");
    } catch {
      continue;
    }

    content.split(/\r?\n/).forEach((line, index) => {
      // Detecta cualquier literal que parezca una service role key de Supabase
      // (eyJ... con longitud característica). No imprime el valor.
      if (
        /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*['"]?(eyJ[a-zA-Z0-9._-]{40,})['"]?/.test(
          line
        )
      ) {
        record("hardcoded-literal", `${relPath}:${index + 1}`, "SUPABASE_SERVICE_ROLE_KEY");
      }
    });
  }
}

function main() {
  scanEnvFiles();
  scanProcessEnv();
  scanTrackedFiles();

  if (findings.length === 0) {
    console.log("✅ check-secrets: no se detectaron exposiciones de service role.");
    process.exit(0);
  }

  console.error("❌ check-secrets: se detectaron posibles exposiciones:");
  for (const f of findings) {
    console.error(`  - [${f.category}] ${f.location} -> ${f.key}`);
  }
  console.error(
    "\nLa variable SUPABASE_SERVICE_ROLE_KEY es server-only. No debe existir como NEXT_PUBLIC_* ni hardcodeada."
  );
  process.exit(1);
}

main();
