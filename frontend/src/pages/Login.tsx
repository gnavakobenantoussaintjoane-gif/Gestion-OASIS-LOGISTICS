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
  const [register, setRegister] = useState(false);
  const [show, setShow] = useState(false);
  const { reload, error } = useSession();
  const { dark, toggleDark } = usePreferences();
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  });
  const submit = form.handleSubmit(async (values) => {
    if (register && values.password.length < 12) {
      form.setError("password", {
        message: "Utilisez au moins 12 caractères.",
      });
      return;
    }
    try {
      const result = await api<{ authenticated?: boolean; message?: string }>(
        `/auth/${register ? "register" : "login"}`,
        { method: "POST", body: JSON.stringify(values) },
      );
      if (register && !result.authenticated) {
        toast.success(result.message);
        setRegister(false);
      } else await reload();
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
          <h1>{register ? "Créez votre compte." : "Bienvenue sur OSIS LOGISTICS"}</h1>
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
                  autoComplete={register ? "new-password" : "current-password"}
                  placeholder={
                    register ? "12 caractères minimum" : "Votre mot de passe"
                  }
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
                : register
                  ? "Créer mon compte"
                  : "Se connecter"}
              <ArrowRight size={17} />
            </button>
          </form>
          <div className="login-switch">
            {register ? "Déjà un compte ?" : "Première connexion ?"}{" "}
            <button
              onClick={() => {
                setRegister((v) => !v);
                form.clearErrors();
              }}
            >
              {register ? "Se connecter" : "Créer un compte"}
            </button>
          </div>
          <div className="auth-note">
            <ShieldCheck size={21} />
            <p>
              Vos données sont privées et isolées par entreprise.
              <br />
              Aucune donnée fictive. Aucun tarif imposé.
            </p>
          </div>
        </div>
        <footer>
          © {new Date().getFullYear()} OSIS LOGISTICS{" "}
          <span>Africa/Abidjan · FCFA</span>
        </footer>
      </section>
      <LoginTruckAnimation />
    </div>
  );
}
