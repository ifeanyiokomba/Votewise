import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "./errors";

export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiFailure = {
  success: false;
  error: { message: string; code: string; details?: unknown };
};

export function ok<T>(data: T, status = 200) {
  return NextResponse.json<ApiSuccess<T>>({ success: true, data }, { status });
}

export function fail(message: string, code = "ERROR", status = 400, details?: unknown) {
  return NextResponse.json<ApiFailure>(
    { success: false, error: { message, code, details } },
    { status }
  );
}

export function handleError(error: unknown) {
  if (error instanceof AppError) {
    return fail(error.message, error.code, error.statusCode);
  }
  if (error instanceof ZodError) {
    return fail("Validation failed", "VALIDATION_ERROR", 422, error.flatten());
  }
  console.error("[unhandled-error]", error);
  const message =
    error instanceof Error ? error.message : "An unexpected error occurred";
  return fail(message, "INTERNAL_ERROR", 500);
}

export async function withHandler<T>(
  fn: () => Promise<T>
): Promise<NextResponse> {
  try {
    const result = await fn();
    if (result instanceof NextResponse) return result;
    return ok(result);
  } catch (error) {
    return handleError(error);
  }
}
