"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard, Users, FileText, Flame, BarChart3, LogOut, Coffee, Menu, X, Plus,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ordenes", label: "Órdenes", icon: FileText },
  { href: "/tueste", label: "Tueste", icon: Flame },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/reportes", label: "Reportes", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
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
        className="fixed top-3 left-3 z-50 flex lg:hidden items-center justify-center w-12 h-12 rounded-xl bg-surface-container-lowest text-primary shadow-lg border border-outline-variant"
        onClick={() => setOpen(!open)}
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
      >
        {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Overlay — solo en tablet/móvil cuando está abierto */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-surface text-on-surface transition-transform duration-300 border-r border-outline-variant",
          "w-64",
          "lg:static lg:z-auto lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 min-h-[68px]">
          <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center overflow-hidden shrink-0">
            <Coffee className="h-6 w-6 text-on-primary" />
          </div>
          <div>
            <span className="font-heading font-bold text-lg whitespace-nowrap leading-tight block">SCACR</span>
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">CAC Desamparados</span>
          </div>
        </div>

        {/* Navegación */}
        <nav className="flex-1 space-y-1 px-4 py-4 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all min-h-[48px] active:scale-95",
                  isActive
                    ? "bg-secondary-container text-on-secondary-container"
                    : "text-muted-foreground hover:bg-surface-container-high hover:text-on-surface"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* CTA + Cerrar sesión */}
        <div className="p-4 border-t border-outline-variant space-y-2">
          <Button
            className="w-full gap-2 shadow-[0px_8px_16px_rgba(75,44,32,0.12)]"
            onClick={() => router.push("/tueste")}
          >
            <Plus className="h-5 w-5 shrink-0" />
            <span>Iniciar Tueste</span>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 min-h-[48px] text-muted-foreground hover:text-on-surface hover:bg-surface-container-high"
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
