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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PorcentajeInput } from "@/components/ui/porcentaje-input";
import { ErroresRecibidoDialog } from "@/components/beneficio/errores-recibido-dialog";
import {
  crearRecibido,
  listarFincasDeProductor,
  listarProductores,
  type FincaResumen,
  type ProductorResumen,
} from "@/lib/api/beneficio";
import { type CrearRecibidoInput } from "@/lib/schemas/beneficio";
import { ProcesoSelect } from "@/components/beneficio/proceso-select";
import {
  CAMPOS_BENEFICIADO_HUMEDO,
  CAMPOS_DENSIDAD,
  CAMPOS_LIMPIEZA,
  CAMPOS_PRUEBAS_FISICAS,
} from "@/lib/beneficio/pruebas-recibido";
import { camposFaltantes } from "@/lib/beneficio/validar-recibido";
import { ApiError, detalleDeError } from "@/lib/api/http";

interface Valores {
  fecha_recibido: string;
  productor_id: string;
  finca_id: string;
  varietal: string;
  cajuelas: string;
  cuartillos: string;
  proceso: string;
  proceso_otro: string;
  porcentaje_flote: string;
  porcentaje_broca: string;
  porcentaje_vano: string;
  porcentaje_verde: string;
  porcentaje_secos: string;
  porcentaje_segundas: string;
  porcentaje_danos_mecanicos: string;
  porcentaje_pulpa_pergamino: string;
  porcentaje_pergamino_pulpa: string;
  densidad_fruta: string;
  densidad_pergamino_humedo: string;
  porcentaje_puro: string;
  porcentaje_impuro: string;
  porcentaje_limpio: string;
  porcentaje_sucio: string;
}

const hoy = () => {
  const fecha = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}`;
};

const VALORES_INICIALES: Valores = {
  fecha_recibido: hoy(),
  productor_id: "",
  finca_id: "",
  varietal: "",
  cajuelas: "",
  cuartillos: "",
  proceso: "",
  proceso_otro: "",
  porcentaje_flote: "",
  porcentaje_broca: "",
  porcentaje_vano: "",
  porcentaje_verde: "",
  porcentaje_secos: "",
  porcentaje_segundas: "",
  porcentaje_danos_mecanicos: "",
  porcentaje_pulpa_pergamino: "",
  porcentaje_pergamino_pulpa: "",
  densidad_fruta: "",
  densidad_pergamino_humedo: "",
  porcentaje_puro: "",
  porcentaje_impuro: "",
  porcentaje_limpio: "",
  porcentaje_sucio: "",
};

const ETIQUETAS_CAMPO: Record<string, string> = {
  productor_id: "Productor",
  finca_id: "Finca",
  zona_finca: "Zona de la finca",
  altura_finca: "Altura de la finca",
  varietal: "Varietal",
  cajuelas: "Cajuelas",
  cuartillos: "Cuartillos",
  proceso_otro: "Especifique el proceso",
};

export default function NuevoRecibidoPage() {
  const router = useRouter();
  const [valores, setValores] = useState<Valores>(VALORES_INICIALES);
  const [productores, setProductores] = useState<ProductorResumen[]>([]);
  const [fincas, setFincas] = useState<FincaResumen[]>([]);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [faltantes, setFaltantes] = useState<string[]>([]);
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

  const fincaSeleccionada = fincas.find((f) => String(f.id_finca) === valores.finca_id) ?? null;

  const numero = (texto: string) => (texto.trim() === "" ? null : Number(texto));

  const abrirFaltantes = (mensajes: string[]) => {
    setFaltantes(mensajes);
  };

  const enviar = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrores({});

    const finca = fincaSeleccionada
      ? { id_finca: fincaSeleccionada.id_finca, zona: fincaSeleccionada.zonas_finca?.nombre ?? null, altura: fincaSeleccionada.altura }
      : null;

    const faltan = camposFaltantes(valores, finca);
    if (faltan.length > 0) {
      const porCampo: Record<string, string> = {};
      for (const item of faltan) porCampo[item.campo] = item.mensaje;
      setErrores(porCampo);
      abrirFaltantes(faltan.map((item) => item.etiqueta));
      return;
    }

    setEnviando(true);

    const payload: CrearRecibidoInput = {
      fecha_recibido: valores.fecha_recibido || "",
      productor_id: Number(valores.productor_id),
      finca_id: Number(valores.finca_id),
      varietal: valores.varietal.trim(),
      cajuelas: Number(valores.cajuelas),
      cuartillos: Number(valores.cuartillos),
      proceso: valores.proceso ? (valores.proceso as CrearRecibidoInput["proceso"]) : null,
      proceso_otro: valores.proceso === "Otro" ? valores.proceso_otro.trim() : null,
      porcentaje_flote: numero(valores.porcentaje_flote),
      porcentaje_broca: numero(valores.porcentaje_broca),
      porcentaje_vano: numero(valores.porcentaje_vano),
      porcentaje_verde: numero(valores.porcentaje_verde),
      porcentaje_secos: numero(valores.porcentaje_secos),
      porcentaje_segundas: numero(valores.porcentaje_segundas),
      porcentaje_danos_mecanicos: numero(valores.porcentaje_danos_mecanicos),
      porcentaje_pulpa_pergamino: numero(valores.porcentaje_pulpa_pergamino),
      porcentaje_pergamino_pulpa: numero(valores.porcentaje_pergamino_pulpa),
      densidad_fruta: numero(valores.densidad_fruta),
      densidad_pergamino_humedo: numero(valores.densidad_pergamino_humedo),
      porcentaje_puro: numero(valores.porcentaje_puro),
      porcentaje_impuro: numero(valores.porcentaje_impuro),
      porcentaje_limpio: numero(valores.porcentaje_limpio),
      porcentaje_sucio: numero(valores.porcentaje_sucio),
    };

    try {
      const lote = await crearRecibido(payload);
      toast.success(`Lote ${lote.numero_lote} registrado`);
      router.push(`/beneficio/recibido/${lote.id_lote}`);
    } catch (error) {
      if (error instanceof ApiError) {
        const planos: Record<string, string> = {};
        const mensajes: string[] = [];
        for (const [campo, lista] of Object.entries(error.fieldErrors)) {
          const primero = lista[0];
          if (!primero) continue;
          planos[campo] = primero;
          mensajes.push(ETIQUETAS_CAMPO[campo] ?? primero);
        }
        setErrores(planos);
        if (mensajes.length > 0) {
          abrirFaltantes(mensajes);
        } else {
          abrirFaltantes([detalleDeError(error)]);
        }
      } else {
        abrirFaltantes([detalleDeError(error)]);
      }
      toast.error(detalleDeError(error));
      setEnviando(false);
    }
  };

  const error = (campo: keyof Valores) =>
    errores[campo as string] ? <p className="text-xs text-destructive">{errores[campo as string]}</p> : null;

  const renderPorcentajes = (campos: typeof CAMPOS_PRUEBAS_FISICAS, columnas: string) => (
    <CardContent className={`grid gap-4 ${columnas}`}>
      {campos.map(({ key, label }) => (
        <div key={key} className="space-y-1.5">
          <Label htmlFor={key}>{label}</Label>
          <PorcentajeInput id={key} value={String(valores[key as keyof Valores])} onChange={(v) => cambiar(key as keyof Valores, v)} aria-invalid={Boolean(errores[key])} />
          {error(key as keyof Valores)}
        </div>
      ))}
    </CardContent>
  );

  return (
    <div className="space-y-6 mt-6">
      <div className="flex items-center gap-4">
        <Link href="/beneficio/recibido">
          <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Nuevo Recibido de Café</h1>
          <p className="text-sm text-muted-foreground">Lote, recibo y factura se generan automáticamente.</p>
        </div>
      </div>

      <form onSubmit={enviar} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Identificación</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>N° de lote</Label>
              <Input value="Se generará automáticamente" readOnly />
            </div>
            <div className="space-y-1.5">
              <Label>N° de recibo</Label>
              <Input value="Se generará automáticamente" readOnly />
            </div>
            <div className="space-y-1.5">
              <Label>Factura</Label>
              <Input value="Se generará automáticamente (FC-00001)" readOnly />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fecha_recibido">Fecha de recibido</Label>
              <Input id="fecha_recibido" type="date" value={valores.fecha_recibido} onChange={(e) => cambiar("fecha_recibido", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Productor y finca</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Productor <span className="text-destructive">*</span></Label>
              <Select value={valores.productor_id} onValueChange={(v) => seleccionarProductor(v ?? "")} disabled={cargandoCatalogos}>
                <SelectTrigger aria-invalid={Boolean(errores["productor_id"])} aria-required="true"><SelectValue placeholder={cargandoCatalogos ? "Cargando..." : "Seleccione"} /></SelectTrigger>
                <SelectContent>
                  {productores.map((p) => <SelectItem key={p.id_productor} value={String(p.id_productor)}>{p.nombre_completo}</SelectItem>)}
                </SelectContent>
              </Select>
              {error("productor_id")}
            </div>
            <div className="space-y-1.5">
              <Label>Finca <span className="text-destructive">*</span></Label>
              <Select value={valores.finca_id} onValueChange={(v) => cambiar("finca_id", v ?? "")} disabled={!valores.productor_id || cargandoFincas}>
                <SelectTrigger aria-invalid={Boolean(errores["finca_id"])} aria-required="true"><SelectValue placeholder={!valores.productor_id ? "Elija un productor" : cargandoFincas ? "Cargando..." : fincas.length === 0 ? "Sin fincas registradas" : "Seleccione"} /></SelectTrigger>
                <SelectContent>
                  {fincas.map((f) => (
                    <SelectItem key={f.id_finca} value={String(f.id_finca)}>
                      {f.nombre}{f.zonas_finca?.nombre ? ` — ${f.zonas_finca.nombre}` : ""}{f.altura != null ? ` (${f.altura} msnm)` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {error("finca_id")}
            </div>
            <div className="space-y-1.5">
              <Label>Zona de la finca</Label>
              <Input value={fincaSeleccionada?.zonas_finca?.nombre ?? ""} placeholder="Se completa al elegir finca" readOnly aria-invalid={Boolean(errores["zona_finca"])} />
              {error("zona_finca" as keyof Valores)}
            </div>
            <div className="space-y-1.5">
              <Label>Altura de la finca (msnm)</Label>
              <Input value={fincaSeleccionada?.altura != null ? String(fincaSeleccionada.altura) : ""} placeholder="Se completa al elegir finca" readOnly aria-invalid={Boolean(errores["altura_finca"])} />
              {error("altura_finca" as keyof Valores)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Café recibido</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="varietal">Varietal <span className="text-destructive">*</span></Label>
              <Input id="varietal" value={valores.varietal} onChange={(e) => cambiar("varietal", e.target.value)} aria-invalid={Boolean(errores["varietal"])} aria-required="true" />
              {error("varietal")}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cajuelas">Cajuelas <span className="text-destructive">*</span></Label>
              <Input id="cajuelas" type="number" min={0} step="1" value={valores.cajuelas} onChange={(e) => cambiar("cajuelas", e.target.value)} aria-invalid={Boolean(errores["cajuelas"])} aria-required="true" />
              {error("cajuelas")}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cuartillos">Cuartillos <span className="text-destructive">*</span></Label>
              <Input id="cuartillos" type="number" min={0} step="1" value={valores.cuartillos} onChange={(e) => cambiar("cuartillos", e.target.value)} aria-invalid={Boolean(errores["cuartillos"])} aria-required="true" />
              {error("cuartillos")}
            </div>
            <ProcesoSelect
              value={valores.proceso}
              onChange={(v) => cambiar("proceso", v)}
              procesoOtro={valores.proceso_otro}
              onProcesoOtroChange={(v) => cambiar("proceso_otro", v)}
              error={errores["proceso"]}
              errorOtro={errores["proceso_otro"]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Pruebas físicas de recibido (%)</CardTitle></CardHeader>
          {renderPorcentajes(CAMPOS_PRUEBAS_FISICAS, "sm:grid-cols-3 lg:grid-cols-5")}
        </Card>

        <Card>
          <CardHeader><CardTitle>Beneficiado húmedo (%)</CardTitle></CardHeader>
          {renderPorcentajes(CAMPOS_BENEFICIADO_HUMEDO, "sm:grid-cols-2 lg:grid-cols-4")}
        </Card>

        <Card>
          <CardHeader><CardTitle>Densidad</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {CAMPOS_DENSIDAD.map(({ key, label, unidad }) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={key}>{label} ({unidad})</Label>
                <Input id={key} type="number" step="0.001" min={0} value={String(valores[key as keyof Valores])} onChange={(e) => cambiar(key as keyof Valores, e.target.value)} />
                {error(key as keyof Valores)}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Limpieza (%)</CardTitle></CardHeader>
          {renderPorcentajes(CAMPOS_LIMPIEZA, "sm:grid-cols-2 lg:grid-cols-4")}
        </Card>

        <div className="flex justify-end gap-2">
          <Link href="/beneficio/recibido"><Button type="button" variant="outline" disabled={enviando}>Cancelar</Button></Link>
          <Button type="submit" disabled={enviando || cargandoCatalogos}>
            {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar recibido
          </Button>
        </div>
      </form>

      <ErroresRecibidoDialog open={faltantes.length > 0} onOpenChange={(abierto) => !abierto && setFaltantes([])} mensajes={faltantes} />
    </div>
  );
}
