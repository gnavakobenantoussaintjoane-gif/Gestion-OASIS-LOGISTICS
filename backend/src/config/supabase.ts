import type { SupportedStorage } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";
/** Client métier : clé publique + jeton utilisateur pour appliquer les politiques RLS.
 * Un stockage temporaire active PKCE uniquement pour OAuth/récupération.
 */
export function supabase(token?: string, flowStorage?: SupportedStorage) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: !!flowStorage,
      ...(flowStorage
        ? { storage: flowStorage, flowType: "pkce" as const }
        : {}),
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      // Borner l’attente réseau ; un échec reste une indisponibilité, pas un mauvais mot de passe.
      fetch: (url, init) =>
        fetch(url, { ...init, signal: AbortSignal.timeout(15000) }),
    },
  });
}
