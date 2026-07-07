import { NextRequest, NextResponse } from "next/server";
import type { ZodError } from "zod";
import { AppError, ERROR_CODES, handleApiError } from "./error-handler";
import { createClient } from "./supabase/server";

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

export async function requireAuth() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AppError(ERROR_CODES.UNAUTHORIZED, "No autorizado", 401);
  }

  return user;
}
