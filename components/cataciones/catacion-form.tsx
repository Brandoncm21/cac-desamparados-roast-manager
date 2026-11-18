"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { detalleDeError } from "@/lib/api/http";
import { guardarCatacion, obtenerCatacion } from "@/lib/api/cataciones";
import { listarLotes, type LoteResumen } from "@/lib/api/lotes";
import { catacionSchema } from "@/lib/schemas/catacion";

interface CatacionFormProps {
  /** Presente al editar una catación existente. */
  catacionId?: number;
  /** Presente al registrar desde un lote concreto. */
  loteId?: number;
}

/**
 * Alta y edición de una catación: solo lote, si se cató y las notas.
 *
 * El servidor hace upsert por lote, así que volver a guardar el mismo lote
 * actualiza el registro en vez de duplicarlo.
 */
export function CatacionForm({ catacionId, loteId }: CatacionFormProps) {
  const router = useRouter();

  const [lotes, setLotes] = useState<LoteResumen[]>([]);
  const [idLote, setIdLote] = useState(loteId ? String(loteId) : "");
  const [catado, setCatado] = useState(false);
  const [notas, setNotas] = useState("");
  const [cargando, setCargando] = useState(Boolean(catacionId));
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    listarLotes()
      .then(setLotes)
      .catch(() => setLotes([]));
  }, []);

  useEffect(() => {
    if (!catacionId) return;

    obtenerCatacion(catacionId)
      .then((catacion) => {
        setIdLote(String(catacion.id_lote));
        setCatado(catacion.catado);
        setNotas(catacion.notas_catacion ?? "");
      })
      .catch((error) => toast.error(detalleDeError(error)))
      .finally(() => setCargando(false));
  }, [catacionId]);

  const opciones = useMemo(
    () =>
      lotes.map((lote) => ({
        value: String(lote.id_lote),
        label: `${lote.nlote}${lote.clientes?.nombre_completo ? ` · ${lote.clientes.nombre_completo}` : ""}`,
      })),
    [lotes]
  );

  const guardar = async (evento: React.FormEvent) => {
    evento.preventDefault();

    const parsed = catacionSchema.safeParse({
      id_catacion_tueste: catacionId,
      id_lote: Number(idLote),
      catado,
      notas_catacion: notas,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }

    setGuardando(true);
    try {
      await guardarCatacion(parsed.data);
      toast.success("Catación guardada");
      router.push("/cataciones");
      router.refresh();
    } catch (error) {
      toast.error(detalleDeError(error));
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return <p className="text-muted-foreground">Cargando catación…</p>;
  }

  return (
    <form onSubmit={guardar} className="space-y-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Lote</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="lote">Lote *</Label>
          <Select
            items={opciones}
            value={idLote}
            onValueChange={(valor) => setIdLote(valor ?? "")}
          >
            <SelectTrigger id="lote" className="w-full">
              <SelectValue placeholder="Seleccionar lote..." />
            </SelectTrigger>
            <SelectContent>
              {lotes.map((lote) => (
                <SelectItem key={lote.id_lote} value={String(lote.id_lote)}>
                  {lote.nlote}
                  {lote.fincas?.nombre ? ` · ${lote.fincas.nombre}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Toda catación pertenece a un lote; no puede guardarse sin lote.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Estado de catación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Checkbox
              id="catado"
              checked={catado}
              onCheckedChange={(valor) => setCatado(Boolean(valor))}
              className="h-5 w-5"
            />
            <Label htmlFor="catado" className="mb-0 text-base">
              El lote fue catado
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notas">Notas de catación</Label>
            <Textarea
              id="notas"
              value={notas}
              onChange={(evento) => setNotas(evento.target.value)}
              rows={5}
              maxLength={2000}
              placeholder="Observaciones de la catación..."
            />
            <p className="text-xs text-muted-foreground">{notas.length}/2000 caracteres</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button type="submit" disabled={guardando} className="sm:w-40">
          {guardando ? "Guardando..." : "Guardar"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
