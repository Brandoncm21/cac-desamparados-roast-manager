"use client";

import type { jsPDF } from "jspdf";

const W = 210;
const M = 10;

/** Datos mínimos para dibujar el encabezado institucional de un comprobante PDF. */
export interface EncabezadoInstitucionalProps {
  /** Instancia de jsPDF donde dibujar. */
  pdf: jsPDF;
  /** Título del documento, ej. "SCACR - Factura de Orden de Trabajo". */
  titulo: string;
  /** Posición Y inicial (mm). Default: 5. */
  y?: number;
  /** Logo en base64 (data URL). Opcional; si falta, el comprobante sigue siendo válido. */
  logoB64?: string;
}

/**
 * Dibuja el encabezado institucional compartido por los comprobantes PDF
 * (facturas de orden y perfiles de tueste):
 *
 * - Logo del Centro Agrícola Cantonal de Desamparados (CACD)
 * - Razón social
 * - Título del documento ("SCACR - ...")
 * - Línea separadora
 *
 * Devuelve la siguiente posición Y disponible (mm).
 */
export function dibujarEncabezadoInstitucional({
  pdf,
  titulo,
  y = 5,
  logoB64,
}: EncabezadoInstitucionalProps): number {
  const offset = logoB64 ? 25 : 0;

  if (logoB64) {
    try {
      pdf.addImage(logoB64, "JPEG", M, y, 22, 22);
    } catch {
      // El comprobante sigue siendo válido sin logo.
    }
  }

  pdf.setFontSize(13);
  pdf.setFont("helvetica", "bold");
  pdf.text("Centro Agrícola Cantonal de Desamparados (CACD)", M + offset, y + 10);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(titulo, M + offset, y + 17);
  pdf.setDrawColor(0);
  pdf.line(M, y + 24, W - M, y + 24);

  return y + 30;
}
