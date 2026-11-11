import TruckVisual from "./TruckVisual";
export default function LoginTruckAnimation() {
  return (
    <aside className="login-visual">
      <div className="login-visual-copy">
        <span className="hero-kicker">LA LOGISTIQUE, EN MOUVEMENT.</span>
        <h2>
          Chaque voyage ouvre
          <br />
          de nouvelles perspectives.
        </h2>
        <p>
          Une vision claire de votre activité.
          <br />
          Des décisions qui vous font avancer.
        </p>
      </div>
      <TruckVisual />
      <div className="login-visual-footer">
        <span>ABIDJAN, CÔTE D’IVOIRE</span>
        <span>TRANSPORT · OPÉRATIONS · FINANCES</span>
      </div>
    </aside>
  );
}
