"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

const OPCIONES_PROCESO = ["Lavado", "Honey", "Natural", "Otro"];

interface Orden {
  id_orden: number;
  id_cliente: number;
  id_finca: number | null;
  porcentaje_humedad_entrada: number | null;
  proceso_cafe: string | null;
  descripcion_producto: string | null;
  fecha_orden: string | null;
  hora_cierre: string | null;
  firma_aprobacion_cliente: boolean | null;
}

interface Finca {
  id_finca: number;
  nombre: string;
  altura: number | null;
}

const SIN_FINCA = "sin_finca";

export default function EditarOrdenPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [porcentajeHumedad, setPorcentajeHumedad] = useState<string>("");
  const [procesoCafe, setProcesoCafe] = useState<string>("");
  const [descripcionProducto, setDescripcionProducto] = useState<string>("");
  const [idFinca, setIdFinca] = useState<number | null>(null);
  const [fincas, setFincas] = useState<Finca[]>([]);
  const [fechaOrden, setFechaOrden] = useState<string>("");
  const [horaCierre, setHoraCierre] = useState<string>("");
  const [firmaAprobacion, setFirmaAprobacion] = useState<boolean>(false);

  useEffect(() => {
    const load = async () => {
      const id = Number(params.id);
      if (Number.isNaN(id)) {
        toast.error("ID de orden inválido");
        router.push("/ordenes");
        return;
      }

      const { data, error } = await supabase
        .from("ordenes_trabajo")
        .select(
          "id_orden, id_cliente, id_finca, porcentaje_humedad_entrada, proceso_cafe, descripcion_producto, fecha_orden, hora_cierre, firma_aprobacion_cliente"
        )
        .eq("id_orden", id)
        .is("deleted_at", null)
        .single();

      if (error || !data) {
        toast.error("Orden no encontrada");
        router.push("/ordenes");
        return;
      }

      const orden = data as Orden;
      setPorcentajeHumedad(orden.porcentaje_humedad_entrada?.toString() ?? "");
      setProcesoCafe(orden.proceso_cafe ?? "");
      setDescripcionProducto(orden.descripcion_producto ?? "");
      setIdFinca(orden.id_finca ?? null);
      setFechaOrden(orden.fecha_orden ?? "");
      setHoraCierre(orden.hora_cierre ?? "");
      setFirmaAprobacion(orden.firma_aprobacion_cliente ?? false);

      if (orden.id_cliente) {
        const resFincas = await fetch(`/api/fincas?cliente_id=${orden.id_cliente}&pageSize=100&page=1`);
        if (resFincas.ok) {
          const { data: filas } = (await resFincas.json()) as { data?: Finca[] };
          setFincas(filas ?? []);
        }
      }

      setLoading(false);
    };

    load();
  }, [params.id, router, supabase]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const id = Number(params.id);

    setSaving(true);
    try {
      const payload = {
        porcentaje_humedad_entrada: porcentajeHumedad === "" ? null : Number(porcentajeHumedad),
        proceso_cafe: procesoCafe || null,
        descripcion_producto: descripcionProducto.trim() || null,
        id_finca: idFinca,
        fecha_orden: fechaOrden || null,
        hora_cierre: horaCierre || null,
        firma_aprobacion_cliente: firmaAprobacion,
      };

      const res = await fetch(`/api/ordenes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await res.json()) as { data?: Orden; error?: { message: string } };

      if (!res.ok) {
        toast.error("Error al actualizar orden: " + (result.error?.message || "Error desconocido"));
        return;
      }

      toast.success("Orden actualizada exitosamente");
      router.push(`/ordenes/${id}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto flex items-center justify-center gap-2 py-12">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-muted-foreground">Cargando orden...</span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mt-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Editar Orden</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Información de la Orden</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="proceso_cafe">Proceso de café</Label>
                <Select value={procesoCafe} onValueChange={(v) => setProcesoCafe(v ?? "")} disabled={saving}>
                  <SelectTrigger id="proceso_cafe">
                    <SelectValue placeholder="Sin especificar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin especificar</SelectItem>
                    {OPCIONES_PROCESO.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="porcentaje_humedad">% Humedad de entrada</Label>
                <Input
                  id="porcentaje_humedad"
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  value={porcentajeHumedad}
                  onChange={(e) => setPorcentajeHumedad(e.target.value)}
                  placeholder="Ej: 12.5"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion_producto">Descripción del producto</Label>
              <Input
                id="descripcion_producto"
                value={descripcionProducto}
                onChange={(e) => setDescripcionProducto(e.target.value)}
                placeholder="Descripción del producto"
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="id_finca">Finca</Label>
              <Select
                value={idFinca ? String(idFinca) : SIN_FINCA}
                onValueChange={(v) => setIdFinca(v && v !== SIN_FINCA ? Number(v) : null)}
                disabled={saving}
              >
                <SelectTrigger id="id_finca">
                  <SelectValue placeholder="Sin especificar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SIN_FINCA}>Sin especificar</SelectItem>
                  {fincas.map((f) => (
                    <SelectItem key={f.id_finca} value={String(f.id_finca)}>
                      {f.nombre}
                      {f.altura != null ? ` — ${f.altura} msnm` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fincas.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  El cliente no tiene fincas registradas. Créalas desde el lote o al crear una orden.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fecha_orden">Fecha de orden</Label>
                <Input
                  id="fecha_orden"
                  type="date"
                  value={fechaOrden}
                  onChange={(e) => setFechaOrden(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hora_cierre">Hora de cierre</Label>
                <Input
                  id="hora_cierre"
                  type="time"
                  value={horaCierre}
                  onChange={(e) => setHoraCierre(e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Checkbox
                id="firma_aprobacion"
                checked={firmaAprobacion}
                onCheckedChange={(checked) => setFirmaAprobacion(checked === true)}
                disabled={saving}
              />
              <Label htmlFor="firma_aprobacion" className="mb-0">
                Firma de aprobación del cliente
              </Label>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar cambios"
                )}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={saving}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
