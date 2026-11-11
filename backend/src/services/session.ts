import type { Response } from "express";
import type { Session } from "@supabase/supabase-js";
import { env } from "../config/env.js";
// Portée /api : les jetons ne sont pas utiles aux ressources statiques.
// httpOnly empêche leur lecture en JavaScript ; secure impose HTTPS en production.
const options = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/api",
};
export function saveSession(res: Response, s: Session) {
  res.cookie("gestion_access", s.access_token, {
    ...options,
    maxAge: (s.expires_in || 3600) * 1000,
  });
  res.cookie("gestion_refresh", s.refresh_token, {
    ...options,
    maxAge: 30 * 86400000,
  });
}
// La suppression doit reprendre le même chemin que la création des cookies.
export function clearSession(res: Response) {
  res.clearCookie("gestion_access", options);
  res.clearCookie("gestion_refresh", options);
}
