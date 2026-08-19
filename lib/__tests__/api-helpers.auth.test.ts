import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { AppError, ERROR_CODES } from "@/lib/error-handler";
import { requireAuth, requireRole } from "@/lib/api-helpers";

const mockedCreateClient = vi.mocked(createClient);

function buildSupabaseMock({
  user,
  empleado,
  userError,
  empleadoError,
}: {
  user?: { id: string } | null;
  empleado?: { rol: string } | null;
  userError?: { message: string } | null;
  empleadoError?: { message: string } | null;
}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: user ?? null },
        error: userError ?? null,
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: empleado ?? null,
        error: empleadoError ?? null,
      }),
    }),
  };
}

beforeEach(() => {
  mockedCreateClient.mockReset();
});

describe("requireAuth", () => {
  it("lanza AppError 401 si no hay usuario autenticado", async () => {
    mockedCreateClient.mockResolvedValue(
      buildSupabaseMock({ user: null, userError: { message: "no session" } }) as any
    );

    await expect(requireAuth()).rejects.toBeInstanceOf(AppError);
    await expect(requireAuth()).rejects.toMatchObject({
      code: ERROR_CODES.UNAUTHORIZED,
      status: 401,
    });
  });

  it("retorna el usuario si la sesión es válida", async () => {
    mockedCreateClient.mockResolvedValue(
      buildSupabaseMock({ user: { id: "auth-user-1" } }) as any
    );

    const user = await requireAuth();
    expect(user.id).toBe("auth-user-1");
  });
});

describe("requireRole", () => {
  it("lanza AppError 403 cuando el array de roles está vacío", async () => {
    mockedCreateClient.mockResolvedValue(
      buildSupabaseMock({ user: { id: "x" } }) as any
    );

    await expect(requireRole([])).rejects.toMatchObject({
      code: ERROR_CODES.FORBIDDEN,
      status: 403,
    });
  });

  it("lanza AppError 401 cuando no hay usuario autenticado", async () => {
    mockedCreateClient.mockResolvedValue(
      buildSupabaseMock({ user: null }) as any
    );

    await expect(requireRole(["Admin"])).rejects.toMatchObject({
      code: ERROR_CODES.UNAUTHORIZED,
      status: 401,
    });
  });

  it("lanza AppError 403 cuando el rol del empleado no está permitido", async () => {
    mockedCreateClient.mockResolvedValue(
      buildSupabaseMock({
        user: { id: "auth-user-1" },
        empleado: { rol: "Operador" },
      }) as any
    );

    await expect(requireRole(["Admin"])).rejects.toMatchObject({
      code: ERROR_CODES.FORBIDDEN,
      status: 403,
    });
  });

  it("lanza AppError 403 cuando el empleado no existe en la tabla", async () => {
    mockedCreateClient.mockResolvedValue(
      buildSupabaseMock({
        user: { id: "auth-user-1" },
        empleado: null,
        empleadoError: { message: "no rows" },
      }) as any
    );

    await expect(requireRole(["Admin"])).rejects.toMatchObject({
      code: ERROR_CODES.FORBIDDEN,
      status: 403,
    });
  });

  it("retorna {user, role} cuando el rol está permitido", async () => {
    mockedCreateClient.mockResolvedValue(
      buildSupabaseMock({
        user: { id: "auth-user-1" },
        empleado: { rol: "Admin" },
      }) as any
    );

    const result = await requireRole(["Admin", "Recepción"]);
    expect(result.role).toBe("Admin");
    expect(result.user.id).toBe("auth-user-1");
  });

  it("el mensaje 403 no filtra los roles esperados", async () => {
    mockedCreateClient.mockResolvedValue(
      buildSupabaseMock({
        user: { id: "auth-user-1" },
        empleado: { rol: "Operador" },
      }) as any
    );

    try {
      await requireRole(["Admin", "Tostador"]);
      throw new Error("debería haber lanzado");
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      const message = (err as AppError).message;
      expect(message).not.toMatch(/Admin/);
      expect(message).not.toMatch(/Tostador/);
    }
  });
});
