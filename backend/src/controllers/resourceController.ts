import { Router } from "express";
import { z } from "zod";
import {
  schemas,
  resourceRoles,
  filtersSchema,
  type Resource,
} from "../validators/resources.js";
import { queryResource, readAllowed } from "../services/resources.js";
import { resolveShift } from "../utils/shifts.js";
import { HttpError, check } from "../utils/errors.js";
const router = Router();
const resource = (v: unknown) =>
  z.enum(Object.keys(schemas) as [Resource, ...Resource[]]).parse(v);
router.get("/:resource", async (req, res) => {
  const table = resource(req.params.resource);
  const f = filtersSchema.parse(req.query);
  const { data, error, count } = await queryResource(req, table, f).range(
    (f.page - 1) * f.limit,
    f.page * f.limit - 1,
  );
  check(error);
  res.json({ rows: data, total: count, page: f.page, limit: f.limit });
});
router.get("/:resource/:id", async (req, res) => {
  const table = resource(req.params.resource);
  if (!readAllowed(req.role, table))
    throw new HttpError(403, "Consultation non autorisée.");
  const id = z.uuid().parse(req.params.id);
  const { data, error } = await req.db
    .from(table)
    .select("*")
    .eq("id", id)
    .eq("company_id", req.companyId)
    .maybeSingle();
  check(error);
  if (!data) throw new HttpError(404, "Élément introuvable.");
  res.json(data);
});
router.post("/:resource", async (req, res) => {
  const table = resource(req.params.resource);
  if (!resourceRoles[table].includes(req.role))
    throw new HttpError(403, "Action non autorisée.");
  const fields = schemas[table].parse(req.body);
  const payload: any = { ...fields, company_id: req.companyId };
  if (table === "trips") {
    try {
      Object.assign(payload, resolveShift(payload.occurred_at));
    } catch (e) {
      throw new HttpError(422, (e as Error).message);
    }
    payload.created_by = req.user.id;
  }
  if (table === "expenses") payload.created_by = req.user.id;
  const { data, error } = await req.db
    .from(table)
    .insert(payload)
    .select()
    .single();
  check(error);
  res.status(201).json(data);
});
router.patch("/:resource/:id", async (req, res) => {
  const table = resource(req.params.resource);
  if (!resourceRoles[table].includes(req.role))
    throw new HttpError(403, "Action non autorisée.");
  const id = z.uuid().parse(req.params.id);
  const fields = schemas[table].partial().parse(req.body);
  if (!Object.keys(fields).length)
    throw new HttpError(422, "Aucune modification valide.");
  const { data, error } = await req.db
    .from(table)
    .update(fields)
    .eq("id", id)
    .eq("company_id", req.companyId)
    .select()
    .maybeSingle();
  check(error);
  if (!data) throw new HttpError(404, "Élément introuvable ou non modifiable.");
  res.json(data);
});
router.delete("/:resource/:id", async (req, res) => {
  const table = resource(req.params.resource);
  if (
    !["admin", "manager"].includes(req.role) ||
    !resourceRoles[table].includes(req.role)
  )
    throw new HttpError(403, "Suppression non autorisée.");
  const id = z.uuid().parse(req.params.id);
  if (table === "trucks") {
    const { data, error } = await req.db
      .from(table)
      .update({ archived: true })
      .eq("id", id)
      .eq("company_id", req.companyId)
      .select("id")
      .maybeSingle();
    check(error);
    if (!data) throw new HttpError(404, "Camion introuvable.");
  } else {
    const { data, error } = await req.db
      .from(table)
      .delete()
      .eq("id", id)
      .eq("company_id", req.companyId)
      .select("id")
      .maybeSingle();
    check(error);
    if (!data) throw new HttpError(404, "Élément introuvable.");
  }
  res.json({ ok: true });
});

export default router;
