import { env } from "../config/env.js";
import { HttpError } from "./errors.js";
/** Compare an immutable UUID, never a freely editable company name. */
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
