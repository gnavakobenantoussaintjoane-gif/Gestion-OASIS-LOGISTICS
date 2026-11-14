import { useState } from "react";
import "./LoginOTL.css";
import bg from "./login-bg.jpg";
import logo from "./logo-otl.png";

const STORAGE_KEY = "otl-remember-identity";

function readRememberedIdentity() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

const Ico = ({ d, c = "currentColor", children }) => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke={c}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {d ? <path d={d} /> : children}
  </svg>
);

/**
 * Props :
 *  - onSubmit({ mode, identifier, password, remember }) -> Promise (throw new Error("...") pour afficher l'erreur)
 *  - onGoogle() -> Promise ; onForgot() ; onForgotSubmit(email) -> Promise<string|void> ; onBack()
 *  - forgot : affiche la demande de réinitialisation dans la même page.
 */
export default function LoginOTL({
  onSubmit,
  onGoogle,
  onForgot,
  onForgotSubmit,
  onBack,
  forgot = false,
  sessionError = "",
}) {
  const [mode, setMode] = useState("email"); // "email" | "tel"
  const [identifier, setIdentifier] = useState(readRememberedIdentity);
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const tel = mode === "tel";
  const shownError = error || sessionError;

  async function handleSubmit(e) {
    e.preventDefault();
    const value = identifier.trim();
    if (!value) {
      setError(
        forgot
          ? "Saisissez une adresse e-mail valide."
          : "Veuillez renseigner vos identifiants.",
      );
      return;
    }
    setError("");
    setNotice("");
    setLoading(true);
    try {
      if (forgot) {
        const message = await onForgotSubmit?.(value);
        if (message) setNotice(message);
      } else {
        await onSubmit?.({ mode, identifier: value, password, remember });
      }
    } catch (err) {
      setError(
        err?.message ||
          (forgot
            ? "Demande impossible. Réessayez."
            : "Connexion impossible. Réessayez."),
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    if (loading) return;
    setError("");
    setNotice("");
    setLoading(true);
    try {
      await onGoogle?.();
    } catch (err) {
      setError(err?.message || "Connexion Google impossible. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="otl-page" style={{ "--bg": `url(${bg})` }}>
      <header className="otl-head">
        <img src={logo} alt="OTL Oasis Transport Logistics" />
        <div className="otl-sep" />
        <p className="otl-tag">
          Votre flotte, votre performance,
          <br />
          votre contrôle.
        </p>
        <div className="otl-badge">
          <i />
          En ligne
        </div>
      </header>

      <main className="otl-main">
        {forgot ? (
          <form className="otl-card" onSubmit={handleSubmit} noValidate>
            <img className="otl-login-logo" src={logo} alt="OTL" />
            <h1>Mot de passe oublié ?</h1>
            <p className="otl-sub">Recevez un lien sécurisé par e-mail.</p>
            <div className="otl-bar" />

            <label className="otl-field">
              <Ico c="#1456d6">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m3 7 9 6 9-6" />
              </Ico>
              <input
                type="email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="email"
                placeholder="Adresse e-mail"
                aria-label="Adresse e-mail"
              />
            </label>

            <button type="submit" className="otl-go" disabled={loading}>
              <Ico c="#fff">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </Ico>
              {loading ? "Envoi…" : "Envoyer le lien"}
            </button>
            <div
              className={`otl-msg${notice ? " otl-ok" : ""}`}
              role={shownError ? "alert" : notice ? "status" : undefined}
            >
              {shownError || notice}
            </div>
            <button
              type="button"
              className="otl-back"
              onClick={() => {
                setError("");
                setNotice("");
                onBack?.();
              }}
            >
              Retour à la connexion
            </button>
          </form>
        ) : (
          <form className="otl-card" onSubmit={handleSubmit} noValidate>
            <img className="otl-login-logo" src={logo} alt="OTL" />
            <h1>Bienvenue sur Gestion</h1>
            <p className="otl-sub">
              Gérez votre flotte, vos missions et vos finances en toute
              simplicité.
            </p>
            <div className="otl-bar" />

            <div
              className="otl-tabs"
              role="group"
              aria-label="Mode de connexion"
            >
              <button
                type="button"
                className={!tel ? "on" : ""}
                aria-pressed={!tel}
                onClick={() => {
                  setMode("email");
                  setIdentifier("");
                  setError("");
                }}
              >
                <Ico>
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="m3 7 9 6 9-6" />
                </Ico>
                E-mail
              </button>
              <button
                type="button"
                className={tel ? "on" : ""}
                aria-pressed={tel}
                onClick={() => {
                  setMode("tel");
                  setIdentifier("");
                  setError("");
                }}
              >
                <Ico d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
                Téléphone
              </button>
            </div>

            <label className="otl-field">
              <Ico c="#1456d6">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m3 7 9 6 9-6" />
              </Ico>
              <input
                type={tel ? "tel" : "email"}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete={tel ? "tel" : "username"}
                placeholder={tel ? "Numéro de téléphone" : "Adresse e-mail"}
                aria-label={tel ? "Numéro de téléphone" : "Adresse e-mail"}
              />
            </label>
            <label className="otl-field">
              <Ico c="#0b2559">
                <rect x="4" y="10" width="16" height="11" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </Ico>
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Mot de passe"
                aria-label="Mot de passe"
                maxLength={128}
              />
              <button
                type="button"
                className="otl-eye"
                aria-label={
                  show ? "Masquer le mot de passe" : "Afficher le mot de passe"
                }
                aria-pressed={show}
                onClick={() => setShow((s) => !s)}
              >
                <Ico c="#0b2559">
                  <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
                  <circle cx="12" cy="12" r="3" />
                </Ico>
              </button>
            </label>

            <div className="otl-row">
              <label>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Se souvenir de moi
              </label>
              <button
                type="button"
                className="otl-forgot"
                onClick={() => {
                  setError("");
                  setNotice("");
                  // La récupération se fait toujours par e-mail.
                  if (tel) {
                    setMode("email");
                    setIdentifier("");
                  }
                  onForgot?.();
                }}
              >
                Mot de passe oublié ?
              </button>
            </div>

            <button type="submit" className="otl-go" disabled={loading}>
              <Ico c="#fff">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
              </Ico>
              {loading ? "Connexion…" : "Se connecter"}
            </button>
            <div
              className={`otl-msg${notice ? " otl-ok" : ""}`}
              role={shownError ? "alert" : notice ? "status" : undefined}
            >
              {shownError || notice}
            </div>
            <div className="otl-or">OU</div>
            <button
              type="button"
              className="otl-gg"
              onClick={handleGoogle}
              disabled={loading}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 48 48"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.2C12.4 13.6 17.7 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.5 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7.9-6.2A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.2z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.2C6.5 42.6 14.6 48 24 48z"
                />
              </svg>
              Continuer avec Google
            </button>
          </form>
        )}
      </main>

      <footer className="otl-foot">
        <div className="otl-ft">
          <span>
            <Ico c="#f7861b">
              <path d="M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6z" />
            </Ico>
            Sécurité renforcée
          </span>
          <b />
          <span>
            <Ico c="#f7861b">
              <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
            </Ico>
            Gestion intelligente
          </span>
          <b />
          <span>
            <Ico c="#f7861b">
              <path d="M4 14v-2a8 8 0 0 1 16 0v2M4 14h3v5H4zM17 14h3v5h-3z" />
            </Ico>
            Support 24/7
          </span>
        </div>
        <div className="otl-slogan">
          Pilotez votre flotte. Maîtrisez votre activité.
        </div>
      </footer>
    </div>
  );
}
