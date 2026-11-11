import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { advanceTruck } from "../src/components/login3d/motion";
const bytes = readFileSync("public/models/truck.glb");
const jsonLength = bytes.readUInt32LE(12);
const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
describe("Camion GLB réellement livré", () => {
  it("est un GLB 2.0 autonome et léger, pas un fichier image renommé", () => {
    expect(bytes.readUInt32LE(0)).toBe(0x46546c67);
    expect(bytes.readUInt32LE(4)).toBe(2);
    expect(bytes.readUInt32LE(8)).toBe(bytes.length);
    expect(bytes.length).toBeLessThan(300000);
    expect(gltf.buffers.every((buffer: { uri?: string }) => !buffer.uri)).toBe(
      true,
    );
    expect(
      gltf.images.every(
        (image: { bufferView?: number; uri?: string }) =>
          image.bufferView !== undefined && !image.uri,
      ),
    ).toBe(true);
  });
  it("contient tracteur, remorque, essieux nommés et marque GESTION", () => {
    const names = gltf.nodes.map((node: { name: string }) => node.name);
    expect(names).toContain("body");
    expect(names).toContain("trailer-body");
    expect(
      names.filter((name: string) => name.startsWith("wheel-")),
    ).toHaveLength(10);
    expect(names).toContain("GESTION-logo");
    expect(gltf.asset.copyright).toContain("CC0");
  });
  it("borne la simulation et boucle sans grand saut après suspension", () => {
    expect(advanceTruck(43.99, 0.05)).toBeCloseTo(0.055);
    expect(advanceTruck(0, 100)).toBeCloseTo(0.065);
    expect(advanceTruck(5, 0)).toBe(5);
    expect(advanceTruck(5, -1)).toBe(5);
  });
});
