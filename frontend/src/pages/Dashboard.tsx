import { lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import {
  Truck,
  Route,
  Wallet,
  TrendingUp,
  ArrowUpRight,
  ArrowRight,
  Sun,
  Moon,
  Anchor,
  AlertTriangle,
  Activity,
} from "lucide-react";

import { api, queryString } from "../api/client";
import { useReferences, referenceLabel } from "../hooks/useReferences";
import { useSession } from "../contexts/SessionContext";
import { money, dateLabel } from "../utils/format";
import FiltersBar from "../components/FiltersBar";
import ExportButtons from "../components/ExportButtons";
import {
  ActivityOverview,
  FinancialCharts,
} from "../components/DashboardCharts";
import type { Filters, Row } from "../types";
const Hero = lazy(
  () => import("../components/animations/DashboardTruckAnimation"),
);
type Report = {
  trips: Row[];
  expenses: Row[];
  trucks: Row[];
  totals: { revenue: string; expenses: string; profit: string; trips: number };
};
export default function Dashboard({
  reportMode = false,
  shiftsMode = false,
}: {
  reportMode?: boolean;
  shiftsMode?: boolean;
}) {
  const [params, setParams] = useSearchParams();
  const filters: Filters = Object.fromEntries(params);
  const setFilters = (next: Filters) =>
    setParams(queryString(next), { replace: true });
  const { session } = useSession();
  const refs = useReferences();
  const data = useQuery({
    queryKey: ["dashboard", filters],
    queryFn: () => api<Report>(`/dashboard?${queryString(filters)}`),
  });
  const report = data.data;
  const trips = report?.trips || [];
  const expenses = report?.expenses || [];
  const trucks = report?.trucks || [];
  const sum = (rows: Row[], key: string) =>
    rows.reduce((s, r) => s + BigInt(r[key] || 0), 0n);
  const today = new Date().toISOString().slice(0, 10);
  const days = new Map<
    string,
    { date: string; recettes: number; depenses: number }
  >();
  for (const t of trips) {
    const d = days.get(t.accounting_date) || {
      date: t.accounting_date,
      recettes: 0,
      depenses: 0,
    };
    d.recettes += Number(t.price);
    days.set(t.accounting_date, d);
  }
  for (const e of expenses) {
    const d = days.get(e.date) || { date: e.date, recettes: 0, depenses: 0 };
    d.depenses += Number(e.amount);
    days.set(e.date, d);
  }
  const chart = [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
  const months = new Map<string, { month: string; benefice: number }>();
  for (const d of chart) {
    const key = d.date.slice(0, 7);
    const v = months.get(key) || { month: key, benefice: 0 };
    v.benefice += d.recettes - d.depenses;
    months.set(key, v);
  }
  const distribution = (key: string, table: string) =>
    [...new Set(trips.map((t) => t[key]))].map((id) => ({
      name: referenceLabel(refs.data, table, id),
      value: trips.filter((t) => t[key] === id).length,
    }));
  const expenseGroups = (refs.data?.expense_categories || [])
    .map((c) => ({
      name: c.name,
      value: Number(
        sum(
          expenses.filter((e) => e.category_id === c.id),
          "amount",
        ),
      ),
    }))
    .filter((e) => e.value);
  const due = (refs.data?.drivers || []).filter((d) => {
    const days = (new Date(d.license_expiry).valueOf() - Date.now()) / 86400000;
    return days <= 30 && d.status === "Actif";
  });
  const stats = [
    {
      name: "Total camions",
      value: String(trucks.length),
      detail: "Parc enregistré",
      icon: Truck,
      color: "blue",
    },
    {
      name: "Voyages réalisés",
      value: String(report?.totals.trips || 0),
      detail: `${trips.filter((t) => t.accounting_date === today).length} voyage(s) aujourd’hui`,
      icon: Route,
      color: "purple",
    },
    {
      name: "Recettes totales",
      value: money(report?.totals.revenue || "0"),
      detail: "FCFA · tarifs historiques",
      icon: Wallet,
      color: "green",
    },
    {
      name: "Bénéfice d’exploitation",
      value: money(report?.totals.profit || "0"),
      detail: `${money(report?.totals.expenses || "0")} FCFA de dépenses`,
      icon: TrendingUp,
      color: "orange",
    },
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">VOTRE ACTIVITÉ EN TEMPS RÉEL</div>
          <h1>
            {reportMode
              ? "Finances & rapports"
              : shiftsMode
                ? "Pilotage des shifts"
                : `Bonjour, ${session?.profile?.full_name?.split(" ")[0] || "bienvenue"}`}
            <span className="title-dot">.</span>
          </h1>
          <p>
            {reportMode
              ? "Des chiffres fiables. Des décisions éclairées."
              : shiftsMode
                ? "Deux équipes, une même vision de vos performances."
                : "Une vue claire pour avancer dans la bonne direction."}
          </p>
        </div>
        <div className="heading-actions">
          <ExportButtons filters={filters} />
          <Link className="button primary" to="/records/trips">
            <Route size={16} />
            Enregistrer un voyage
          </Link>
        </div>
      </div>
      {!reportMode && !shiftsMode && (
        <Suspense fallback={<div className="fleet-hero" />}>
          <Hero />
        </Suspense>
      )}
      <FiltersBar value={filters} onChange={setFilters} />
      {data.error ? (
        <div role="alert" className="card empty">
          <p>{data.error.message}</p>
          <button
            className="button secondary"
            onClick={() => void data.refetch()}
          >
            Réessayer
          </button>
        </div>
      ) : data.isPending ? (
        <div className="card empty" role="status">
          <span className="spinner" />
          Chargement des indicateurs réels…
        </div>
      ) : (
        <>
          <section className="stats-grid">
            {stats.map((s) => (
              <article className="card stat-card" key={s.name}>
                <div>
                  <span>{s.name}</span>
                  <span className={`stat-icon ${s.color}`}>
                    <s.icon size={20} />
                  </span>
                </div>
                <strong>{s.value}</strong>
                <small>
                  <ArrowUpRight size={13} />
                  {s.detail}
                </small>
              </article>
            ))}
          </section>
          <div className="fleet-status">
            <span>
              <i className="dot green" />
              {
                trucks.filter((t) => t.status === "Disponible" && !t.archived)
                  .length
              }{" "}
              disponibles
            </span>
            <span>
              <i className="dot blue" />
              {
                trucks.filter((t) => t.status === "En voyage" && !t.archived)
                  .length
              }{" "}
              en déplacement
            </span>
            <span>
              <i className="dot orange" />
              {
                trucks.filter(
                  (t) => t.status === "En maintenance" && !t.archived,
                ).length
              }{" "}
              en maintenance
            </span>
            <span>
              <i className="dot red" />
              {
                trucks.filter((t) => t.status === "Hors service" && !t.archived)
                  .length
              }{" "}
              hors service
            </span>
            <span className="status-last">
              <Activity size={13} /> {money(report?.totals.expenses || "0")}{" "}
              FCFA de dépenses
            </span>
          </div>
          {due.length > 0 && (
            <div className="alert">
              <AlertTriangle size={17} />
              {due.length} permis expiré(s) ou arrivant à échéance dans les 30
              jours. <Link to="/records/drivers">Consulter les chauffeurs</Link>
            </div>
          )}
          <section className="analytics-grid">
            <ActivityOverview chart={chart} />
            <article className="card shift-card">
              <div className="card-heading">
                <div>
                  <h2>À chaque shift, sa performance</h2>
                  <p>Date comptable du départ</p>
                </div>
                <Anchor size={19} />
              </div>
              {(["day", "night"] as const).map((s) => {
                const group = trips.filter((t) => t.shift === s);
                return (
                  <div className={`shift-block ${s}`} key={s}>
                    <div className="shift-top">
                      <span className="shift-icon">
                        {s === "day" ? <Sun size={20} /> : <Moon size={20} />}
                      </span>
                      <div>
                        <strong>Shift {s === "day" ? "jour" : "soir"}</strong>
                        <small>
                          {s === "day"
                            ? "06h00 – 18h30"
                            : "19h00 – 06h00 (J+1)"}
                        </small>
                      </div>
                      <b>
                        {group.length}
                        <small>voyages</small>
                      </b>
                    </div>
                    <div className="progress">
                      <i
                        style={{
                          width: `${trips.length ? (group.length / trips.length) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <div className="shift-bottom">
                      <span>Recettes</span>
                      <strong>
                        {money(sum(group, "price"))} <small>FCFA</small>
                      </strong>
                    </div>
                  </div>
                );
              })}
              <p className="shift-note">
                Les départs avant 06h appartiennent à la veille.
              </p>
            </article>
          </section>
          {(reportMode || shiftsMode) && (
            <>
              <FinancialCharts months={months} expenseGroups={expenseGroups} />
              <section className="analytics-grid equal">
                {[
                  ["terminal_id", "terminals", "Voyages par terminal"],
                  [
                    "container_type_id",
                    "container_types",
                    "Répartition des conteneurs",
                  ],
                ].map(([key, table, title]) => (
                  <article className="card breakdown-card" key={key}>
                    <h2>{title}</h2>
                    {distribution(key, table).map((item) => (
                      <div className="breakdown-row" key={item.name}>
                        <span>{item.name}</span>
                        <strong>{item.value} voyage(s)</strong>
                      </div>
                    ))}
                    {!trips.length && <p>Aucun voyage enregistré.</p>}
                  </article>
                ))}
              </section>
              <section className="card table-card">
                <div className="table-title">
                  <h2>
                    {shiftsMode
                      ? "Shifts par date comptable"
                      : "Performance financière par camion"}
                  </h2>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>{shiftsMode ? "Date / shift" : "Camion"}</th>
                        <th>Voyages</th>
                        <th>Recettes · FCFA</th>
                        <th>Dépenses · FCFA</th>
                        <th>Bénéfice · FCFA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(shiftsMode
                        ? [
                            ...new Set(
                              trips.map(
                                (t) => `${t.accounting_date}|${t.shift}`,
                              ),
                            ),
                          ]
                        : trucks.map((t) => t.id)
                      ).map((id) => {
                        const [date, s] = id.split("|");
                        const ts = trips.filter((t) =>
                          shiftsMode
                            ? t.accounting_date === date && t.shift === s
                            : t.truck_id === id,
                        );
                        const es = expenses.filter((e) =>
                          shiftsMode
                            ? e.date === date && e.shift === s
                            : e.truck_id === id,
                        );
                        const rev = sum(ts, "price");
                        const spent = sum(es, "amount");
                        return (
                          <tr key={id}>
                            <td>
                              {shiftsMode
                                ? `${dateLabel(date)} · ${s === "day" ? "Jour" : "Soir"}`
                                : referenceLabel(refs.data, "trucks", id)}
                            </td>
                            <td>{ts.length}</td>
                            <td className="money-cell">{money(rev)}</td>
                            <td>{money(spent)}</td>
                            <td className="money-cell">{money(rev - spent)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {!(shiftsMode ? trips.length : trucks.length) && (
                  <div className="empty">
                    <h3>Aucune donnée sur la période</h3>
                    <p>
                      Enregistrez un voyage ou ajustez les filtres pour
                      afficher cette synthèse.
                    </p>
                  </div>
                )}
                <div className="table-footnote">
                  Les dépenses générales ne sont pas ventilées artificiellement
                  par camion ou shift. Ce résultat d’exploitation n’inclut ni
                  fiscalité ni amortissements.
                </div>
              </section>
            </>
          )}
          {!reportMode && !shiftsMode && (
            <section className="card table-card">
              <div className="table-title">
                <div>
                  <h2>
                    Derniers mouvements{" "}
                    <span className="count">{trips.length}</span>
                  </h2>
                  <p>Le fil de vos opérations portuaires.</p>
                </div>
                <Link className="text-button" to="/records/trips">
                  Tous les voyages <ArrowRight size={14} />
                </Link>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Référence</th>
                      <th>Camion</th>
                      <th>Date comptable</th>
                      <th>Shift</th>
                      <th>Terminal</th>
                      <th>Conteneur</th>
                      <th>Recette · FCFA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trips.slice(0, 6).map((t) => (
                      <tr key={t.id}>
                        <td className="reference-cell">{t.reference}</td>
                        <td>
                          {referenceLabel(refs.data, "trucks", t.truck_id)}
                        </td>
                        <td>{dateLabel(t.accounting_date)}</td>
                        <td>
                          <span
                            className={`badge ${t.shift === "day" ? "orange" : "purple"}`}
                          >
                            {t.shift === "day" ? (
                              <Sun size={12} />
                            ) : (
                              <Moon size={12} />
                            )}{" "}
                            {t.shift === "day" ? "Jour" : "Soir"}
                          </span>
                        </td>
                        <td>
                          {referenceLabel(
                            refs.data,
                            "terminals",
                            t.terminal_id,
                          )}
                        </td>
                        <td>
                          {referenceLabel(
                            refs.data,
                            "container_types",
                            t.container_type_id,
                          )}{" "}
                          <span className="muted">· {t.load}</span>
                        </td>
                        <td className="money-cell">{money(t.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!trips.length && (
                  <div className="empty">
                    <Route size={30} />
                    <h3>Votre prochain voyage commence ici.</h3>
                    <p>
                      Ajoutez vos chauffeurs, vos camions et vos tarifs pour
                      démarrer.
                    </p>
                    <Link to="/records/trucks" className="button secondary">
                      Configurer ma flotte <ArrowUpRight size={15} />
                    </Link>
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
