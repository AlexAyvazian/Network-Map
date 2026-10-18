// Adapted from Aceternity UI's GitHub Globe (https://ui.aceternity.com/components/github-globe).
// Uses the supplied country geometry. Routes are decorative.
import { useEffect, useMemo } from "react";
import { Color, Vector3, type MeshPhongMaterial } from "three";
import ThreeGlobe from "three-globe";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import countries from "./globe.json";
export type Position = {
  order: number;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  arcAlt: number;
  color: string;
};
export type GlobeConfig = {
  pointSize?: number;
  globeColor?: string;
  showAtmosphere?: boolean;
  atmosphereColor?: string;
  atmosphereAltitude?: number;
  emissive?: string;
  emissiveIntensity?: number;
  shininess?: number;
  polygonColor?: string;
  ambientLight?: string;
  directionalLeftLight?: string;
  directionalTopLight?: string;
  pointLight?: string;
  arcTime?: number;
  arcLength?: number;
  rings?: number;
  maxRings?: number;
  initialPosition?: { lat: number; lng: number };
  autoRotate?: boolean;
  autoRotateSpeed?: number;
};
type WorldProps = {
  globeConfig: GlobeConfig;
  data: Position[];
  reducedMotion?: boolean;
};
function Globe({ globeConfig: config, data, reducedMotion }: WorldProps) {
  const globe = useMemo(() => new ThreeGlobe({ animateIn: false }), []);
  useEffect(() => {
    const material = globe.globeMaterial() as MeshPhongMaterial;
    material.color = new Color(config.globeColor ?? "#062056");
    material.emissive = new Color(config.emissive ?? "#050c30");
    material.emissiveIntensity = config.emissiveIntensity ?? 0.2;
    material.shininess = config.shininess ?? 0.9;
    const points = [
      ...new Map(
        data
          .flatMap((d) => [
            { lat: d.startLat, lng: d.startLng, color: d.color },
            { lat: d.endLat, lng: d.endLng, color: d.color },
          ])
          .map((p) => [`${p.lat}:${p.lng}`, p]),
      ).values(),
    ];
    globe
      .hexPolygonsData(countries.features)
      .hexPolygonResolution(3)
      .hexPolygonMargin(0.7)
      .hexPolygonColor(() => config.polygonColor ?? "rgba(190,213,255,0.75)")
      .showAtmosphere(config.showAtmosphere ?? true)
      .atmosphereColor(config.atmosphereColor ?? "#a5c4ef")
      .atmosphereAltitude(config.atmosphereAltitude ?? 0.08)
      .arcsData(data)
      .arcStartLat("startLat")
      .arcStartLng("startLng")
      .arcEndLat("endLat")
      .arcEndLng("endLng")
      .arcColor("color")
      .arcAltitude("arcAlt")
      .arcStroke(0.3)
      .arcDashLength(reducedMotion ? 1 : (config.arcLength ?? 0.9))
      .arcDashGap(reducedMotion ? 0 : 15)
      .arcDashInitialGap("order")
      .arcDashAnimateTime(reducedMotion ? 0 : (config.arcTime ?? 2200))
      .pointsData(points)
      .pointColor("color")
      .pointsMerge(true)
      .pointAltitude(0)
      .pointRadius(config.pointSize ?? 1)
      .ringsData(reducedMotion || config.rings === 0 ? [] : points)
      .ringColor("color")
      .ringMaxRadius(config.maxRings ?? 3)
      .ringPropagationSpeed(3)
      .ringRepeatPeriod(
        ((config.arcTime ?? 2200) * (config.arcLength ?? 0.9)) /
          Math.max(config.rings ?? 1, 1),
      );
    if (reducedMotion) globe.pauseAnimation();
    else globe.resumeAnimation();
    return () => {
      globe.pauseAnimation();
    };
  }, [globe, config, data, reducedMotion]);
  useEffect(
    () => () => {
      globe.pauseAnimation();
      globe.traverse((object) => {
        const mesh = object as import("three").Mesh;
        mesh.geometry?.dispose();
        if (mesh.material)
          (Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material]
          ).forEach((material) => material.dispose());
      });
    },
    [globe],
  );
  return <primitive object={globe} />;
}
export function World(props: WorldProps) {
  const { globeConfig: config } = props;
  const position = useMemo(() => {
    const lat = ((config.initialPosition?.lat ?? 12) * Math.PI) / 180;
    const lng = ((config.initialPosition?.lng ?? 70) * Math.PI) / 180;
    return new Vector3(
      300 * Math.cos(lat) * Math.sin(lng),
      300 * Math.sin(lat),
      300 * Math.cos(lat) * Math.cos(lng),
    );
  }, [config.initialPosition?.lat, config.initialPosition?.lng]);
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: true }}
      camera={{ fov: 50, near: 0.1, far: 1800, position }}
    >
      <ambientLight color={config.ambientLight ?? "#fff"} intensity={0.6} />
      <directionalLight
        color={config.directionalLeftLight ?? "#fff"}
        position={[-400, 100, 400]}
        intensity={1}
      />
      <directionalLight
        color={config.directionalTopLight ?? "#fff"}
        position={[-200, 500, 200]}
        intensity={1}
      />
      <pointLight
        color={config.pointLight ?? "#fff"}
        position={[-200, 500, 200]}
        intensity={0.8}
      />
      <Globe {...props} />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minDistance={300}
        maxDistance={300}
        autoRotate={config.autoRotate ?? true}
        autoRotateSpeed={config.autoRotateSpeed ?? 0.45}
        minPolarAngle={Math.PI / 3.5}
        maxPolarAngle={Math.PI - Math.PI / 3}
      />
    </Canvas>
  );
}
