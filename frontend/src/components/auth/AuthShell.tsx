import type { ReactNode } from "react";
import { ShieldCheck, ChartNoAxesCombined, Truck } from "lucide-react";
import TruckBackground from "../login3d/TruckBackground";
import { OtlLogo } from "../Brand";
import { usePreferences } from "../../contexts/PreferencesContext";
import { useMotionPreference } from "../../hooks/useMotionPreference";
import "../../assets/login.css";
/** La scène est décorative : aucun chargement WebGL ne bloque les formulaires Auth. */
export default function AuthShell({ children }: { children: ReactNode }) {
  const { animations } = usePreferences();
  const reduced = useMotionPreference();
  return (
    <main
      className={`gestion-auth ${animations && !reduced ? "gestion-auth--moving" : ""}`}
    >
      <TruckBackground />
      <header className="otl-auth-header">
        <div className="otl-auth-identity">
          <OtlLogo />
          <p>
            Votre flotte, votre performance,
            <br />
            votre contrôle.
            <span />
          </p>
        </div>
        <span className="otl-secure">
          <ShieldCheck size={16} /> Accès privé
        </span>
      </header>
      <div className="gestion-auth__layout">
        <section
          className="gestion-auth__panel"
          aria-label="Espace de connexion OTL"
        >
          <OtlLogo className="otl-auth-logo" />
          {children}
        </section>
      </div>
      <footer className="gestion-auth__footer">
        <div>
          <span>
            <ShieldCheck size={21} /> Accès sécurisé
          </span>
          <span>
            <ChartNoAxesCombined size={21} /> Gestion intelligente
          </span>
          <span>
            <Truck size={21} /> Transport & logistique
          </span>
        </div>
        <p>
          Pilotez votre flotte. Maîtrisez votre activité.
          <small>© {new Date().getFullYear()} OASIS TRANSPORT LOGISTICS</small>
        </p>
      </footer>
    </main>
  );
}
