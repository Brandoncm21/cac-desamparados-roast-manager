import { describe, it, expect } from "vitest";
import {
  camposOpcionalesVacios,
  validarOrdenParaConfirmar,
  type FlagsServicios,
} from "../services/orden-validacion";

const SIN_FLAGS: FlagsServicios = { hayTueste: false, hayMolido: false, hayEmpaque: false };

describe("lib/services/orden-validacion", () => {
  describe("validarOrdenParaConfirmar", () => {
    const completo = {
      id_cliente: 5,
      servicios: [{ servicio_id: 3, tipo_servicio: "Tueste" }],
      id_empleado_recibe: 2,
    };

    it("debería aceptar una orden con cliente, servicios y responsable", () => {
      expect(validarOrdenParaConfirmar(completo)).toBeNull();
    });

    it("debería exigir el cliente", () => {
      expect(validarOrdenParaConfirmar({ ...completo, id_cliente: 0 })).toEqual({
        campo: "id_cliente",
        mensaje: "Debe seleccionar un cliente",
      });
    });

    it("debería exigir al menos un servicio", () => {
      expect(validarOrdenParaConfirmar({ ...completo, servicios: [] })).toEqual({
        campo: "servicios",
        mensaje: "Agregue al menos un servicio",
      });
    });

    it("debería exigir el responsable", () => {
      expect(
        validarOrdenParaConfirmar({ ...completo, id_empleado_recibe: undefined })
      ).toEqual({
        campo: "id_empleado_recibe",
        mensaje: "Debe seleccionar un responsable",
      });
    });

    it("debería reportar el cliente primero cuando faltan varios campos", () => {
      const resultado = validarOrdenParaConfirmar({
        id_cliente: null,
        servicios: [],
        id_empleado_recibe: null,
      });

      expect(resultado?.campo).toBe("id_cliente");
    });
  });

  describe("camposOpcionalesVacios", () => {
    it("debería listar los campos generales cuando no hay servicios especiales", () => {
      expect(camposOpcionalesVacios({}, SIN_FLAGS)).toEqual([
        "Proceso de café",
        "Descripción del producto",
        "Observaciones",
      ]);
    });

    it("debería pedir el tipo de tueste cuando se contrató tueste", () => {
      expect(
        camposOpcionalesVacios({}, { ...SIN_FLAGS, hayTueste: true })
      ).toContain("Tipo de tueste");
    });

    it("debería pedir la molienda solo si hay tueste y molido", () => {
      const conMolido = camposOpcionalesVacios(
        {},
        { ...SIN_FLAGS, hayTueste: true, hayMolido: true }
      );
      const sinMolido = camposOpcionalesVacios({}, { ...SIN_FLAGS, hayTueste: true });

      expect(conMolido).toContain("Tipo de molienda");
      expect(sinMolido).not.toContain("Tipo de molienda");
    });

    it("debería pedir el tipo de empaque solo si hay empaque", () => {
      expect(camposOpcionalesVacios({}, { ...SIN_FLAGS, hayEmpaque: true })).toContain(
        "Tipo de empaque"
      );
    });

    it("debería devolver una lista vacía con todo completo", () => {
      expect(
        camposOpcionalesVacios(
          {
            proceso_cafe: "Lavado",
            descripcion_producto: "Café de altura",
            tipo_tueste: "Medio",
            tipo_molienda: "Media",
            tipo_empaque: "Bolsa",
            observaciones: "Sin novedad",
          },
          { hayTueste: true, hayMolido: true, hayEmpaque: true }
        )
      ).toEqual([]);
    });

    it("debería tratar los textos en blanco como vacíos", () => {
      expect(
        camposOpcionalesVacios(
          { proceso_cafe: "   ", descripcion_producto: "", observaciones: "ok" },
          SIN_FLAGS
        )
      ).toEqual(["Proceso de café", "Descripción del producto"]);
    });
  });
});
