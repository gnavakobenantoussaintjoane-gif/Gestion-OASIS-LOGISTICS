import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Group, Mesh, Object3D, PerspectiveCamera } from "three";
import { advanceTruck, WHEEL_RADIUS } from "./motion";
import LogisticsHub from "./LogisticsHub";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
const MODEL_URL = `${import.meta.env.BASE_URL}models/truck.glb`;

function Truck({
  animate,
  onLoaded,
  parked,
}: {
  animate: boolean;
  onLoaded: () => void;
  parked?: [number, number, number];
}) {
  const { scene } = useGLTF(MODEL_URL);
  // Clone transforms only. Cached GLTF geometry/materials remain shared and owned by useGLTF.
  const model = useMemo(() => {
    const copy = clone(scene);
    copy.traverse((node) => {
      if (node instanceof Mesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    return copy;
  }, [scene]);
  const wheels = useMemo(() => {
    const found: Object3D[] = [];
    model.traverse((node) => {
      if (node.name.startsWith("wheel-")) found.push(node);
    });
    return found;
  }, [model]);
  const moving = useRef<Group>(null);
  const distance = useRef(12);
  useEffect(() => {
    onLoaded();
  }, [onLoaded]);
  // Déplacer uniquement les transformations : aucune géométrie recréée à chaque image.
  useFrame((_state, delta) => {
    if (!animate || parked || !moving.current) return;
    const next = advanceTruck(distance.current, delta);
    const step = (next - distance.current + 44) % 44;
    distance.current = next;
    moving.current.position.x = -22 + distance.current;
    // Distance / rayon = angle parcouru ; les pivots wheel-* viennent du modèle GLB.
    wheels.forEach((wheel) => {
      wheel.rotation.x += step / WHEEL_RADIUS;
    });
  });
  return (
    <group
      ref={moving}
      position={parked || [-10, 0, 6]}
      rotation={[0, parked ? 0 : Math.PI / 2, 0]}
    >
      <primitive object={model} dispose={null} />
    </group>
  );
}
function CameraRig({ compact }: { compact: boolean }) {
  useFrame(({ camera, size }) => {
    if (!(camera instanceof PerspectiveCamera)) return;
    // Canvas supplies the live aspect ratio; update framing on resize without rebuilding the scene.
    const x = compact ? 15 : 16;
    const y = compact ? 14 : 10;
    const z = compact ? 29 : 28;
    if (
      camera.position.x !== x ||
      camera.position.y !== y ||
      camera.position.z !== z
    ) {
      camera.position.set(x, y, z);
      camera.lookAt(0, 2.8, 0);
      camera.updateProjectionMatrix();
    }
    if (camera.aspect !== size.width / size.height) {
      camera.aspect = size.width / size.height;
      camera.updateProjectionMatrix();
    }
  });
  return null;
}
function ContextLoss({ onLost }: { onLost: () => void }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (event: Event) => {
      event.preventDefault();
      onLost();
    };
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [gl, onLost]);
  return null;
}
function Road() {
  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.04, 0]}
        receiveShadow
      >
        <planeGeometry args={[140, 80]} />
        <meshStandardMaterial color="#203c62" roughness={0.3} metalness={0.5} />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.015, 0]}
        receiveShadow
      >
        <planeGeometry args={[140, 6]} />
        <meshStandardMaterial
          color="#304566"
          roughness={0.35}
          metalness={0.4}
        />
      </mesh>
      {[-2.65, 2.65].map((z) => (
        <mesh key={z} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, z]}>
          <planeGeometry args={[140, 0.07]} />
          <meshStandardMaterial color="#e6eef5" />
        </mesh>
      ))}
      {Array.from({ length: 22 }, (_, i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[-42 + i * 4, 0.002, 0]}
        >
          <planeGeometry args={[1.8, 0.08]} />
          <meshStandardMaterial color="#f5e7b1" />
        </mesh>
      ))}
    </>
  );
}
export default function TruckScene({
  animate,
  compact,
  onLoaded,
  onLost,
}: {
  animate: boolean;
  compact: boolean;
  onLoaded: () => void;
  onLost: () => void;
}) {
  return (
    <Canvas
      dpr={compact ? 1 : [1, 1.5]}
      shadows={!compact}
      camera={{
        position: compact ? [15, 14, 29] : [16, 10, 28],
        fov: compact ? 43 : 38,
        near: 0.1,
        far: 180,
      }}
      frameloop={animate ? "always" : "demand"}
      gl={{ alpha: false, antialias: !compact, powerPreference: "low-power" }}
      onCreated={({ camera }) => {
        camera.lookAt(0, 2.8, 0);
      }}
    >
      <color attach="background" args={["#7296ca"]} />
      <fog attach="fog" args={["#7296ca", 45, 125]} />
      <ambientLight intensity={1.1} />
      <directionalLight position={[-20, 6, 10]} color="#ffad61" intensity={3} />
      <hemisphereLight args={["#b9d5ff", "#102f70", 1.5]} />
      <directionalLight
        position={[-6, 12, 7]}
        intensity={3.2}
        castShadow={!compact}
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-bias={-0.001}
      />
      <ContextLoss onLost={onLost} />
      <CameraRig compact={compact} />
      <Road />
      <Suspense fallback={null}>
        <LogisticsHub compact={compact} />
        <Truck animate={animate} onLoaded={onLoaded} />
        <Truck animate={false} onLoaded={onLoaded} parked={[1, 0, -2]} />
        {!compact && (
          <Truck animate={false} onLoaded={onLoaded} parked={[7, 0, -2]} />
        )}
        {!compact && (
          <Truck animate={false} onLoaded={onLoaded} parked={[13, 0, -2]} />
        )}
      </Suspense>
    </Canvas>
  );
}
