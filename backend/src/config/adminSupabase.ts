import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";
import { HttpError } from "../utils/errors.js";
/** Server only. Never use for ordinary business queries or send its key to the browser. */
export function adminSupabase() {
  if (!env.SUPABASE_SERVICE_ROLE_KEY)
    throw new HttpError(
      503,
      "La création de comptes doit être configurée par l’administrateur serveur.",
    );
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (url, init) =>
        fetch(url, { ...init, signal: AbortSignal.timeout(15000) }),
    },
  });
}
