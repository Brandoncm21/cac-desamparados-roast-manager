import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EstadoBadge } from "@/components/ui/estado-badge";

describe("<EstadoBadge />", () => {
  it("debería mostrar la etiqueta legible del estado", () => {
    render(<EstadoBadge estado="Completado" />);

    expect(screen.getByText("Completado")).toBeInTheDocument();
  });

  it("debería aplicar la clase de color del estado", () => {
    render(<EstadoBadge estado="Cancelado" familia="orden" />);

    expect(screen.getByText("Cancelado")).toHaveClass("bg-red-100", "text-red-800");
  });

  it("debería traducir un estado de paso a su etiqueta", () => {
    render(<EstadoBadge estado="OMITIDO" familia="paso" />);

    expect(screen.getByText("Omitido")).toBeInTheDocument();
  });

  it("debería degradar a neutro con un estado desconocido", () => {
    render(<EstadoBadge estado="Desconocido" familia="lote" />);

    const badge = screen.getByText("Desconocido");
    expect(badge).toHaveClass("bg-gray-100", "text-gray-800");
  });

  it("debería permitir clases adicionales", () => {
    render(<EstadoBadge estado="Pendiente" className="ml-2" />);

    expect(screen.getByText("Pendiente")).toHaveClass("ml-2");
  });
});
