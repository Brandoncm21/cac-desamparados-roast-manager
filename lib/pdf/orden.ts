"use client";

import type { OrdenDetalle } from "@/app/(dashboard)/ordenes/[id]/types";

const dinero = (valor: number | string | null | undefined) =>
  `CRC ${(Number(valor) || 0).toFixed(2)}`;

const texto = (valor: string | number | null | undefined) =>
  valor == null || valor === "" ? "—" : String(valor);

const peso = (valor: number | string | null | undefined) =>
  valor == null || valor === "" ? "—" : `${Number(valor).toFixed(2)} kg`;

/**
 * Factura/orden en PDF con el mismo encabezado institucional y estructura
 * tipográfica de los comprobantes de perfiles y recibido.
 */
export async function generarPDFFactura(
  orden: OrdenDetalle,
  total: number
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF("p", "mm", "a4");
  const W = 210;
  const M = 10;
  const PAGE_BOTTOM = 282;

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

  let y = 5;

  if (logoB64) {
    try {
      pdf.addImage(logoB64, "JPEG", M, y, 22, 22);
    } catch {
      // La factura sigue siendo válida sin logo.
    }
  }

  const offset = logoB64 ? 25 : 0;
  pdf.setFontSize(13);
  pdf.setFont("helvetica", "bold");
  pdf.text("Centro Agrícola Cantonal de Desamparados (CACD)", M + offset, y + 10);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text("SCACR - Factura de Orden de Trabajo", M + offset, y + 17);
  pdf.setDrawColor(0);
  pdf.line(M, y + 24, W - M, y + 24);
  y += 32;

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

  seccion("DATOS DE LA ORDEN");
  pdf.text(
    `Orden #: ${texto(orden.numero_factura)}    Fecha: ${texto(orden.fecha_orden)}    Estado: ${texto(orden.estado_orden)}`,
    M,
    y
  );
  y += 4;
  pdf.text(
    `Hora de cierre: ${texto(orden.hora_cierre)}    Responsable: ${texto(orden.empleado_recibe?.nombre)}`,
    M,
    y
  );
  y += 7;

  seccion("CLIENTE");
  pdf.text(`Nombre: ${texto(orden.clientes?.nombre_completo)}`, M, y);
  y += 4;
  pdf.text(`Teléfono: ${texto(orden.clientes?.telefono)}`, M, y);
  y += 7;

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
    `Producto: ${texto(orden.descripcion_producto)}    Proceso: ${texto(orden.proceso_cafe)}`,
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
    pdf.text("Servicio / Empaque", columnas.descripcion, y);
    pdf.text("Peso", columnas.peso, y, { align: "right" });
    pdf.text("Precio/kg", columnas.precioKg, y, { align: "right" });
    pdf.text("Empaque", columnas.empaque, y, { align: "right" });
    pdf.text("Total", columnas.total, y, { align: "right" });
    y += 4;
    pdf.setFont("helvetica", "normal");
  };

  encabezadoTabla();

  if (orden.servicios_ejecutados.length === 0) {
    pdf.setFontSize(8);
    pdf.text("Sin servicios registrados.", M, y);
    y += 6;
  }

  for (const servicio of orden.servicios_ejecutados) {
    const descripcion = servicio.empaques?.nombre
      ? `${servicio.tipo_servicio} · ${servicio.empaques.nombre}`
      : servicio.tipo_servicio;
    const lineas = pdf.splitTextToSize(descripcion, 80);
    const alto = Math.max(4, lineas.length * 3.6) + 1;

    if (y + alto > PAGE_BOTTOM) {
      pdf.addPage();
      y = 15;
      encabezadoTabla();
    }

    pdf.setFontSize(8);
    pdf.text(lineas, columnas.descripcion, y);
    pdf.text(peso(servicio.peso_kg ?? servicio.peso_inicial), columnas.peso, y, {
      align: "right",
    });
    pdf.text(dinero(servicio.snapshot_precio_por_kg), columnas.precioKg, y, {
      align: "right",
    });
    pdf.text(dinero(servicio.snapshot_precio_empaque), columnas.empaque, y, {
      align: "right",
    });
    pdf.text(
      dinero(servicio.linea_total ?? servicio.precio),
      columnas.total,
      y,
      { align: "right" }
    );
    y += alto;
  }

  asegurarEspacio(14);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.text("TOTAL ACUMULADO", M, y + 4);
  pdf.text(dinero(total), columnas.total, y + 4, { align: "right" });
  y += 12;

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

  pdf.save(`factura-${orden.numero_factura || orden.id_orden}.pdf`);
}
