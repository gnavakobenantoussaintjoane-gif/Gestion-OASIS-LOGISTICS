import { describe, expect, it } from "vitest";
import {
  demoData,
  filteredData,
  summarize,
  total,
  validateTrip,
  type Filters,
} from "../src/lib/domain";
import { backupSchema } from "../src/lib/validation";
const f: Filters = {
  start: "",
  end: "",
  truck: "",
  shift: "",
  terminal: "",
  container: "",
  load: "",
  query: "",
};
describe("Calculs des voyages et finances", () => {
  const d = demoData();
  it("calcule quantité × prix", () =>
    expect(total({ ...d.trips[0], quantity: 3, price: 45000 })).toBe(135000));
  it("distingue résultat et trésorerie", () => {
    const s = summarize(
      [{ ...d.trips[0], quantity: 3, price: 45000, paid: 50000 }],
      [{ ...d.expenses[0], amount: 20000 }],
    );
    expect(s).toMatchObject({
      revenue: 135000,
      paid: 50000,
      spent: 20000,
      profit: 115000,
      cash: 30000,
      pending: 85000,
      count: 3,
    });
  });
  it("gère une sélection vide", () =>
    expect(summarize([], [])).toEqual({
      revenue: 0,
      paid: 0,
      spent: 0,
      profit: 0,
      cash: 0,
      pending: 0,
      count: 0,
    }));
  it("interdit le surpaiement et les fractions de voyage", () => {
    expect(validateTrip({ ...d.trips[0], paid: total(d.trips[0]) + 1 })).toBe(
      false,
    );
    expect(validateTrip({ ...d.trips[0], quantity: 1.5 })).toBe(false);
    expect(validateTrip({ ...d.trips[0], price: -10 })).toBe(false);
  });
  it("combine les filtres", () => {
    const v = d.trips[0];
    const result = filteredData(d, {
      ...f,
      start: v.date,
      end: v.date,
      truck: v.truckId,
      shift: v.shift,
      terminal: v.terminal,
      container: v.container,
      load: v.load,
    });
    expect(result.trips.length).toBeGreaterThan(0);
    expect(
      result.trips.every(
        (t) =>
          t.date === v.date &&
          t.truckId === v.truckId &&
          t.shift === v.shift &&
          t.terminal === v.terminal &&
          t.container === v.container &&
          t.load === v.load,
      ),
    ).toBe(true);
  });
  it("conserve les charges générales sans filtre de voyage", () =>
    expect(filteredData(d, f).expenses).toHaveLength(d.expenses.length));
  it("exclut les dépenses non affectées si on filtre par shift", () => {
    const result = filteredData(d, { ...f, shift: "Jour" });
    expect(
      result.expenses.every((e) => result.trips.some((t) => t.id === e.tripId)),
    ).toBe(true);
  });
  it("rattache le shift nuit à la date de départ", () => {
    const v = d.trips.find((t) => t.shift === "Nuit")!;
    expect(
      filteredData(d, { ...f, start: v.date, end: v.date, shift: "Nuit" })
        .trips,
    ).toContainEqual(v);
  });
  it("filtre les dépenses par date et camion", () => {
    const e = d.expenses[0];
    const result = filteredData(d, {
      ...f,
      start: e.date,
      end: e.date,
      truck: e.truckId,
    });
    expect(
      result.expenses.every(
        (x) => x.date === e.date && x.truckId === e.truckId,
      ),
    ).toBe(true);
  });
});
describe("Validation des sauvegardes", () => {
  it("accepte la démonstration", () =>
    expect(backupSchema.safeParse(demoData()).success).toBe(true));
  it("rejette une sauvegarde incorrecte", () =>
    expect(
      backupSchema.safeParse({ trucks: [], trips: [{}], expenses: [] }).success,
    ).toBe(false));
  it("rejette les références orphelines", () => {
    const d = demoData();
    d.trucks = [];
    expect(backupSchema.safeParse(d).success).toBe(false);
  });
  it("rejette les identifiants dupliqués", () => {
    const d = demoData();
    d.trips.push(d.trips[0]);
    expect(backupSchema.safeParse(d).success).toBe(false);
  });
  it("rejette les dates impossibles", () => {
    const d = demoData();
    d.trips[0].date = "2026-02-30";
    expect(backupSchema.safeParse(d).success).toBe(false);
  });
});
