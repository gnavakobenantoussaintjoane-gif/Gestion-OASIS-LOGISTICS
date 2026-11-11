import { assertOasisCompany } from "../utils/companyAccess.js";
import { Router } from "express";
import { z } from "zod";
import { rateLimit } from "express-rate-limit";
import { supabase } from "../config/supabase.js";
import { authenticate } from "../middlewares/auth.js";
import { clearSession, saveSession } from "../services/session.js";
import { isTemporaryAuthError } from "../utils/authErrors.js";
import { HttpError, check } from "../utils/errors.js";
import flows from "./authFlows.js";
const router = Router();
router.use(flows);
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Trop de tentatives. Réessayez dans quelques minutes." },
});
// Accepter exactement email+mot de passe OU téléphone+mot de passe ; pas de champs supplémentaires.
router.post("/login", authLimiter, async (req, res) => {
  const password = z.string().min(1).max(128);
  const c = z
    .union([
      z.object({ email: z.email().max(254), password }).strict(),
      z
        .object({
          phone: z
            .string()
            .regex(
              /^\+[1-9]\d{7,14}$/,
              "Utilisez le format international, par exemple +2250700000000.",
            ),
          password,
        })
        .strict(),
    ])
    .parse(req.body);
  const { data, error } = await supabase().auth.signInWithPassword(c);
  // Conserver la distinction 503 (transport/service) et 401 (identifiants refusés).
  if (isTemporaryAuthError(error))
    throw new HttpError(
      503,
      "Le serveur ne parvient pas à joindre Supabase. Vérifiez son accès réseau.",
    );
  if (error || !data.session)
    throw new HttpError(
      401,
      "Identifiants invalides ou adresse non confirmée.",
    );
  saveSession(res, data.session);
  res.json({ ok: true });
});
router.post("/register", (_req, _res) => {
  throw new HttpError(
    403,
    "Les inscriptions publiques sont fermées. Contactez OASIS LOGISTICS.",
  );
});
// Un compte Auth valide ne suffit pas : profil, entreprise et capacité propriétaire viennent de SQL.
router.get("/session", authenticate, async (req, res) => {
  const [profile, role] = await Promise.all([
    req.db.from("profiles").select("*").eq("id", req.user.id).maybeSingle(),
    req.db
      .from("user_roles")
      .select("role,company_id")
      .eq("user_id", req.user.id)
      .maybeSingle(),
  ]);
  check(profile.error);
  check(role.error);
  if (role.data) assertOasisCompany(role.data.company_id);
  let company = null;
  if (role.data) {
    const result = await req.db
      .from("companies")
      .select("*")
      .eq("id", role.data.company_id)
      .single();
    check(result.error);
    company = result.data;
  }
  const capability = await req.db.rpc("oasis_is_super_admin");
  check(capability.error);
  res.json({
    isSuperAdmin: capability.data === true,
    user: { id: req.user.id, email: req.user.email },
    profile: profile.data,
    role: role.data?.role || null,
    company,
  });
});
// Logging out locally must also work when the access token is expired or Auth is offline.
router.post("/logout", async (req, res) => {
  const access = req.cookies.gestion_access;
  const refresh = req.cookies.gestion_refresh;
  let revoked = !access && !refresh;
  try {
    if (access && refresh) {
      const client = supabase();
      const restored = await client.auth.setSession({
        access_token: access,
        refresh_token: refresh,
      });
      if (!restored.error) {
        const result = await client.auth.signOut({ scope: "local" });
        revoked = !result.error;
      }
    }
  } catch {
    /* Never retain browser cookies because remote revocation failed. */
  }
  clearSession(res);
  res.json({ ok: true, revoked });
});
router.post("/password", authLimiter, authenticate, async (req, res) => {
  const { password, current_password } = z
    .object({
      password: z.string().min(12).max(128),
      current_password: z.string().min(1),
    })
    .parse(req.body);
  const authClient = supabase();
  const verified = await authClient.auth.signInWithPassword({
    ...(req.user.email
      ? { email: req.user.email }
      : { phone: req.user.phone! }),
    password: current_password,
  });
  if (isTemporaryAuthError(verified.error))
    throw new HttpError(
      503,
      "Le service d’authentification est temporairement indisponible.",
    );
  if (verified.error)
    throw new HttpError(401, "Mot de passe actuel incorrect.");
  const { error } = await authClient.auth.updateUser({ password });
  check(error);
  await authClient.auth.signOut({ scope: "global" });
  clearSession(res);
  res.json({ ok: true });
});
router.post("/company", (_req, _res) => {
  throw new HttpError(
    403,
    "La création d’entreprises est désactivée : cette application est réservée à OASIS LOGISTICS.",
  );
});
export default router;
