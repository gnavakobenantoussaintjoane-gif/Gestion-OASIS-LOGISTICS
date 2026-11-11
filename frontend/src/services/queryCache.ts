import type { QueryClient } from "@tanstack/react-query";
/** Annule les requêtes de l’ancien compte avant de vider leur cache.
 * La session observée reste en place pour éviter une boucle de rechargement.
 */
export async function clearPrivateQueries(client: QueryClient) {
  const filters = {
    predicate: (q: { queryKey: readonly unknown[] }) =>
      q.queryKey[0] !== "session",
  };
  await client.cancelQueries(filters);
  client.removeQueries(filters);
}
