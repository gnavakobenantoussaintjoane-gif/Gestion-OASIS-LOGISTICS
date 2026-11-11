import type { RequestHandler } from "express";
import { supabase } from "../config/supabase.js";
import { clearSession, saveSession } from "../services/session.js";
import { HttpError, check } from "../utils/errors.js";
const refreshing = new Map<
  string,
  ReturnType<ReturnType<typeof supabase>["auth"]["refreshSession"]>
>();
export const authenticate: RequestHandler = async (req, res, next) => {
  try {
    let token = req.cookies.gestion_access as string | undefined;
    let result = token ? await supabase(token).auth.getUser() : null;
    if (result?.error?.name === "AuthRetryableFetchError")
      throw new HttpError(
        503,
        "Supabase est temporairement inaccessible. Réessayez sans vous déconnecter.",
      );
    const refresh = req.cookies.gestion_refresh as string | undefined;
    if ((!result?.data.user || result.error) && refresh) {
      let pending = refreshing.get(refresh);
      if (!pending) {
        pending = supabase().auth.refreshSession({ refresh_token: refresh });
        refreshing.set(refresh, pending);
        setTimeout(() => refreshing.delete(refresh), 10000).unref();
      }
      const renewed = await pending;
      if (renewed.error?.name === "AuthRetryableFetchError")
        throw new HttpError(
          503,
          "Le renouvellement de session est temporairement indisponible. Réessayez.",
        );
      if (renewed.data.session) {
        saveSession(res, renewed.data.session);
        token = renewed.data.session.access_token;
        result = { data: { user: renewed.data.user! }, error: null };
      }
    }
    if (!token || !result?.data.user || result.error) {
      clearSession(res);
      throw new HttpError(401, "Votre session a expiré. Reconnectez-vous.");
    }
    req.db = supabase(token);
    req.user = result.data.user;
    next();
  } catch (e) {
    next(e);
  }
};
export const requireCompany: RequestHandler = async (req, _res, next) => {
  try {
    const { data, error } = await req.db
      .from("user_roles")
      .select("company_id,role")
      .eq("user_id", req.user.id)
      .maybeSingle();
    check(error);
    if (!data)
      throw new HttpError(
        428,
        "Créez une entreprise ou demandez votre rattachement à un administrateur.",
      );
    req.companyId = data.company_id;
    req.role = data.role;
    next();
  } catch (e) {
    next(e);
  }
};
export const allow =
  (...roles: string[]): RequestHandler =>
  (req, _res, next) =>
    roles.includes(req.role)
      ? next()
      : next(new HttpError(403, "Votre rôle ne permet pas cette action."));
