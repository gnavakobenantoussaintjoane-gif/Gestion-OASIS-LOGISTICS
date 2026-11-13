import { useRef, useState } from "react";
import {
  ArrowRight,
  LoaderCircle,
  Phone,
  LogIn,
} from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import AuthShell from "../components/auth/AuthShell";
import { api } from "../api/client";
import { useSession } from "../contexts/SessionContext";
import type { Session } from "../types";
/** Icônes de la maquette : enveloppe pleine bleue, cadenas et œil au trait marine. */
function MailGlyph() {
  return (
    <svg
      className="gestion-auth__mail-glyph"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="2.6" y="4.7" width="18.8" height="14.6" rx="3.1" fill="currentColor" />
      <path
        className="gestion-auth__mail-flap"
        d="m4.5 6.9 6.8 5.1a1.2 1.2 0 0 0 1.4 0l6.8-5.1"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function LockGlyph() {
  return (
    <svg
      className="gestion-auth__lock-glyph"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M8 10V7.5a4 4 0 0 1 8 0V10"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <rect
        x="4.4"
        y="10.2"
        width="15.2"
        height="10.4"
        rx="2.7"
        stroke="currentColor"
        strokeWidth="2.2"
      />
      <circle cx="12" cy="15.2" r="1.3" fill="currentColor" />
    </svg>
  );
}
function EyeGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M2.6 12S6.2 6.2 12 6.2 21.4 12 21.4 12 17.8 17.8 12 17.8 2.6 12 2.6 12Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.9" fill="currentColor" />
      <circle cx="11" cy="11" r="0.85" fill="#fff" />
    </svg>
  );
}
function EyeOffGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M2.6 12S6.2 6.2 12 6.2 21.4 12 21.4 12 17.8 17.8 12 17.8 2.6 12 2.6 12Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        opacity=".5"
      />
      <circle cx="12" cy="12" r="2.9" fill="currentColor" opacity=".5" />
      <path
        d="M4.2 4.2 19.8 19.8"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6C44.4 38.04 46.98 31.89 46.98 24.55Z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.87 23.87 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
      />
    </svg>
  );
}
/** Interface commune email/téléphone et récupération ; aucune clé administrative côté client. */
export default function Login() {
  const { reload, error: sessionError } = useSession();
  const [mode, setMode] = useState<"email" | "phone">("email");
  // « Se souvenir de moi » est une préférence locale : le cookie de session reste
  // httpOnly et sa durée (30 jours) est fixée côté serveur, jamais par le navigateur.
  const [remember, setRemember] = useState(() => {
    try {
      return window.localStorage.getItem("otl-remember-identity") !== null;
    } catch {
      return false;
    }
  });
  const [identity, setIdentity] = useState(() => {
    try {
      return window.localStorage.getItem("otl-remember-identity") ?? "";
    } catch {
      return "";
    }
  });
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [forgot, setForgot] = useState(false);
  const [notice, setNotice] = useState("");
  // Le verrou est immédiat, contrairement à un setState : il bloque les doubles soumissions.
  const lock = useRef(false);
  async function run(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Opération impossible. Réessayez.";
      setError(message);
      toast.error(message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function submit() {
    await run(async () => {
      // Une demande de récupération n’authentifie pas l’utilisateur.
      if (forgot) {
        const email = z.email().safeParse(identity.trim());
        if (!email.success)
          throw new Error(
            "Saisissez une adresse e-mail valide pour recevoir le lien.",
          );
        const result = await api<{ message: string }>("/auth/forgot-password", {
          method: "POST",
          body: JSON.stringify({ email: email.data }),
        });
        setNotice(result.message);
        toast.success("Demande de réinitialisation envoyée.");
        return;
      }
      const value = identity.trim();
      if (mode === "email" && !z.email().safeParse(value).success)
        throw new Error("Saisissez une adresse e-mail valide.");
      if (mode === "phone" && !/^\+[1-9]\d{7,14}$/.test(value))
        throw new Error(
          "Utilisez le format international E.164, par exemple +2250700000000.",
        );
      if (!password) throw new Error("Saisissez votre mot de passe.");
      // Le serveur dialogue avec Supabase et pose les cookies sécurisés.
      await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ [mode]: value, password }),
      });
      // Mémoriser seulement l'identifiant choisi, jamais le mot de passe.
      try {
        if (!forgot && remember)
          window.localStorage.setItem("otl-remember-identity", value);
        else window.localStorage.removeItem("otl-remember-identity");
      } catch {
        /* stockage indisponible : la connexion reste valable */
      }
      // A valid Auth identity is not enough: preserve server-side company/role checks.
      await api<Session>("/auth/session");
      await reload();
      toast.success("Connexion réussie.");
    });
  }
  return (
    <AuthShell>
      <div className="gestion-auth__form-heading">
        <h1>
          {forgot ? "Mot de passe oublié ?" : "Bienvenue sur Gestion"}
        </h1>
        <p>
          {forgot
            ? "Recevez un lien sécurisé par e-mail."
            : "Gérez votre flotte, vos missions et vos finances en toute simplicité."}
        </p>
      </div>
      {!forgot && (
        <div
          className="gestion-auth__modes"
          role="group"
          aria-label="Mode de connexion"
        >
          {(["email", "phone"] as const).map((m) => (
            <button
              type="button"
              key={m}
              aria-pressed={mode === m}
              disabled={busy}
              onClick={() => {
                setMode(m);
                setIdentity("");
                setError("");
              }}
            >
              {m === "email" ? (
                <MailGlyph />
              ) : (
                <Phone aria-hidden="true" />
              )}
              {m === "email" ? "E-mail" : "Téléphone"}
            </button>
          ))}
        </div>
      )}
      {(error || sessionError) && (
        <div className="gestion-auth__error" role="alert">
          {error || sessionError?.message}
        </div>
      )}
      {notice && (
        <div className="gestion-auth__notice" role="status">
          {notice}
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        noValidate
      >
        <label className="gestion-auth__label" htmlFor="gestion-identity">
          {forgot || mode === "email"
            ? "Adresse e-mail"
            : "Numéro de téléphone"}
        </label>
        <div className="gestion-auth__field">
          {/* Le libellé reste accessible ; la maquette n'affiche que le placeholder. */}
          {forgot || mode === "email" ? (
            <MailGlyph />
          ) : (
            <Phone aria-hidden="true" />
          )}
          <input
            id="gestion-identity"
            type={forgot || mode === "email" ? "email" : "tel"}
            autoComplete={forgot || mode === "email" ? "email" : "tel"}
            placeholder={
              forgot || mode === "email"
                ? "Adresse e-mail"
                : "Numéro de téléphone (+225…)"
            }
            value={identity}
            onChange={(e) => setIdentity(e.target.value)}
            disabled={busy}
            required
          />
        </div>
        {!forgot && (
          <>
            <label className="gestion-auth__label" htmlFor="gestion-password">
              Mot de passe
            </label>
            <div className="gestion-auth__password gestion-auth__field">
              <LockGlyph />
              <input
                id="gestion-password"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe"
                maxLength={128}
                disabled={busy}
                required
              />
              <button
                type="button"
                aria-label={
                  show ? "Masquer le mot de passe" : "Afficher le mot de passe"
                }
                aria-pressed={show}
                onClick={() => setShow(!show)}
              >
                {show ? <EyeOffGlyph /> : <EyeGlyph />}
              </button>
            </div>
            <div className="gestion-auth__options">
              <label className="gestion-auth__remember">
                <input
                  className="gestion-auth__check"
                  type="checkbox"
                  checked={remember}
                  disabled={busy}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Se souvenir de moi
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setForgot(true);
                  setMode("email");
                  setIdentity("");
                  setError("");
                  setPassword("");
                }}
              >
                Mot de passe oublié ?
              </button>
            </div>
          </>
        )}
        <button className="gestion-auth__submit" type="submit" disabled={busy}>
          {busy ? (
            <>
              <LoaderCircle size={19} className="gestion-auth__spinner" />
              Veuillez patienter…
            </>
          ) : (
            <>
              {forgot ? <ArrowRight size={19} /> : <LogIn size={19} />}
              {forgot ? "Envoyer le lien" : "Se connecter"}
            </>
          )}
        </button>
      </form>
      {forgot ? (
        <button
          className="gestion-auth__back"
          type="button"
          disabled={busy}
          onClick={() => {
            setForgot(false);
            setError("");
            setNotice("");
          }}
        >
          Retour à la connexion
        </button>
      ) : (
        <>
          <div className="gestion-auth__separator">
            <span>OU</span>
          </div>
          <button
            className="gestion-auth__google"
            type="button"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const result = await api<{ url: string }>("/auth/google", {
                  method: "POST",
                });
                window.location.assign(result.url);
              })
            }
          >
            <GoogleIcon />
            Continuer avec Google
          </button>
        </>
      )}
    </AuthShell>
  );
}
