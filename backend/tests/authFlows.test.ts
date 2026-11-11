import { beforeEach, describe, it, expect, vi } from "vitest";
import request from "supertest";
const mock = vi.hoisted(() => ({
  password: vi.fn(),
  oauth: vi.fn(),
  reset: vi.fn(),
  exchange: vi.fn(),
  setSession: vi.fn(),
  update: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("../src/config/supabase.js", () => ({
  supabase: (
    _token?: string,
    storage?: { setItem: (k: string, v: string) => void },
  ) => ({
    auth: {
      signInWithPassword: mock.password,
      signInWithOAuth: async (args: unknown) => {
        storage?.setItem(
          "sb-project-auth-token-code-verifier",
          "test-verifier",
        );
        return mock.oauth(args);
      },
      resetPasswordForEmail: async (...args: unknown[]) => {
        storage?.setItem(
          "sb-project-auth-token-code-verifier",
          "test-verifier/recovery",
        );
        return mock.reset(...args);
      },
      exchangeCodeForSession: mock.exchange,
      setSession: mock.setSession,
      updateUser: mock.update,
      signOut: mock.signOut,
    },
  }),
}));
import { app } from "../src/app.js";
const session = {
  access_token: "access-test-only",
  refresh_token: "refresh-test-only",
  expires_in: 3600,
};
const flowCookie = (flow: string) =>
  `gestion_auth_flow=${encodeURIComponent(JSON.stringify({ flow, values: { "sb-project-auth-token-code-verifier": "test-verifier" } }))}`;
const post = (path: string) =>
  request(app)
    .post(`/api/auth${path}`)
    .set("X-Gestion-Client", "web")
    .set("Host", "app.example")
    .set("Origin", "https://app.example");
beforeEach(() => {
  vi.clearAllMocks();
  mock.password.mockResolvedValue({ data: { session }, error: null });
  mock.oauth.mockResolvedValue({
    data: { url: "https://auth.example/authorize" },
    error: null,
  });
  mock.reset.mockResolvedValue({ error: null });
  mock.exchange.mockResolvedValue({ data: { session }, error: null });
  mock.setSession.mockResolvedValue({ error: null });
  mock.update.mockResolvedValue({ error: null });
  mock.signOut.mockResolvedValue({ error: null });
});
describe("Auth réelle : contrats API isolés (sans réseau Supabase)", () => {
  it("transmet email et mot de passe sans modifier les cookies existants", async () => {
    const response = await post("/login").send({
      email: "member@example.com",
      password: "test-password",
    });
    expect(response.status).toBe(200);
    expect(mock.password).toHaveBeenCalledWith({
      email: "member@example.com",
      password: "test-password",
    });
    expect(response.headers["set-cookie"].join(" ")).toContain("HttpOnly");
  });
  it("transmet le téléphone E.164 tel quel, sans inventer d’email", async () => {
    expect(
      (
        await post("/login").send({
          phone: "+2250700000000",
          password: "test-password",
        })
      ).status,
    ).toBe(200);
    expect(mock.password).toHaveBeenCalledWith({
      phone: "+2250700000000",
      password: "test-password",
    });
  });
  it("refuse les numéros locaux, doubles identités et rôles injectés", async () => {
    for (const body of [
      { phone: "0700000000", password: "x" },
      { email: "a@example.com", phone: "+2250700000000", password: "x" },
      { email: "a@example.com", password: "x", role: "admin" },
    ])
      expect((await post("/login").send(body)).status).toBe(422);
    expect(mock.password).not.toHaveBeenCalled();
  });
  it("normalise les identifiants incorrects et les pannes temporaires", async () => {
    mock.password.mockResolvedValueOnce({
      data: { session: null },
      error: { status: 400, message: "secret provider internals" },
    });
    const bad = await post("/login").send({
      email: "a@example.com",
      password: "x",
    });
    expect(bad.status).toBe(401);
    expect(JSON.stringify(bad.body)).not.toContain("internals");
    mock.password.mockResolvedValueOnce({
      data: { session: null },
      error: { status: 503 },
    });
    expect(
      (await post("/login").send({ email: "a@example.com", password: "x" }))
        .status,
    ).toBe(503);
  });
  it("initialise Google PKCE avec origine vérifiée et verifier httpOnly", async () => {
    const response = await post("/google").send({});
    expect(response.status).toBe(200);
    expect(mock.oauth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "https://app.example/auth/callback",
        skipBrowserRedirect: true,
      },
    });
    expect(response.headers["set-cookie"].join(" ")).toContain("HttpOnly");
    expect(response.body).toEqual({ url: "https://auth.example/authorize" });
  });
  it("Google non configuré reste une erreur compréhensible sans secret", async () => {
    mock.oauth.mockResolvedValue({
      data: { url: null },
      error: { message: "secret" },
    });
    const response = await post("/google").send({});
    expect(response.status).toBe(503);
    expect(response.body.error).toContain("Google");
    expect(response.body.error).not.toContain("secret");
  });
  it("empêche de fournir une URL de retour depuis une origine étrangère", async () => {
    expect(
      (
        await request(app)
          .post("/api/auth/google")
          .set("X-Gestion-Client", "web")
          .set("Host", "app.example")
          .set("Origin", "https://evil.example")
      ).status,
    ).toBe(403);
    expect(mock.oauth).not.toHaveBeenCalled();
  });
  it("envoie la récupération uniquement par email avec le callback configuré", async () => {
    const response = await post("/forgot-password").send({
      email: "a@example.com",
    });
    expect(response.status).toBe(200);
    expect(mock.reset).toHaveBeenCalledWith("a@example.com", {
      redirectTo: "https://app.example/auth/reset-password",
    });
    expect(response.body.message).toContain("Si cette adresse");
    expect(
      (await post("/forgot-password").send({ phone: "+2250700000000" })).status,
    ).toBe(422);
  });
  it("refuse les callbacks sans verifier ou avec un autre flux", async () => {
    expect(
      (await post("/callback").send({ code: "code", flow: "google" })).status,
    ).toBe(400);
    expect(
      (
        await post("/callback")
          .set("Cookie", flowCookie("recovery"))
          .send({ code: "code", flow: "google" })
      ).status,
    ).toBe(400);
    expect(mock.exchange).not.toHaveBeenCalled();
  });
  it("échange le code Google et conserve les sessions httpOnly existantes", async () => {
    const response = await post("/callback")
      .set("Cookie", flowCookie("google"))
      .send({ code: "code", flow: "google" });
    expect(response.status).toBe(200);
    expect(mock.exchange).toHaveBeenCalledWith("code");
    expect(response.headers["set-cookie"].join(" ")).toContain(
      "gestion_access=access-test-only",
    );
  });
  it("isole la session de récupération des cookies métier", async () => {
    const response = await post("/callback")
      .set("Cookie", flowCookie("recovery"))
      .send({ code: "code", flow: "recovery" });
    expect(response.status).toBe(200);
    const cookies = response.headers["set-cookie"].join(" ");
    expect(cookies).toContain("gestion_recovery_access");
    expect(cookies).not.toContain("gestion_access=");
  });
  it("refuse la réinitialisation sans preuve de récupération", async () => {
    expect(
      (await post("/recovery/password").send({ password: "new-test-password" }))
        .status,
    ).toBe(401);
    expect(mock.update).not.toHaveBeenCalled();
  });
  it("réinitialise le mot de passe et révoque les sessions sans renvoyer de token", async () => {
    const response = await post("/recovery/password")
      .set(
        "Cookie",
        "gestion_recovery_access=test-access; gestion_recovery_refresh=test-refresh",
      )
      .send({ password: "new-test-password" });
    expect(response.status).toBe(200);
    expect(mock.update).toHaveBeenCalledWith({ password: "new-test-password" });
    expect(mock.signOut).toHaveBeenCalledWith({ scope: "global" });
    expect(response.body).toEqual({ ok: true, revoked: true });
  });
});
