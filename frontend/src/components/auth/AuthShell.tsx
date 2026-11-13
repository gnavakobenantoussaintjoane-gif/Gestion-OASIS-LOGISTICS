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
          {/* Décor large : la maquette complète, utilisée quand la carte HTML
              peut se superposer exactement à la carte dessinée (écrans ≥ 1101 px). */}
          <img
            className="otl-auth-background"
            src={`${import.meta.env.BASE_URL}branding/otl-login-background.png`}
            alt=""
            aria-hidden="true"
            fetchPriority="high"
            decoding="async"
          />
          {/* Décor étroit : camion entier de la maquette, net et jamais flouté,
              pour les tablettes et les téléphones. */}
          <img
            className="otl-auth-trucks"
            src={`${import.meta.env.BASE_URL}branding/otl-login-trucks.png`}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            width={557}
            height={941}
          />
          {/* Carte du monde animée : deux calques de points lumineux superposés
              au réseau déjà dessiné dans la maquette. Purement décoratif. */}
          <span className="otl-auth-net" aria-hidden="true" />
          <span
            className="otl-auth-net otl-auth-net--late"
            aria-hidden="true"
          />
          <img
            className="otl-auth-trucks-banner"
            src={`${import.meta.env.BASE_URL}branding/otl-login-trucks-banner.png`}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            width={557}
            height={430}
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
