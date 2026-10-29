import pg from "pg";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import dns from "dns/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationPath = join(__dirname, "..", "supabase", "migrations", "0001_schema_inicial.sql");
const seedPath = join(__dirname, "..", "supabase", "seed.sql");

// Credenciales SIEMPRE desde variables de entorno. Nunca hardcodear valores.
// Ver docs/RUNBOOK.md "Rotación de Claves" para el proceso de rotación.
const DATABASE_URL = process.env.DATABASE_URL || "";
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || "";
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD || "";

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!DATABASE_URL && (!PROJECT_REF || !DB_PASSWORD)) {
  fail(
    "Faltan credenciales: define DATABASE_URL o (SUPABASE_PROJECT_REF + SUPABASE_DB_PASSWORD) " +
      "en .env.local (archivo ignorado por git, no commitear). Ver docs/RUNBOOK.md sección Rotación de Claves."
  );
}

const poolerHosts = PROJECT_REF
  ? [
      { host: "aws-0-us-east-1.pooler.supabase.com", port: 6543, user: `postgres.${PROJECT_REF}` },
      { host: "aws-0-us-east-1.pooler.supabase.com", port: 5432, user: `postgres.${PROJECT_REF}` },
    ]
  : [];

async function connectWithRetry(config, label) {
  const client = new pg.Client(config);
  try {
    await client.connect();
    console.log(`✅ ${label}`);
    return client;
  } catch (err) {
    const msg = err.message.split("\n")[0].substring(0, 120);
    console.log(`❌ ${label} - ${msg}`);
    return null;
  }
}

async function connectWithConnectionString() {
  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });
  try {
    await client.connect();
    console.log("✅ Conexión vía DATABASE_URL");
    return client;
  } catch (err) {
    console.log(`❌ Conexión vía DATABASE_URL - ${err.message.split("\n")[0].substring(0, 120)}`);
    return null;
  }
}

async function main() {
  let client = null;

  if (DATABASE_URL) {
    client = await connectWithConnectionString();
  }

  // Try direct IPv6 connection
  if (!client && PROJECT_REF) {
    try {
      const ipv6 = await dns.resolve6(`db.${PROJECT_REF}.supabase.co`);
      if (ipv6?.length) {
        client = await connectWithRetry({
          host: ipv6[0],
          port: 5432,
          user: "postgres",
          password: DB_PASSWORD,
          database: "postgres",
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 15000,
        }, `Directo IPv6 ${ipv6[0]}:5432`);
      }
    } catch (e) {
      console.log(`❌ Directo IPv6 - resolución falló: ${e.message.substring(0, 60)}`);
    }
  }

  // Try pooler hosts
  if (!client) {
    for (const h of poolerHosts) {
      client = await connectWithRetry({
        host: h.host,
        port: h.port,
        user: h.user,
        password: DB_PASSWORD,
        database: "postgres",
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 15000,
      }, `Pooler ${h.host}:${h.port}`);
      if (client) break;
    }
  }

  if (!client) {
    console.error("\nNo se pudo conectar a la base de datos");
    console.error("Posibles causas:");
    console.error("1. Las credenciales en .env.local son incorrectas o faltan");
    console.error("2. El proyecto está pausado o no activo");
    console.error("3. El pooler no está configurado para este proyecto");
    console.error("\nAlternativa: usa el SQL Editor en Supabase Dashboard para ejecutar la migración manualmente.");
    process.exit(1);
  }

  try {
    // Run migration
    console.log("\n📦 Ejecutando migración...");
    const migrationSql = readFileSync(migrationPath, "utf-8");
    await client.query(migrationSql);
    console.log("✅ Migración aplicada correctamente");

    // Run seed
    console.log("\n🌱 Ejecutando seed...");
    const seedSql = readFileSync(seedPath, "utf-8");
    await client.query(seedSql);
    console.log("✅ Seed ejecutado correctamente");
  } catch (err) {
    console.error("Error:", err.message.substring(0, 200));
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
