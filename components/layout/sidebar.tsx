"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  Home, Users, FileText, Thermometer, BarChart3, LogOut, Coffee, Menu, X,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/ordenes", label: "Órdenes", icon: FileText },
  { href: "/tueste", label: "Captura de Tueste", icon: Thermometer },
  { href: "/reportes", label: "Reportes", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      {/* Hamburger — visible en tablet/móvil */}
      <button
        className="fixed top-3 left-3 z-50 flex lg:hidden items-center justify-center w-12 h-12 rounded-xl bg-zinc-950 text-white shadow-lg"
        onClick={() => setOpen(!open)}
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
      >
        {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Overlay — solo en tablet/móvil cuando está abierto */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-zinc-950 text-white transition-transform duration-300",
          "w-64",
          "lg:static lg:z-auto lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-6 py-5 border-b border-zinc-800 min-h-[68px]">
          <Coffee className="h-6 w-6 text-amber-500 shrink-0" />
          <span className="font-bold text-lg whitespace-nowrap">SCACR</span>
        </div>

        {/* Navegación */}
        <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[48px]",
                  isActive
                    ? "bg-amber-600 text-white"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Cerrar sesión */}
        <div className="p-4 border-t border-zinc-800">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 min-h-[48px] text-zinc-400 hover:text-white hover:bg-zinc-800"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span>Cerrar sesión</span>
          </Button>
        </div>
      </aside>
    </>
  );
}
