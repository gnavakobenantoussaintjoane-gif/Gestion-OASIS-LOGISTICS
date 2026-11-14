import { describe, expect, it } from "vitest";
import {
  isValidIso6346,
  normalizeContainerNumber,
  validateContainerSet,
} from "../src/utils/containers.js";
import {
  schemas,
  tripContainersSchema,
} from "../src/validators/resources.js";

const valid = "CSQU3054383";
const valid2 = "MSCU1234566";
const trip = {
  truck_id: "11111111-1111-4111-8111-111111111111",
  driver_id: "22222222-2222-4222-8222-222222222222",
  occurred_at: "2026-11-14T08:00:00Z",
  terminal_id: "33333333-3333-4333-8333-333333333333",
  container_type_id: "44444444-4444-4444-8444-444444444444",
  load: "Plein",
  tariff_rule_id: "55555555-5555-4555-8555-555555555555",
};

describe("Numéros ISO 6346", () => {
  it("accepte un numéro valide et normalise la saisie", () => {
    expect(isValidIso6346(valid)).toBe(true);
    expect(isValidIso6346(`  ${valid.toLowerCase()}  `)).toBe(true);
    expect(normalizeContainerNumber(` ${valid.toLowerCase()} `)).toBe(valid);
  });
  it("refuse une clé de contrôle fausse", () => {
    expect(isValidIso6346("CSQU3054384")).toBe(false);
  });
  it("refuse un format incomplet ou non alphabétique", () => {
    expect(isValidIso6346("CSQU305438")).toBe(false);
    expect(isValidIso6346("1SQU3054383")).toBe(false);
    expect(isValidIso6346("")).toBe(false);
  });
});

describe("Ensemble de conteneurs d’une mission", () => {
  it("accepte deux 20 pieds distincts", () => {
    expect(
      validateContainerSet([
        { number: valid, size: 20 },
        { number: valid2, size: 20 },
      ]),
    ).toBeNull();
  });
  it("accepte un 40 pieds", () => {
    expect(validateContainerSet([{ number: valid, size: 40 }])).toBeNull();
  });
  it("refuse un mélange de tailles", () => {
    expect(
      validateContainerSet([
        { number: valid, size: 20 },
        { number: valid2, size: 40 },
      ]),
    ).toMatch(/2 × 20/);
  });
  it("refuse un doublon dans la mission", () => {
    expect(
      validateContainerSet([
        { number: valid, size: 20 },
        { number: ` ${valid.toLowerCase()} `, size: 20 },
      ]),
    ).toMatch(/deux fois/);
  });
  it("refuse un nombre de conteneurs hors 1 × 40 / 2 × 20", () => {
    expect(validateContainerSet([])).toMatch(/deux conteneurs/);
    expect(
      validateContainerSet([
        { number: valid, size: 20 },
        { number: valid2, size: 20 },
        { number: "TGHU7654321", size: 20 },
      ]),
    ).toMatch(/deux conteneurs/);
  });
  it("refuse un numéro invalide dans le lot", () => {
    expect(
      validateContainerSet([{ number: "CSQU3054384", size: 40 }]),
    ).toMatch(/ISO 6346/);
  });
});

describe("Schéma de création/modification d’une mission", () => {
  it("normalise et accepte deux conteneurs 20 pieds", () => {
    const result = schemas.trips.parse({
      ...trip,
      containers: [
        { number: ` ${valid.toLowerCase()} `, size: 20 },
        { number: valid2, size: 20 },
      ],
    });
    expect(result.containers).toEqual([
      { number: valid, size: 20 },
      { number: valid2, size: 20 },
    ]);
  });
  it("refuse une clé de contrôle fausse", () => {
    expect(
      schemas.trips.safeParse({
        ...trip,
        containers: [{ number: "CSQU3054384", size: 40 }],
      }).success,
    ).toBe(false);
  });
  it("refuse un doublon", () => {
    expect(
      tripContainersSchema.safeParse([
        { number: valid, size: 20 },
        { number: valid.toLowerCase(), size: 20 },
      ]).success,
    ).toBe(false);
  });
  it("refuse deux 40 pieds", () => {
    expect(
      tripContainersSchema.safeParse([
        { number: valid, size: 40 },
        { number: valid2, size: 40 },
      ]).success,
    ).toBe(false);
  });
  it("conserve le schéma partiel pour une modification de conteneurs", () => {
    expect(
      schemas.trips.partial().parse({
        containers: [{ number: valid, size: 40 }],
      }),
    ).toEqual({ containers: [{ number: valid, size: 40 }] });
  });
});
