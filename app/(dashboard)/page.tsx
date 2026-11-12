"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Users, Thermometer, AlertTriangle } from "lucide-react";
import { ENPROCESO_LOTE } from "@/lib/schemas/lotes";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    ordenes_pendientes: 0,
    clientes: 0,
    perfiles_hoy: 0,
    proximos_vencer: 0,
  });

  const [lotesPorFase, setLotesPorFase] = useState<
    Record<string, Array<{ id_lote: number; nlote: string; clientes: { nombre_completo: string } | null; fincas: { nombre: string } | null }>>
  >({});

  useEffect(() => {
    fetch("/api/lotes?pageSize=100&page=1")
      .then((r) => r.json())
      .then((j) => {
        const grupos: Record<
          string,
          Array<{ id_lote: number; nlote: string; clientes: { nombre_completo: string } | null; fincas: { nombre: string } | null }>
        > = {};
        for (const l of (j.data ?? [])) {
          const fase = (l.enproceso as string) ?? "No";
          (grupos[fase] ??= []).push(l);
        }
        setLotesPorFase(grupos);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const loadStats = async () => {
      const hoy = new Date().toISOString().split("T")[0];
      const dentro30dias = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      const [
        { count: ordenes },
        { count: clientes },
        { count: perfiles },
        { data: vencidos },
      ] = await Promise.all([
        supabase.from("ordenes_trabajo").select("*", { count: "exact", head: true }).eq("estado_orden", "Pendiente"),
        supabase.from("clientes").select("*", { count: "exact", head: true }),
        supabase.from("perfiles_tueste").select("*", { count: "exact", head: true }).gte("fecha_tueste", hoy),
        supabase.from("perfiles_tueste").select("*").lte("fecha_vencimiento", dentro30dias),
      ]);

      setStats({
        ordenes_pendientes: ordenes || 0,
        clientes: clientes || 0,
        perfiles_hoy: perfiles || 0,
        proximos_vencer: vencidos?.length || 0,
      });
    };
    loadStats();
  }, []);

  const cards = [
    {
      title: "Órdenes Pendientes",
      value: stats.ordenes_pendientes,
      icon: FileText,
      color: "text-amber-600",
      href: "/ordenes?estado=Pendiente",
    },
    {
      title: "Clientes Registrados",
      value: stats.clientes,
      icon: Users,
      color: "text-blue-600",
      href: "/clientes",
    },
    {
      title: "Tuestes Hoy",
      value: stats.perfiles_hoy,
      icon: Thermometer,
      color: "text-orange-600",
      href: "/tueste",
    },
    {
      title: "Próximos a Vencer",
      value: stats.proximos_vencer,
      icon: AlertTriangle,
      color: "text-red-600",
      href: "/reportes",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard SCACR</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.title} href={card.href} className="block">
              <Card className="h-full transition-all hover:shadow-md hover:border-amber-200/50 cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{card.value}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Lotes por fase de proceso</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ENPROCESO_LOTE.map((fase) => {
            const lotes = lotesPorFase[fase] ?? [];
            const etiqueta = fase === "No" ? "En acopio" : fase;
            return (
              <Card key={fase}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{etiqueta}</CardTitle>
                  <span className="text-xs text-muted-foreground">{lotes.length}</span>
                </CardHeader>
                <CardContent>
                  {lotes.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sin lotes</p>
                  ) : (
                    <ul className="space-y-1">
                      {lotes.slice(0, 8).map((l) => (
                        <li key={l.id_lote}>
                          <Link href={`/lotes/${l.id_lote}`} className="text-sm hover:underline">
                            <span className="font-mono">{l.nlote}</span>
                            <span className="text-muted-foreground">
                              {" "}— {l.clientes?.nombre_completo ?? "-"} · {l.fincas?.nombre ?? "-"}
                            </span>
                          </Link>
                        </li>
                      ))}
                      {lotes.length > 8 && (
                        <li className="text-xs text-muted-foreground">+{lotes.length - 8} más</li>
                      )}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
