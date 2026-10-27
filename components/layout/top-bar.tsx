"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  getDeadLetterCount,
  reintentarDeadLetter,
  syncAll,
} from "@/lib/offline/sync";
import { Search, Wifi, WifiOff, Bell, User, CloudOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Empleado {
  nombre: string;
  rol: string;
  linea?: string;
}

export function TopBar() {
  const supabase = useMemo(() => createClient(), []);
  const pathname = usePathname();
  const [online, setOnline] = useState(true);
  const [empleado, setEmpleado] = useState<Empleado | null>(null);
  const [dlqCount, setDlqCount] = useState(0);

  const refrescarDlq = async () => {
    try {
      setDlqCount(await getDeadLetterCount());
    } catch {
      // IndexedDB no disponible (SSR/tests): ignorar
    }
  };

  useEffect(() => {
    setOnline(navigator.onLine);
    refrescarDlq();
    const handleOnline = () => {
      setOnline(true);
      refrescarDlq();
      syncAll().then(refrescarDlq);
    };
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const reintentarPendientes = async () => {
    const total = await reintentarDeadLetter();
    await refrescarDlq();
    if (total > 0) {
      toast.success(`${total} registro(s) reencolados para sincronizar`);
    } else {
      toast.info("No hay registros pendientes de recuperación");
    }
  };

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("empleados")
        .select("nombre, rol")
        .eq("id_auth", user.id)
        .single();
      if (data) {
        setEmpleado({
          nombre: data.nombre,
          rol: data.rol,
          linea: "Planta Principal",
        });
      }
    };
    load();
  }, [supabase]);

  const pageTitles: Record<string, string> = {
    "/": "Resumen de Operaciones",
    "/ordenes": "Órdenes de Trabajo",
    "/ordenes/nueva": "Nueva Orden de Trabajo",
    "/tueste": "Perfiles de Tueste",
    "/clientes": "Clientes",
    "/reportes": "Reportes",
  };

  const title = pageTitles[pathname] || "SCACR";

  return (
    <header className="fixed top-0 right-0 w-full lg:w-[calc(100%-16rem)] h-16 z-40 bg-surface border-b border-outline-variant flex items-center justify-between px-4 lg:px-6 gap-4">
      {/* Title on mobile / search on desktop */}
      <div className="flex items-center gap-4 flex-1">
        <h1 className="font-heading text-headline-sm font-bold text-primary lg:hidden">
          {title}
        </h1>
        <div className="relative w-full max-w-md hidden lg:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar órdenes, clientes o lotes..."
            className="pl-10 border-none bg-surface-container-low rounded-full focus-visible:border-secondary"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 lg:gap-6">
        <div className="flex items-center gap-1 lg:gap-2">
          <button className="hover:bg-surface-container-low rounded-full p-2 text-muted-foreground transition-colors active:scale-95">
            {online ? (
              <Wifi className="h-5 w-5" />
            ) : (
              <WifiOff className="h-5 w-5 text-error" />
            )}
          </button>
          <button className="hover:bg-surface-container-low rounded-full p-2 text-muted-foreground transition-colors active:scale-95 relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full" />
          </button>
          {dlqCount > 0 && (
            <button
              onClick={reintentarPendientes}
              title={`${dlqCount} registro(s) sin sincronizar: clic para reintentar`}
              className="hover:bg-surface-container-low rounded-full p-2 text-amber-600 transition-colors active:scale-95 relative"
            >
              <CloudOff className="h-5 w-5" />
              <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                {dlqCount > 99 ? "99+" : dlqCount}
              </span>
            </button>
          )}
        </div>

        <div className="h-8 w-px bg-outline-variant hidden sm:block" />

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-on-surface leading-tight">
              {empleado?.nombre || "Operador"}
            </p>
            <p className="text-xs text-muted-foreground uppercase tracking-tighter">
              {empleado?.rol || "Planta Principal"}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary-fixed bg-surface-container-high flex items-center justify-center">
            <User className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </div>
    </header>
  );
}
