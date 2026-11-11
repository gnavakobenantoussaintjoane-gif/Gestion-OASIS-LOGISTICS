import { Component, lazy, Suspense, useState, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import { usePreferences } from "../../contexts/PreferencesContext";
import type { ContainerKind } from "./TruckModel";
const Scene = lazy(() => import("./TruckScene"));
class SceneBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
export function FlatTruck({
  animated = true,
  kind = "40_DRY",
}: {
  animated?: boolean;
  kind?: ContainerKind;
}) {
  return (
    <div
      className={`flat-scene ${animated ? "rolling" : ""}`}
      aria-label="Camion porte-conteneur animé"
    >
      <div className="port-crane" />
      <div className="flat-road" />
      <div className={`flat-truck kind-${kind}`}>
        <div className="flat-container">
          GESTION{" "}
          <span>
            {kind === "40_REEFER"
              ? "TEMPERATURE CONTROLLED"
              : "INTERMODAL LOGISTICS"}
          </span>
          {kind === "40_REEFER" && <i className="reefer-unit" />}
        </div>
        <div className="flat-cab">
          <i />
        </div>
        <div className="flat-chassis" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`flat-wheel wheel-${i}`}>
            <i />
          </div>
        ))}
      </div>
    </div>
  );
}
export default function TruckVisual({
  kind = "40_DRY",
}: {
  kind?: ContainerKind;
}) {
  const { animations } = usePreferences();
  const reduce = useReducedMotion();
  const [supported] = useState(() => {
    try {
      return (
        !!document.createElement("canvas").getContext("webgl2") &&
        navigator.hardwareConcurrency > 2 &&
        window.innerWidth > 700
      );
    } catch {
      return false;
    }
  });
  const active = animations && !reduce;
  const fallback = <FlatTruck animated={!!active} kind={kind} />;
  return (
    <div className="truck-visual">
      {supported ? (
        <SceneBoundary fallback={fallback}>
          <Suspense fallback={fallback}>
            <Scene kind={kind} animate={!!active} />
          </Suspense>
        </SceneBoundary>
      ) : (
        fallback
      )}
    </div>
  );
}
