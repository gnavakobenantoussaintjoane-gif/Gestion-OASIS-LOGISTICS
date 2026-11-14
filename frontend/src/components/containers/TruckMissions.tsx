import { useQuery } from "@tanstack/react-query";
import { Truck } from "lucide-react";
import { api } from "../../api/client";
import { useReferences, referenceLabel } from "../../hooks/useReferences";
import { dateLabel } from "../../utils/format";
import type { ListResult, Row } from "../../types";
import ContainerSummary from "./ContainerSummary";

export default function TruckMissions({ truckId }: { truckId: string }) {
  const refs = useReferences();
  const missions = useQuery({
    queryKey: ["truck-missions", truckId],
    queryFn: () => api<ListResult>(`/trips?truck_id=${truckId}&limit=10`),
  });
  return (
    <section className="truck-missions" aria-labelledby="truck-missions-title">
      <h3 id="truck-missions-title">
        <Truck size={16} /> Missions et conteneurs récents
      </h3>
      {missions.isPending ? (
        <p className="container-history-muted" role="status">
          <span className="spinner" /> Chargement des missions…
        </p>
      ) : missions.error ? (
        <div className="container-history-error" role="alert">
          <p>{missions.error.message}</p>
          <button
            type="button"
            className="text-button"
            onClick={() => void missions.refetch()}
          >
            Réessayer
          </button>
        </div>
      ) : !missions.data?.rows.length ? (
        <p className="container-history-muted">
          Aucune mission enregistrée pour ce camion.
        </p>
      ) : (
        <ul className="truck-mission-list">
          {missions.data.rows.map((mission: Row) => (
            <li key={mission.id}>
              <div className="truck-mission-head">
                <strong>{mission.reference}</strong>
                <span>{dateLabel(mission.accounting_date)}</span>
              </div>
              <div className="truck-mission-meta">
                <span>
                  Chauffeur :{" "}
                  {referenceLabel(refs.data, "drivers", mission.driver_id)}
                </span>
                <ContainerSummary
                  containers={mission.trip_containers}
                  typeId={mission.container_type_id}
                  refs={refs.data}
                  compact
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
