import { NextResponse } from "next/server";

export function apiOk<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function apiError(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export function apiValidationError(errors: unknown) {
  return NextResponse.json({ error: "Validation error", details: errors }, { status: 422 });
}
