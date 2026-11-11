import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import AuthShell from "../components/auth/AuthShell";
import { api } from "../api/client";
import { useSession } from "../contexts/SessionContext";
import type { Session } from "../types";
export default function AuthReturn({ recovery }: { recovery: boolean }) {
  const navigate = useNavigate();
  const { reload } = useSession();
  const [params] = useState(() => new URLSearchParams(window.location.search));
  const operation = useRef<Promise<void> | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    let mounted = true;
    if (!operation.current)
      operation.current = (async () => {
        const code = params.get("code");
        window.history.replaceState(null, "", window.location.pathname);
        if (params.has("error") || !code)
          throw new Error(
            recovery
              ? "Le lien est invalide ou expiré. Demandez un nouveau lien."
              : "La connexion Google a été refusée ou n’est pas configurée. Utilisez votre e-mail ou contactez votre administrateur.",
          );
        await api("/auth/callback", {
          method: "POST",
          body: JSON.stringify({
            code,
            flow: recovery ? "recovery" : "google",
          }),
        });
        if (!recovery) {
          await api<Session>("/auth/session");
          await reload();
        }
      })();
    void operation.current
      .then(() => {
        if (!mounted) return;
        if (recovery) setReady(true);
        else navigate("/", { replace: true });
      })
      .catch((e: unknown) => {
        if (mounted)
          setError(e instanceof Error ? e.message : "Connexion impossible.");
      });
    return () => {
      mounted = false;
    };
  }, [params, recovery, reload, navigate]);
  async function save() {
    if (lock.current) return;
    setError("");
    if (password.length < 12 || password.length > 128) {
      setError("Utilisez entre 12 et 128 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    lock.current = true;
    setBusy(true);
    try {
      const result = await api<{ revoked: boolean }>(
        "/auth/recovery/password",
        { method: "POST", body: JSON.stringify({ password }) },
      );
      setPassword("");
      setConfirm("");
      toast.success("Mot de passe modifié. Reconnectez-vous.");
      if (!result.revoked)
        toast.warning(
          "La révocation des autres sessions n’a pas pu être confirmée.",
        );
      navigate("/", { replace: true });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Modification impossible.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <AuthShell>
      <div className="gestion-auth__form-heading">
        <h1>{recovery ? "Nouveau mot de passe" : "Connexion Google"}</h1>
        <p>
          {ready
            ? "Choisissez un mot de passe unique et sécurisé."
            : "Vérification du lien sécurisé…"}
        </p>
      </div>
      {error && (
        <div className="gestion-auth__error" role="alert">
          {error}
        </div>
      )}
      {ready && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <label htmlFor="new-password">Nouveau mot de passe</label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
          />
          <label htmlFor="confirm-password">Confirmer le mot de passe</label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={busy}
          />
          <button className="gestion-auth__submit" disabled={busy}>
            {busy ? "Enregistrement…" : "Enregistrer le mot de passe"}
          </button>
        </form>
      )}
      <button
        className="gestion-auth__back"
        onClick={() => navigate("/", { replace: true })}
      >
        Retour à la connexion
      </button>
    </AuthShell>
  );
}
