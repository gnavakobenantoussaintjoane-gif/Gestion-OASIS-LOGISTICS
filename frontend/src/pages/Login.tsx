import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
  Sun,
  Moon,
} from "lucide-react";
import { toast } from "sonner";
import Brand from "../components/Brand";
import LoginTruckAnimation from "../components/animations/LoginTruckAnimation";
import { api } from "../api/client";
import { useSession } from "../contexts/SessionContext";
import { usePreferences } from "../contexts/PreferencesContext";
const schema = z.object({
  email: z.email("Adresse e-mail invalide"),
  password: z.string().min(1, "Mot de passe requis").max(128),
});
export default function Login() {
  const [show, setShow] = useState(false);
  const { reload, error } = useSession();
  const { dark, toggleDark } = usePreferences();
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  });
  const submit = form.handleSubmit(async (values) => {
    try {
      await api("/auth/login", {
        method: "POST",
        body: JSON.stringify(values),
      });
      await reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  });
  return (
    <div className="login-page">
      <section className="login-form-panel">
        <div className="login-top">
          <Brand />
          <button
            className="icon-button"
            onClick={toggleDark}
            aria-label="Changer le thème"
          >
            {dark ? <Sun size={19} /> : <Moon size={19} />}
          </button>
        </div>
        <div className="login-form">
          <div className="eyebrow">
            <span /> VOTRE ESPACE PROFESSIONNEL
          </div>
          <h1>Bienvenue sur OASIS LOGISTICS</h1>
          <p>Pilotez votre flotte. Maîtrisez vos finances.</p>
          {error && (
            <div className="alert">
              {error.message}{" "}
              <button onClick={() => void reload()}>Réessayer</button>
            </div>
          )}
          <form onSubmit={submit}>
            <label>
              Adresse e-mail
              <input
                type="email"
                autoComplete="email"
                placeholder="vous@entreprise.ci"
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <small className="error">
                  {form.formState.errors.email.message}
                </small>
              )}
            </label>
            <label>
              Mot de passe
              <div className="password-field">
                <input
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Votre mot de passe"
                  {...form.register("password")}
                />
                <button
                  type="button"
                  aria-label={
                    show
                      ? "Masquer le mot de passe"
                      : "Afficher le mot de passe"
                  }
                  onClick={() => setShow((v) => !v)}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {form.formState.errors.password && (
                <small className="error">
                  {form.formState.errors.password.message}
                </small>
              )}
            </label>
            <div className="auth-security">
              <LockKeyhole size={13} /> Session chiffrée · Accès sécurisé
            </div>
            <button
              className="button primary login-submit"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting
                ? "Connexion en cours…"
                : "Se connecter"}
              <ArrowRight size={17} />
            </button>
          </form>
          <div className="login-switch">
            Espace privé OASIS LOGISTICS.
            <br />
            Pour obtenir un accès, contactez votre administrateur.
          </div>
          <div className="auth-note">
            <ShieldCheck size={21} />
            <p>
              Accès réservé aux collaborateurs autorisés.
              <br />
              Vos opérations et vos données restent confidentielles.
            </p>
          </div>
        </div>
        <footer>
          © {new Date().getFullYear()} OASIS LOGISTICS{" "}
          <span>Africa/Abidjan · FCFA</span>
        </footer>
      </section>
      <LoginTruckAnimation />
    </div>
  );
}
