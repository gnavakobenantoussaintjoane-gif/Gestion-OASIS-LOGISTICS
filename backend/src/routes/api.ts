import { Router } from "express";
import resourcesRouter from "../controllers/resourceController.js";
import { z } from "zod";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { authenticate, requireCompany, allow } from "../middlewares/auth.js";
import { filtersSchema } from "../validators/resources.js";
import { reportData } from "../services/resources.js";
import { reportReferences } from "../services/reportReferences.js";
import { exportReport } from "../services/exports.js";
import { HttpError, check } from "../utils/errors.js";
const router = Router();
router.use(authenticate, requireCompany);
router.get("/reference-data", async (req, res) => {
  const tables =
    req.role === "driver"
      ? [
          "drivers",
          "trucks",
          "terminals",
          "container_types",
          "shift_definitions",
        ]
      : [
          "trucks",
          "drivers",
          "terminals",
          "container_types",
          "expense_categories",
          "tariff_rules",
          "shift_definitions",
        ];
  const output: Record<string, any> = {};
  for (const table of tables) {
    const rows: any[] = [];
    for (let offset = 0; offset < 100000; offset += 1000) {
      const { data, error } = await req.db
        .from(table)
        .select("*")
        .eq("company_id", req.companyId)
        .range(offset, offset + 999);
      check(error);
      rows.push(...(data || []));
      if ((data?.length || 0) < 1000) break;
      if (offset === 99000) throw new HttpError(422, "Trop de références.");
    }
    output[table] = rows;
  }
  res.json(output);
});
router.get("/dashboard", allow("admin", "manager"), async (req, res) =>
  res.json(await reportData(req, filtersSchema.parse(req.query))),
);
router.get("/reports/:format", allow("admin", "manager"), async (req, res) => {
  const format = z.enum(["xlsx", "pdf"]).parse(req.params.format);
  const f = filtersSchema.parse(req.query);
  const report = await reportData(req, f);
  const { data, error } = await req.db
    .from("companies")
    .select("name")
    .eq("id", req.companyId)
    .single();
  check(error);
  await exportReport(
    res,
    format,
    { ...report, references: await reportReferences(req) },
    data!.name,
    `${f.start || "Début"} au ${f.end || "aujourd’hui"}`,
  );
});
router.get("/notifications", async (req, res) => {
  const { data, error } = await req.db
    .from("notifications")
    .select("*")
    .eq("company_id", req.companyId)
    .eq("user_id", req.user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  check(error);
  res.json(data);
});
router.patch("/notifications/:id/read", async (req, res) => {
  const id = z.uuid().parse(req.params.id);
  const { error } = await req.db
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", req.user.id);
  check(error);
  res.json({ ok: true });
});
router.get("/members", allow("admin", "manager"), async (req, res) => {
  const { data, error } = await req.db
    .from("profiles")
    .select(
      "id,full_name,phone,user_roles:user_roles!user_roles_user_id_fkey(role)",
    )
    .eq("company_id", req.companyId);
  check(error);
  res.json(data);
});
router.post("/members", allow("admin"), async (req, res) => {
  const fields = z
    .object({
      member_email: z.email(),
      member_name: z.string().trim().min(2).max(100),
      member_role: z.enum(["admin", "manager", "operator", "driver"]),
    })
    .parse(req.body);
  const { error } = await req.db.rpc("gestion_set_member", fields);
  check(error);
  res.json({ ok: true });
});
router.patch("/company", allow("admin"), async (req, res) => {
  const fields = z
    .object({
      name: z.string().trim().min(2).max(100),
      phone: z.string().max(30).nullable().optional(),
      address: z.string().max(500).nullable().optional(),
    })
    .parse(req.body);
  const { data, error } = await req.db
    .from("companies")
    .update(fields)
    .eq("id", req.companyId)
    .select()
    .single();
  check(error);
  res.json(data);
});
router.patch("/profile", async (req, res) => {
  const fields = z
    .object({
      full_name: z.string().trim().min(2).max(100),
      phone: z.string().max(30).nullable().optional(),
    })
    .parse(req.body);
  const { data, error } = await req.db
    .from("profiles")
    .update(fields)
    .eq("id", req.user.id)
    .select()
    .single();
  check(error);
  res.json(data);
});
router.get("/audit-logs", allow("admin", "manager"), async (req, res) => {
  const { data, error } = await req.db
    .from("audit_logs")
    .select("*")
    .eq("company_id", req.companyId)
    .order("created_at", { ascending: false })
    .limit(100);
  check(error);
  res.json(data);
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});
router.post(
  "/expenses/:id/receipt",
  allow("admin", "manager"),
  upload.single("file"),
  async (req, res) => {
    const id = z.uuid().parse(req.params.id);
    const f = req.file;
    if (!f)
      throw new HttpError(
        422,
        "Fichier requis (PDF, JPEG ou PNG, 5 Mo maximum).",
      );
    const ext =
      f.buffer.subarray(0, 5).toString() === "%PDF-"
        ? "pdf"
        : f.buffer[0] === 0xff && f.buffer[1] === 0xd8
          ? "jpg"
          : f.buffer
                .subarray(0, 8)
                .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
            ? "png"
            : null;
    if (!ext) throw new HttpError(422, "Format non autorisé.");
    const exists = await req.db
      .from("expenses")
      .select("id,receipt_path")
      .eq("id", id)
      .eq("company_id", req.companyId)
      .maybeSingle();
    check(exists.error);
    if (!exists.data) throw new HttpError(404, "Dépense introuvable.");
    const path = `${req.companyId}/${id}/${randomUUID()}.${ext}`;
    const storage = req.db.storage.from("gestion-receipts");
    const { error } = await storage.upload(path, f.buffer, {
      contentType:
        ext === "pdf"
          ? "application/pdf"
          : ext === "jpg"
            ? "image/jpeg"
            : "image/png",
    });
    check(error);
    const saved = await req.db
      .from("expenses")
      .update({ receipt_path: path })
      .eq("id", id)
      .eq("company_id", req.companyId)
      .select("id")
      .single();
    if (saved.error) {
      await storage.remove([path]);
      check(saved.error);
    }
    if (exists.data.receipt_path)
      await storage.remove([exists.data.receipt_path]);
    res.status(201).json({ ok: true });
  },
);
router.get(
  "/expenses/:id/receipt",
  allow("admin", "manager"),
  async (req, res) => {
    const id = z.uuid().parse(req.params.id);
    const { data, error } = await req.db
      .from("expenses")
      .select("receipt_path")
      .eq("id", id)
      .eq("company_id", req.companyId)
      .maybeSingle();
    check(error);
    if (!data?.receipt_path) throw new HttpError(404, "Justificatif absent.");
    const result = await req.db.storage
      .from("gestion-receipts")
      .createSignedUrl(data.receipt_path, 60, { download: true });
    check(result.error);
    res.json({ url: result.data!.signedUrl });
  },
);
router.use(resourcesRouter);
export default router;
