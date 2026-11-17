/**
 * Cliente HTTP de la aplicación.
 *
 * Normaliza el contrato que devuelven los Route Handlers (ver `lib/api-helpers.ts`):
 *   - éxito → `{ data: T }`
 *   - error  → `{ error: { code?, message?, issues? } }`
 *
 * Objetivo: que ninguna página vuelva a parsear `res.json()` ni a interpretar
 * `error.issues` a mano (Principio VII de la constitución: errores normalizados).
 */

export type ErroresCampo = Record<string, string[]>;

/** Un `ZodIssue` tal como viaja serializado desde `apiValidationError`. */
interface IssueZod {
  path?: Array<string | number>;
  message?: string;
}

/** La forma aplanada de `z.flattenError()` / `error.flatten()`. */
interface IssuesAplanados {
  formErrors?: string[];
  fieldErrors?: ErroresCampo;
}

export interface CuerpoError {
  error?: {
    code?: string;
    message?: string;
    issues?: IssueZod[] | IssuesAplanados;
  };
}

export interface OpcionesApiError {
  code?: string;
  fieldErrors?: ErroresCampo;
  formErrors?: string[];
}

/**
 * Error de una llamada a la API con la información que la UI necesita para
 * pintar mensajes precisos por campo.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly fieldErrors: ErroresCampo;
  readonly formErrors: string[];

  constructor(message: string, status: number, opciones: OpcionesApiError = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = opciones.code;
    this.fieldErrors = opciones.fieldErrors ?? {};
    this.formErrors = opciones.formErrors ?? [];
    Error.captureStackTrace?.(this, this.constructor);
  }
}

function esIssuesAplanados(
  issues: IssueZod[] | IssuesAplanados
): issues is IssuesAplanados {
  return !Array.isArray(issues);
}

function unirPath(path: Array<string | number> | undefined): string {
  return (path ?? []).join(".");
}

/**
 * Convierte `error.issues` (en cualquiera de sus dos formas) en
 * `{ fieldErrors, formErrors }`.
 */
export function extraerErrores(
  issues: IssueZod[] | IssuesAplanados | undefined
): { fieldErrors: ErroresCampo; formErrors: string[] } {
  if (!issues) return { fieldErrors: {}, formErrors: [] };

  if (esIssuesAplanados(issues)) {
    return {
      fieldErrors: issues.fieldErrors ?? {},
      formErrors: issues.formErrors ?? [],
    };
  }

  const fieldErrors: ErroresCampo = {};
  const formErrors: string[] = [];

  for (const issue of issues) {
    const mensaje = issue.message ?? "Valor inválido";
    const clave = unirPath(issue.path);
    if (clave === "") {
      formErrors.push(mensaje);
      continue;
    }
    (fieldErrors[clave] ??= []).push(mensaje);
  }

  return { fieldErrors, formErrors };
}

/**
 * Lee el cuerpo de una respuesta y devuelve `data`, o lanza `ApiError`.
 *
 * Un cuerpo ilegible (HTML de un 502, cuerpo vacío) no debe romper la UI:
 * se degrada a un mensaje con el status.
 */
export async function leerJson<T>(res: Response): Promise<T> {
  let cuerpo: unknown;
  try {
    cuerpo = await res.json();
  } catch {
    cuerpo = undefined;
  }

  if (res.ok) {
    return (cuerpo as { data?: T } | undefined)?.data as T;
  }

  const error = (cuerpo as CuerpoError | undefined)?.error;
  const { fieldErrors, formErrors } = extraerErrores(error?.issues);

  throw new ApiError(error?.message || `Error HTTP ${res.status}`, res.status, {
    ...(error?.code ? { code: error.code } : {}),
    fieldErrors,
    formErrors,
  });
}

/** Mensaje apto para un toast a partir de cualquier error capturado. */
export function mensajeDeError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Error desconocido";
}
