import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
describe("API REST et sécurité sans session", () => {
  it("publie la santé API sans secret", async () => {
    const r = await request(app).get("/api/health");
    expect(r.status).toBe(200);
    expect(r.body.status).toBe("ok");
    expect(JSON.stringify(r.body)).not.toContain("sb_");
  });
  it("refuse les routes métier sans session", async () => {
    const r = await request(app).get("/api/trips");
    expect(r.status).toBe(401);
  });
  it("protège les mutations contre les formulaires intersites", async () => {
    const r = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@example.com", password: "secret" });
    expect(r.status).toBe(403);
  });
  it("refuse une origine étrangère même avec le header attendu", async () => {
    const r = await request(app)
      .post("/api/auth/login")
      .set("X-Gestion-Client", "web")
      .set("Origin", "https://evil.example")
      .send({});
    expect(r.status).toBe(403);
  });
  it("valide les entrées avant tout appel Supabase", async () => {
    const r = await request(app)
      .post("/api/auth/login")
      .set("X-Gestion-Client", "web")
      .send({ email: "not-an-email", password: "" });
    expect(r.status).toBe(422);
    expect(r.body.details.length).toBeGreaterThan(0);
  });
  it("répond en JSON aux erreurs", async () => {
    const r = await request(app)
      .post("/api/auth/login")
      .set("X-Gestion-Client", "web")
      .set("Content-Type", "application/json")
      .send("{bad");
    expect(r.status).toBe(400);
    expect(r.body.error).toBeTruthy();
  });
  it("désactive le cache des données privées", async () => {
    const r = await request(app).get("/api/health");
    expect(r.headers["cache-control"]).toBe("no-store");
  });
});
