"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  crearRecibido,
  listarFincasDeProductor,
  listarProductores,
  type FincaResumen,
  type ProductorResumen,
} from "@/lib/api/beneficio";
import { PROCESOS_BENEFICIO, type CrearRecibidoInput } from "@/lib/schemas/beneficio";
import { ApiError, detalleDeError } from "@/lib/api/http";

interface Valores {
  numero_lote: string;
  numero_recibo: string;
  factura: string;
  fecha_recibido: string;
  productor_id: string;
  finca_id: string;
  varietal: string;
  cajuelas: string;
  cuartillos: string;
  proceso: string;
  porcentaje_flote: string;
  porcentaje_broca: string;
  porcentaje_vano: string;
  porcentaje_verde: string;
  porcentaje_secos: string;
  ph_miel: string;
  rango_objetivo: string;
  rango_sobre_objetivo: string;
  rango: string;
  puro_impuro: boolean;
  limpio_sucio: boolean;
}

const hoy = () => {
  const fecha = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}`;
};

const VALORES_INICIALES: Valores = {
  numero_lote: "",
  numero_recibo: "",
  factura: "",
  fecha_recibido: hoy(),
  productor_id: "",
  finca_id: "",
  varietal: "",
  cajuelas: "",
  cuartillos: "",
  proceso: "",
  porcentaje_flote: "",
  porcentaje_broca: "",
  porcentaje_vano: "",
  porcentaje_verde: "",
  porcentaje_secos: "",
  ph_miel: "",
  rango_objetivo: "",
  rango_sobre_objetivo: "",
  rango: "",
  puro_impuro: true,
  limpio_sucio: true,
};

const CAMPOS_PORCENTAJE: { key: keyof Valores; label: string }[] = [
  { key: "porcentaje_flote", label: "Flote" },
  { key: "porcentaje_broca", label: "Broca" },
  { key: "porcentaje_vano", label: "Vano" },
  { key: "porcentaje_verde", label: "Verde" },
  { key: "porcentaje_secos", label: "Secos" },
];

export default function NuevoRecibidoPage() {
  const router = useRouter();
  const [valores, setValores] = useState<Valores>(VALORES_INICIALES);
  const [productores, setProductores] = useState<ProductorResumen[]>([]);
  const [fincas, setFincas] = useState<FincaResumen[]>([]);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true);
  const [cargandoFincas, setCargandoFincas] = useState(false);

  useEffect(() => {
    listarProductores()
      .then(setProductores)
      .catch((error) => toast.error(detalleDeError(error)))
      .finally(() => setCargandoCatalogos(false));
  }, []);

  const cambiar = <K extends keyof Valores>(key: K, valor: Valores[K]) => {
    setValores((prev) => ({ ...prev, [key]: valor }));
    setErrores((prev) => {
      if (!prev[key as string]) return prev;
      const { [key as string]: _omitido, ...resto } = prev;
      return resto;
    });
  };

  const seleccionarProductor = async (valor: string) => {
    cambiar("productor_id", valor);
    cambiar("finca_id", "");
    setFincas([]);

    const id = Number(valor);
    if (!id) return;

    setCargandoFincas(true);
    try {
      setFincas(await listarFincasDeProductor(id));
    } catch (error) {
      toast.error(detalleDeError(error));
    } finally {
      setCargandoFincas(false);
    }
  };

  const numero = (texto: string) => (texto.trim() === "" ? null : Number(texto));

  const enviar = async (event: React.FormEvent) => {
    event.preventDefault();
    setEnviando(true);
    setErrores({});

    const payload: CrearRecibidoInput = {
      numero_lote: valores.numero_lote.trim(),
      numero_recibo: valores.numero_recibo.trim(),
      factura: valores.factura.trim(),
      fecha_recibido: valores.fecha_recibido || "",
      productor_id: Number(valores.productor_id),
      finca_id: Number(valores.finca_id),
      varietal: valores.varietal.trim(),
      cajuelas: numero(valores.cajuelas),
      cuartillos: numero(valores.cuartillos),
      proceso: valores.proceso ? (valores.proceso as CrearRecibidoInput["proceso"]) : null,
      porcentaje_flote: numero(valores.porcentaje_flote),
      porcentaje_broca: numero(valores.porcentaje_broca),
      porcentaje_vano: numero(valores.porcentaje_vano),
      porcentaje_verde: numero(valores.porcentaje_verde),
      porcentaje_secos: numero(valores.porcentaje_secos),
      ph_miel: numero(valores.ph_miel),
      rango_objetivo: numero(valores.rango_objetivo),
      rango_sobre_objetivo: numero(valores.rango_sobre_objetivo),
      rango: numero(valores.rango),
      puro_impuro: valores.puro_impuro,
      limpio_sucio: valores.limpio_sucio,
    };

    try {
      const lote = await crearRecibido(payload);
      toast.success(`Lote ${lote.numero_lote} recibido`);
      router.push(`/beneficio/recibido/${lote.id_lote}`);
    } catch (error) {
      if (error instanceof ApiError) {
        const planos: Record<string, string> = {};
        for (const [campo, mensajes] of Object.entries(error.fieldErrors)) {
          const primero = mensajes[0];
          if (primero) planos[campo] = primero;
        }
        setErrores(planos);
      }
      toast.error(detalleDeError(error));
      setEnviando(false);
    }
  };

  const error = (campo: keyof Valores) =>
    errores[campo as string] ? (
      <p className="text-xs text-destructive">{errores[campo as string]}</p>
    ) : null;

  return (
    <div className="space-y-6 mt-6">
      <div className="flex items-center gap-4">
        <Link href="/beneficio/recibido">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Nuevo Recibido de Café</h1>
          <p className="text-sm text-muted-foreground">
            Registra la entrada de cosecha; el lote nace en este paso.
          </p>
        </div>
      </div>

      <form onSubmit={enviar} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Identificación</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="numero_lote">
                N° de lote <span className="text-destructive">*</span>
              </Label>
              <Input
                id="numero_lote"
                value={valores.numero_lote}
                onChange={(e) => cambiar("numero_lote", e.target.value)}
                aria-invalid={Boolean(errores["numero_lote"])}
              />
              {error("numero_lote")}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="numero_recibo">
                N° de recibo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="numero_recibo"
                value={valores.numero_recibo}
                onChange={(e) => cambiar("numero_recibo", e.target.value)}
                aria-invalid={Boolean(errores["numero_recibo"])}
              />
              {error("numero_recibo")}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="factura">Factura</Label>
              <Input
                id="factura"
                value={valores.factura}
                onChange={(e) => cambiar("factura", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fecha_recibido">Fecha de recibido</Label>
              <Input
                id="fecha_recibido"
                type="date"
                value={valores.fecha_recibido}
                onChange={(e) => cambiar("fecha_recibido", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Productor y finca</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>
                Productor <span className="text-destructive">*</span>
              </Label>
              <Select
                value={valores.productor_id}
                onValueChange={(v) => seleccionarProductor(v ?? "")}
                disabled={cargandoCatalogos}
              >
                <SelectTrigger aria-invalid={Boolean(errores["productor_id"])}>
                  <SelectValue placeholder={cargandoCatalogos ? "Cargando..." : "Seleccione"} />
                </SelectTrigger>
                <SelectContent>
                  {productores.map((p) => (
                    <SelectItem key={p.id_productor} value={String(p.id_productor)}>
                      {p.nombre_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {error("productor_id")}
            </div>

            <div className="space-y-1.5">
              <Label>
                Finca <span className="text-destructive">*</span>
              </Label>
              <Select
                value={valores.finca_id}
                onValueChange={(v) => cambiar("finca_id", v ?? "")}
                disabled={!valores.productor_id || cargandoFincas}
              >
                <SelectTrigger aria-invalid={Boolean(errores["finca_id"])}>
                  <SelectValue
                    placeholder={
                      !valores.productor_id
                        ? "Elija un productor"
                        : cargandoFincas
                          ? "Cargando..."
                          : fincas.length === 0
                            ? "Sin fincas registradas"
                            : "Seleccione"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {fincas.map((f) => (
                    <SelectItem key={f.id_finca} value={String(f.id_finca)}>
                      {f.nombre}
                      {f.zonas_finca?.nombre ? ` — ${f.zonas_finca.nombre}` : ""}
                      {f.altura != null ? ` (${f.altura} msnm)` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {error("finca_id")}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Café recibido</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="varietal">Varietal</Label>
              <Input
                id="varietal"
                value={valores.varietal}
                onChange={(e) => cambiar("varietal", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cajuelas">Cajuelas</Label>
              <Input
                id="cajuelas"
                type="number"
                min={0}
                step="1"
                value={valores.cajuelas}
                onChange={(e) => cambiar("cajuelas", e.target.value)}
              />
              {error("cajuelas")}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cuartillos">Cuartillos</Label>
              <Input
                id="cuartillos"
                type="number"
                min={0}
                step="1"
                value={valores.cuartillos}
                onChange={(e) => cambiar("cuartillos", e.target.value)}
              />
              {error("cuartillos")}
            </div>

            <div className="space-y-1.5">
              <Label>Proceso</Label>
              <Select
                value={valores.proceso}
                onValueChange={(v) => cambiar("proceso", v ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin definir" />
                </SelectTrigger>
                <SelectContent>
                  {PROCESOS_BENEFICIO.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ph_miel">pH de miel</Label>
              <Input
                id="ph_miel"
                type="number"
                min={0}
                max={14}
                step="0.01"
                value={valores.ph_miel}
                onChange={(e) => cambiar("ph_miel", e.target.value)}
              />
              {error("ph_miel")}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Calidad y clasificación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {CAMPOS_PORCENTAJE.map(({ key, label }) => (
                <div key={key} className="space-y-1.5">
                  <Label htmlFor={key}>{label} (%)</Label>
                  <Input
                    id={key}
                    type="number"
                    min={0}
                    max={100}
                    step="0.1"
                    value={String(valores[key])}
                    onChange={(e) => cambiar(key, e.target.value)}
                    aria-invalid={Boolean(errores[key])}
                  />
                  {error(key)}
                </div>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="rango_objetivo">Rango objetivo</Label>
                <Input
                  id="rango_objetivo"
                  type="number"
                  min={0}
                  step="1"
                  value={valores.rango_objetivo}
                  onChange={(e) => cambiar("rango_objetivo", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rango_sobre_objetivo">Rango sobre objetivo</Label>
                <Input
                  id="rango_sobre_objetivo"
                  type="number"
                  min={0}
                  step="1"
                  value={valores.rango_sobre_objetivo}
                  onChange={(e) => cambiar("rango_sobre_objetivo", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rango">Rango</Label>
                <Input
                  id="rango"
                  type="number"
                  min={0}
                  step="1"
                  value={valores.rango}
                  onChange={(e) => cambiar("rango", e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-3 text-sm">
                <Checkbox
                  checked={valores.puro_impuro}
                  onCheckedChange={(v) => cambiar("puro_impuro", Boolean(v))}
                />
                Puro / impuro
              </label>
              <label className="flex items-center gap-3 text-sm">
                <Checkbox
                  checked={valores.limpio_sucio}
                  onCheckedChange={(v) => cambiar("limpio_sucio", Boolean(v))}
                />
                Limpio / sucio
              </label>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Link href="/beneficio/recibido">
            <Button type="button" variant="outline" disabled={enviando}>
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={enviando || cargandoCatalogos}>
            {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar recibido
          </Button>
        </div>
      </form>
    </div>
  );
}
