export const envClient = {
  get SUPABASE_URL() {
    const value = process.env["NEXT_PUBLIC_SUPABASE_URL"];
    if (!value) throw new Error("❌ Variable de entorno faltante: NEXT_PUBLIC_SUPABASE_URL");
    return value;
  },
  get SUPABASE_ANON_KEY() {
    const value = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];
    if (!value) throw new Error("❌ Variable de entorno faltante: NEXT_PUBLIC_SUPABASE_ANON_KEY");
    return value;
  },
  get NODE_ENV() {
    return (process.env.NODE_ENV || "development") as "development" | "production" | "test";
  },
  get APP_URL() {
    return process.env["NEXT_PUBLIC_APP_URL"] || "http://localhost:3016";
  },
} as const;
