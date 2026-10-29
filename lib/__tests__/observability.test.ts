import { describe, expect, it } from "vitest";
import { newCorrelationId, redactar } from "../observability";

describe("redactar", () => {
  it("redacta claves sensibles recursivamente", () => {
    const input = {
      password: "s3cret",
      db_password: "s3cret",
      token: "abc",
      Authorization: "Bearer abc",
      Cookie: "sb-x=1",
      apiKey: "k",
      api_key: "k",
      SERVICE_ROLE: "k",
      sbp_fake: "k",
      SecretFile: "k",
      safe: "valor",
      nested: { token: "abc", ok: 1 },
    };
    const out = redactar(input) as Record<string, unknown>;
    expect(out["password"]).toBe("[redacted]");
    expect(out["db_password"]).toBe("[redacted]");
    expect(out["token"]).toBe("[redacted]");
    expect(out["Authorization"]).toBe("[redacted]");
    expect(out["Cookie"]).toBe("[redacted]");
    expect(out["apiKey"]).toBe("[redacted]");
    expect(out["api_key"]).toBe("[redacted]");
    expect(out["SERVICE_ROLE"]).toBe("[redacted]");
    expect(out["sbp_fake"]).toBe("[redacted]");
    expect(out["SecretFile"]).toBe("[redacted]");
    expect(out["safe"]).toBe("valor");
    expect((out["nested"] as Record<string, unknown>)["token"]).toBe("[redacted]");
    expect((out["nested"] as Record<string, unknown>)["ok"]).toBe(1);
  });

  it("no muta el objeto de entrada", () => {
    const input = { token: "abc" };
    redactar(input);
    expect(input.token).toBe("abc");
  });

  it("preserva arrays y valores primitivos", () => {
    const out = redactar({
      lista: [1, 2, { password: "x" }],
      num: 5,
      nulo: null,
    }) as Record<string, unknown>;
    expect(out["num"]).toBe(5);
    expect(out["nulo"]).toBeNull();
    expect((out["lista"] as unknown[])[0]).toBe(1);
  });
});

describe("newCorrelationId", () => {
  it("genera IDs Ãºnicos", () => {
    const a = newCorrelationId();
    const b = newCorrelationId();
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
    expect(a).not.toBe(b);
  });
});
