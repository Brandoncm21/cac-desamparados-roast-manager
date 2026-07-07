import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { apiOk, apiValidationError, requireAuth, withErrorHandler } from "@/lib/api-helpers";

const syncItemSchema = z.object({
  tempId: z.string(),
  table: z.enum([
    "trazabilidad_temperatura", "hitos_termicos", "ajustes_tueste",
    "metricas_tueste", "servicios_ejecutados",
  ]),
  data: z.record(z.string(), z.unknown()),
});

const syncSchema = z.object({
  items: z.array(syncItemSchema),
});

async function post(request: NextRequest) {
  await requireAuth();
  const supabase = await createClient();
  const body = await request.json();

  const parsed = syncSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  const idMap: Record<string, number> = {};

  for (const item of parsed.data.items) {
    if (item.table === "trazabilidad_temperatura") {
      const { data: existing } = await supabase
        .from("trazabilidad_temperatura")
        .select("id_registro")
        .match({ id_perfil: item.data["id_perfil"], minuto: item.data["minuto"] })
        .maybeSingle();

      if (existing) {
        idMap[item.tempId] = existing.id_registro;
        continue;
      }

      const { data } = await supabase
        .from("trazabilidad_temperatura")
        .insert(item.data as any)
        .select()
        .single();

      if (data) idMap[item.tempId] = (data as any).id_registro;
    } else if (item.table === "hitos_termicos") {
      const { data: existing } = await supabase
        .from("hitos_termicos")
        .select("id_hito")
        .match({ id_perfil: item.data["id_perfil"], tipo_hito: item.data["tipo_hito"] })
        .maybeSingle();

      if (existing) {
        idMap[item.tempId] = existing.id_hito;
        continue;
      }

      const { data } = await supabase
        .from("hitos_termicos")
        .insert(item.data as any)
        .select()
        .single();

      if (data) idMap[item.tempId] = (data as any).id_hito;
    } else {
      const { data } = await supabase
        .from(item.table)
        .insert(item.data as any)
        .select()
        .single();

      if (data) {
        const [firstKey] = Object.keys(data as Record<string, unknown>);
        if (firstKey) idMap[item.tempId] = (data as Record<string, unknown>)[firstKey] as number;
      }
    }
  }

  return apiOk({ idMap });
}

export const POST = withErrorHandler(post);
