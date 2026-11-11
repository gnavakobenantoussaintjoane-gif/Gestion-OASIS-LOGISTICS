import { describe, it, expect } from "vitest";
import { resolveShift } from "../src/utils/shifts.js";
import { financialTotals } from "../src/utils/finance.js";
import { schemas, filtersSchema } from "../src/validators/resources.js";
import { readAllowed } from "../src/services/resources.js";
describe("Shifts / Africa-Abidjan", () => {
  it.each([
    ["06:00", "day", "2026-11-12"],
    ["18:30", "day", "2026-11-12"],
    ["19:00", "night", "2026-11-12"],
    ["23:00", "night", "2026-11-12"],
    ["00:00", "night", "2026-11-11"],
    ["05:59", "night", "2026-11-11"],
    ["06:00", "day", "2026-11-12"],
  ])("%s donne %s et date %s", (time, shift, day) =>
    expect(resolveShift(`2026-11-12T${time}:00Z`)).toEqual({
      shift,
      accounting_date: day,
    }),
  );
  it("18h45 est hors shift", () =>
    expect(() => resolveShift("2026-11-12T18:45:00Z")).toThrow("Hors shift"));
  it("00h00 au changement de mois appartient à la veille", () =>
    expect(resolveShift("2027-01-01T00:00:00Z").accounting_date).toBe(
      "2026-12-31",
    ));
  it("interdit les dates invalides", () =>
    expect(() => resolveShift("incorrect")).toThrow());
});
describe("Finances exactes", () => {
  it("compte une seule recette par voyage", () =>
    expect(
      financialTotals(
        [{ price: 45000 }, { price: 65000 }],
        [{ amount: 15000 }],
      ),
    ).toEqual({
      revenue: "110000",
      expenses: "15000",
      profit: "95000",
      trips: 2,
    }));
  it("gère des totaux supérieurs à MAX_SAFE_INTEGER sans arrondi", () =>
    expect(
      financialTotals(
        [{ price: "9007199254740991" }, { price: "10" }],
        [{ amount: "1" }],
      ).profit,
    ).toBe("9007199254741000"));
  it("gère les sélections vides", () =>
    expect(financialTotals([], []).revenue).toBe("0"));
});
describe("Validation et permissions", () => {
  it("refuse les dépenses négatives", () =>
    expect(schemas.expenses.safeParse({ amount: -1 }).success).toBe(false));
  it("refuse les tarifs fractionnaires", () =>
    expect(schemas.tariff_rules.shape.price.safeParse(1.5).success).toBe(
      false,
    ));
  it("refuse les périodes inversées", () =>
    expect(
      filtersSchema.safeParse({ start: "2026-12-01", end: "2026-11-01" })
        .success,
    ).toBe(false));
  it("refuse les UUID malformés dans les filtres", () =>
    expect(
      filtersSchema.safeParse({ truck_id: "x'); DROP TABLE trips;" }).success,
    ).toBe(false));
  it("limite la pagination", () =>
    expect(filtersSchema.safeParse({ limit: 100000 }).success).toBe(false));
  it("opérateur sans lecture des finances", () =>
    expect(readAllowed("operator", "expenses")).toBe(false));
  it("chauffeur limité aux missions", () => {
    expect(readAllowed("driver", "trips")).toBe(true);
    expect(readAllowed("driver", "tariff_rules")).toBe(false);
  });
  it("ignore les champs d’escalade de privilèges", () =>
    expect(
      schemas.trucks.partial().parse({ company_id: "evil", role: "admin" }),
    ).toEqual({}));
});
