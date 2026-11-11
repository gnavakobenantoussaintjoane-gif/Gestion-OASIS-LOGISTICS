import { useState } from "react";
import { api } from "../api/client";
import { useSession } from "../contexts/SessionContext";
import Brand from "../components/Brand";
import { toast } from "sonner";
export default function Onboarding() {
  const { session, reload, logout } = useSession();
  const [busy, setBusy] = useState(false);
  return (
    <div className="onboarding">
      <Brand />
      <div className="card">
        <span className="eyebrow">PREMIÈRE CONNEXION</span>
        <h1>
          Votre entreprise,
          <br />
          votre espace.
        </h1>
        <p>
          Connecté en tant que {session?.user.email}. Créez votre entreprise
          pour en devenir administrateur. Si vous rejoignez une équipe, demandez
          d’abord à son administrateur de rattacher cette adresse.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              const data = Object.fromEntries(new FormData(e.currentTarget));
              await api("/auth/company", {
                method: "POST",
                body: JSON.stringify(data),
              });
              await reload();
            } catch (error) {
              toast.error((error as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Votre nom complet
            <input name="display_name" minLength={2} maxLength={100} required />
          </label>
          <label>
            Nom de l’entreprise
            <input name="company_name" minLength={2} maxLength={100} required />
          </label>
          <button className="button primary" disabled={busy}>
            {busy ? "Création…" : "Créer mon entreprise"}
          </button>
        </form>
        <div className="onboarding-actions">
          <button className="text-button" onClick={() => void reload()}>
            Vérifier mon rattachement
          </button>
          <button
            className="text-button"
            onClick={() => void logout().catch((e) => toast.error(e.message))}
          >
            Me déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}
