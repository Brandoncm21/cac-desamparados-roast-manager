import { spawnSync, execSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect, afterAll } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const REPO_ROOT = join(__dirname, "..", "..");
const SCRIPT_PATH = join(REPO_ROOT, "scripts", "check-secrets.mjs");

const tempDirs: string[] = [];
afterAll(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function runScript(env = {}) {
  return spawnSync("node", [SCRIPT_PATH], {
    cwd: REPO_ROOT,
    env: { ...process.env, ...env },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function runScriptIn(cwd: string, env = {}) {
  return spawnSync("node", [SCRIPT_PATH], {
    cwd,
    env: { ...process.env, ...env },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function initTempRepo(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "check-secrets-"));
  tempDirs.push(dir);
  execSync("git init -q", { cwd: dir });
  execSync('git config user.email "test@test.com"', { cwd: dir });
  execSync('git config user.name "test"', { cwd: dir });
  for (const [rel, content] of Object.entries(files)) {
    const full = join(dir, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  execSync("git add -A", { cwd: dir });
  return dir;
}

describe("check-secrets.mjs (repo real)", () => {
  it("exit code 0 cuando no hay exposiciones (entorno limpio)", () => {
    const result = runScript({
      NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY: "",
    });
    expect(result.status).toBe(0);
  });

  it("exit code 1 cuando NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY está presente en process.env", () => {
    const result = runScript({
      NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY: "eyJhbGciOiJIUzI1NiJ9.dummy",
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/process-env/);
    expect(result.stderr).toMatch(/NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY/);
  });

  it("no imprime el valor del secreto en la salida de error", () => {
    const secret =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.this_should_not_leak";
    const result = runScript({
      NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY: secret,
    });
    const stdout = result.stdout || "";
    const stderr = result.stderr || "";
    expect(stdout).not.toContain(secret);
    expect(stderr).not.toContain(secret);
  });
});

describe("check-secrets.mjs (repos temporales)", () => {
  it("exit code 0 en un repo limpio", () => {
    const dir = initTempRepo({
      "app/page.tsx": "export default function Page() { return null; }\n",
      "docs/GUIA.md": "DATABASE_URL con <NUEVA_PASSWORD> como placeholder.\n",
    });
    expect(runScriptIn(dir).status).toBe(0);
  });

  it("exit code 1 ante un literal hardcodeado de service role key en código rastreado", () => {
    const jwt =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.this_should_not_leak";
    const dir = initTempRepo({
      "app/lib/config.ts": `export const SUPABASE_SERVICE_ROLE_KEY = "${jwt}";\n`,
    });
    const result = runScriptIn(dir);
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/hardcoded-literal/);
    expect(result.stderr).not.toContain(jwt);
  });

  it("exit code 1 ante DB_PASSWORD hardcodeado en scripts/", () => {
    const dir = initTempRepo({
      "scripts/deploy.mjs": 'const DB_PASSWORD = "s3cr3t-value-123";\n',
    });
    const result = runScriptIn(dir);
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/db-password/);
    expect(result.stderr).not.toContain("s3cr3t-value-123");
  });

  it("exit code 1 ante token sbp_ y PROJECT_REF con valor real", () => {
    const dir = initTempRepo({
      "docs/NOTAS.md":
        "Token sbp_abcdefghij1234567890 para la API.\nPROJECT_REF = abcdefghijklmnopqrst\n",
    });
    const result = runScriptIn(dir);
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/supabase-pat/);
    expect(result.stderr).toMatch(/project-ref/);
  });

  it("exit code 1 ante URL de dashboard con project ref real", () => {
    const dir = initTempRepo({
      "docs/GUIA.md":
        "Ve a: https://supabase.com/dashboard/project/abcdefghijklmnopqrst/sql/new\n",
    });
    const result = runScriptIn(dir);
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/dashboard-url/);
  });

  it("exit code 1 ante connection string con password embebido", () => {
    const dir = initTempRepo({
      "scripts/legacy.mjs":
        "const url = postgres://postgres:s3cr3t@db.ref.supabase.co:5432/postgres;\n",
    });
    const result = runScriptIn(dir);
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/connection-string/);
  });

  it("exit code 0 con placeholders, lecturas process.env y fixtures", () => {
    const dir = initTempRepo({
      "scripts/app.mjs":
        'const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD || "";\nconst REF = process.env.SUPABASE_PROJECT_REF;\n',
      "docs/GUIA.md":
        "PROJECT_REF = <PROJECT_REF>\nDATABASE_URL con <NUEVA_PASSWORD>.\nURL: https://mcp.supabase.com/mcp?project_ref=abcdefghijklmnopqrst\n",
      "scripts/__tests__/fixture.test.ts": `const k = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.this_should_not_leak";\n`,
    });
    expect(runScriptIn(dir).status).toBe(0);
  });

  it("exit code 1 ante .env versionado con NEXT_PUBLIC_*SERVICE_ROLE", () => {
    const dir = initTempRepo({
      ".env": "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiJ9.dummy\n",
      "app/page.tsx": "export default function Page() { return null; }\n",
    });
    const result = runScriptIn(dir);
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/env-file/);
  });
});
