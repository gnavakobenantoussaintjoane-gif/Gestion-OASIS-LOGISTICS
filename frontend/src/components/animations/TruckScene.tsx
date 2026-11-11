import { Canvas } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import TruckModel, { type ContainerKind } from "./TruckModel";
export default function TruckScene({
  kind = "40_DRY",
  animate = true,
}: {
  kind?: ContainerKind;
  animate?: boolean;
}) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [10, 6, 12], fov: 36 }}
      shadows
      frameloop={animate ? "always" : "demand"}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
    >
      <ambientLight intensity={1.4} />
      <directionalLight
        position={[5, 9, 4]}
        intensity={3}
        castShadow
        shadow-mapSize={[512, 512]}
      />
      <pointLight position={[-5, 3, -5]} intensity={30} color="#368bff" />
      <TruckModel kind={kind} animate={animate} />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        receiveShadow
      >
        <planeGeometry args={[25, 12]} />
        <meshStandardMaterial color="#142742" />
      </mesh>
      {[-8, -4, 0, 4, 8].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.01, 2.4]}>
          <planeGeometry args={[1.8, 0.06]} />
          <meshStandardMaterial color="#6986a4" />
        </mesh>
      ))}
      {[-6, -2, 2].map((x, i) => (
        <group key={x} position={[x, 0, -5]}>
          <mesh position={[0, 1.4, 0]}>
            <boxGeometry args={[3, 2.4, 1.6]} />
            <meshStandardMaterial color={i % 2 ? "#1c4062" : "#244b79"} />
          </mesh>
          <mesh position={[1.8, 4, 0]}>
            <boxGeometry args={[0.14, 8, 0.14]} />
            <meshStandardMaterial color="#436387" />
          </mesh>
          <mesh position={[0.2, 7.5, 0]}>
            <boxGeometry args={[4, 0.14, 0.14]} />
            <meshStandardMaterial color="#436387" />
          </mesh>
        </group>
      ))}
      <ContactShadows
        position={[0, 0, 0]}
        opacity={0.45}
        scale={20}
        blur={2}
        far={10}
        frames={animate ? Infinity : 1}
      />
    </Canvas>
  );
}
