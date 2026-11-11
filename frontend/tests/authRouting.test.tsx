import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Outlet } from "react-router-dom";
const state = vi.hoisted(() => ({
  session: null as null | {
    user: { id: string };
    company: { id: string } | null;
    role: string | null;
  },
  loading: false,
}));
vi.mock("../src/contexts/SessionContext", () => ({ useSession: () => state }));
vi.mock("../src/layouts/AppLayout", () => ({ default: () => <Outlet /> }));
vi.mock("../src/components/animations/LoadingTruckAnimation", () => ({
  default: () => <p>Chargement sécurisé</p>,
}));
vi.mock("../src/pages/Login", () => ({
  default: () => <p>Connexion publique</p>,
}));
vi.mock("../src/pages/Onboarding", () => ({
  default: () => <p>Rattachement nécessaire</p>,
}));
vi.mock("../src/pages/Dashboard", () => ({
  default: () => <p>Dashboard privé</p>,
}));
vi.mock("../src/pages/ResourcePage", () => ({
  default: () => <p>Voyages autorisés</p>,
}));
vi.mock("../src/pages/AuthReturn", () => ({
  default: ({ recovery }: { recovery: boolean }) => (
    <p>{recovery ? "Retour récupération" : "Retour OAuth"}</p>
  ),
}));
import App from "../src/routes/App";
const show = (path = "/") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
describe("Routage préservé", () => {
  it("protège une URL privée sans session", async () => {
    state.session = null;
    show("/reports");
    expect(await screen.findByText("Connexion publique")).toBeTruthy();
  });
  it("garde les opérateurs et chauffeurs hors du dashboard financier", async () => {
    state.session = {
      user: { id: "u" },
      company: { id: "c" },
      role: "operator",
    };
    show();
    expect(await screen.findByText("Voyages autorisés")).toBeTruthy();
  });
  it("conserve le dashboard pour les administrateurs", async () => {
    state.session = { user: { id: "u" }, company: { id: "c" }, role: "admin" };
    show();
    expect(await screen.findByText("Dashboard privé")).toBeTruthy();
  });
  it("n’accorde pas de rôle à un compte non rattaché", async () => {
    state.session = { user: { id: "u" }, company: null, role: null };
    show();
    expect(await screen.findByText("Rattachement nécessaire")).toBeTruthy();
  });
  it("traite le callback avant la barrière de session", async () => {
    state.session = null;
    show("/auth/callback?code=test");
    expect(await screen.findByText("Retour OAuth")).toBeTruthy();
  });
  it("permet le retour de récupération même avec une session existante", async () => {
    state.session = { user: { id: "u" }, company: { id: "c" }, role: "admin" };
    show("/auth/reset-password?code=test");
    expect(await screen.findByText("Retour récupération")).toBeTruthy();
  });
});
