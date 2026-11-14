import { beforeEach, describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ api: vi.fn(), reload: vi.fn() }));
vi.mock("../src/api/client", () => ({ api: mocks.api }));
vi.mock("../src/contexts/SessionContext", () => ({
  useSession: () => ({ reload: mocks.reload, error: null }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
import Login from "../src/pages/Login";
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mocks.api.mockResolvedValue({});
  mocks.reload.mockResolvedValue({});
});
describe("Formulaire de connexion", () => {
  it("valide email et téléphone sans appel réseau invalide", async () => {
    render(<Login />);
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));
    await screen.findByRole("alert");
    expect(mocks.api).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "Téléphone", exact: true }),
    );
    fireEvent.change(screen.getByLabelText("Numéro de téléphone"), {
      target: { value: "0700000000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("E.164"),
    );
    expect(mocks.api).not.toHaveBeenCalled();
  });
  it("envoie un téléphone sans le convertir en email puis vérifie la session serveur", async () => {
    render(<Login />);
    fireEvent.click(
      screen.getByRole("button", { name: "Téléphone", exact: true }),
    );
    fireEvent.change(screen.getByLabelText("Numéro de téléphone"), {
      target: { value: "+2250700000000" },
    });
    fireEvent.change(screen.getByLabelText("Mot de passe", { exact: true }), {
      target: { value: "test-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));
    await waitFor(() => expect(mocks.reload).toHaveBeenCalledOnce());
    expect(mocks.api).toHaveBeenNthCalledWith(1, "/auth/login", {
      method: "POST",
      body: JSON.stringify({
        phone: "+2250700000000",
        password: "test-password",
      }),
    });
    expect(mocks.api).toHaveBeenNthCalledWith(2, "/auth/session");
  });
  it("affiche une erreur Google et garde le formulaire utilisable", async () => {
    mocks.api.mockRejectedValue(new Error("Google indisponible."));
    render(<Login />);
    fireEvent.click(
      screen.getByRole("button", { name: "Continuer avec Google" }),
    );
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(
        "Google indisponible",
      ),
    );
    expect(screen.getByLabelText("Adresse e-mail")).toBeTruthy();
    expect(
      (
        screen.getByRole("button", {
          name: "Se connecter",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
  });
  it("envoie la récupération par email, jamais par SMS", async () => {
    mocks.api.mockResolvedValue({
      message: "Si cette adresse est admissible, un lien sera envoyé.",
    });
    render(<Login />);
    fireEvent.click(
      screen.getByRole("button", { name: "Mot de passe oublié ?" }),
    );
    fireEvent.change(screen.getByLabelText("Adresse e-mail"), {
      target: { value: "member@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer le lien" }));
    await screen.findByRole("status");
    expect(mocks.api).toHaveBeenCalledWith("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: "member@example.com" }),
    });
    expect(mocks.reload).not.toHaveBeenCalled();
  });
  it("n’actualise pas une session dont le serveur refuse le profil", async () => {
    mocks.api
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("Compte non autorisé."));
    render(<Login />);
    fireEvent.change(screen.getByLabelText("Adresse e-mail"), {
      target: { value: "member@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Mot de passe", { exact: true }), {
      target: { value: "test-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));
    await screen.findByRole("alert");
    expect(mocks.reload).not.toHaveBeenCalled();
  });
  it("mémorise seulement l’identifiant quand « Se souvenir de moi » est coché", async () => {
    localStorage.clear();
    render(<Login />);
    fireEvent.change(screen.getByLabelText("Adresse e-mail"), {
      target: { value: "member@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Mot de passe", { exact: true }), {
      target: { value: "test-password" },
    });
    expect(
      (screen.getByLabelText("Se souvenir de moi") as HTMLInputElement).checked,
    ).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));
    await waitFor(() => expect(mocks.reload).toHaveBeenCalledOnce());
    expect(localStorage.getItem("otl-remember-identity")).toBe(
      "member@example.com",
    );
    expect(JSON.stringify(localStorage)).not.toContain("test-password");
  });
  it("ne mémorise rien quand la case est décochée", async () => {
    localStorage.clear();
    render(<Login />);
    const box = screen.getByLabelText("Se souvenir de moi") as HTMLInputElement;
    expect(box.checked).toBe(true);
    fireEvent.click(box);
    expect(box.checked).toBe(false);
    fireEvent.change(screen.getByLabelText("Adresse e-mail"), {
      target: { value: "sans-memoire@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Mot de passe", { exact: true }), {
      target: { value: "test-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));
    await waitFor(() => expect(mocks.reload).toHaveBeenCalledOnce());
    expect(localStorage.getItem("otl-remember-identity")).toBe(null);
  });
  it("recharge l’identifiant mémorisé au prochain affichage", () => {
    localStorage.setItem("otl-remember-identity", "ancien@example.com");
    render(<Login />);
    expect(
      (screen.getByLabelText("Adresse e-mail") as HTMLInputElement).value,
    ).toBe("ancien@example.com");
    expect(
      (screen.getByLabelText("Se souvenir de moi") as HTMLInputElement).checked,
    ).toBe(true);
    localStorage.clear();
  });
  it("affiche et masque le mot de passe", () => {
    render(<Login />);
    fireEvent.click(
      screen.getByRole("button", { name: "Afficher le mot de passe" }),
    );
    expect(
      (
        screen.getByLabelText("Mot de passe", {
          exact: true,
        }) as HTMLInputElement
      ).type,
    ).toBe("text");
    fireEvent.click(
      screen.getByRole("button", { name: "Masquer le mot de passe" }),
    );
    expect(
      (
        screen.getByLabelText("Mot de passe", {
          exact: true,
        }) as HTMLInputElement
      ).type,
    ).toBe("password");
  });
});
