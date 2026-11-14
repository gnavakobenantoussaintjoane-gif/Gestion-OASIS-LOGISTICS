import type { Request } from "express";
import type { Filters, Resource } from "../validators/resources.js";
import { financialTotals } from "../utils/finance.js";
import { HttpError, check } from "../utils/errors.js";
export const readAllowed = (role: string, resource: string) =>
  role === "admin" ||
  role === "manager" ||
  (role === "operator" &&
    !["expenses", "audit_logs", "profiles"].includes(resource)) ||
  (role === "driver" && ["drivers", "trips"].includes(resource));
const searchColumns: Record<string, string[]> = {
  trucks: ["plate", "brand", "model"],
  drivers: ["first_name", "last_name", "phone"],
  trips: ["reference", "observations"],
  expenses: ["reference", "description"],
  tariff_rules: [],
  terminals: ["code", "name"],
  container_types: ["name"],
  expense_categories: ["name"],
};
export function queryResource(req: Request, resource: Resource, f: Filters) {
  if (!readAllowed(req.role, resource))
    throw new HttpError(403, "Consultation non autorisée.");
  const select =
    resource === "trips"
      ? "*,trip_containers(id,number,size,created_at,created_by)"
      : "*";
  let query = req.db
    .from(resource)
    .select(select, { count: "exact" })
    .eq("company_id", req.companyId);
  const dateCol =
    resource === "trips"
      ? "accounting_date"
      : resource === "expenses"
        ? "date"
        : null;
  if (dateCol) {
    if (f.start) query = query.gte(dateCol, f.start);
    if (f.end) query = query.lte(dateCol, f.end);
  }
  const applicable =
    resource === "trips"
      ? [
          "truck_id",
          "driver_id",
          "shift",
          "terminal_id",
          "container_type_id",
          "load",
        ]
      : resource === "expenses"
        ? ["truck_id", "driver_id", "shift", "category_id"]
        : resource === "tariff_rules"
          ? ["terminal_id", "container_type_id", "load", "shift"]
          : [];
  for (const key of applicable) {
    const v = f[key as keyof Filters];
    if (v) query = query.eq(key, v);
  }
  if (resource === "trucks") {
    if (f.truck_id) query = query.eq("id", f.truck_id);
    if (f.driver_id) query = query.eq("driver_id", f.driver_id);
  }
  if (resource === "drivers" && f.driver_id)
    query = query.eq("id", f.driver_id);
  const amountCol =
    resource === "trips" || resource === "tariff_rules"
      ? "price"
      : resource === "expenses"
        ? "amount"
        : null;
  if (amountCol) {
    if (f.min !== undefined) query = query.gte(amountCol, f.min);
    if (f.max !== undefined) query = query.lte(amountCol, f.max);
  }
  if (f.q && searchColumns[resource]?.length) {
    const term = f.q.replace(/[,%()\\]/g, " ").trim();
    if (term)
      query = query.or(
        searchColumns[resource].map((c) => `${c}.ilike.%${term}%`).join(","),
      );
  }
  const sorts =
    resource === "trips"
      ? ["created_at", "accounting_date", "price", "occurred_at"]
      : resource === "expenses"
        ? ["created_at", "date", "amount"]
        : resource === "trucks"
          ? ["created_at", "plate"]
          : ["created_at"];
  const fallback = [
    "terminals",
    "container_types",
    "expense_categories",
  ].includes(resource)
    ? "name"
    : "created_at";
  return query
    .order(
      sorts.includes(f.sort) &&
        !["terminals", "container_types", "expense_categories"].includes(
          resource,
        )
        ? f.sort
        : fallback,
      { ascending: f.order === "asc" },
    )
    .order("id", { ascending: true });
}
export async function allResource(
  req: Request,
  resource: Resource,
  f: Filters,
) {
  const rows: Record<string, any>[] = [];
  for (let offset = 0; offset < 100000; offset += 1000) {
    const { data, error } = await queryResource(req, resource, f).range(
      offset,
      offset + 999,
    );
    check(error);
    rows.push(...(data || []));
    if ((data?.length || 0) < 1000) return rows;
  }
  throw new HttpError(422, "Rapport trop volumineux. Réduisez la période.");
}
export async function reportData(req: Request, f: Filters) {
  const [trips, baseExpenses, trucks] = await Promise.all([
    allResource(req, "trips", f),
    allResource(req, "expenses", f),
    allResource(req, "trucks", { ...f, q: undefined }),
  ]);
  let expenses = baseExpenses;
  if (f.terminal_id || f.container_type_id || f.load) {
    const ids = new Set(trips.map((t) => t.id));
    expenses = expenses.filter((e) => e.trip_id && ids.has(e.trip_id));
  }
  return {
    trips,
    expenses,
    trucks,
    totals: financialTotals(
      trips as { price: number }[],
      expenses as { amount: number }[],
    ),
  };
}
