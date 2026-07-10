import { createClient } from "@/lib/supabase/client";

export type UserRole = "Admin" | "Tostador" | "Recepción" | "Operador";

/**
 * Obtiene el rol del usuario autenticado desde el cliente de navegador.
 * Solo debe usarse en componentes cliente ("use client"). En el servidor,
 * usar `requireRole` o `requireAuth` de `@/lib/api-helpers`.
 */
export async function getCurrentUserRole(): Promise<UserRole | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: empleado } = await supabase
    .from("empleados")
    .select("rol")
    .eq("id_auth", user.id)
    .single();

  return (empleado?.rol as UserRole) || null;
}

export function isAdmin(role: UserRole | null) {
  return role === "Admin";
}

export function canEditClient(role: UserRole | null) {
  return role === "Admin";
}

export function canEditOrder(role: UserRole | null) {
  return ["Admin", "Recepción", "Tostador"].includes(role || "");
}

export function canEditPerfil(role: UserRole | null) {
  return ["Admin", "Tostador"].includes(role || "");
}

export function canDeleteClient(role: UserRole | null) {
  return role === "Admin" || role === "Recepción";
}

export function canDeleteOrder(role: UserRole | null) {
  return ["Admin", "Recepción", "Tostador"].includes(role || "");
}

export function canDeletePerfil(role: UserRole | null) {
  return ["Admin", "Tostador"].includes(role || "");
}
