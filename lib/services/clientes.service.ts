import { createAdminClient } from "@/lib/supabase/admin";
import { AppError, ERROR_CODES } from "@/lib/error-handler";
import type { CrearClienteInput, ActualizarClienteInput } from "@/lib/schemas/clientes";

export const clientesService = {
  async obtenerTodos(page = 1, limit = 50) {
    const supabase = createAdminClient();
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from("clientes")
      .select("*", { count: "exact" })
      .order("nombre_completo")
      .range(offset, offset + limit - 1);

    if (error) throw new AppError(ERROR_CODES.DB_ERROR, error.message, 500);
    return { data, count };
  },

  async obtenerPorId(id: number) {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .eq("id_cliente", id)
      .single();

    if (error || !data) {
      throw new AppError(
        ERROR_CODES.RESOURCE_NOT_FOUND,
        "Cliente no encontrado",
        404
      );
    }
    return data;
  },

  async crear(input: CrearClienteInput) {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("clientes")
      .insert(input)
      .select()
      .single();

    if (error) {
      throw new AppError(ERROR_CODES.DB_ERROR, "Error al crear cliente", 500);
    }
    return data;
  },

  async actualizar(id: number, input: ActualizarClienteInput) {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("clientes")
      .update(input)
      .eq("id_cliente", id)
      .select()
      .single();

    if (error) {
      throw new AppError(ERROR_CODES.DB_ERROR, "Error al actualizar cliente", 500);
    }
    return data;
  },

  async eliminar(id: number) {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("clientes")
      .delete()
      .eq("id_cliente", id);

    if (error) {
      throw new AppError(ERROR_CODES.DB_ERROR, "Error al eliminar cliente", 500);
    }
  },
};
