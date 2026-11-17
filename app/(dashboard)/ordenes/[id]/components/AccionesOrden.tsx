"use client";

import { ArrowLeft, Pencil, Printer, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EstadoBadge } from "@/components/ui/estado-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import styles from "../page.module.css";

const ESTADOS = ["Pendiente", "En Proceso", "Completado", "Cancelado"];

interface AccionesOrdenProps {
  numeroFactura: string;
  estado: string;
  puedeEditar: boolean;
  puedeEliminar: boolean;
  onVolver: () => void;
  onCambiarEstado: (estado: string) => void;
  onEditar: () => void;
  onEliminar: () => void;
  onImprimir: () => void;
}

/** Barra de acciones del detalle (no se imprime). */
export function AccionesOrden({
  numeroFactura,
  estado,
  puedeEditar,
  puedeEliminar,
  onVolver,
  onCambiarEstado,
  onEditar,
  onEliminar,
  onImprimir,
}: AccionesOrdenProps) {
  return (
    <div className={`flex items-center gap-4 flex-wrap noPrint mt-6 ${styles["noPrint"]}`}>
      <Button variant="ghost" size="icon" onClick={onVolver}>
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <h1 className="text-2xl font-bold">Orden #{numeroFactura}</h1>
      <Select value={estado} onValueChange={(valor) => valor && onCambiarEstado(valor)}>
        <SelectTrigger className="w-36">
          <EstadoBadge estado={estado} />
        </SelectTrigger>
        <SelectContent>
          {ESTADOS.map((opcion) => (
            <SelectItem key={opcion} value={opcion}>
              {opcion}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {puedeEditar && (
        <Button variant="outline" size="sm" onClick={onEditar}>
          <Pencil className="h-4 w-4 mr-2" />
          Editar
        </Button>
      )}
      {puedeEliminar && (
        <Button variant="destructive" size="sm" onClick={onEliminar}>
          <Trash2 className="h-4 w-4 mr-2" />
          Eliminar
        </Button>
      )}
      <Button variant="outline" onClick={onImprimir} className="ml-auto">
        <Printer className="h-4 w-4 mr-2" />
        Imprimir Orden
      </Button>
    </div>
  );
}
