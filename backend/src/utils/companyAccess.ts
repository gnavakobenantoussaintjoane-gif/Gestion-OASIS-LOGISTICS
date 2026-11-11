import { env } from "../config/env.js";
import { HttpError } from "./errors.js";
/** Comparer l’UUID configuré, jamais le nom librement modifiable de l’entreprise.
 * Sans configuration, refuser l’accès plutôt que d’ouvrir toutes les entreprises.
 */
export function assertOasisCompany(companyId: string) {
  if (!env.OASIS_COMPANY_ID)
    throw new HttpError(
      503,
      "L’accès OASIS LOGISTICS doit être configuré par l’administrateur.",
    );
  if (companyId !== env.OASIS_COMPANY_ID)
    throw new HttpError(
      403,
      "Cette application est réservée à OASIS LOGISTICS.",
    );
}
