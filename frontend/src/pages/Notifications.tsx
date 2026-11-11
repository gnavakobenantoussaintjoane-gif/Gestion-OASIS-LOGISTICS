import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { api } from "../api/client";
import { dateLabel } from "../utils/format";
import type { Row } from "../types";
export default function Notifications({ audit = false }: { audit?: boolean }) {
  const client = useQueryClient();
  const q = useQuery({
    queryKey: [audit ? "audit" : "notifications"],
    queryFn: () => api<Row[]>(audit ? "/audit-logs" : "/notifications"),
    refetchInterval: audit ? false : 30000,
  });
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">RESTEZ INFORMÉ</div>
          <h1>
            {audit ? "Journal d’audit" : "Notifications"}
            <span className="title-dot">.</span>
          </h1>
          <p>
            {audit
              ? "La traçabilité des écritures et modifications de votre entreprise."
              : "Les dernières opérations liées à votre compte."}
          </p>
        </div>
      </div>
      <section className="card notification-list">
        {q.error ? (
          <div className="empty">
            <p>{q.error.message}</p>
            <button
              className="button secondary"
              onClick={() => void q.refetch()}
            >
              Réessayer
            </button>
          </div>
        ) : q.isPending ? (
          <div className="empty" role="status">
            Chargement…
          </div>
        ) : !q.data?.length ? (
          <div className="empty">
            <Bell size={30} />
            <h3>Vous êtes à jour.</h3>
            <p>
              {audit
                ? "Les prochaines opérations seront journalisées ici."
                : "Vos prochaines notifications apparaîtront ici."}
            </p>
          </div>
        ) : (
          q.data.map((n) => (
            <article
              className={`notification-item ${!audit && !n.read_at ? "unread" : ""}`}
              key={n.id}
            >
              <span className="notification-icon">
                {audit ? <ClipboardList size={20} /> : <Bell size={20} />}
              </span>
              <div>
                <h3>{audit ? `${n.action} · ${n.entity}` : n.title}</h3>
                <p>{audit ? `Référence : ${n.entity_id}` : n.message}</p>
                <small>
                  {dateLabel(n.created_at)} ·{" "}
                  {new Date(n.created_at).toLocaleTimeString("fr-FR", {
                    timeZone: "Africa/Abidjan",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </small>
                {audit && (
                  <details>
                    <summary>Détails de la modification</summary>
                    <pre>
                      {JSON.stringify(
                        { avant: n.old_data, apres: n.new_data },
                        null,
                        2,
                      )}
                    </pre>
                  </details>
                )}
              </div>
              {!audit && !n.read_at && (
                <button
                  className="button subtle"
                  onClick={async () => {
                    try {
                      await api(`/notifications/${n.id}/read`, {
                        method: "PATCH",
                      });
                      await client.invalidateQueries({
                        queryKey: ["notifications"],
                      });
                    } catch (e) {
                      toast.error((e as Error).message);
                    }
                  }}
                >
                  <Check size={15} />
                  Marquer lu
                </button>
              )}
            </article>
          ))
        )}
      </section>
    </>
  );
}
