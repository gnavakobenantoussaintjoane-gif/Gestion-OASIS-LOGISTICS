import type { Request, Response } from "express";
import { env } from "../config/env.js";
import { HttpError } from "../utils/errors.js";
export type AuthFlow = "google" | "recovery";
export type FlowStore = Record<string, string>;
// Le verifier PKCE est temporaire et httpOnly ; il relie le départ au retour du même navigateur.
export const flowCookie = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/api/auth",
  maxAge: 10 * 60 * 1000,
};
// Isoler la récupération des cookies métier pour ne pas ouvrir une session applicative normale.
export const recoveryCookie = {
  ...flowCookie,
  path: "/api/auth/recovery",
  maxAge: 15 * 60 * 1000,
};
export function redirectOrigin(req: Request) {
  const origin = req.get("origin");
  if (!origin)
    throw new HttpError(
      400,
      "Origine de connexion manquante. Rechargez la page.",
    );
  // The app's existing origin middleware has already checked host / FRONTEND_ORIGIN.
  const parsed = new URL(origin);
  if (!["http:", "https:"].includes(parsed.protocol))
    throw new HttpError(400, "Origine invalide.");
  return parsed.origin;
}
export function memoryStorage(values: FlowStore) {
  return {
    getItem: (key: string) => values[key] ?? null,
    setItem: (key: string, value: string) => {
      values[key] = value;
    },
    removeItem: (key: string) => {
      delete values[key];
    },
  };
}
export function saveFlow(res: Response, flow: AuthFlow, values: FlowStore) {
  res.cookie("gestion_auth_flow", JSON.stringify({ flow, values }), flowCookie);
}
// Les cookies sont des entrées non fiables : contrôler le type de flux et borner leur contenu.
export function readFlow(req: Request, expected: AuthFlow): FlowStore {
  try {
    const stored: unknown = JSON.parse(req.cookies.gestion_auth_flow ?? "null");
    if (
      !stored ||
      typeof stored !== "object" ||
      !("flow" in stored) ||
      stored.flow !== expected ||
      !("values" in stored) ||
      !stored.values ||
      typeof stored.values !== "object"
    )
      throw new Error();
    const entries = Object.entries(stored.values);
    if (
      entries.length < 1 ||
      entries.length > 4 ||
      entries.some(
        ([key, value]) =>
          !/^sb-[a-z0-9-]+-code-verifier$/.test(key) ||
          key.length > 200 ||
          typeof value !== "string" ||
          value.length > 1024,
      )
    )
      throw new Error();
    return Object.fromEntries(entries) as FlowStore;
  } catch {
    throw new HttpError(
      400,
      "Ce lien a expiré ou a été ouvert dans un autre navigateur. Recommencez la demande.",
    );
  }
}
export function clearFlow(res: Response) {
  res.clearCookie("gestion_auth_flow", flowCookie);
}
export function clearRecovery(res: Response) {
  res.clearCookie("gestion_recovery_access", recoveryCookie);
  res.clearCookie("gestion_recovery_refresh", recoveryCookie);
}
