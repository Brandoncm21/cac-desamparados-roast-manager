"use client";

import Link from "next/link";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type SidebarNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  title?: string;
};

type Tone = "acopio" | "servicios";

const toneStyles: Record<
  Tone,
  {
    container: string;
    header: string;
    headerOpen: string;
    headerIcon: string;
    eyebrow: string;
    itemHover: string;
    itemActive: string;
    focus: string;
  }
> = {
  acopio: {
    container: "border-l-tertiary bg-tertiary-fixed/15",
    header: "text-on-surface hover:bg-tertiary-fixed/25",
    headerOpen: "bg-tertiary-fixed/30",
    headerIcon: "bg-tertiary-fixed text-on-tertiary-fixed",
    eyebrow: "text-on-tertiary-fixed-variant",
    itemHover: "hover:bg-tertiary-fixed/35 hover:text-on-tertiary-fixed-variant",
    itemActive:
      "bg-tertiary-fixed text-on-tertiary-fixed font-semibold shadow-[inset_3px_0_0_var(--tertiary)]",
    focus: "focus-visible:ring-tertiary/50",
  },
  servicios: {
    container: "border-l-secondary bg-secondary-fixed/20",
    header: "text-on-surface hover:bg-secondary-fixed/30",
    headerOpen: "bg-secondary-fixed/35",
    headerIcon: "bg-secondary-fixed text-on-secondary-fixed",
    eyebrow: "text-on-secondary-fixed-variant",
    itemHover: "hover:bg-secondary-fixed/45 hover:text-on-secondary-fixed-variant",
    itemActive:
      "bg-secondary-fixed text-on-secondary-fixed font-semibold shadow-[inset_3px_0_0_var(--secondary)]",
    focus: "focus-visible:ring-secondary/50",
  },
};

export function esRutaActiva(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function SidebarGrupo({
  id,
  titulo,
  eyebrow,
  icono: Icono,
  tone,
  items,
  pathname,
  abierto,
  onToggle,
}: {
  id: string;
  titulo: string;
  eyebrow: string;
  icono: LucideIcon;
  tone: Tone;
  items: SidebarNavItem[];
  pathname: string;
  abierto: boolean;
  onToggle: () => void;
}) {
  const t = toneStyles[tone];
  const panelId = `${id}-panel`;
  const activo = items.some((item) => esRutaActiva(pathname, item.href));

  return (
    <div
      className={cn(
        "rounded-xl border border-outline-variant/50 border-l-[3px] p-1.5",
        t.container
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={abierto}
        aria-controls={panelId}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left transition-colors min-h-[44px]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
          t.focus,
          t.header,
          abierto && t.headerOpen
        )}
      >
        <span
          className={cn(
            "grid h-7 w-7 shrink-0 place-items-center rounded-md",
            t.headerIcon
          )}
        >
          <Icono className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block text-[9px] font-semibold uppercase tracking-[0.14em] leading-none",
              t.eyebrow
            )}
          >
            {eyebrow}
          </span>
          <span className="mt-0.5 block truncate text-[13px] font-semibold leading-tight">
            {titulo}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            abierto ? "rotate-0" : "-rotate-90",
            activo && !abierto && "text-on-surface"
          )}
        />
      </button>

      {abierto && (
        <div id={panelId} className="mt-1 space-y-0.5 pl-1.5">
          {items.map((item) => {
            const Icon = item.icon;
            const itemActivo = esRutaActiva(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.title}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors min-h-[38px]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
                  t.focus,
                  itemActivo
                    ? t.itemActive
                    : cn("text-muted-foreground", t.itemHover)
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}