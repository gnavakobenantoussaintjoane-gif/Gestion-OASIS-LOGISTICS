import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  Package,
  ChevronLeft,
  ChevronRight,
  Upload,
  FileText,
  ArrowUpDown,
  Zap,
  Archive,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import { api, queryString } from "../api/client";
import { configs, columnLabels } from "../services/resources";
import { useReferences, referenceLabel } from "../hooks/useReferences";
import { useSession } from "../contexts/SessionContext";
import { money, dateLabel } from "../utils/format";
import FiltersBar from "../components/FiltersBar";
import Modal from "../components/Modal";
import ResourceForm from "../components/ResourceForm";
import type { Filters, ListResult, Row } from "../types";
export default function ResourcePage({
  resource: prop,
}: {
  resource?: string;
}) {
  const { resource: param } = useParams();
  const resource = prop || param || "trips";
  const config = configs[resource];
  const { session } = useSession();
  const refs = useReferences();
  const client = useQueryClient();
  const [filters, setFilters] = useState<Filters>({ page: "1", limit: "20" });
  const [editing, setEditing] = useState<Row | true | null>(null);
  const [detail, setDetail] = useState<Row | null>(null);
  const [quick, setQuick] = useState(false);
  const [operation, setOperation] = useState(false);
  const close = useCallback(() => setEditing(null), []);
  const closeDetail = useCallback(() => setDetail(null), []);
  const records = useQuery({
    enabled: !!config,
    queryKey: ["records", resource, filters],
    queryFn: () => api<ListResult>(`/${resource}?${queryString(filters)}`),
  });
  if (!config)
    return (
      <div className="card empty">
        <h2>Module introuvable</h2>
        <Link to="/">Retour au tableau de bord</Link>
      </div>
    );
  const canWrite = config.writers.includes(session?.role || "");
  const canDelete =
    ["admin", "manager"].includes(session?.role || "") && canWrite;
  // Les opérateurs ne modifient que les voyages qu'ils ont créés (la RLS le vérifie aussi).
  const canEdit = (row: Row) =>
    canWrite &&
    (session?.role !== "operator" || row.created_by === session?.user.id);
  const format = (key: string, value: any) => {
    if (value === null || value === undefined || value === "") return "—";
    const links: Record<string, string> = {
      truck_id: "trucks",
      driver_id: "drivers",
      terminal_id: "terminals",
      container_type_id: "container_types",
      category_id: "expense_categories",
    };
    if (links[key]) return referenceLabel(refs.data, links[key], value);
    if (key === "price" || key === "amount") return money(value);
    if (
      [
        "date",
        "accounting_date",
        "license_expiry",
        "created_at",
        "updated_at",
      ].includes(key)
    )
      return dateLabel(value);
    if (key === "occurred_at")
      return `${dateLabel(value)} · ${new Date(value).toLocaleTimeString("fr-FR", { timeZone: "Africa/Abidjan", hour: "2-digit", minute: "2-digit" })}`;
    if (key === "shift") return value === "day" ? "Jour" : "Soir";
    if (typeof value === "boolean") return value ? "Oui" : "Non";
    if (key === "receipt_path") return "Disponible";
    return String(value);
  };
  async function remove(row: Row) {
    if (
      !window.confirm(
        resource === "trucks"
          ? "Archiver ce camion ? Son historique sera conservé."
          : "Supprimer cette opération ? Cette action est irréversible et sera journalisée.",
      )
    )
      return;
    setOperation(true);
    try {
      await api(`/${resource}/${row.id}`, { method: "DELETE" });
      await client.invalidateQueries();
      toast.success(
        resource === "trucks" ? "Camion archivé." : "Opération supprimée.",
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setOperation(false);
    }
  }
  async function receipt(row: Row) {
    try {
      const data = await api<{ url: string }>(`/expenses/${row.id}/receipt`);
      window.location.assign(data.url);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">ESPACE OPÉRATIONS</div>
          <h1>
            {config.title}
            <span className="title-dot">.</span>
          </h1>
          <p>{config.description}</p>
        </div>
        <div className="heading-actions">
          {resource === "trips" && canWrite && (
            <button
              className="button secondary"
              onClick={() => {
                setQuick(true);
                setEditing(true);
              }}
            >
              <Zap size={16} />
              Saisie rapide
            </button>
          )}
          {canWrite && (
            <button
              className="button primary"
              onClick={() => {
                setQuick(false);
                setEditing(true);
              }}
            >
              <Plus size={17} />
              Ajouter {config.singular}
            </button>
          )}
        </div>
      </div>
      <FiltersBar value={filters} onChange={setFilters} />
      {refs.error && (
        <div className="alert" role="alert">
          <span>
            Les références (camions, chauffeurs, terminaux) n’ont pas pu être
            chargées. Les identifiants restent affichés.
          </span>
          <button
            type="button"
            className="text-button"
            onClick={() => void refs.refetch()}
          >
            Réessayer
          </button>
        </div>
      )}
      <section className="card table-card">
        <div className="table-title">
          <h2>
            Registre des {config.title.toLowerCase()}{" "}
            <span className="count">{records.data?.total || 0}</span>
          </h2>
          <span className="live-label">
            <i />
            Données de votre entreprise
          </span>
        </div>
        {records.error ? (
          <div role="alert" className="empty">
            <p>{records.error.message}</p>
            <button
              className="button secondary"
              onClick={() => void records.refetch()}
            >
              Réessayer
            </button>
          </div>
        ) : records.isPending ? (
          <div role="status" className="empty">
            <span className="spinner" />
            Chargement des opérations…
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {config.columns.map((c) => (
                    <th key={c}>
                      {[
                        "date",
                        "accounting_date",
                        "price",
                        "amount",
                        "plate",
                        "occurred_at",
                      ].includes(c) ? (
                        <button
                          onClick={() =>
                            setFilters({
                              ...filters,
                              sort: c,
                              order: filters.order === "asc" ? "desc" : "asc",
                            })
                          }
                        >
                          {columnLabels[c] || c}
                          <ArrowUpDown size={10} />
                        </button>
                      ) : (
                        columnLabels[c] || c
                      )}
                    </th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.data?.rows.map((row) => (
                  <tr key={row.id}>
                    {config.columns.map((c) => (
                      <td
                        key={c}
                        className={
                          c === "price" || c === "amount" ? "money-cell" : ""
                        }
                      >
                        {[
                          "status",
                          "shift",
                          "load",
                          "active",
                          "archived",
                        ].includes(c) ? (
                          <span
                            className={`badge ${row[c] === "Disponible" || row[c] === "Plein" || row[c] === true ? "green" : row[c] === "En maintenance" ? "orange" : "blue"}`}
                          >
                            {format(c, row[c])}
                          </span>
                        ) : c === "receipt_path" ? (
                          row[c] ? (
                            <button
                              className="text-button"
                              onClick={() => void receipt(row)}
                            >
                              <FileText size={14} />
                              Consulter
                            </button>
                          ) : (
                            <span className="muted">Absent</span>
                          )
                        ) : (
                          format(c, row[c])
                        )}
                      </td>
                    ))}
                    <td>
                      <div className="row-actions">
                        <button
                          aria-label="Consulter"
                          title="Consulter"
                          onClick={() => setDetail(row)}
                        >
                          <Eye size={15} />
                        </button>
                        {canEdit(row) && (
                          <button
                            aria-label="Modifier"
                            title="Modifier"
                            onClick={() => {
                              setQuick(false);
                              setEditing(row);
                            }}
                          >
                            <Pencil size={15} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            aria-label={
                              resource === "trucks" ? "Archiver" : "Supprimer"
                            }
                            title={
                              resource === "trucks" ? "Archiver" : "Supprimer"
                            }
                            disabled={operation}
                            onClick={() => void remove(row)}
                          >
                            {resource === "trucks" ? (
                              <Archive size={15} />
                            ) : (
                              <Trash2 size={15} />
                            )}
                          </button>
                        )}
                        {resource === "expenses" && canWrite && (
                          <label
                            className="upload-action"
                            title="Ajouter un justificatif"
                          >
                            <Upload size={15} />
                            <input
                              type="file"
                              aria-label="Ajouter un justificatif"
                              accept="application/pdf,image/jpeg,image/png"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const input = e.target;
                                if (file.size > 5242880) {
                                  toast.error("Maximum 5 Mo.");
                                  input.value = "";
                                  return;
                                }
                                try {
                                  const form = new FormData();
                                  form.append("file", file);
                                  await api(`/expenses/${row.id}/receipt`, {
                                    method: "POST",
                                    body: form,
                                  });
                                  await client.invalidateQueries({
                                    queryKey: ["records"],
                                  });
                                  toast.success("Justificatif enregistré.");
                                } catch (error) {
                                  toast.error((error as Error).message);
                                }
                                input.value = "";
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!records.data?.rows.length && (
              <div className="empty">
                <span className="empty-icon">
                  <Package size={30} />
                </span>
                <h3>Aucune opération pour le moment</h3>
                <p>
                  Vos données réelles apparaîtront ici après leur
                  enregistrement.
                </p>
                {canWrite && (
                  <button
                    className="button secondary"
                    onClick={() => {
                      setQuick(false);
                      setEditing(true);
                    }}
                  >
                    <Plus size={15} />
                    Ajouter {config.singular}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        <div className="pagination">
          <span>
            {records.data?.total || 0} résultat(s) · Page {filters.page || 1}
          </span>
          <div>
            <select
              aria-label="Lignes par page"
              value={filters.limit || "20"}
              onChange={(e) =>
                setFilters({ ...filters, limit: e.target.value, page: "1" })
              }
            >
              <option>20</option>
              <option>50</option>
              <option>100</option>
            </select>
            <button
              aria-label="Page précédente"
              disabled={Number(filters.page || 1) <= 1}
              onClick={() =>
                setFilters({
                  ...filters,
                  page: String(Number(filters.page || 1) - 1),
                })
              }
            >
              <ChevronLeft size={16} />
            </button>
            <button
              aria-label="Page suivante"
              disabled={
                Number(filters.page || 1) * Number(filters.limit || 20) >=
                (records.data?.total || 0)
              }
              onClick={() =>
                setFilters({
                  ...filters,
                  page: String(Number(filters.page || 1) + 1),
                })
              }
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>
      {editing && (
        <Modal
          title={`${editing === true ? "Ajouter" : "Modifier"} ${config.singular}${quick ? " · saisie rapide" : ""}`}
          onClose={close}
        >
          <ResourceForm
            resource={resource}
            row={editing === true ? undefined : editing}
            onClose={close}
            quick={quick}
          />
        </Modal>
      )}
      {detail && (
        <Modal title={`Détails · ${config.singular}`} onClose={closeDetail}>
          <dl className="detail-list">
            {Object.entries(detail)
              .filter(
                ([k]) =>
                  !["company_id", "created_by", "receipt_path"].includes(k),
              )
              .map(([k, v]) => (
                <div key={k}>
                  <dt>
                    {columnLabels[k] ||
                      config.fields.find((f) => f.name === k)?.label ||
                      k}
                  </dt>
                  <dd>{format(k, v)}</dd>
                </div>
              ))}
          </dl>
          {["trucks", "drivers"].includes(resource) &&
            ["admin", "manager"].includes(session?.role || "") && (
              <Link
                className="button primary"
                to={`/reports?${resource === "trucks" ? "truck_id" : "driver_id"}=${detail.id}`}
              >
                Voir les performances <ArrowUpRight size={15} />
              </Link>
            )}
        </Modal>
      )}
    </>
  );
}
