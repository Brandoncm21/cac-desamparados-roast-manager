"use client";

import type { jsPDF } from "jspdf";
import type { OrdenDetalle } from "@/app/(dashboard)/ordenes/[id]/types";
import { formatearColones, formatearPeso } from "@/lib/format";
import { dibujarEncabezadoInstitucional } from "./header";

const W = 210;
const M = 10;
const PAGE_BOTTOM = 282;

const texto = (valor: string | number | null | undefined) =>
  valor == null || valor === "" ? "—" : String(valor);

interface FilaFactura {
  descripcion: string;
  peso: number | null;
  precioKg: number | null;
  empaque: number | null;
  total: number;
}

/** Descarga la factura de la orden en PDF (diseño unificado CACD). */
export async function generarPDFFactura(
  orden: OrdenDetalle,
  total: number
): Promise<void> {
  const pdf = await buildFacturaPDF(orden, total);
  pdf.save(`factura-${orden.numero_factura || orden.id_orden}.pdf`);
}

/** Imprime la factura de la orden usando el mismo documento PDF (diseño unificado CACD). */
export async function imprimirFactura(
  orden: OrdenDetalle,
  total: number
): Promise<void> {
  const pdf = await buildFacturaPDF(orden, total);
  const blob = pdf.output("blob");
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (!win) {
    URL.revokeObjectURL(url);
    throw new Error("No se pudo abrir el documento para imprimir");
  }

  // El visor de PDF necesita cargar antes de invocar print(); se dispara al
  // terminar la carga o, como respaldo, tras un breve margen. Solo una vez.
  let impreso = false;
  const imprimir = () => {
    if (impreso) return;
    impreso = true;
    try {
      win.focus();
      win.print();
    } catch {
      // Si el navegador bloquea la impresión automática, el usuario aún puede
      // imprimir manualmente desde la pestaña abierta.
    }
  };

  win.onload = imprimir;
  setTimeout(imprimir, 1000);
}

/** Construye el documento PDF de la factura (compartido por descargar e imprimir). */
async function buildFacturaPDF(
  orden: OrdenDetalle,
  total: number
): Promise<jsPDF> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF("p", "mm", "a4");

  let logoB64 = "";
  try {
    const resp = await fetch("/logo-cacd.jpg");
    const blob = await resp.blob();
    logoB64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    logoB64 = "";
  }

  let y = dibujarEncabezadoInstitucional({
    pdf,
    titulo: "SCACR - Factura de Orden de Trabajo",
    logoB64,
  });

  const seccion = (titulo: string) => {
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text(titulo, M, y);
    y += 5;
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
  };

  const asegurarEspacio = (necesario: number) => {
    if (y + necesario > PAGE_BOTTOM) {
      pdf.addPage();
      y = 15;
    }
  };

  // ---- DATOS DE LA ORDEN ----
  seccion("DATOS DE LA ORDEN");
  pdf.text(
    `Orden #: ${texto(orden.numero_factura)}    Fecha: ${texto(orden.fecha_orden)}    Estado: ${texto(orden.estado_orden)}`,
    M,
    y
  );
  y += 4;
  pdf.text(
    `Hora de cierre: ${texto(orden.hora_cierre)}    Responsable: ${texto(
      orden.empleado_recibe?.nombre
    )}`,
    M,
    y
  );
  y += 7;

  // ---- CLIENTE ----
  seccion("CLIENTE");
  pdf.text(`Nombre: ${texto(orden.clientes?.nombre_completo)}`, M, y);
  y += 4;
  pdf.text(`Teléfono: ${texto(orden.clientes?.telefono)}`, M, y);
  y += 7;

  // ---- FINCA Y PRODUCTO ----
  seccion("FINCA Y PRODUCTO");
  const finca = orden.fincas?.nombre
    ? `${orden.fincas.nombre}${orden.fincas.altura != null ? ` (${orden.fincas.altura} msnm)` : ""}`
    : "—";
  const lotes = orden.lotes?.length
    ? orden.lotes
        .map((lote) => `${lote.numero_lote} (${lote.enproceso})`)
        .join(", ")
    : "—";
  pdf.text(`Finca: ${finca}`, M, y);
  y += 4;
  pdf.text(
    `Producto: ${texto(orden.descripcion_producto)}    Proceso: ${texto(
      orden.proceso_cafe
    )}`,
    M,
    y
  );
  y += 4;
  pdf.text(
    `Humedad: ${orden.porcentaje_humedad_entrada != null ? `${orden.porcentaje_humedad_entrada}%` : "—"}`,
    M,
    y
  );
  y += 4;
  const lotesLineas = pdf.splitTextToSize(`Lotes: ${lotes}`, W - 2 * M);
  pdf.text(lotesLineas, M, y);
  y += lotesLineas.length * 3.5 + 4;

  // ---- DETALLE DE SERVICIOS ----
  seccion("DETALLE DE SERVICIOS");
  const columnas = {
    descripcion: M,
    peso: 105,
    precioKg: 137,
    empaque: 169,
    total: 200,
  };

  const encabezadoTabla = () => {
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "bold");
    pdf.text("Servicio / Etapa", columnas.descripcion, y);
    pdf.text("Peso", columnas.peso, y, { align: "right" });
    pdf.text("Precio/kg", columnas.precioKg, y, { align: "right" });
    pdf.text("Empaque", columnas.empaque, y, { align: "right" });
    pdf.text("Total", columnas.total, y, { align: "right" });
    y += 4;
    pdf.setFont("helvetica", "normal");
  };

  const filas = construirFilas(orden);

  if (filas.length === 0) {
    pdf.setFontSize(8);
    pdf.text("Sin servicios registrados.", M, y);
    y += 6;
  } else {
    encabezadoTabla();
    for (const fila of filas) {
      const descripcionLineas = pdf.splitTextToSize(fila.descripcion, 80);
      const alto = Math.max(4, descripcionLineas.length * 3.6) + 1;

      if (y + alto > PAGE_BOTTOM) {
        pdf.addPage();
        y = 15;
        encabezadoTabla();
      }

      pdf.setFontSize(8);
      pdf.text(descripcionLineas, columnas.descripcion, y);
      pdf.text(formatearPeso(fila.peso), columnas.peso, y, { align: "right" });
      pdf.text(formatearColones(fila.precioKg), columnas.precioKg, y, {
        align: "right",
      });
      pdf.text(formatearColones(fila.empaque), columnas.empaque, y, {
        align: "right",
      });
      pdf.text(formatearColones(fila.total), columnas.total, y, {
        align: "right",
      });
      y += alto;
    }
  }

  // ---- TOTAL ACUMULADO ----
  asegurarEspacio(14);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.text("TOTAL ACUMULADO", M, y + 4);
  pdf.text(formatearColones(total), columnas.total, y + 4, { align: "right" });
  y += 12;

  // ---- ESPECIFICACIONES ----
  const especificaciones = orden.especificaciones_orden;
  if (
    especificaciones &&
    (especificaciones.tipo_tueste ||
      especificaciones.tipo_molienda ||
      especificaciones.tipo_empaque ||
      especificaciones.observaciones)
  ) {
    asegurarEspacio(20);
    seccion("ESPECIFICACIONES");
    pdf.setFontSize(8);
    pdf.text(`Tueste: ${texto(especificaciones.tipo_tueste)}`, M, y);
    y += 4;
    pdf.text(`Molienda: ${texto(especificaciones.tipo_molienda)}`, M, y);
    y += 4;
    pdf.text(`Empaque: ${texto(especificaciones.tipo_empaque)}`, M, y);
    y += 4;
    const obs = pdf.splitTextToSize(
      `Observaciones: ${texto(especificaciones.observaciones)}`,
      W - 2 * M
    );
    pdf.text(obs, M, y);
    y += obs.length * 3.6 + 4;
  }

  // ---- FOOTER ----
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "normal");
  pdf.setDrawColor(0);
  pdf.line(M, 286, W - M, 286);
  pdf.text(
    "Documento generado por SCACR - Sistema de Gestión de Torrefacción",
    W / 2,
    291,
    { align: "center" }
  );

  return pdf;
}

/**
 * Construye las filas de la factura desde los pasos COMPLETADOS (fuente de
 * verdad) con fallback a `servicios_ejecutados` (legacy) cuando no haya
 * pasos completados.
 */
function construirFilas(orden: OrdenDetalle): FilaFactura[] {
  const filas: FilaFactura[] = [];
  const completados = orden.orden_pasos.filter((p) => p.estado === "COMPLETADO");

  if (completados.length > 0) {
    for (const paso of completados) {
      filas.push({
        descripcion: paso.servicios_maestro?.nombre
          ? paso.servicios_maestro.nombre
          : texto(paso.servicios_maestro?.tipo),
        peso: paso.peso_facturable_kg ?? paso.peso_inicial_kg,
        precioKg: paso.snapshot_precio_kg,
        empaque: paso.snapshot_precio_empaque,
        total: Number(paso.costo_total_paso) || 0,
      });
    }
    return filas;
  }

  // Fallback legacy: servicios_ejecutados.
  for (const servicio of orden.servicios_ejecutados) {
    filas.push({
      descripcion: servicio.empaques?.nombre
        ? `${servicio.tipo_servicio} · ${servicio.empaques.nombre}`
        : servicio.tipo_servicio,
      peso: servicio.peso_kg ?? servicio.peso_inicial,
      precioKg: servicio.snapshot_precio_por_kg,
      empaque: servicio.snapshot_precio_empaque,
      total: Number(servicio.linea_total) || Number(servicio.precio) || 0,
    });
  }
  return filas;
}
