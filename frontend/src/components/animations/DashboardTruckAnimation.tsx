import Brand from "../Brand";
import { useState } from "react";
import TruckVisual from "./TruckVisual";
import type { ContainerKind } from "./TruckModel";
export default function DashboardTruckAnimation() {
  const [kind, setKind] = useState<ContainerKind>("40_DRY");
  return (
    <section className="fleet-hero">
      <div className="hero-copy">
        <span className="hero-kicker">
          <i /> CONNECTÉ À VOTRE ACTIVITÉ
        </span>
        <h2>
          Gardez une longueur
          <br />
          d’avance.
        </h2>
        <p>
          Votre flotte, vos opérations, vos performances.
          <br />
          Un seul espace pour tout piloter.
        </p>
        <div className="hero-brand">
          <Brand />
        </div>
      </div>
      <TruckVisual kind={kind} />
      <div className="container-options">
        {(["20_DRY", "40_DRY", "40_REEFER"] as const).map((k) => (
          <button
            key={k}
            className={kind === k ? "selected" : ""}
            onClick={() => setKind(k)}
          >
            {k.replace("_", "′ ")}
          </button>
        ))}
      </div>
      <span className="hero-coordinates">
        5°17′ N · 4°00′ W &nbsp; / &nbsp; PORT D’ABIDJAN
      </span>
    </section>
  );
}
