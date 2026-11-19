"use client";

import type { RecibidoDetalle } from "@/lib/api/beneficio";

function v(x: unknown): string {
  if (x == null || x === "") return "—";
  return String(x);
}

function n(x: unknown): string {
  if (x == null || x === "") return "—";
  return String(x);
}

export async function generarPDFRecibo(lote: RecibidoDetalle): Promise<void> {
  const { jsPDF } = await import("jspdf");

  const pdf = new jsPDF("p", "mm", "a4");
  const W = 210;
  const M = 10;

  let logoB64 = "";
  try {
    const logoResp = await fetch("/logo-cacd.jpg");
    const logoBlob = await logoResp.blob();
    logoB64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(logoBlob);
    });
  } catch {
    logoB64 = "";
  }

  let y = 5;

  if (logoB64) {
    try {
      pdf.addImage(logoB64, "JPEG", M, y, 22, 22);
    } catch {
      // ignore logo errors
    }
  }

  pdf.setFontSize(13);
  pdf.setFont("helvetica", "bold");
  pdf.text("Centro Agrícola Cantonal de Desamparados (CACD)", M + (logoB64 ? 25 : 0), y + 10);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text("SCACR - Comprobante de Recibido de Café", M + (logoB64 ? 25 : 0), y + 17);
  pdf.setDrawColor(0);
  pdf.line(M, y + 24, W - M, y + 24);
  y += 30;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text("DATOS DEL RECIBO", M, y);
  y += 5;
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Recibo #: ${v(lote.numero_recibo)}    Lote #: ${v(lote.numero_lote)}`, M, y);
  y += 4;
  pdf.text(`Fecha: ${new Date(lote.fecha_recibido).toLocaleDateString("es-CR")}    Factura: ${v(lote.factura)}`, M, y);
  y += 7;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text("PRODUCTOR Y FINCA", M, y);
  y += 5;
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Productor: ${v(lote.productores?.nombre_completo)}`, M, y);
  y += 4;
  const zona = lote.zona_finca ?? lote.fincas?.zonas_finca?.nombre ?? null;
  const altura = lote.altura_finca ?? lote.fincas?.altura ?? null;
  pdf.text(
    `Finca: ${v(lote.fincas?.nombre)}    Zona: ${v(zona)}    Altura: ${altura != null ? `${altura} msnm` : "—"}`,
    M,
    y
  );
  y += 7;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text("CAFÉ RECIBIDO", M, y);
  y += 5;
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.text(
    `Varietal: ${v(lote.varietal)}    Proceso: ${v(lote.proceso)}${lote.proceso_otro ? ` (${lote.proceso_otro})` : ""}`,
    M,
    y
  );
  y += 4;
  pdf.text(`Cajuelas: ${v(lote.cajuelas)}    Cuartillos: ${v(lote.cuartillos)}`, M, y);
  y += 7;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text("PRUEBAS FÍSICAS (%)", M, y);
  y += 5;
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Flote: ${n(lote.porcentaje_flote)}%    Broca: ${n(lote.porcentaje_broca)}%    Vano: ${n(lote.porcentaje_vano)}%`, M, y);
  y += 4;
  pdf.text(`Verde: ${n(lote.porcentaje_verde)}%    Secos: ${n(lote.porcentaje_secos)}%`, M, y);
  y += 7;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text("BENEFICIADO HÚMEDO (%)", M, y);
  y += 5;
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Segundas: ${n(lote.porcentaje_segundas)}%    Daños mecánicos: ${n(lote.porcentaje_danos_mecanicos)}%`, M, y);
  y += 4;
  pdf.text(`Pulpa pergamino: ${n(lote.porcentaje_pulpa_pergamino)}%    Pergamino en pulpa: ${n(lote.porcentaje_pergamino_pulpa)}%`, M, y);
  y += 7;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text("DENSIDAD", M, y);
  y += 5;
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Fruta: ${lote.densidad_fruta ?? "—"} g/mL    Pergamino húmedo: ${lote.densidad_pergamino_humedo ?? "—"} g/mL`, M, y);
  y += 7;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text("LIMPIEZA (%)", M, y);
  y += 5;
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Puro: ${n(lote.porcentaje_puro)}%    Impuro: ${n(lote.porcentaje_impuro)}%`, M, y);
  y += 4;
  pdf.text(`Limpio: ${n(lote.porcentaje_limpio)}%    Sucio: ${n(lote.porcentaje_sucio)}%`, M, y);
  y += 7;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text("ESTADO DEL LOTE", M, y);
  y += 5;
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Estado comercial: ${lote.estado_lote}    Etapa: ${lote.enproceso}`, M, y);

  pdf.save(`recibo-${lote.numero_recibo || lote.numero_lote}.pdf`);
}
