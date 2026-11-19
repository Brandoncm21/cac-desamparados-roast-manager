"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ErroresRecibidoDialog({
  open,
  onOpenChange,
  titulo = "Faltan campos obligatorios",
  mensajes,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo?: string;
  mensajes: string[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="bg-orange-600/85 text-white ring-orange-300 backdrop-blur-sm sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <AlertTriangle className="h-5 w-5" />
            {titulo}
          </DialogTitle>
          <DialogDescription className="text-orange-50">
            Complete los siguientes valores antes de registrar el recibido.
          </DialogDescription>
        </DialogHeader>
        {mensajes.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5 text-sm font-medium">
            {mensajes.map((mensaje, i) => (
              <li key={`${mensaje}-${i}`}>{mensaje}</li>
            ))}
          </ul>
        ) : null}
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            className="border-white/70 bg-transparent text-white hover:bg-white/20 hover:text-white"
            onClick={() => onOpenChange(false)}
          >
            Entendido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
