import { useTexture } from "@react-three/drei";
import { SRGBColorSpace } from "three";
import { useMemo } from "react";

/** Décor géométrique local : entrepôt, quais et balisage, sans HDRI ni service distant. */
export default function LogisticsHub({ compact }: { compact: boolean }) {
  const source = useTexture(`${import.meta.env.BASE_URL}branding/otl-logo.jpg`);
  const logo = useMemo(() => {
    source.colorSpace = SRGBColorSpace;
    return source;
  }, [source]);
  return (
    <group position={[10, 0, -12]}>
      <mesh position={[0, 3.8, 0]} castShadow receiveShadow>
        <boxGeometry args={[27, 7.6, 8]} />
        <meshStandardMaterial
          color="#102f70"
          metalness={0.45}
          roughness={0.48}
        />
      </mesh>
      <mesh position={[0, 5.2, 4.08]}>
        <boxGeometry args={[27.1, 0.18, 0.14]} />
        <meshStandardMaterial
          color="#f47700"
          emissive="#f47700"
          emissiveIntensity={0.6}
        />
      </mesh>
      {Array.from({ length: compact ? 12 : 30 }, (_, i) => (
        <mesh
          key={`rib-${i}`}
          position={[-13 + i * (compact ? 2.2 : 0.9), 6.4, 4.06]}
        >
          <boxGeometry args={[0.035, 2.2, 0.06]} />
          <meshStandardMaterial
            color="#42679b"
            metalness={0.5}
            roughness={0.5}
          />
        </mesh>
      ))}
      {[-9, -3, 3, 9].map((x) => (
        <group key={x} position={[x, 0, 4.1]}>
          <mesh position={[0, 1.8, 0]}>
            <boxGeometry args={[4.7, 3.6, 0.2]} />
            <meshStandardMaterial color="#091a35" />
          </mesh>
          <mesh position={[0, 3.9, 0.5]}>
            <boxGeometry args={[4.9, 0.12, 1.5]} />
            <meshStandardMaterial
              color="#e9eef5"
              metalness={0.5}
              roughness={0.4}
            />
          </mesh>
          <mesh position={[0, 3.65, 0.6]}>
            <boxGeometry args={[3.9, 0.05, 0.1]} />
            <meshStandardMaterial
              color="#ffbd77"
              emissive="#ff9d3f"
              emissiveIntensity={2}
            />
          </mesh>
          {[-2.25, 2.25].map((side) => (
            <mesh key={side} position={[side, 0.5, 0.45]}>
              <boxGeometry args={[0.12, 1, 0.12]} />
              <meshStandardMaterial color="#f47700" />
            </mesh>
          ))}
        </group>
      ))}
      {/* Le plan conserve le ratio 2:1 du logo original, sans recoloration. */}
      <mesh position={[0, 6.4, 4.14]}>
        <planeGeometry args={[6, 3]} />
        <meshBasicMaterial map={logo} toneMapped={false} />
      </mesh>
      {!compact &&
        [-8, 8].map((x) => (
          <group key={x} position={[x, 0, 8]}>
            <mesh position={[0, 3.5, 0]}>
              <cylinderGeometry args={[0.06, 0.1, 7, 8]} />
              <meshStandardMaterial color="#91a6be" />
            </mesh>
            <mesh position={[0, 7, 0]}>
              <boxGeometry args={[1.5, 0.12, 0.4]} />
              <meshStandardMaterial
                color="#fff0e2"
                emissive="#ffb977"
                emissiveIntensity={2}
              />
            </mesh>
          </group>
        ))}
    </group>
  );
}
