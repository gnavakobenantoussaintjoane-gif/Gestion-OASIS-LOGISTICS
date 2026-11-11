import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePreferences } from "../../contexts/PreferencesContext";
import { useMotionPreference } from "../../hooks/useMotionPreference";
const Scene = lazy(() => import("./TruckScene"));
class SceneError extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}
export default function TruckBackground() {
  const { animations } = usePreferences();
  const reduced = useMotionPreference();
  const [supported] = useState(supportsWebGL);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [compact, setCompact] = useState(
    () => window.matchMedia("(max-width: 760px)").matches,
  );
  const [visible, setVisible] = useState(() => !document.hidden);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const update = () => setCompact(media.matches);
    const visibility = () => setVisible(!document.hidden);
    media.addEventListener("change", update);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      media.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  const onLoaded = useCallback(() => setLoaded(true), []);
  const onError = useCallback(() => setFailed(true), []);
  const state = !supported || failed ? "static" : loaded ? "ready" : "loading";
  return (
    <div
      className="gestion-auth__three"
      data-scene-state={state}
      data-motion={state === "ready" && animations && !reduced && visible ? "on" : "off"}
      aria-hidden="true"
    >
      <div className="gestion-auth__static-sky" />
      {supported && !failed && (
        <SceneError onError={onError}>
          <Suspense fallback={null}>
            <Scene
              animate={animations && !reduced && visible}
              compact={compact}
              onLoaded={onLoaded}
              onLost={onError}
            />
          </Suspense>
        </SceneError>
      )}
      <div className="gestion-auth__scene-scrim" />
    </div>
  );
}
