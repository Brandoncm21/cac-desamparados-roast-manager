import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { crearFincaSchema } from "@/lib/schemas/fincas";
import { apiOk, apiError, apiValidationError, requireRole, withErrorHandler } from "@/lib/api-helpers";
import { apiPaginado, parsePaginacion, sanitizarBusqueda } from "@/lib/pagination";

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

  // Filtros opcionales: `productor_id` (flujo Beneficiado) o `cliente_id`
  // (flujo legacy de órdenes, retirado en F5).
  const enteroPositivo = (clave: string): number | null => {
    const raw = searchParams.get(clave);
    if (!raw) return null;
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed <= 0) return Number.NaN;
    return parsed;
  };

  const productorId = enteroPositivo("productor_id");
  const clienteId = enteroPositivo("cliente_id");

  if (Number.isNaN(productorId)) return apiError("productor_id inválido", 422);
  if (Number.isNaN(clienteId)) return apiError("cliente_id inválido", 422);

  let query = supabase
    .from("fincas")
    .select("*, clientes(nombre_completo), productores(nombre_completo), zonas_finca(nombre)", {
      count: "exact",
    })
    .is("deleted_at", null)
    .order("nombre")
    .range(from, to);

  if (productorId) query = query.eq("productor_id", productorId);
  if (clienteId) query = query.eq("cliente_id", clienteId);
  if (busqueda) query = query.ilike("nombre", `%${busqueda}%`);

  const { data, count, error } = await query;
  if (error) return apiError(error.message, 500);
  return apiPaginado(data ?? [], count ?? 0, page, pageSize);
}

async function post(request: NextRequest) {
  await requireRole(["Admin", "Recepción"]);
  const supabase = await createClient();
  const body = await request.json();

  const parsed = crearFincaSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  const { data, error } = await supabase
    .from("fincas")
    .insert(parsed.data)
    .select("*, clientes(nombre_completo), zonas_finca(nombre)")
    .single();

  if (error) {
    const status = error.code === "23505" ? 409 : error.code === "23503" ? 400 : 500;
    return apiError(error.message, status);
  }
  return apiOk(data, 201);
}

export const GET = withErrorHandler(get);
export const POST = withErrorHandler(post);
