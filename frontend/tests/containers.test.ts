import { describe, expect, it } from "vitest";
import {
  containerModeLabel,
  isValidIso6346,
  normalizeContainerNumber,
  validateTripContainers,
} from "../src/utils/containers";

const valid = "CSQU3054383";
const valid2 = "MSCU1234566";

describe("Validation frontend des conteneurs", () => {
  it("accepte un numéro ISO 6346 valide et le normalise", () => {
    expect(isValidIso6346(` ${valid.toLowerCase()} `)).toBe(true);
    expect(normalizeContainerNumber(` ${valid.toLowerCase()} `)).toBe(valid);
  });
  it("signale une clé de contrôle fausse", () => {
    expect(isValidIso6346("CSQU3054384")).toBe(false);
    const check = validateTripContainers("1x40", ["CSQU3054384"]);
    expect(check.error).toBeTruthy();
    expect(check.fieldErrors[0]).toMatch(/ISO 6346/);
  });
  it("exige deux numéros pour 2 × 20", () => {
    const check = validateTripContainers("2x20", [valid, ""]);
    expect(check.error).toBeTruthy();
    expect(check.fieldErrors[1]).toMatch(/conteneur 2/);
  });
  it("signale le second numéro manquant même si l’état n’en contient qu’un", () => {
    const check = validateTripContainers("2x20", [valid]);
    expect(check.fieldErrors).toHaveLength(2);
    expect(check.fieldErrors[1]).toMatch(/conteneur 2/);
    expect(check.containers).toEqual([]);
  });
  it("exige un seul numéro pour 1 × 40", () => {
    const check = validateTripContainers("1x40", [valid, valid2]);
    expect(check.error).toBeNull();
    expect(check.containers).toEqual([{ number: valid, size: 40 }]);
  });
  it("refuse un doublon", () => {
    const check = validateTripContainers("2x20", [
      valid,
      ` ${valid.toLowerCase()} `,
    ]);
    expect(check.error).toMatch(/deux fois/);
  });
  it("produit les tailles attendues", () => {
    expect(validateTripContainers("2x20", [valid, valid2]).containers).toEqual([
      { number: valid, size: 20 },
      { number: valid2, size: 20 },
    ]);
    expect(containerModeLabel("2x20")).toBe("2 × 20 pieds");
    expect(containerModeLabel("1x40")).toBe("1 × 40 pieds");
  });
});
