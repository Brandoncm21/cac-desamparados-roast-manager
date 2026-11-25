"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { crearProductor, type ProductorResumen } from "@/lib/api/beneficio";
import { detalleDeError } from "@/lib/api/http";
import { crearProductorSchema, type CrearProductorInput } from "@/lib/schemas/productores";

interface NuevoProductorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Se invoca con la fila creada para seleccionarla en Nueva Finca. */
  onCreado: (productor: ProductorResumen) => void;
}

const VACIOS: CrearProductorInput = { nombre_completo: "", telefono: "" };

/**
 * Modal para registrar un productor sin abandonar el formulario de Nueva Finca.
 * Al cancelar/cerrar sólo se limpia este modal; la finca en curso no se toca.
 */
export function NuevoProductorDialog({
  open,
  onOpenChange,
  onCreado,
}: NuevoProductorDialogProps) {
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CrearProductorInput>({
    resolver: zodResolver(crearProductorSchema) as never,
    defaultValues: VACIOS,
  });

  const cerrar = (abierto: boolean) => {
    if (!abierto) reset(VACIOS);
    onOpenChange(abierto);
  };

  const onSubmit = async (values: CrearProductorInput) => {
    setSaving(true);
    try {
      const creado = await crearProductor({
        nombre_completo: values.nombre_completo,
        telefono: values.telefono?.trim() || null,
      });
      toast.success("Productor creado");
      onCreado(creado);
      cerrar(false);
    } catch (error) {
      toast.error("Error al crear el productor: " + detalleDeError(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Nuevo productor</DialogTitle>
            <DialogDescription>
              Registrá un productor para asignarle la finca. Las fechas y metadatos se
              generan automáticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="productor-nombre">Nombre completo *</Label>
            <Input
              id="productor-nombre"
              maxLength={150}
              placeholder="Ej: María Rodríguez"
              autoFocus
              {...register("nombre_completo")}
            />
            {errors.nombre_completo && (
              <p className="text-sm text-red-600">{String(errors.nombre_completo.message)}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="productor-telefono">Teléfono</Label>
            <Input
              id="productor-telefono"
              maxLength={30}
              placeholder="Opcional (ej: 8888-8888)"
              {...register("telefono")}
            />
            {errors.telefono && (
              <p className="text-sm text-red-600">{String(errors.telefono.message)}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => cerrar(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando…" : "Crear productor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
