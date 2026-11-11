import { describe, it, expect, vi } from "vitest";
import request from "supertest";
vi.mock("../src/config/env.js", () => ({
  env: {
    NODE_ENV: "test",
    SUPABASE_URL: "https://tests.invalid",
    SUPABASE_PUBLISHABLE_KEY: "test-only-placeholder",
    OASIS_COMPANY_ID: "11111111-1111-4111-8111-111111111111",
  },
}));
import { assertOasisCompany } from "../src/utils/companyAccess.js";
import { env } from "../src/config/env.js";
import { app } from "../src/app.js";
describe("Installation privée OASIS LOGISTICS", () => {
  it("autorise uniquement le UUID configuré", () => {
    expect(() =>
      assertOasisCompany("11111111-1111-4111-8111-111111111111"),
    ).not.toThrow();
    expect(() =>
      assertOasisCompany("22222222-2222-4222-8222-222222222222"),
    ).toThrow("réservée à OASIS LOGISTICS");
  });
  it("refuse les accès métier si le UUID manque", () => {
    const previous = env.OASIS_COMPANY_ID;
    env.OASIS_COMPANY_ID = undefined;
    try {
      expect(() => assertOasisCompany("anything")).toThrow("configuré");
    } finally {
      env.OASIS_COMPANY_ID = previous;
    }
  });
  it("interdit les inscriptions et créations publiques côté serveur", async () => {
    for (const path of ["/api/auth/register", "/api/auth/company"]) {
      const response = await request(app)
        .post(path)
        .set("X-Gestion-Client", "web")
        .send({});
      expect(response.status).toBe(403);
    }
  });
});
