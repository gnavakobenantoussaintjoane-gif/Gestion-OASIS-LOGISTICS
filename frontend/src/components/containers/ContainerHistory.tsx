import { useQuery } from "@tanstack/react-query";
import { History, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "../../api/client";
import type { Row } from "../../types";

const labels: Record<string, string> = {
  CONTAINER_ADDED: "Ajout",
  CONTAINER_UPDATED: "Modification",
  CONTAINER_REMOVED: "Suppression",
  INSERT: "Ajout",
  UPDATE: "Modification",
  DELETE: "Suppression",
};
const icons: Record<string, typeof Plus> = {
  CONTAINER_ADDED: Plus,
  CONTAINER_UPDATED: Pencil,
  CONTAINER_REMOVED: Trash2,
  INSERT: Plus,
  UPDATE: Pencil,
  DELETE: Trash2,
};

function containerNumber(row: any) {
  return row?.number ? String(row.number) : "—";
}

export default function ContainerHistory({
  tripId,
  canRead,
}: {
  tripId: string;
  canRead: boolean;
}) {
  const history = useQuery({
    queryKey: ["container-history", tripId],
    queryFn: () => api<Row[]>(`/trips/${tripId}/containers/history`),
    enabled: canRead,
  });
  if (!canRead) return null;
  return (
    <section className="container-history" aria-labelledby="container-history-title">
      <h3 id="container-history-title">
        <History size={16} /> Historique des conteneurs
      </h3>
      {history.isPending ? (
        <p className="container-history-muted" role="status">
          <span className="spinner" /> Chargement de l’historique…
        </p>
      ) : history.error ? (
        <div className="container-history-error" role="alert">
          <p>{history.error.message}</p>
          <button
            type="button"
            className="text-button"
            onClick={() => void history.refetch()}
          >
            Réessayer
          </button>
        </div>
      ) : !history.data?.length ? (
        <p className="container-history-muted">
          Aucune modification de conteneur enregistrée.
        </p>
      ) : (
        <ol className="container-history-list">
          {history.data.map((entry) => {
            const Icon = icons[String(entry.action)] || History;
            const oldNumber = containerNumber(entry.old_data);
            const newNumber = containerNumber(entry.new_data);
            const action = labels[String(entry.action)] || String(entry.action);
            return (
              <li key={entry.id}>
                <span className={`container-history-icon ${String(entry.action).toLowerCase()}`}>
                  <Icon size={13} />
                </span>
                <div>
                  <strong>{action}</strong>
                  <span className="container-history-numbers">
                    {String(entry.action) === "CONTAINER_UPDATED" ||
                    String(entry.action) === "UPDATE"
                      ? `${oldNumber} → ${newNumber}`
                      : String(entry.action) === "CONTAINER_REMOVED" ||
                          String(entry.action) === "DELETE"
                        ? oldNumber
                        : newNumber}
                  </span>
                  <small>
                    {new Date(entry.created_at).toLocaleString("fr-FR", {
                      timeZone: "Africa/Abidjan",
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </small>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
