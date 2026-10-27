import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { apiError, apiValidationError, requireRole, withErrorHandler } from "@/lib/api-helpers";
import { apiPaginado, parsePaginacion } from "@/lib/pagination";

const filtrosEmpleadosSchema = z.object({
  rol: z.enum(["Operador", "Tostador", "Recepción", "Admin"]).optional(),
});

async function get(request: NextRequest) {
  await requireRole(["Admin", "Recepción"]);
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const paginacion = parsePaginacion(searchParams);
  if (!paginacion.success) return apiValidationError(paginacion.error.flatten());

  const filtros = filtrosEmpleadosSchema.safeParse({
    rol: searchParams.get("rol") ?? undefined,
  });
  if (!filtros.success) return apiValidationError(filtros.error.flatten());

  const { page, pageSize } = paginacion.data;
  const from = (page - 1) * pageSize;
  const to = page * pageSize - 1;

  let query = supabase
    .from("empleados")
    .select("id_empleado, nombre, rol, activo", { count: "exact" })
    .eq("activo", true)
    .order("nombre")
    .range(from, to);

  if (filtros.data.rol) query = query.eq("rol", filtros.data.rol);

  const { data, count, error } = await query;
  if (error) return apiError(error.message, 500);
  return apiPaginado(data ?? [], count ?? 0, page, pageSize);
}

export const GET = withErrorHandler(get);
