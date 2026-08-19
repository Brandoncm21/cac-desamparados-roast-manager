import "server-only";

import { NextRequest, NextResponse } from "next/server";
import type { ZodError } from "zod";
import { AppError, ERROR_CODES, handleApiError } from "./error-handler";
import { createClient } from "./supabase/server";
import type { UserRole } from "./auth-helpers";

export function apiOk<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function apiError(error: AppError | string, status = 400) {
  if (typeof error === "string") {
    return NextResponse.json({ error: { message: error } }, { status });
  }
  const { error: errorObj, status: errorStatus } = handleApiError(error);
  return NextResponse.json({ error: errorObj }, { status: errorStatus });
}

type ZodFlattenedError = {
  formErrors: string[];
  fieldErrors: Record<string, string[]>;
};

export function apiValidationError(errors: ZodError | ZodFlattenedError) {
  return NextResponse.json(
    {
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: "Validation failed",
        issues: "issues" in errors ? errors.issues : errors,
      },
    },
    { status: 422 }
  );
}

export function withErrorHandler<
  H extends (req: NextRequest, ...args: any[]) => Promise<NextResponse>
>(handler: H): H {
  return (async (req: NextRequest, ...args: any[]) => {
    try {
      return await handler(req, ...args);
    } catch (error) {
      const { error: errorObj, status } = handleApiError(error);
      return NextResponse.json({ error: errorObj }, { status });
    }
  }) as H;
}

export function validateIdParam(value: string): number {
  const id = Number(value);
  if (!Number.isFinite(id) || id <= 0 || !Number.isInteger(id)) {
    throw new AppError(ERROR_CODES.INVALID_INPUT, "ID inválido", 400);
  }
  return id;
}

/**
 * Conjuntos de roles autorizados reutilizables.
 * Centralizar aquí evita listas inconsistentes entre endpoints.
 */
export const ROLE_SETS = {
  ADMIN: ["Admin"] as UserRole[],
  ADMIN_OR_RECEPCION: ["Admin", "Recepción"] as UserRole[],
  ADMIN_OR_RECEPCION_OR_TOSTADOR: ["Admin", "Recepción", "Tostador"] as UserRole[],
  ADMIN_OR_TOSTADOR: ["Admin", "Tostador"] as UserRole[],
} as const;

export async function requireAuth() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AppError(ERROR_CODES.UNAUTHORIZED, "No autorizado", 401);
  }

  return user;
}

/**
 * Verifica que el usuario autenticado pertenezca a uno de los roles permitidos.
 *
 * Reglas:
 *   - `roles` debe ser un array no vacío de `UserRole`. Pasar `[]` o `undefined`
 *     lanza `AppError` con `FORBIDDEN` (defensa contra endpoints
 *     mal configurados).
 *   - El mensaje de error 403 NO enumera los roles esperados para no filtrar
 *     información a un atacante.
 */
export async function requireRole(roles: readonly UserRole[]) {
  if (!Array.isArray(roles) || roles.length === 0) {
    throw new AppError(
      ERROR_CODES.FORBIDDEN,
      "Configuración de roles inválida",
      403
    );
  }

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AppError(ERROR_CODES.UNAUTHORIZED, "No autorizado", 401);
  }

  const { data: empleado, error: empleadoError } = await supabase
    .from("empleados")
    .select("rol")
    .eq("id_auth", user.id)
    .single();

  if (empleadoError || !empleado || !roles.includes(empleado.rol as UserRole)) {
    throw new AppError(
      ERROR_CODES.FORBIDDEN,
      "No tiene permisos para esta acción",
      403
    );
  }

  return { user, role: empleado.rol as UserRole };
}
