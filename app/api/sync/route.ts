import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  apiOk,
  apiValidationError,
  requireRole,
  withErrorHandler,
} from "@/lib/api-helpers";
import { syncBatchSchema } from "@/lib/offline/schemas";
import {
  procesarItemsParaSync,
  type SyncDbLike,
} from "@/lib/offline/sync-server";

async function post(request: NextRequest) {
  await requireRole(["Admin", "Recepción", "Tostador"]);
  const supabase = await createClient();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiValidationError({
      formErrors: ["Cuerpo JSON inválido"],
      fieldErrors: {},
    });
  }

  const parsed = syncBatchSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  // Adaptador mínimo: supabase-js no expone un tipo estable para tablas
  // dinámicas con upsert tipado, por eso se adapta a SyncDbLike aquí.
  const db: SyncDbLike = {
    from: (table: string) => {
      const base = supabase.from(table as never);
      return {
        upsert: (rows, opts) => ({
          select: (cols: string) =>
            base
              .upsert(rows as never, opts)
              .select(cols) as unknown as Promise<{
              data: Record<string, unknown>[] | null;
              error: { code?: string; message: string } | null;
            }>,
        }),
        insert: (row) => ({
          select: (cols: string) => ({
            maybeSingle: () =>
              base
                .insert(row as never)
                .select(cols)
                .maybeSingle() as unknown as Promise<{
                data: Record<string, unknown> | null;
                error: { code?: string; message: string } | null;
              }>,
          }),
        }),
      };
    },
  };

  const resultado = await procesarItemsParaSync(db, parsed.data.items);
  return apiOk(resultado);
}

export const POST = withErrorHandler(post);
