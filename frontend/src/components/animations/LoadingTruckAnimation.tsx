import { usePreferences } from "../../contexts/PreferencesContext";
import { useReducedMotion } from "motion/react";
import { FlatTruck } from "./TruckVisual";
export default function LoadingTruckAnimation() {
  const { animations } = usePreferences();
  const reduce = useReducedMotion();
  return (
    <div
      className="loading-screen"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <strong>
        GESTION<span>TRANSPORT & LOGISTICS</span>
      </strong>
      <FlatTruck animated={animations && !reduce} />
      <div className="loading-track">
        <i />
      </div>
      <p>Préparation de votre espace de gestion...</p>
    </div>
  );
}
