import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { isTemporaryAuthError } from "../src/utils/authErrors.js";
describe("Régressions authentification et requêtes", () => {
  it("ne limite pas les lectures de session comme des tentatives de connexion", async () => {
    for (let i = 0; i < 42; i++) {
      const response = await request(app).get("/api/auth/session");
      expect(response.status).toBe(401);
    }
  });
  it("permet de fermer une session absente et efface les cookies", async () => {
    const response = await request(app)
      .post("/api/auth/logout")
      .set("X-Gestion-Client", "web")
      .send({});
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, revoked: true });
    expect(response.headers["set-cookie"]).toEqual(
      expect.arrayContaining([
        expect.stringContaining("gestion_access=;"),
        expect.stringContaining("gestion_refresh=;"),
      ]),
    );
  });
  it("renvoie 413 en JSON pour un corps trop volumineux", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .set("X-Gestion-Client", "web")
      .send({ password: "x".repeat(110000) });
    expect(response.status).toBe(413);
    expect(response.body.error).toBeTruthy();
  });
  it("distingue une panne Auth d’une session invalide", () => {
    expect(isTemporaryAuthError({ status: 503 })).toBe(true);
    expect(isTemporaryAuthError({ name: "AuthRetryableFetchError" })).toBe(
      true,
    );
    expect(isTemporaryAuthError({ status: 0 })).toBe(true);
    expect(isTemporaryAuthError({ status: 401 })).toBe(false);
    expect(isTemporaryAuthError(null)).toBe(false);
  });
});
