import { useSession } from "../contexts/SessionContext";
import Brand from "../components/Brand";
import { toast } from "sonner";
export default function Onboarding() {
  const { session, reload, logout } = useSession();
  return (
    <div className="onboarding">
      <Brand />
      <div className="card">
        <span className="eyebrow">ESPACE PRIVÉ</span>
        <h1>Votre accès OASIS LOGISTICS</h1>
        <p>
          Le compte {session?.user.email} n’est pas encore rattaché à l’équipe.
          Demandez à l’administrateur OASIS LOGISTICS de vous attribuer un rôle.
          La création d’autres entreprises n’est pas autorisée.
        </p>
        <div className="onboarding-actions">
          <button className="button primary" onClick={() => void reload()}>
            Vérifier mon accès
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
