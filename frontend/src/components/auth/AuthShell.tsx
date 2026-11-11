import type { ReactNode } from "react";
import { Truck, ShieldCheck } from "lucide-react";
import TruckBackground from "../login3d/TruckBackground";
import { usePreferences } from "../../contexts/PreferencesContext";
import { useMotionPreference } from "../../hooks/useMotionPreference";
import "../../assets/login.css";
/** Présentation partagée des écrans Auth ; le décor 3D ne contrôle jamais le formulaire. */
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
          aria-label="Présentation de OASIS LOGISTICS"
        >
          <div className="gestion-auth__brand">
            <span>
              <Truck size={28} />
            </span>
            <div>
              <strong>OASIS LOGISTICS</strong>
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
          <div className="gestion-auth__company">
            <ShieldCheck size={18} /> Espace privé OASIS LOGISTICS
          </div>
        </section>
        <section className="gestion-auth__panel">{children}</section>
      </div>
      <footer className="gestion-auth__footer">
        © {new Date().getFullYear()} OASIS LOGISTICS
        <span>Transport · Logistique · Gestion de flotte</span>
      </footer>
      <TruckBackground />
    </main>
  );
}
