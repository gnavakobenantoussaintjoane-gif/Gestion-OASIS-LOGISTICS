import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import multer from "multer";
import { env } from "./config/env.js";
import auth from "./routes/auth.js";
import api from "./routes/api.js";
import { HttpError } from "./utils/errors.js";
export const app = express();
app.disable("x-powered-by");
app.set("trust proxy", false);
app.use(helmet());
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use(
  "/api",
  rateLimit({
    windowMs: 60000,
    limit: 250,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Trop de requêtes. Réessayez dans une minute." },
  }),
);
app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  if (req.headers["x-gestion-client"] !== "web")
    return next(new HttpError(403, "En-tête de sécurité manquant."));
  const origin = req.headers.origin;
  if (origin) {
    let allowed = false;
    try {
      allowed =
        new URL(origin).host === req.get("host") ||
        origin === env.FRONTEND_ORIGIN;
    } catch {
      /* invalid origin */
    }
    if (!allowed) return next(new HttpError(403, "Origine non autorisée."));
  }
  next();
});
app.get("/api/health", (_req, res) =>
  res.json({ service: "GESTION API", status: "ok", database: "configured" }),
);
app.use("/api/auth", auth);
app.use("/api", api);
app.use((_req, res) => res.status(404).json({ error: "Route introuvable." }));
app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (res.headersSent) return res.end();
    if (error instanceof z.ZodError)
      return res
        .status(422)
        .json({
          error: "Vérifiez les champs saisis.",
          details: error.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message,
          })),
        });
    if (error instanceof HttpError)
      return res.status(error.status).json({ error: error.message });
    if (error instanceof multer.MulterError)
      return res
        .status(422)
        .json({
          error: "Fichier trop volumineux ou envoi invalide (5 Mo maximum).",
        });
    if (error instanceof SyntaxError)
      return res.status(400).json({ error: "Corps JSON invalide." });
    console.error(
      "Request failure:",
      error instanceof Error ? error.name : "unknown",
    );
    res
      .status(503)
      .json({
        error:
          "Service temporairement indisponible. Vérifiez la connexion au serveur.",
      });
  },
);
