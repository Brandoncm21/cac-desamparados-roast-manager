"use client";

import { useCallback, useRef } from "react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import type {
  AjusteLocal,
  HitoRecord,
  MetricaLocal,
  PerfilTueste,
} from "../types";

interface UsePDFProps {
  perfilId: number;
  perfil: PerfilTueste | null;
  metricas: MetricaLocal[];
  hitos: HitoRecord[];
  ajustes: AjusteLocal[];
  ctxNombreCafe: string;
  ctxTempSala: string;
  ctxHumSala: string;
  numeroFactura?: string;
  nombreTostador?: string;
}

export function usePDF({
  perfilId,
  perfil,
  metricas,
  hitos,
  ajustes,
  ctxNombreCafe,
  ctxTempSala,
  ctxHumSala,
  numeroFactura,
  nombreTostador,
}: UsePDFProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  const calcularDiferencia = (antes: string, despues: string): string => {
    const a = Number(antes);
    const d = Number(despues);
    if (!a || !d || a === 0) return "-";
    return (((a - d) / a) * 100).toFixed(2);
  };

  const descargarPDF = useCallback(async () => {
    const pdf = new jsPDF("p", "mm", "a4");
    const W = 210;
    const M = 10;
    const CW = W - 2 * M;

    const logoResp = await fetch("/logo-cacd.jpg");
    const logoBlob = await logoResp.blob();
    const logoB64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(logoBlob);
    });

    let y = 5;

    pdf.addImage(logoB64, "JPEG", M, y, 22, 22);
    pdf.setFontSize(13);
    pdf.setFont("helvetica", "bold");
    pdf.text("Centro Agrícola Cantonal de Desamparados (CACD)", M + 25, y + 10);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text("SCACR - Registro de Torrefacción", M + 25, y + 17);
    pdf.setDrawColor(0);
    pdf.line(M, y + 24, W - M, y + 24);
    y += 30;

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("DATOS DEL PERFIL", M, y);
    y += 5;

    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.text(
      `Perfil #: ${perfilId}    Fecha: ${perfil?.fecha_tueste || "-"}    Factura: ${numeroFactura || "-"}`,
      M,
      y
    );
    y += 4;
    pdf.text(
      `Café: ${ctxNombreCafe || "-"}    Lote: ${perfil?.numero_lote || "-"}`,
      M,
      y
    );
    y += 4;
    pdf.text(
      `Tostador: ${nombreTostador || "-"}    Temp. Sala: ${ctxTempSala || "-"}°C    Humedad: ${ctxHumSala || "-"}%`,
      M,
      y
    );
    y += 7;

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("RENDIMIENTOS / MERMAS", M, y);
    y += 5;

    pdf.setFontSize(7);
    pdf.setFont("helvetica", "bold");
    pdf.text("Métrica", M, y);
    pdf.text("Antes", M + 40, y);
    pdf.text("Después", M + 70, y);
    pdf.text("% Dif.", M + 105, y);
    y += 4;

    pdf.setFont("helvetica", "normal");
    metricas.forEach((m) => {
      pdf.text(m.tipo_metrica, M, y);
      pdf.text(m.valor_antes || "-", M + 40, y);
      pdf.text(m.valor_despues || "-", M + 70, y);
      const diff = calcularDiferencia(m.valor_antes, m.valor_despues);
      pdf.text(diff !== "-" ? `${diff}%` : "-", M + 105, y);
      y += 4;
    });
    y += 4;

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("HITOS TÉRMICOS", M, y);
    y += 5;

    pdf.setFontSize(7);
    pdf.setFont("helvetica", "bold");
    pdf.text("Hito", M, y);
    pdf.text("Tiempo", M + 70, y);
    pdf.text("Temp", M + 110, y);
    y += 4;

    pdf.setFont("helvetica", "normal");
    hitos.forEach((h) => {
      pdf.text(h.tipo_hito, M, y);
      pdf.text(`${h.tiempo_min} min`, M + 70, y);
      pdf.text(`${h.temperatura}°C`, M + 110, y);
      y += 4;
    });
    y += 4;

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("CURVA DE TUESTE", M, y);
    y += 3;

    if (chartRef.current) {
      try {
        const chartImg = await toPng(chartRef.current, {
          quality: 0.95,
          pixelRatio: 2,
          backgroundColor: "#ffffff",
          width: chartRef.current.offsetWidth,
          height: chartRef.current.offsetHeight,
        });
        const chartH = 55;
        pdf.addImage(chartImg, "PNG", M, y, CW, chartH);
        y += chartH + 4;
      } catch {
        pdf.text("(Gráfico no disponible)", M, y);
        y += 8;
      }
    }

    if (ajustes.length > 0) {
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text("AJUSTES DE MÁQUINA", M, y);
      y += 5;

      pdf.setFontSize(7);
      pdf.setFont("helvetica", "bold");
      pdf.text("Minuto", M, y);
      pdf.text("Temp", M + 35, y);
      pdf.text("Llama", M + 65, y);
      pdf.text("Aire", M + 95, y);
      y += 4;

      pdf.setFont("helvetica", "normal");
      ajustes.forEach((a) => {
        pdf.text(a.tiempo || "-", M, y);
        pdf.text(a.temperatura_ajuste ? `${a.temperatura_ajuste}°C` : "-", M + 35, y);
        pdf.text(a.llama ? `${a.llama}%` : "-", M + 65, y);
        pdf.text(a.aire ? `${a.aire}%` : "-", M + 95, y);
        y += 4;
      });
    }

    pdf.save(`perfil-tueste-${perfilId}.pdf`);
  }, [
    perfilId,
    perfil,
    metricas,
    hitos,
    ajustes,
    ctxNombreCafe,
    ctxTempSala,
    ctxHumSala,
    numeroFactura,
    nombreTostador,
  ]);

  return { chartRef, descargarPDF };
}
