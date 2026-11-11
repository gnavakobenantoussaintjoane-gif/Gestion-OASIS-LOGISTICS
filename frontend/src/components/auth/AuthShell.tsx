import type { ReactNode } from "react";
import { Truck, ShieldCheck } from "lucide-react";
import TruckIllustration from "../animations/TruckIllustration";
import { usePreferences } from "../../contexts/PreferencesContext";
import { useMotionPreference } from "../../hooks/useMotionPreference";
import "../../assets/login.css";
export default function AuthShell({ children }: { children: ReactNode }) {
  const { animations } = usePreferences();
  const reduced = useMotionPreference();
  return (
    <main
      className={`gestion-auth ${animations && !reduced ? "gestion-auth--moving" : ""}`}
    >
      <div className="gestion-auth__layout">
        <section
          className="gestion-auth__intro"
          aria-label="Présentation de Gestion"
        >
          <div className="gestion-auth__brand">
            <span>
              <Truck size={28} />
            </span>
            <div>
              <strong>GESTION</strong>
              <small>FLEET MANAGEMENT</small>
            </div>
          </div>
          <div className="gestion-auth__pitch">
            <span className="gestion-auth__kicker">TRANSPORT & LOGISTIQUE</span>
            <h2>
              Votre flotte,
              <br />
              votre performance,
              <br />
              <em>votre contrôle.</em>
            </h2>
            <p>
              Gérez vos véhicules, vos missions, vos chauffeurs et vos finances
              depuis une plateforme centralisée.
            </p>
          </div>
          <div
            className="gestion-auth__illustration"
            role="img"
            aria-label="Illustration fixe d’un camion de transport OASIS LOGISTICS"
          >
            <TruckIllustration kind="40_DRY" />
          </div>
          <div className="gestion-auth__company">
            <ShieldCheck size={18} /> Espace privé OASIS LOGISTICS
          </div>
        </section>
        <section className="gestion-auth__panel">{children}</section>
      </div>
      <footer className="gestion-auth__footer">
        © {new Date().getFullYear()} Gestion · OASIS LOGISTICS
        <span>Transport · Logistique · Gestion de flotte</span>
      </footer>
      <div className="gestion-auth__background" aria-hidden="true">
        <svg viewBox="0 0 1440 210" preserveAspectRatio="none">
          <path d="M-50 190C300 190 280 75 710 125S1120 190 1500 45" />
          <path d="M-50 210C340 210 300 98 720 148S1180 210 1500 68" />
          <path
            className="gestion-auth__light"
            d="M-50 190C300 190 280 75 710 125S1120 190 1500 45"
          />
        </svg>
        <i />
        <i />
        <i />
        <i />
      </div>
    </main>
  );
}
