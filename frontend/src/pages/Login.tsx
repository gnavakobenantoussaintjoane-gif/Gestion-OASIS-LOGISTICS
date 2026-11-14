import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import LoginOTL from "../components/LoginOTL/LoginOTL";
import type { LoginOTLSubmit } from "../components/LoginOTL/LoginOTL";
import { api, ApiError } from "../api/client";
import { useSession } from "../contexts/SessionContext";
import type { Session } from "../types";

const E164 = /^\+[1-9]\d{7,14}$/;
const REMEMBER_KEY = "otl-remember-identity";

/** Branche la page fournie sur l’authentification réelle de Gestion. */
export default function Login() {
  const { reload, error: sessionError } = useSession();
  const [forgot, setForgot] = useState(false);

  async function handleLogin({
    mode,
    identifier,
    password,
    remember,
  }: LoginOTLSubmit) {
    const value = identifier.trim();
    if (mode === "email" && !z.email().safeParse(value).success)
      throw new Error("Saisissez une adresse e-mail valide.");
    if (mode === "tel" && !E164.test(value))
      throw new Error(
        "Utilisez le format international E.164, par exemple +2250700000000.",
      );
    if (!password) throw new Error("Saisissez votre mot de passe.");

    try {
      // Le serveur accepte exactement email+mot de passe ou téléphone+mot de passe.
      await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          [mode === "tel" ? "phone" : "email"]: value,
          password,
        }),
      });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401)
        throw new Error("Identifiants incorrects");
      throw e;
    }
    // Une identité Auth valide ne suffit pas : conserver les contrôles entreprise/rôle du serveur.
    await api<Session>("/auth/session");

    // Mémoriser seulement l’identifiant choisi, jamais le mot de passe.
    try {
      if (remember) window.localStorage.setItem(REMEMBER_KEY, value);
      else window.localStorage.removeItem(REMEMBER_KEY);
    } catch {
      /* stockage indisponible : la connexion reste valable */
    }
    await reload();
    toast.success("Connexion réussie.");
  }

  async function handleForgot(email: string) {
    const parsed = z.email().safeParse(email.trim());
    if (!parsed.success)
      throw new Error("Saisissez une adresse e-mail valide.");
    const result = await api<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: parsed.data }),
    });
    return result.message;
  }

  async function handleGoogle() {
    const result = await api<{ url: string }>("/auth/google", {
      method: "POST",
    });
    window.location.assign(result.url);
  }

  return (
    <LoginOTL
      onSubmit={handleLogin}
      onGoogle={handleGoogle}
      onForgot={() => setForgot(true)}
      onForgotSubmit={handleForgot}
      onBack={() => setForgot(false)}
      forgot={forgot}
      sessionError={sessionError?.message}
    />
  );
}
