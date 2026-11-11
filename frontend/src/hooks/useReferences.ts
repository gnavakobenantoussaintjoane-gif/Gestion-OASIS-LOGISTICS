import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import type { ReferenceData, Row } from "../types";
export function useReferences() {
  return useQuery({
    queryKey: ["references"],
    queryFn: () => api<ReferenceData>("/reference-data"),
    staleTime: 60000,
  });
}
export function rowLabel(r: Row) {
  return (
    r.plate ||
    r.name ||
    [r.first_name, r.last_name].filter(Boolean).join(" ") ||
    r.full_name ||
    r.reference ||
    r.id
  );
}
export function referenceLabel(
  refs: ReferenceData | undefined,
  table: string,
  id: string,
) {
  return refs?.[table]?.find((r) => r.id === id)
    ? rowLabel(refs[table].find((r) => r.id === id)!)
    : id
      ? "Référence indisponible"
      : "—";
}
