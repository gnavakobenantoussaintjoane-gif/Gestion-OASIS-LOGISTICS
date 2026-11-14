import { Container } from "lucide-react";
import type { ReferenceData } from "../../types";
import { referenceLabel } from "../../hooks/useReferences";
import {
  containerModeLabel,
  type TripContainer,
} from "../../utils/containers";

export default function ContainerSummary({
  containers,
  typeId,
  refs,
  compact = false,
}: {
  containers?: TripContainer[];
  typeId?: string;
  refs?: ReferenceData;
  compact?: boolean;
}) {
  const sorted = [...(containers || [])].sort((a, b) =>
    String(a.number).localeCompare(String(b.number)),
  );
  if (!sorted.length)
    return (
      <span className="container-summary-empty" title="Aucun numéro enregistré">
        Non renseigné
      </span>
    );
  const mode = sorted.some((container) => Number(container.size) === 40)
    ? "1x40"
    : "2x20";
  const typeLabel = typeId
    ? referenceLabel(refs, "container_types", typeId)
    : null;
  return (
    <span className={`container-summary ${compact ? "compact" : ""}`}>
      <span className="container-summary-type">
        <Container size={13} aria-hidden="true" />
        {containerModeLabel(mode)}
        {typeLabel ? ` · ${typeLabel}` : ""}
      </span>
      <span className="container-summary-numbers">
        {sorted.map((container) => (
          <span
            className="container-chip"
            key={container.id || container.number}
          >
            {container.number}
          </span>
        ))}
      </span>
      {!compact && (
        <small>
          {sorted.length} conteneur{sorted.length > 1 ? "s" : ""}
        </small>
      )}
    </span>
  );
}
