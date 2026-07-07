import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiOk, apiError, requireAuth, withErrorHandler } from "@/lib/api-helpers";

async function get(request: NextRequest) {
  await requireAuth();
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const rol = searchParams.get("rol");

  let query = supabase
    .from("empleados")
    .select("*")
    .eq("activo", true)
    .order("nombre");

  if (rol) query = query.eq("rol", rol);

  const { data, error } = await query;
  if (error) return apiError(error.message, 500);
  return apiOk(data);
}

export const GET = withErrorHandler(get);
