import type { ReactNode } from "react";
import { Headphones, ShieldCheck, TrendingUp } from "lucide-react";
import "../../assets/login.css";

const LOGO = `${import.meta.env.BASE_URL}branding/otl-logo.png`;
const STAGE = `${import.meta.env.BASE_URL}branding/otl-login-stage.jpg`;
const HERO = `${import.meta.env.BASE_URL}branding/otl-login-trucks-banner.png`;

/**
 * Écran de connexion OTL.
 *
 * Le décor est la maquette fournie par le propriétaire : elle est utilisée telle
 * quelle, sans Canvas ni modèle 3D. Seule la carte du formulaire a été nettoyée
 * dans le décor (son contenu dessiné est remplacé par le verre de la carte) afin
 * que le formulaire HTML puisse s'y superposer au pixel près.
 *
 * Le panneau est positionné sur la carte dessinée de la maquette
 * (x 575→1097, y 155→812 sur 1672×941). Toutes ses mesures internes sont en
 * `cqw` : la composition reste identique à toutes les échelles desktop.
 */
export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="gestion-auth">
      <div className="gestion-auth__backdrop" aria-hidden="true" />
      <div className="gestion-auth__stage">
        <div className="gestion-auth__scene">
          {/* Décor complet de la maquette (carte nettoyée). */}
          <img
            className="otl-auth-background"
            src={STAGE}
            alt=""
            aria-hidden="true"
            fetchPriority="high"
            decoding="async"
            width={1672}
            height={941}
          />
          {/* Décor mobile : le camion de la maquette, sans la carte. */}
          <img
            className="otl-auth-trucks"
            src={HERO}
            alt=""
            aria-hidden="true"
            decoding="async"
            width={557}
            height={430}
          />
          <span className="gestion-auth__hero-veil" aria-hidden="true" />
          {/* Scintillement des lumières de la carte du monde. */}
          <span className="otl-auth-net" aria-hidden="true" />
          <span className="otl-auth-net otl-auth-net--late" aria-hidden="true" />

          {/* En-tête mobile (sur desktop, l'en-tête est dessiné dans le décor). */}
          <header className="gestion-auth__mobile-head">
            <div className="gestion-auth__mobile-brand">
              <span className="gestion-auth__logo-plate">
                <img
                  src={LOGO}
                  alt="OTL — OASIS TRANSPORT LOGISTICS"
                  width={1088}
                  height={477}
                  decoding="async"
                />
              </span>
              <p>Votre flotte, votre performance, votre contrôle.</p>
            </div>
            <span className="gestion-auth__badge">
              <span className="gestion-auth__badge-dot" aria-hidden="true" />
              En ligne
            </span>
          </header>

          <section
            className="gestion-auth__panel"
            aria-label="Espace de connexion OTL"
          >
            <div className="gestion-auth__card">
              <img
                className="otl-auth-logo"
                src={LOGO}
                alt="OTL — OASIS TRANSPORT LOGISTICS"
                width={1088}
                height={477}
                decoding="async"
              />
              {children}
            </div>
          </section>

          {/* Bandeau inférieur mobile (sur desktop, il est dessiné dans le décor). */}
          <footer className="gestion-auth__mobile-footer">
            <div className="gestion-auth__mobile-perks">
              <span>
                <ShieldCheck aria-hidden="true" />
                Sécurité renforcée
              </span>
              <span>
                <TrendingUp aria-hidden="true" />
                Gestion intelligente
              </span>
              <span>
                <Headphones aria-hidden="true" />
                Support 24/7
              </span>
            </div>
            <p>Pilotez votre flotte. Maîtrisez votre activité.</p>
          </footer>
        </div>
      </div>
    </main>
  );
}
