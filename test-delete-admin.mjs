import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createAdminClient } from "./lib/supabase/admin.ts";

async function testSoftDelete(id) {
  console.log(`Probando soft delete de orden ${id} con admin client...`);

  try {
    const supabase = createAdminClient();

    // 1. Verificar que la orden existe
    const { data: orden, error: selectError } = await supabase
      .from("ordenes_trabajo")
      .select("id_orden, numero_factura, estado_orden, deleted_at")
      .eq("id_orden", id)
      .single();

    if (selectError) {
      console.error("Error al consultar orden:", selectError);
      return;
    }

    console.log("Orden encontrada:", orden);

    // 2. Intentar soft delete
    const { data, error } = await supabase
      .from("ordenes_trabajo")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id_orden", id)
      .is("deleted_at", null)
      .select();

    if (error) {
      console.error("Error en soft delete:", error);
      return;
    }

    console.log("Soft delete exitoso:", data);

    // 3. Restaurar
    const { data: restoreData, error: restoreError } = await supabase
      .from("ordenes_trabajo")
      .update({ deleted_at: null })
      .eq("id_orden", id)
      .select();

    if (restoreError) {
      console.error("Error al restaurar:", restoreError);
      return;
    }

    console.log("Restauración exitosa:", restoreData);
  } catch (error) {
    console.error("Error inesperado:", error);
  }
}

const id = process.argv[2] ? Number(process.argv[2]) : 1;
testSoftDelete(id);
