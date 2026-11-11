import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { z } from "zod";
// Résoudre le .env du backend relativement au fichier, indépendamment du dossier courant.
dotenv.config({
  path: fileURLToPath(new URL("../../.env", import.meta.url)),
  quiet: true,
});
// Valider au démarrage les variables indispensables ; aucune valeur secrète n’est journalisée ici.
export const env = z
  .object({
    // Réservée aux opérations administratives Auth ; jamais exposée au frontend.
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
    OASIS_COMPANY_ID: z.uuid().optional(),
    PORT: z.coerce.number().default(4000),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    SUPABASE_URL: z.url(),
    SUPABASE_PUBLISHABLE_KEY: z.string().min(10),
    FRONTEND_ORIGIN: z.url().optional(),
  })
  .parse(process.env);
