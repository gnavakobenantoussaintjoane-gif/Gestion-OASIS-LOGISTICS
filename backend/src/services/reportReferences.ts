import type { Request } from "express";
import { check } from "../utils/errors.js";
export async function reportReferences(req: Request) {
  const output: Record<string, Record<string, any>[]> = {};
  for (const table of [
    "drivers",
    "terminals",
    "container_types",
    "expense_categories",
  ]) {
    const rows: Record<string, any>[] = [];
    for (let offset = 0; offset < 100000; offset += 1000) {
      const { data, error } = await req.db
        .from(table)
        .select("*")
        .eq("company_id", req.companyId)
        .range(offset, offset + 999);
      check(error);
      rows.push(...(data || []));
      if ((data?.length || 0) < 1000) break;
    }
    output[table] = rows;
  }
  return output;
}
