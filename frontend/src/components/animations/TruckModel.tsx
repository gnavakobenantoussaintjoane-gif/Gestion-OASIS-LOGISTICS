import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import type { Group } from "three";
export type ContainerKind = "20_DRY" | "40_DRY" | "40_REEFER";
export default function TruckModel({
  kind = "40_DRY",
  animate = true,
}: {
  kind?: ContainerKind;
  animate?: boolean;
}) {
  const group = useRef<Group>(null);
  const wheels = useRef<Group[]>([]);
  const length = kind === "20_DRY" ? 3 : 5.4;
  const color =
    kind === "40_REEFER"
      ? "#e8edf2"
      : kind === "20_DRY"
        ? "#ed8c48"
        : "#2a67d7";
  useFrame(({ clock }, dt) => {
    if (!animate) return;
    if (group.current)
      group.current.position.x = Math.sin(clock.elapsedTime * 0.3) * 1.1;
    wheels.current.forEach((w) => {
      w.rotation.z -= dt * 3;
    });
  });
  return (
    <group ref={group} position={[0, 0, 0]}>
      <RoundedBox args={[8, 0.18, 1.8]} position={[-0.4, 0.7, 0]} radius={0.05}>
        <meshStandardMaterial color="#223249" metalness={0.7} roughness={0.3} />
      </RoundedBox>
      <RoundedBox
        args={[1.8, 1.8, 1.9]}
        radius={0.16}
        position={[2.6, 1.65, 0]}
        castShadow
      >
        <meshStandardMaterial
          color="#f4f7fb"
          metalness={0.35}
          roughness={0.25}
        />
      </RoundedBox>
      <RoundedBox
        args={[0.95, 0.85, 1.93]}
        radius={0.1}
        position={[2.85, 2.05, 0]}
      >
        <meshStandardMaterial
          color="#112b49"
          metalness={0.5}
          roughness={0.18}
        />
      </RoundedBox>
      <mesh position={[3.53, 1.9, 0]}>
        <boxGeometry args={[0.03, 0.65, 1.6]} />
        <meshStandardMaterial color="#0d2541" metalness={0.8} roughness={0.1} />
      </mesh>
      <mesh position={[3.55, 1.1, 0]}>
        <boxGeometry args={[0.05, 0.3, 1.3]} />
        <meshStandardMaterial color="#20364d" />
      </mesh>
      {[-0.7, 0.7].map((z) => (
        <mesh key={z} position={[3.58, 0.93, z]}>
          <boxGeometry args={[0.05, 0.15, 0.3]} />
          <meshStandardMaterial
            color="#ecf7ff"
            emissive="#9bddff"
            emissiveIntensity={2}
          />
        </mesh>
      ))}
      <RoundedBox
        args={[length, 1.9, 1.82]}
        radius={0.04}
        position={[-1.35, 1.8, 0]}
        castShadow
      >
        <meshStandardMaterial color={color} metalness={0.35} roughness={0.45} />
      </RoundedBox>
      {Array.from({ length: kind === "20_DRY" ? 13 : 25 }, (_, i) => {
        const x =
          -1.35 -
          length / 2 +
          0.1 +
          (i * (length - 0.2)) / (kind === "20_DRY" ? 12 : 24);
        return (
          <group key={i}>
            {[-0.927, 0.927].map((z) => (
              <mesh key={z} position={[x, 1.8, z]} castShadow>
                <boxGeometry args={[0.035, 1.75, 0.045]} />
                <meshStandardMaterial
                  color={color}
                  metalness={0.5}
                  roughness={0.5}
                />
              </mesh>
            ))}
          </group>
        );
      })}
      {kind === "40_REEFER" && (
        <group position={[1.4, 1.8, 0]}>
          <mesh>
            <boxGeometry args={[0.25, 1.7, 1.55]} />
            <meshStandardMaterial color="#c5d0d9" />
          </mesh>
          {[-0.4, 0.4].map((z) => (
            <mesh
              key={z}
              rotation={[0, 0, Math.PI / 2]}
              position={[0.15, 0, z]}
            >
              <cylinderGeometry args={[0.3, 0.3, 0.06, 20]} />
              <meshStandardMaterial color="#314358" />
            </mesh>
          ))}
        </group>
      )}
      {[-3.3, -2.4, 0.9, 2.7].flatMap((x, i) =>
        [-1, 1].map((z, j) => (
          <group
            key={`${x}-${z}`}
            position={[x, 0.53, z]}
            ref={(el) => {
              if (el) wheels.current[i * 2 + j] = el;
            }}
          >
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.49, 0.49, 0.24, 24]} />
              <meshStandardMaterial color="#16202c" roughness={0.8} />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.26, 0.26, 0.27, 12]} />
              <meshStandardMaterial
                color="#a1b2c7"
                metalness={0.85}
                roughness={0.2}
              />
            </mesh>
            <mesh position={[0, 0.18, z * 0.15]}>
              <boxGeometry args={[0.07, 0.1, 0.02]} />
              <meshStandardMaterial color="#273b52" />
            </mesh>
          </group>
        )),
      )}
    </group>
  );
}
