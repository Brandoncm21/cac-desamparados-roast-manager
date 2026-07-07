"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Thermometer, Printer } from "lucide-react";
import { toast } from "sonner";
import styles from "./page.module.css";

const ESTADOS = ["Pendiente", "En Proceso", "Completado", "Cancelado"];

interface Cliente {
  nombre_completo: string;
  telefono: string | null;
  zona_procedencia: string | null;
}

interface Servicio {
  id_servicio: number;
  tipo_servicio: string;
  peso_inicial: number | null;
  precio: number | null;
}

interface Especificaciones {
  tipo_tueste: string | null;
  tipo_molienda: string | null;
  tipo_empaque: string | null;
  observaciones: string | null;
}

interface Empleado {
  nombre: string;
}

interface Orden {
  id_orden: number;
  numero_factura: string;
  fecha_orden: string;
  hora_cierre: string | null;
  estado_orden: string;
  proceso_cafe: string | null;
  porcentaje_humedad_entrada: number | null;
  descripcion_producto: string | null;
  zona_finca: string | null;
  clientes: Cliente | null;
  servicios_ejecutados: Servicio[];
  especificaciones_orden: Especificaciones | null;
  empleado_recibe: Empleado | null;
  empleado_entrega: Empleado | null;
}

interface PerfilTueste {
  id_perfil: number;
}

export default function OrdenDetallePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [orden, setOrden] = useState<Orden | null>(null);
  const [perfilTueste, setPerfilTueste] = useState<PerfilTueste | null>(null);
  const [loadingPerfil, setLoadingPerfil] = useState(false);
  const [creandoPerfil, setCreandoPerfil] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("ordenes_trabajo")
        .select(
          `
          *,
          clientes(*),
          servicios_ejecutados(*),
          especificaciones_orden(*),
          empleado_recibe:empleados!id_empleado_recibe(nombre),
          empleado_entrega:empleados!id_empleado_entrega(nombre)
        `
        )
        .eq("id_orden", Number(params.id))
        .single();
      if (data) setOrden(data as unknown as Orden);
    };
    load();
  }, [params.id, supabase]);

  useEffect(() => {
    if (!orden) return;
    const tieneTueste = orden.servicios_ejecutados.some((s) => s.tipo_servicio === "Tueste");
    if (!tieneTueste) {
      setPerfilTueste(null);
      return;
    }

    setLoadingPerfil(true);
    supabase
      .from("perfiles_tueste")
      .select("id_perfil")
      .eq("id_orden", orden.id_orden)
      .maybeSingle()
      .then(({ data }) => {
        setPerfilTueste(data as PerfilTueste | null);
        setLoadingPerfil(false);
      });
  }, [orden, supabase]);

  const cambiarEstado = async (nuevoEstado: string) => {
    if (!orden) return;
    const { error } = await supabase
      .from("ordenes_trabajo")
      .update({ estado_orden: nuevoEstado })
      .eq("id_orden", orden.id_orden);

    if (error) {
      toast.error("Error al cambiar estado: " + error.message);
      return;
    }

    toast.success(`Estado actualizado a ${nuevoEstado}`);
    setOrden({ ...orden, estado_orden: nuevoEstado });
    router.refresh();
  };

  const handlePrint = () => {
    window.print();
  };

  const estadoBadge = (estado: string) => {
    const colors: Record<string, string> = {
      Pendiente: "bg-yellow-100 text-yellow-800",
      "En Proceso": "bg-blue-100 text-blue-800",
      Completado: "bg-green-100 text-green-800",
      Cancelado: "bg-red-100 text-red-800",
    };
    return colors[estado] || "bg-gray-100 text-gray-800";
  };

  if (!orden) return <p>Cargando...</p>;

  const cliente = orden.clientes;
  const total = orden.servicios_ejecutados.reduce((sum, s) => sum + (Number(s.precio) || 0), 0);
  const tieneTueste = orden.servicios_ejecutados.some((s) => s.tipo_servicio === "Tueste");

  const handleIniciarTueste = async () => {
    if (!orden || creandoPerfil) return;
    setCreandoPerfil(true);
    try {
      const { data, error } = await supabase
        .from("perfiles_tueste")
        .insert({
          id_orden: orden.id_orden,
          nombre_cafe: orden.descripcion_producto || orden.clientes?.nombre_completo || "Nuevo lote",
        })
        .select()
        .single();

      if (error) {
        toast.error("Error al iniciar tueste: " + error.message);
        return;
      }

      if (data?.id_perfil) {
        router.push(`/tueste/${data.id_perfil}`);
      } else {
        toast.error("No se pudo obtener el ID del perfil creado");
      }
    } finally {
      setCreandoPerfil(false);
    }
  };

  const renderTuesteSection = () => {
    if (!tieneTueste) return null;

    return (
      <Card className="mb-8 noPrint">
        <CardHeader>
          <CardTitle className="text-lg">Proceso de Tueste</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingPerfil ? (
            <p className="text-muted-foreground">Verificando perfil de tueste...</p>
          ) : perfilTueste ? (
            <Button
              className="w-full h-12"
              onClick={() => router.push(`/tueste/${perfilTueste.id_perfil}`)}
            >
              <Thermometer className="h-4 w-4 mr-2" />
              Ver perfil de tueste
            </Button>
          ) : (
            <Button
              className="w-full h-12"
              onClick={handleIniciarTueste}
              disabled={creandoPerfil}
            >
              <Thermometer className="h-4 w-4 mr-2" />
              {creandoPerfil ? "Creando perfil..." : "Iniciar Tueste"}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className={`flex items-center gap-4 flex-wrap noPrint mt-6 ${styles["noPrint"]}`}>
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Orden #{orden.numero_factura}</h1>
        <Select value={orden.estado_orden} onValueChange={(value) => value && cambiarEstado(value)}>
          <SelectTrigger className="w-36">
            <Badge className={estadoBadge(orden.estado_orden)}>
              {orden.estado_orden}
            </Badge>
          </SelectTrigger>
          <SelectContent>
            {ESTADOS.map((e) => (
              <SelectItem key={e} value={e}>{e}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={handlePrint} className="ml-auto">
          <Printer className="h-4 w-4 mr-2" />
          Imprimir Orden
        </Button>
      </div>

      <div className={`printArea ${styles["printArea"]}`}>
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold">SCACR</h2>
          <p className="text-muted-foreground">Centro Agrícola Cantonal de Desamparados</p>
          <p className="font-mono text-xl mt-2">Orden #{orden.numero_factura}</p>
          <Badge className={estadoBadge(orden.estado_orden)}>{orden.estado_orden}</Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card>
            <CardHeader><CardTitle className="text-lg">Cliente</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">{cliente?.nombre_completo || "—"}</p>
              <p>{cliente?.telefono || "—"}</p>
              <p>{cliente?.zona_procedencia || "—"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Detalles</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>Proceso: <span className="font-medium">{orden.proceso_cafe || "—"}</span></p>
              <p>Humedad: <span className="font-medium">{orden.porcentaje_humedad_entrada ?? "—"}%</span></p>
              <p>Factura: <span className="font-medium">{orden.numero_factura}</span></p>
              <p>Fecha: <span className="font-medium">{orden.fecha_orden}</span></p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader><CardTitle className="text-lg">Datos de Cierre</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              Hora: <span className="font-medium">{orden.hora_cierre || "—"}</span>
            </p>
            <p>
              Responsable: <span className="font-medium">{orden.empleado_recibe?.nombre || "Sin asignar"}</span>
            </p>
            <p>
              Zona/Finca: <span className="font-medium">{orden.zona_finca || "Sin especificar"}</span>
            </p>
            <p>
              Producto: <span className="font-medium">{orden.descripcion_producto || "Sin especificar"}</span>
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader><CardTitle className="text-lg">Servicios</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Servicio</TableHead>
                  <TableHead>Peso Inicial</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orden.servicios_ejecutados.map((s) => (
                  <TableRow key={s.id_servicio}>
                    <TableCell className="font-medium">{s.tipo_servicio}</TableCell>
                    <TableCell>{s.peso_inicial ? `${s.peso_inicial} kg` : "—"}</TableCell>
                    <TableCell className="text-right">{s.precio ? `₡${Number(s.precio).toLocaleString()}` : "—"}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={2} className="font-bold">Total</TableCell>
                  <TableCell className="text-right font-bold">₡{total.toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {orden.especificaciones_orden && (
          <Card className="mb-8">
            <CardHeader><CardTitle className="text-lg">Especificaciones</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              <p>Tueste: {orden.especificaciones_orden.tipo_tueste || "—"}</p>
              <p>Molienda: {orden.especificaciones_orden.tipo_molienda || "—"}</p>
              <p>Empaque: {orden.especificaciones_orden.tipo_empaque || "—"}</p>
              <p>Observaciones: {orden.especificaciones_orden.observaciones || "—"}</p>
            </CardContent>
          </Card>
        )}

        <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>Documento generado por SCACR - Sistema de Gestión de Torrefacción</p>
        </div>
      </div>

      {renderTuesteSection()}
    </div>
  );
}
