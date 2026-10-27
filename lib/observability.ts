import "server-only";

export type LogLevel = "debug" | "info" | "warn" | "error";

const CLAVES_SENSIBLES = [
  "password",
  "db_password",
  "token",
  "authorization",
  "cookie",
  "apikey",
  "api_key",
  "service_role",
  "sbp_",
  "secret",
];

export function newCorrelationId(): string {
  if (typeof globalThis.crypto !== "undefined" && "randomUUID" in globalThis.crypto) {
    return globalThis.crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Elimina claves sensibles de objetos de metadatos antes de loguear. */
export function redactar(meta: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    const k = key.toLowerCase();
    if (CLAVES_SENSIBLES.some((s) => k.includes(s))) {
      out[key] = "[redacted]";
      continue;
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      out[key] = redactar(value as Record<string, unknown>);
      continue;
    }
    out[key] = value;
  }
  return out;
}

function emitir(level: LogLevel, event: string, meta: Record<string, unknown>) {
  const registro = {
    ts: new Date().toISOString(),
    level,
    event,
    ...redactar(meta),
  };
  const linea = JSON.stringify(registro);
  if (level === "error") console.error(linea);
  else if (level === "warn") console.warn(linea);
  else console.log(linea);
}

export function logEvent(
  level: LogLevel,
  event: string,
  meta: Record<string, unknown> = {}
) {
  emitir(level, event, meta);
}

export interface RequestLogContext {
  correlationId: string;
  endpoint: string;
  method: string;
  status: number;
  durationMs: number;
  batchSize?: number;
  rowsAffected?: number;
  pgError?: { code?: string; message?: string };
}

export function logRequest(ctx: RequestLogContext) {
  const level: LogLevel =
    ctx.status >= 500 ? "error" : ctx.status >= 400 ? "warn" : "info";
  emitir(level, "api.request", { ...ctx });
}

export function esProduccion(): boolean {
  return process.env.NODE_ENV === "production";
}
