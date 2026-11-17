"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  crearFinca, etiquetaFinca, listarFincas, listarZonas, opcionesFinca,
  type FincaOpcion, type ZonaOpcion,
} from "@/lib/fincas";

const SIN_ZONA = "__sin_zona__";

interface FincaSelectProps {
  /** Productor seleccionado: las fincas se cargan solo para él. */
  clienteId: number | null;
  value: number | null;
  /** Devuelve la finca completa (nombre, altura, zona) para autopoblar el formulario. */
  onChange: (finca: FincaOpcion | null) => void;
  onFincasChange?: (fincas: FincaOpcion[]) => void;
  disabled?: boolean;
  error?: string;
  /** Muestra el alta rápida de finca (nombre + altura + zona). */
  permitirCrear?: boolean;
}

export function FincaSelect({
  clienteId,
  value,
  onChange,
  onFincasChange,
  disabled,
  error,
  permitirCrear = true,
}: FincaSelectProps) {
  const [fincas, setFincas] = useState<FincaOpcion[]>([]);
  const [zonas, setZonas] = useState<ZonaOpcion[]>([]);
  const [cargando, setCargando] = useState(false);
  const [crearOpen, setCrearOpen] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [nuevaNombre, setNuevaNombre] = useState("");
  const [nuevaAltura, setNuevaAltura] = useState("");
  const [nuevaZona, setNuevaZona] = useState<number | null>(null);

  useEffect(() => {
    let activo = true;
    listarZonas()
      .then((z) => {
        if (activo) setZonas(z);
      })
      .catch(() => undefined);
    return () => {
      activo = false;
    };
  }, []);

  // Callbacks y valor vigente en refs: el fetch solo depende de `clienteId`,
  // así seleccionar una finca no vuelve a pedir la lista (sin bucles).
  const vigenteRef = useRef({ onChange, onFincasChange, value });
  useEffect(() => {
    vigenteRef.current = { onChange, onFincasChange, value };
  });

  useEffect(() => {
    let activo = true;
    if (!clienteId) {
      setFincas([]);
      vigenteRef.current.onFincasChange?.([]);
      return;
    }
    setCargando(true);
    listarFincas({ clienteId })
      .then((lista) => {
        if (!activo) return;
        setFincas(lista);
        vigenteRef.current.onFincasChange?.(lista);
        const elegida = vigenteRef.current.value;
        if (elegida != null && !lista.some((f) => f.id_finca === elegida)) {
          vigenteRef.current.onChange(null);
        }
      })
      .catch((e) => {
        if (activo) {
          toast.error("No se pudieron cargar las fincas: " + (e instanceof Error ? e.message : ""));
        }
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, [clienteId]);

  const seleccionar = (valor: string | null) => {
    if (!valor) {
      onChange(null);
      return;
    }
    const finca = fincas.find((f) => String(f.id_finca) === valor) ?? null;
    onChange(finca);
  };

  const crear = async () => {
    if (!clienteId) {
      toast.error("Seleccioná un productor primero");
      return;
    }
    if (!nuevaNombre.trim()) {
      toast.error("El nombre de la finca es obligatorio");
      return;
    }
    const altura = nuevaAltura.trim() === "" ? null : Number(nuevaAltura);
    if (altura != null && (!Number.isFinite(altura) || altura < 0)) {
      toast.error("La altura debe ser un número mayor o igual a 0");
      return;
    }
    setGuardando(true);
    try {
      const creada = await crearFinca({
        cliente_id: clienteId,
        nombre: nuevaNombre.trim(),
        altura,
        zona_id: nuevaZona,
      });
      toast.success("Finca creada");
      setNuevaNombre("");
      setNuevaAltura("");
      setNuevaZona(null);
      setCrearOpen(false);
      const lista = await listarFincas({ clienteId });
      setFincas(lista);
      onFincasChange?.(lista);
      onChange(lista.find((f) => f.id_finca === creada.id_finca) ?? creada);
    } catch (e) {
      toast.error("Error al crear finca: " + (e instanceof Error ? e.message : ""));
    } finally {
      setGuardando(false);
    }
  };

  const sinFincas = Boolean(clienteId) && !cargando && fincas.length === 0;
  const placeholder = !clienteId
    ? "Elegí un productor primero"
    : cargando
      ? "Cargando fincas…"
      : fincas.length === 0
        ? "Este productor no tiene fincas"
        : "Seleccionar finca";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>Finca *</Label>
        {permitirCrear && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            disabled={!clienteId || disabled || guardando}
            onClick={() => setCrearOpen((v) => !v)}
          >
            + Crear finca
          </Button>
        )}
      </div>

      <Select
        items={opcionesFinca(fincas)}
        value={value != null ? String(value) : null}
        onValueChange={seleccionar}
        disabled={!clienteId || disabled || cargando || fincas.length === 0}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {fincas.map((f) => (
            <SelectItem key={f.id_finca} value={String(f.id_finca)}>
              {etiquetaFinca(f)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {sinFincas && !crearOpen && (
        <p className="text-xs text-muted-foreground">
          Este productor todavía no tiene fincas. Usá <strong>+ Crear finca</strong> para registrar la primera.
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {crearOpen && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-md border p-3">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="nf-nombre">Nombre de la finca *</Label>
            <Input
              id="nf-nombre"
              value={nuevaNombre}
              onChange={(e) => setNuevaNombre(e.target.value)}
              maxLength={150}
              placeholder="Ej: Finca La Esperanza"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nf-altura">Altura (msnm)</Label>
            <Input
              id="nf-altura"
              type="number"
              min={0}
              step="0.01"
              value={nuevaAltura}
              onChange={(e) => setNuevaAltura(e.target.value)}
              placeholder="Opcional"
            />
          </div>
          <div className="space-y-2">
            <Label>Zona</Label>
            <Select
              items={[
                { value: SIN_ZONA, label: "Sin zona" },
                ...zonas.map((z) => ({ value: String(z.id_zona), label: z.nombre })),
              ]}
              value={nuevaZona != null ? String(nuevaZona) : SIN_ZONA}
              onValueChange={(v) => setNuevaZona(v && v !== SIN_ZONA ? Number(v) : null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sin zona" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SIN_ZONA}>Sin zona</SelectItem>
                {zonas.map((z) => (
                  <SelectItem key={z.id_zona} value={String(z.id_zona)}>
                    {z.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 flex items-center gap-2">
            <Button type="button" size="sm" onClick={crear} disabled={guardando}>
              {guardando ? "Creando…" : "Crear finca"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setCrearOpen(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
