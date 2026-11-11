import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  createUser: vi.fn(),
  deleteUser: vi.fn(),
  superAdmin: false,
}));
vi.mock("../src/middlewares/auth.js", () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { id: "owner", email: "owner@example.com" };
    req.db = { rpc: mocks.rpc };
    next();
  },
  requireCompany: (req: any, _res: any, next: any) => {
    req.companyId = "company";
    req.role = "admin";
    next();
  },
  allow: () => (_req: any, _res: any, next: any) => next(),
}));
vi.mock("../src/config/adminSupabase.js", () => ({
  adminSupabase: () => ({
    auth: {
      admin: { createUser: mocks.createUser, deleteUser: mocks.deleteUser },
    },
  }),
}));
import { app } from "../src/app.js";
const fields = {
  member_email: "member@example.com",
  member_name: "Utilisateur Test",
  member_role: "operator",
  password: "test-only-password-123!",
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.superAdmin = false;
  mocks.rpc.mockImplementation(async (name: string) => ({
    data: name === "oasis_is_super_admin" ? mocks.superAdmin : null,
    error: null,
  }));
  mocks.createUser.mockResolvedValue({
    data: { user: { id: "new-user" } },
    error: null,
  });
  mocks.deleteUser.mockResolvedValue({ error: null });
});
const post = (path: string, body: unknown = fields) =>
  request(app).post(path).set("X-Gestion-Client", "web").send(body);
describe("Administration réservée au propriétaire", () => {
  it("refuse un administrateur ordinaire avant tout appel privilégié", async () => {
    expect((await post("/api/members/accounts")).status).toBe(403);
    expect(mocks.createUser).not.toHaveBeenCalled();
  });
  it("refuse aussi la modification des rôles aux administrateurs ordinaires", async () => {
    expect((await post("/api/members")).status).toBe(403);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
  it("crée et rattache un compte sans renvoyer le mot de passe", async () => {
    mocks.superAdmin = true;
    const response = await post("/api/members/accounts");
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ id: "new-user" });
    expect(mocks.rpc).toHaveBeenCalledWith("gestion_set_member", {
      member_email: fields.member_email,
      member_name: fields.member_name,
      member_role: fields.member_role,
    });
    expect(JSON.stringify(response.body)).not.toContain(fields.password);
  });
  it("refuse un rôle super admin fourni par le navigateur", async () => {
    mocks.superAdmin = true;
    expect(
      (
        await post("/api/members/accounts", {
          ...fields,
          member_role: "super_admin",
        })
      ).status,
    ).toBe(422);
    expect(mocks.createUser).not.toHaveBeenCalled();
  });
  it("valide la longueur du mot de passe", async () => {
    mocks.superAdmin = true;
    expect(
      (await post("/api/members/accounts", { ...fields, password: "short" }))
        .status,
    ).toBe(422);
  });
  it("supprime seulement le compte nouvellement créé si le rattachement échoue", async () => {
    mocks.superAdmin = true;
    mocks.rpc.mockImplementation(async (name: string) =>
      name === "oasis_is_super_admin"
        ? { data: true, error: null }
        : { data: null, error: { message: "refused" } },
    );
    expect((await post("/api/members/accounts")).status).toBe(422);
    expect(mocks.deleteUser).toHaveBeenCalledWith("new-user");
  });
  it("ne supprime aucun compte existant lors d’un doublon Auth", async () => {
    mocks.superAdmin = true;
    mocks.createUser.mockResolvedValue({
      data: { user: null },
      error: { message: "duplicate" },
    });
    expect((await post("/api/members/accounts")).status).toBe(422);
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });
});
