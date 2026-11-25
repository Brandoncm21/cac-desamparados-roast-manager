import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { crearProductorSchema } from "@/lib/schemas/productores";
import {
  apiOk,
  apiError,
  apiValidationError,
  requireRole,
  statusDeCodigoPg,
  withErrorHandler,
} from "@/lib/api-helpers";
import { apiPaginado, parsePaginacion, sanitizarBusqueda } from "@/lib/pagination";

/**
 * Catálogo de productores (F0/F1): entidad independiente de `clientes`,
 * usada por el módulo Recibido de Café para seleccionar productor → finca.
 */
async function get(request: NextRequest) {
  await requireRole(["Admin", "Recepción", "Tostador"]);
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const paginacion = parsePaginacion(searchParams);
  if (!paginacion.success) return apiValidationError(paginacion.error.flatten());

  const { page, pageSize } = paginacion.data;
  const from = (page - 1) * pageSize;
  const to = page * pageSize - 1;
  const busqueda = sanitizarBusqueda(searchParams.get("search"));

  let query = supabase
    .from("productores")
    .select("id_productor, nombre_completo, telefono", { count: "exact" })
    .is("deleted_at", null)
    .order("nombre_completo")
    .range(from, to);

  if (busqueda) query = query.ilike("nombre_completo", `%${busqueda}%`);

  const { data, count, error } = await query;
  if (error) return apiError(error.message, 500);
  return apiPaginado(data ?? [], count ?? 0, page, pageSize);
}

/**
 * Crea un productor. Solo se envían las columnas editables: el resto
 * (`id_productor`, fechas, `public_id`, `deleted_at`) lo pone la BD.
 */
async function post(request: NextRequest) {
  await requireRole(["Admin", "Recepción"]);
  const supabase = await createClient();

  const body = await request.json();
  const parsed = crearProductorSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  const nombreCompleto = parsed.data.nombre_completo.trim();
  const telefono = parsed.data.telefono?.trim() || null;

  // La tabla no tiene UNIQUE por nombre; se evita el duplicado exacto
  // (sin distinguir mayúsculas) para dar un mensaje claro al usuario.
  const patronNombre = nombreCompleto
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
  const { data: existente } = await supabase
    .from("productores")
    .select("id_productor")
    .is("deleted_at", null)
    .ilike("nombre_completo", patronNombre)
    .limit(1)
    .maybeSingle();

  if (existente) {
    return apiError("Ya existe un productor con ese nombre", 409);
  }

  const { data, error } = await supabase
    .from("productores")
    .insert({ nombre_completo: nombreCompleto, telefono })
    .select("id_productor, nombre_completo, telefono")
    .single();

  if (error) return apiError(error.message, statusDeCodigoPg(error.code));
  return apiOk(data, 201);
}

export const GET = withErrorHandler(get);
export const POST = withErrorHandler(post);
