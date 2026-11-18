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
async function cuerpoDe(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return undefined;
  }
}

/** Construye el `ApiError` a partir del sobre `{ error }` del servidor. */
function errorDeRespuesta(res: Response, cuerpo: unknown): ApiError {
  const error = (cuerpo as CuerpoError | undefined)?.error;
  const { fieldErrors, formErrors } = extraerErrores(error?.issues);

  return new ApiError(error?.message || `Error HTTP ${res.status}`, res.status, {
    ...(error?.code ? { code: error.code } : {}),
    fieldErrors,
    formErrors,
  });
}

/**
 * Lee el cuerpo de una respuesta y devuelve `data`, o lanza `ApiError`.
 *
 * Un cuerpo ilegible (HTML de un 502, cuerpo vacío) no debe romper la UI:
 * se degrada a un mensaje con el status.
 */
export async function leerJson<T>(res: Response): Promise<T> {
  const cuerpo = await cuerpoDe(res);
  if (!res.ok) throw errorDeRespuesta(res, cuerpo);
  return (cuerpo as { data?: T } | undefined)?.data as T;
}

export interface PaginacionApi {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/**
 * Variante para endpoints paginados (`apiPaginado`), que devuelven además la
 * meta necesaria para pintar el paginador.
 */
export async function leerJsonPaginado<T>(
  res: Response
): Promise<{ items: T[]; pagination: PaginacionApi }> {
  const cuerpo = await cuerpoDe(res);
  if (!res.ok) throw errorDeRespuesta(res, cuerpo);

  const sobre = cuerpo as { data?: T[]; pagination?: Partial<PaginacionApi> } | undefined;
  const meta = sobre?.pagination;

  return {
    items: sobre?.data ?? [],
    pagination: {
      page: meta?.page ?? 1,
      pageSize: meta?.pageSize ?? 25,
      total: meta?.total ?? 0,
      totalPages: meta?.totalPages ?? 1,
    },
  };
}

/** Mensaje apto para un toast a partir de cualquier error capturado. */
export function mensajeDeError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Error desconocido";
}

/**
 * Detalle útil para el usuario: prefiere los mensajes por campo, que son los
 * accionables, sobre el mensaje genérico del servidor.
 */
export function detalleDeError(error: unknown): string {
  if (error instanceof ApiError) {
    const porCampo = Object.values(error.fieldErrors).flat();
    if (porCampo.length > 0) return porCampo.join(", ");
    if (error.formErrors.length > 0) return error.formErrors.join(", ");
  }
  return mensajeDeError(error);
}
