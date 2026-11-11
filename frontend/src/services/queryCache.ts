import type { QueryClient } from "@tanstack/react-query";
/** Preserve the observed session query; cancel old account requests before dropping their cache. */
export async function clearPrivateQueries(client: QueryClient) {
  const filters = {
    predicate: (q: { queryKey: readonly unknown[] }) =>
      q.queryKey[0] !== "session",
  };
  await client.cancelQueries(filters);
  client.removeQueries(filters);
}
