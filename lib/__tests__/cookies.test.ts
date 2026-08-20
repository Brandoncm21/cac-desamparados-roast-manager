import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  secureCookieOptions,
  applySecureCookies,
  type CookieToSet,
} from "@/lib/cookies";

function buildMockResponse() {
  const setCookieSpy = vi.fn();
  const setHeaderSpy = vi.fn();
  return {
    response: {
      cookies: { set: setCookieSpy },
      headers: { set: setHeaderSpy },
    },
    setCookieSpy,
    setHeaderSpy,
  };
}

function buildMockRequest() {
  const setCookieReqSpy = vi.fn();
  return {
    request: {
      cookies: { set: setCookieReqSpy },
    },
    setCookieReqSpy,
  };
}

describe("secureCookieOptions", () => {
  it("httpOnly=true, secure=false, sameSite=lax en desarrollo", () => {
    const opts = secureCookieOptions(undefined, "development");
    expect(opts["httpOnly"]).toBe(true);
    expect(opts["secure"]).toBe(false);
    expect(opts["sameSite"]).toBe("lax");
    expect(opts["path"]).toBe("/");
  });

  it("httpOnly=true, secure=true, sameSite=lax en producción", () => {
    const opts = secureCookieOptions(undefined, "production");
    expect(opts["httpOnly"]).toBe(true);
    expect(opts["secure"]).toBe(true);
    expect(opts["sameSite"]).toBe("lax");
    expect(opts["path"]).toBe("/");
  });

  it("respeta un extra.secure=true incluso en desarrollo", () => {
    const opts = secureCookieOptions({ secure: true }, "development");
    expect(opts["secure"]).toBe(true);
  });

  it("fuerza httpOnly=true incluso si el extra lo desactiva", () => {
    const opts = secureCookieOptions({ httpOnly: false }, "production");
    expect(opts["httpOnly"]).toBe(true);
  });

  it("respeta un extra.sameSite distinto", () => {
    const opts = secureCookieOptions({ sameSite: "strict" }, "production");
    expect(opts["sameSite"]).toBe("strict");
  });

  it("respeta expires/maxAge si vienen en extra", () => {
    const expires = new Date("2030-01-01T00:00:00Z");
    const opts = secureCookieOptions(
      { expires, maxAge: 3600 },
      "production"
    );
    expect(opts["maxAge"]).toBe(3600);
    expect(opts["expires"]).toEqual(expires);
  });
});

describe("applySecureCookies", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("aplica httpOnly + secure + sameSite a cada cookie del upstream", () => {
    const { response, setCookieSpy } = buildMockResponse();
    const { request, setCookieReqSpy } = buildMockRequest();

    const cookiesToSet: CookieToSet[] = [
      {
        name: "sb-access-token",
        value: "abc",
        options: { path: "/", httpOnly: true },
      },
      {
        name: "sb-refresh-token",
        value: "def",
        options: { path: "/", httpOnly: true },
      },
    ];

    const previousEnv = Reflect.get(process.env, "NODE_ENV");
    Reflect.set(process.env, "NODE_ENV", "production");

    try {
      applySecureCookies(
        request as unknown as Parameters<typeof applySecureCookies>[0],
        response as unknown as Parameters<typeof applySecureCookies>[1],
        cookiesToSet
      );
    } finally {
      Reflect.set(process.env, "NODE_ENV", previousEnv);
    }

    expect(setCookieSpy).toHaveBeenCalledTimes(2);
    for (const call of setCookieSpy.mock.calls) {
      const [, , options] = call as [string, string, Record<string, unknown>];
      expect(options["httpOnly"]).toBe(true);
      expect(options["secure"]).toBe(true);
      expect(options["sameSite"]).toBe("lax");
      expect(options["path"]).toBe("/");
    }
    expect(setCookieReqSpy).toHaveBeenCalledTimes(2);
  });

  it("reenvía headers extra al response (no-cache)", () => {
    const { response, setHeaderSpy } = buildMockResponse();
    const { request } = buildMockRequest();

    applySecureCookies(
      request as unknown as Parameters<typeof applySecureCookies>[0],
      response as unknown as Parameters<typeof applySecureCookies>[1],
      [{ name: "sb-access-token", value: "abc" }],
      { "Cache-Control": "private, no-store" }
    );

    expect(setHeaderSpy).toHaveBeenCalledWith(
      "Cache-Control",
      "private, no-store"
    );
  });

  it("no sobrescribe un httpOnly existente del upstream con false", () => {
    const { response, setCookieSpy } = buildMockResponse();
    const { request } = buildMockRequest();

    const previousEnv = Reflect.get(process.env, "NODE_ENV");
    Reflect.set(process.env, "NODE_ENV", "production");

    try {
      applySecureCookies(
        request as unknown as Parameters<typeof applySecureCookies>[0],
        response as unknown as Parameters<typeof applySecureCookies>[1],
        [
          {
            name: "sb-access-token",
            value: "abc",
            options: { httpOnly: false },
          },
        ]
      );
    } finally {
      Reflect.set(process.env, "NODE_ENV", previousEnv);
    }

    const [, , options] = setCookieSpy.mock.calls[0] as [
      string,
      string,
      Record<string, unknown>
    ];
    expect(options["httpOnly"]).toBe(true);
  });
});
