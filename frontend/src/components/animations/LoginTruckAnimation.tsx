import { Pause, Play, Route, ShieldCheck } from "lucide-react";
import { useMotionPreference } from "../../hooks/useMotionPreference";
import { usePreferences } from "../../contexts/PreferencesContext";
import { FlatTruck } from "./TruckVisual";

export default function LoginTruckAnimation() {
  const { animations, toggleAnimations } = usePreferences();
  const reduced = useMotionPreference();
  const moving = animations && !reduced;
  return (
    <aside
      className={`login-visual login-visual--showcase ${moving ? "is-moving" : ""}`}
      aria-label="Transport OASIS LOGISTICS"
    >
      <div className="login-visual-copy">
        <span className="hero-kicker">OASIS LOGISTICS · ABIDJAN</span>
        <h2>
          Votre flotte.
          <br />
          Notre engagement.
        </h2>
        <p>Le transport maîtrisé, du terminal à destination.</p>
      </div>
      <div
        className="oasis-road-stage"
        role="img"
        aria-label="Camion OASIS LOGISTICS sur une route devant le port d’Abidjan"
      >
        <div className="oasis-skyline" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </div>
        <FlatTruck animated={!!moving} />
        <div className="oasis-road-markings" aria-hidden="true" />
      </div>
      <div className="oasis-showcase-bottom">
        <div className="oasis-service-labels">
          <span>
            <Route size={18} />
            Transport & opérations
          </span>
          <span>
            <ShieldCheck size={18} />
            Espace privé sécurisé
          </span>
        </div>
        <button
          className="oasis-motion-button"
          onClick={toggleAnimations}
          aria-pressed={!animations}
          disabled={!!reduced}
          aria-label={
            animations ? "Mettre l’animation en pause" : "Reprendre l’animation"
          }
        >
          {moving ? <Pause size={17} /> : <Play size={17} />}
          {reduced
            ? "Mouvements réduits"
            : moving
              ? "Mettre en pause"
              : "Reprendre"}
        </button>
      </div>
    </aside>
  );
}
