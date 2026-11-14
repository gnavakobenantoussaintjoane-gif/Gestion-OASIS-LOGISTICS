import { z } from "zod";
import {
  isValidIso6346,
  normalizeContainerNumber,
  validateContainerSet,
} from "../utils/containers.js";
const text = (max = 100) => z.string().trim().min(1).max(max);
const optional = (max = 500) =>
  z.string().trim().max(max).nullable().optional();
const uuid = z.uuid();
const link = uuid.nullable().optional();
const date = z.iso.date();
const money = z.number().int().min(1).max(1000000000000);
export const tripContainerSchema = z.object({
  number: z
    .string()
    .transform(normalizeContainerNumber)
    .refine(isValidIso6346, "Numéro de conteneur ISO 6346 invalide."),
  size: z.union([z.literal(20), z.literal(40)]),
});
export const tripContainersSchema = z
  .array(tripContainerSchema)
  .min(1, "Au moins un conteneur est requis.")
  .max(2, "Deux conteneurs maximum par mission.")
  .superRefine((containers, ctx) => {
    const error = validateContainerSet(containers);
    if (error) ctx.addIssue({ code: "custom", message: error });
  });
export const schemas = {
  trucks: z.object({
    plate: text(30).transform((v) => v.toUpperCase()),
    brand: text(),
    model: text(),
    year: z.number().int().min(1950).max(2200),
    chassis: optional(100),
    driver_id: link,
    status: z.enum([
      "Disponible",
      "En voyage",
      "En maintenance",
      "Hors service",
    ]),
    description: optional(),
    archived: z.boolean().optional(),
  }),
  drivers: z.object({
    first_name: text(),
    last_name: text(),
    phone: text(30),
    address: optional(),
    license_number: text(),
    license_expiry: date,
    status: z.enum(["Actif", "Inactif"]),
    user_id: link,
  }),
  trips: z.object({
    truck_id: uuid,
    driver_id: uuid,
    occurred_at: z.iso.datetime({ offset: true }),
    terminal_id: uuid,
    container_type_id: uuid,
    load: z.enum(["Plein", "Vide"]),
    tariff_rule_id: uuid,
    observations: optional(),
    containers: tripContainersSchema,
  }),
  expenses: z.object({
    date,
    amount: money,
    category_id: uuid,
    description: text(500),
    truck_id: link,
    driver_id: link,
    trip_id: link,
    shift: z.enum(["day", "night"]).nullable().optional(),
  }),
  tariff_rules: z.object({
    terminal_id: uuid,
    container_type_id: uuid,
    load: z.enum(["Plein", "Vide"]),
    shift: z.enum(["day", "night"]),
    price: money,
    active: z.boolean(),
  }),
  terminals: z.object({ code: text(20), name: text(), active: z.boolean() }),
  container_types: z.object({
    name: text(),
    kind: z.enum(["20_DRY", "40_DRY", "40_REEFER"]),
    active: z.boolean(),
  }),
  expense_categories: z.object({ name: text(), active: z.boolean() }),
};
export type Resource = keyof typeof schemas;
export const resourceRoles: Record<Resource, string[]> = {
  trucks: ["admin", "manager"],
  drivers: ["admin", "manager"],
  trips: ["admin", "manager", "operator"],
  expenses: ["admin", "manager"],
  tariff_rules: ["admin"],
  terminals: ["admin"],
  container_types: ["admin"],
  expense_categories: ["admin"],
};
export const filtersSchema = z
  .object({
    start: date.optional(),
    end: date.optional(),
    truck_id: uuid.optional(),
    driver_id: uuid.optional(),
    shift: z.enum(["day", "night"]).optional(),
    terminal_id: uuid.optional(),
    container_type_id: uuid.optional(),
    load: z.enum(["Plein", "Vide"]).optional(),
    category_id: uuid.optional(),
    min: z.coerce.number().int().min(0).max(1e12).optional(),
    max: z.coerce.number().int().min(0).max(1e12).optional(),
    q: z.string().max(100).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sort: z
      .enum([
        "created_at",
        "date",
        "accounting_date",
        "price",
        "amount",
        "plate",
        "occurred_at",
      ])
      .default("created_at"),
    order: z.enum(["asc", "desc"]).default("desc"),
  })
  .refine((f) => !f.start || !f.end || f.start <= f.end, {
    message: "Période invalide",
  })
  .refine((f) => f.min === undefined || f.max === undefined || f.min <= f.max, {
    message: "Montants invalides",
  });
export type Filters = z.infer<typeof filtersSchema>;
