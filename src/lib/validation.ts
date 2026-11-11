import { z } from "zod";
import { containers, categories } from "./domain";
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
  );
const amount = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const id = z.string().min(1).max(200);
const truck = z.object({
  id,
  plate: z.string().trim().min(1).max(30),
  driver: z.string().trim().min(1).max(100),
  status: z.enum(["Disponible", "En mission", "Maintenance"]),
});
const trip = z
  .object({
    id,
    date,
    truckId: id,
    shift: z.enum(["Jour", "Nuit"]),
    terminal: z.enum(["ATL", "CIT"]),
    container: z.enum(containers),
    load: z.enum(["Plein", "Vide"]),
    quantity: z.number().int().min(1).max(10000),
    price: amount.positive(),
    paid: amount,
  })
  .refine(
    (t) =>
      Number.isSafeInteger(t.quantity * t.price) &&
      t.paid <= t.quantity * t.price,
    "Montants invalides",
  );
const expense = z.object({
  id,
  date,
  truckId: z.string(),
  tripId: z.string(),
  category: z.enum(categories),
  description: z.string().trim().min(1).max(200),
  amount: amount.positive(),
});
export const backupSchema = z
  .object({
    trucks: z.array(truck).max(10000),
    trips: z.array(trip).max(100000),
    expenses: z.array(expense).max(100000),
  })
  .superRefine((d, ctx) => {
    const trucks = new Set(d.trucks.map((t) => t.id));
    const trips = new Map(d.trips.map((t) => [t.id, t]));
    if (
      trucks.size !== d.trucks.length ||
      trips.size !== d.trips.length ||
      new Set(d.expenses.map((e) => e.id)).size !== d.expenses.length ||
      new Set(d.trucks.map((t) => t.plate.toUpperCase())).size !==
        d.trucks.length
    )
      ctx.addIssue({
        code: "custom",
        message: "Identifiants ou plaques dupliqués",
      });
    if (
      d.trips.some((t) => !trucks.has(t.truckId)) ||
      d.expenses.some(
        (e) =>
          (e.truckId && !trucks.has(e.truckId)) ||
          (e.tripId &&
            (!trips.has(e.tripId) ||
              trips.get(e.tripId)?.truckId !== e.truckId)),
      )
    )
      ctx.addIssue({ code: "custom", message: "Références invalides" });
  });
