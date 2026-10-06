"use client";

import { useEffect } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

interface RegistroConfirmadoDialogProps {
  registro: { minuto: number; temperatura: number } | null;
  onClose: () => void;
}

export function RegistroConfirmadoDialog({ registro, onClose }: RegistroConfirmadoDialogProps) {
  const open = registro !== null;

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(onClose, 2500);
    return () => clearTimeout(timer);
  }, [open, onClose]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="h-5 w-5" />
            Registrado exitosamente
          </DialogTitle>
        </DialogHeader>

        <div className="py-2 text-center space-y-1">
          <p className="text-3xl font-bold text-orange-700">{registro?.temperatura}°C</p>
          <p className="text-sm text-muted-foreground">Minuto {registro?.minuto}</p>
        </div>

        <DialogFooter>
          <Button onClick={onClose} className="w-full sm:w-auto">
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
