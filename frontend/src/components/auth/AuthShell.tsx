import type { ReactNode } from "react";
import { OtlLogo } from "../Brand";
import "../../assets/login.css";

/**
 * Écran de connexion OTL.
 * La maquette fournie par le propriétaire sert de décor fixe : elle est affichée
 * intacte (aucune retouche, aucun Canvas ni modèle 3D). La carte, le logo et le
 * formulaire sont de vrais éléments HTML, car les champs dessinés dans une image
 * ne peuvent pas recevoir de saisie ni déclencher la connexion.
 */
export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="gestion-auth gestion-auth--static">
      <div className="gestion-auth__stage">
        <div className="gestion-auth__canvas">
          <img
            className="otl-auth-background"
            src={`${import.meta.env.BASE_URL}branding/otl-login-background.png`}
            alt=""
            aria-hidden="true"
            fetchPriority="high"
            decoding="async"
          />
        </div>
        <section
          className="gestion-auth__panel"
          aria-label="Espace de connexion OTL"
        >
          <div className="gestion-auth__card">
            <OtlLogo className="otl-auth-logo" />
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
