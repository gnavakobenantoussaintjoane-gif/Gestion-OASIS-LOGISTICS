import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { supabase } from "../config/supabase.js";
import { HttpError } from "../utils/errors.js";
import { isTemporaryAuthError } from "../utils/authErrors.js";
import { saveSession } from "../services/session.js";
import {
  clearFlow,
  clearRecovery,
  memoryStorage,
  readFlow,
  redirectOrigin,
  recoveryCookie,
  saveFlow,
  type FlowStore,
} from "../services/authFlow.js";
const router = Router();
const limit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Trop de demandes. Réessayez dans quelques minutes." },
});
router.post("/google", limit, async (req, res) => {
  const values: FlowStore = {};
  const client = supabase(undefined, memoryStorage(values));
  const { data, error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${redirectOrigin(req)}/auth/callback`,
      skipBrowserRedirect: true,
    },
  });
  if (error || !data.url)
    throw new HttpError(
      503,
      "La connexion Google est indisponible. Son activation dans Supabase et Google Cloud peut être nécessaire. Utilisez votre e-mail.",
    );
  saveFlow(res, "google", values);
  res.json({ url: data.url });
});
router.post("/forgot-password", limit, async (req, res) => {
  const { email } = z
    .object({ email: z.email().max(254) })
    .strict()
    .parse(req.body);
  const values: FlowStore = {};
  const client = supabase(undefined, memoryStorage(values));
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: `${redirectOrigin(req)}/auth/reset-password`,
  });
  if (error)
    throw new HttpError(
      isTemporaryAuthError(error) ? 503 : 422,
      "La demande n’a pas pu être envoyée. Réessayez plus tard ou contactez votre administrateur.",
    );
  saveFlow(res, "recovery", values);
  res.json({
    message:
      "Si cette adresse est admissible, un lien de réinitialisation vous sera envoyé. Ouvrez-le dans ce navigateur.",
  });
});
router.post("/callback", limit, async (req, res) => {
  const { code, flow } = z
    .object({
      code: z.string().min(1).max(2048),
      flow: z.enum(["google", "recovery"]),
    })
    .strict()
    .parse(req.body);
  const values = readFlow(req, flow);
  clearFlow(res);
  const { data, error } = await supabase(
    undefined,
    memoryStorage(values),
  ).auth.exchangeCodeForSession(code);
  if (error || !data.session)
    throw new HttpError(
      400,
      "Le lien de connexion est invalide ou expiré. Recommencez la demande.",
    );
  if (flow === "google") saveSession(res, data.session);
  else {
    // Recovery credentials cannot grant access to normal business routes.
    res.cookie(
      "gestion_recovery_access",
      data.session.access_token,
      recoveryCookie,
    );
    res.cookie(
      "gestion_recovery_refresh",
      data.session.refresh_token,
      recoveryCookie,
    );
  }
  res.json({ ok: true });
});
router.post("/recovery/password", limit, async (req, res) => {
  const { password } = z
    .object({ password: z.string().min(12).max(128) })
    .strict()
    .parse(req.body);
  const access = req.cookies.gestion_recovery_access;
  const refresh = req.cookies.gestion_recovery_refresh;
  if (typeof access !== "string" || typeof refresh !== "string")
    throw new HttpError(
      401,
      "Votre lien de réinitialisation a expiré. Faites une nouvelle demande.",
    );
  const client = supabase();
  const restored = await client.auth.setSession({
    access_token: access,
    refresh_token: refresh,
  });
  if (restored.error) {
    clearRecovery(res);
    throw new HttpError(401, "Le lien a expiré. Faites une nouvelle demande.");
  }
  const updated = await client.auth.updateUser({ password });
  if (updated.error)
    throw new HttpError(
      422,
      "Ce mot de passe ne respecte pas la politique de sécurité ou le service est indisponible.",
    );
  // Password update is successful even if remote revocation is temporarily unavailable.
  const revoked = await client.auth.signOut({ scope: "global" });
  clearRecovery(res);
  res.json({ ok: true, revoked: !revoked.error });
});
export default router;
