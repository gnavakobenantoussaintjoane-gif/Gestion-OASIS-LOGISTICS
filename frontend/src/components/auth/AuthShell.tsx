import type { ReactNode } from "react";
import { OtlLogo } from "../Brand";
import "../../assets/login.css";
/** Fond fixe fourni par le propriétaire ; les champs restent de vrais éléments HTML.
 * Aucun Canvas ni chargement Three.js sur les écrans Auth.
 */
export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="gestion-auth gestion-auth--static">
      <img
        className="otl-auth-background"
        src={`${import.meta.env.BASE_URL}branding/otl-login-background.png`}
        alt=""
        aria-hidden="true"
        fetchPriority="high"
        decoding="async"
      />
      <div className="gestion-auth__layout">
        <section
          className="gestion-auth__panel"
          aria-label="Espace de connexion OTL"
        >
          <OtlLogo className="otl-auth-logo" />
          {children}
        </section>
      </div>
    </main>
  );
}
