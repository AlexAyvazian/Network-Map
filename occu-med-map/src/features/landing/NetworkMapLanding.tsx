import {
  Component,
  Suspense,
  lazy,
  useEffect,
  useState,
  useRef,
  useMemo,
  type ReactNode,
} from "react";
import "./landing.css";
import { MagicRings } from "./MagicRings";
const World = lazy(() =>
  import("./LandingGlobe").then((m) => ({ default: m.World })),
);
const globeConfig = {
  pointSize: 1,
  globeColor: "#062056",
  emissive: "#050c30",
  emissiveIntensity: 0.2,
  shininess: 0.9,
  polygonColor: "rgba(190,213,255,0.75)",
  showAtmosphere: true,
  atmosphereColor: "#a5c4ef",
  atmosphereAltitude: 0.08,
  ambientLight: "#ffffff",
  directionalLeftLight: "#ffffff",
  directionalTopLight: "#ffffff",
  pointLight: "#ffffff",
  arcTime: 2200,
  arcLength: 0.9,
  rings: 1,
  maxRings: 3,
  initialPosition: { lat: 12, lng: 70 },
  autoRotate: true,
  autoRotateSpeed: 0.45,
};
// Decorative animation routes, not provider locations or coverage claims.
const data = [
  {
    order: 1,
    startLat: 37.77,
    startLng: -122.42,
    endLat: 51.51,
    endLng: -0.13,
    arcAlt: 0.27,
    color: "#38bdf8",
  },
  {
    order: 2,
    startLat: 51.51,
    startLng: -0.13,
    endLat: 1.35,
    endLng: 103.82,
    arcAlt: 0.3,
    color: "#06b6d4",
  },
  {
    order: 3,
    startLat: 1.35,
    startLng: 103.82,
    endLat: -33.87,
    endLng: 151.21,
    arcAlt: 0.2,
    color: "#3b82f6",
  },
  {
    order: 4,
    startLat: 25.2,
    startLng: 55.27,
    endLat: -1.29,
    endLng: 36.82,
    arcAlt: 0.15,
    color: "#06b6d4",
  },
  {
    order: 5,
    startLat: 35.68,
    startLng: 139.69,
    endLat: 1.35,
    endLng: 103.82,
    arcAlt: 0.16,
    color: "#60a5fa",
  },
  {
    order: 6,
    startLat: -26.2,
    startLng: 28.04,
    endLat: 51.51,
    endLng: -0.13,
    arcAlt: 0.25,
    color: "#3b82f6",
  },
];
class GlobeBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <p className="nm-landing-fallback">
        The interactive globe requires WebGL.
      </p>
    ) : (
      this.props.children
    );
  }
}
export function NetworkMapLanding({ onEnter }: { onEnter: () => void }) {
  const [entering, setEntering] = useState(false);
  const [entryStarted, setEntryStarted] = useState(false);
  const enteredRef = useRef(false);
  const completedRef = useRef(false);
  const finishEntry = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    setEntering(false);
    onEnter();
  };
  const enter = () => {
    if (enteredRef.current) return;
    enteredRef.current = true;
    setEntryStarted(true);
    if (reducedMotion) finishEntry();
    else setEntering(true);
  };
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const activeGlobeConfig = useMemo(
    () => ({ ...globeConfig, autoRotate: !reducedMotion }),
    [reducedMotion],
  );
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReducedMotion(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  return (
    <main className="nm-landing">
      <div className="nm-landing-stars" aria-hidden="true">
        <span className="nm-landing-twinkle nm-landing-twinkle-a" />
        <span className="nm-landing-twinkle nm-landing-twinkle-b" />
      </div>
      <header className="nm-landing-branding">
        <h1>Global Health Directory Map</h1>
      </header>
      <button
        className="nm-landing-enter"
        onClick={enter}
        disabled={entryStarted}
        aria-busy={entering}
      >
        Enter Map <span aria-hidden="true">→</span>
      </button>
      <section
        className="nm-landing-globe-stage"
        aria-label="Interactive globe. Drag to rotate."
        tabIndex={0}
      >
        {entering && <MagicRings onComplete={finishEntry} />}
        <GlobeBoundary>
          <Suspense
            fallback={
              <div className="nm-landing-loading" aria-label="Loading globe" />
            }
          >
            <World
              globeConfig={activeGlobeConfig}
              data={data}
              reducedMotion={reducedMotion}
            />
          </Suspense>
        </GlobeBoundary>
      </section>
    </main>
  );
}
