import { describe, expect, it } from "vitest";
import { readAllowed } from "../src/services/resources.js";
import {
  resourceRoles,
  type Resource,
} from "../src/validators/resources.js";

const resources: Resource[] = [
  "trucks",
  "drivers",
  "trips",
  "expenses",
  "tariff_rules",
  "terminals",
  "container_types",
  "expense_categories",
];

// Matrice attendue, volontairement écrite à part de l'implémentation.
const writers: Record<Resource, string[]> = {
  trucks: ["admin", "manager"],
  drivers: ["admin", "manager"],
  trips: ["admin", "manager", "operator"],
  expenses: ["admin", "manager"],
  tariff_rules: ["admin"],
  terminals: ["admin"],
  container_types: ["admin"],
  expense_categories: ["admin"],
};

const readers: Record<string, Resource[]> = {
  admin: resources,
  manager: resources,
  operator: resources.filter((resource) => resource !== "expenses"),
  driver: ["drivers", "trips"],
};

describe("Matrice des droits métier", () => {
  it("conserve exactement les rôles autorisés à écrire", () => {
    expect(resourceRoles).toEqual(writers);
  });

  it.each(Object.keys(readers))(
    "applique les lectures du rôle %s",
    (role) => {
      for (const resource of resources)
        expect(
          readAllowed(role, resource),
          `${role} / ${resource}`,
        ).toBe(readers[role].includes(resource));
    },
  );

  it("refuse un rôle absent ou inconnu", () => {
    for (const role of ["", "viewer", "super_admin", "anonymous"])
      for (const resource of resources)
        expect(readAllowed(role, resource)).toBe(false);
  });

  it("n’ouvre ni les finances ni l’audit aux opérateurs", () => {
    expect(readAllowed("operator", "expenses")).toBe(false);
    expect(readAllowed("operator", "audit_logs")).toBe(false);
    expect(readAllowed("operator", "profiles")).toBe(false);
  });

  it("limite le chauffeur à ses missions et à ses références", () => {
    expect(readAllowed("driver", "trips")).toBe(true);
    expect(readAllowed("driver", "drivers")).toBe(true);
    for (const resource of [
      "trucks",
      "expenses",
      "tariff_rules",
      "terminals",
      "container_types",
      "expense_categories",
    ] as Resource[])
      expect(readAllowed("driver", resource), resource).toBe(false);
  });
});
