"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Cliente {
  id_cliente: number;
  nombre_completo: string;
  telefono: string | null;
  zona_procedencia: string | null;
}

export default function EditarClientePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [nombreCompleto, setNombreCompleto] = useState("");
  const [telefono, setTelefono] = useState("");
  const [zonaProcedencia, setZonaProcedencia] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const id = Number(params.id);
      if (Number.isNaN(id)) {
        toast.error("ID de cliente inválido");
        router.push("/clientes");
        return;
      }

      const { data, error } = await supabase
        .from("clientes")
        .select("id_cliente, nombre_completo, telefono, zona_procedencia")
        .eq("id_cliente", id)
        .is("deleted_at", null)
        .single();

      if (error || !data) {
        toast.error("Cliente no encontrado");
        router.push("/clientes");
        return;
      }

      const loaded = data as Cliente;
      setNombreCompleto(loaded.nombre_completo);
      setTelefono(loaded.telefono ?? "");
      setZonaProcedencia(loaded.zona_procedencia ?? "");
      setLoading(false);
    };

    load();
  }, [params.id, router, supabase]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const id = Number(params.id);

    if (!nombreCompleto.trim()) {
      toast.error("El nombre completo es obligatorio");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/clientes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre_completo: nombreCompleto.trim(),
          telefono: telefono.trim() || null,
          zona_procedencia: zonaProcedencia.trim() || null,
        }),
      });

      const result = (await res.json()) as { data?: Cliente; error?: { message: string } };

      if (!res.ok) {
        toast.error("Error al actualizar cliente: " + (result.error?.message || "Error desconocido"));
        return;
      }

      toast.success("Cliente actualizado exitosamente");
      router.push(`/clientes/${id}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto flex items-center justify-center gap-2 py-12">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-muted-foreground">Cargando cliente...</span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mt-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Editar Cliente</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Información del Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre_completo">Nombre completo *</Label>
              <Input
                id="nombre_completo"
                value={nombreCompleto}
                onChange={(e) => setNombreCompleto(e.target.value)}
                placeholder="Nombre completo"
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Teléfono"
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zona_procedencia">Zona de procedencia</Label>
              <Input
                id="zona_procedencia"
                value={zonaProcedencia}
                onChange={(e) => setZonaProcedencia(e.target.value)}
                placeholder="Zona de procedencia"
                disabled={saving}
              />
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
