"use client";
import {
  useEffect,
  useState,
  useId,
  cloneElement,
  type ReactElement,
  type FormEvent,
} from "react";
import {
  LayoutDashboard,
  Truck as TruckIcon,
  Route,
  Wallet,
  ChartNoAxesCombined,
  Settings,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Search,
  Bell,
  ChevronDown,
  Download,
  ArrowRight,
  Sun,
  Moon,
  X,
  Trash2,
  Pencil,
  SlidersHorizontal,
  Check,
  Menu,
  Anchor,
  CircleHelp,
  Package,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import {
  containers,
  categories,
  demoData,
  filteredData,
  localDate,
  money,
  summarize,
  total,
  validateTrip,
  type Data,
  type Trip,
  type Expense,
  type Truck,
  type Filters,
} from "@/lib/domain";
import { exportReport } from "@/lib/exports";
import { backupSchema } from "@/lib/validation";
const nav = [
  { name: "Vue d’ensemble", icon: LayoutDashboard },
  { name: "Camions", icon: TruckIcon },
  { name: "Voyages & shifts", icon: Route },
  { name: "Dépenses", icon: Wallet },
  { name: "Finances & rapports", icon: ChartNoAxesCombined },
];
const emptyFilters: Filters = {
  start: "",
  end: "",
  truck: "",
  shift: "",
  terminal: "",
  container: "",
  load: "",
  query: "",
};
const storageKey = "oasis-logistics-v1";
const dateLabel = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
export default function Home() {
  const [data, setData] = useState<Data>({
    trucks: [],
    trips: [],
    expenses: [],
  });
  const [loaded, setLoaded] = useState(false);
  const [storageOk, setStorageOk] = useState(true);
  const [page, setPage] = useState("Vue d’ensemble");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [modal, setModal] = useState<"trip" | "expense" | "truck" | null>(null);
  const [editId, setEditId] = useState("");
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  useEffect(() => {
    let mounted = true;
    Promise.resolve().then(() => {
      if (!mounted) return;
      try {
        const saved = localStorage.getItem(storageKey);
        setData(saved ? backupSchema.parse(JSON.parse(saved)) : demoData());
      } catch {
        setData(demoData());
        setStorageOk(false);
      }
      setLoaded(true);
    });
    return () => {
      mounted = false;
    };
  }, []);
  useEffect(() => {
    if (loaded && storageOk) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(data));
      } catch {
        queueMicrotask(() => setStorageOk(false));
      }
    }
  }, [data, loaded, storageOk]);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 5000);
    return () => clearTimeout(timer);
  }, [message]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModal(null);
        setExportOpen(false);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector(".modal") as HTMLElement | null;
    const focusable = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input, select, [tabindex="0"]',
        ) || [],
      );
    focusable()[0]?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const els = focusable();
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", trap);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", trap);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [modal]);
  const { trips, expenses } = filteredData(data, filters);
  const stats = summarize(trips, expenses);
  const sorted = [...trips].sort((a, b) => b.date.localeCompare(a.date));
  const isOverview = page === "Vue d’ensemble";
  const setFilter = (key: keyof Filters, value: string) =>
    setFilters((p) => ({ ...p, [key]: value }));
  const truckName = (id: string) =>
    data.trucks.find((t) => t.id === id)?.plate || "Non affectée";
  const open = (type: "trip" | "expense" | "truck", id = "") => {
    setEditId(id);
    setFormError("");
    setModal(type);
  };
  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const str = (k: string) => String(f.get(k) || "").trim();
    const num = (k: string) => Number(f.get(k));
    const id = editId || crypto.randomUUID();
    if (modal === "trip") {
      const t: Trip = {
        id,
        date: str("date"),
        truckId: str("truckId"),
        shift: str("shift") as Trip["shift"],
        terminal: str("terminal") as Trip["terminal"],
        container: str("container") as Trip["container"],
        load: str("load") as Trip["load"],
        quantity: num("quantity"),
        price: num("price"),
        paid: num("paid"),
      };
      if (!validateTrip(t)) {
        setFormError(
          "Vérifiez les montants : voyages entiers positifs, prix positif et encaissement entre 0 et le total.",
        );
        return;
      }
      setData((d) => ({
        ...d,
        trips: editId
          ? d.trips.map((x) => (x.id === id ? t : x))
          : [t, ...d.trips],
        expenses: editId
          ? d.expenses.map((e) =>
              e.tripId === id ? { ...e, truckId: t.truckId } : e,
            )
          : d.expenses,
      }));
    } else if (modal === "expense") {
      const linked = data.trips.find((t) => t.id === str("tripId"));
      if (linked && str("truckId") && str("truckId") !== linked.truckId) {
        setFormError("Le camion doit correspondre au voyage lié.");
        return;
      }
      const expense: Expense = {
        id,
        date: str("date"),
        truckId: linked?.truckId || str("truckId"),
        tripId: str("tripId"),
        category: str("category"),
        description: str("description"),
        amount: num("amount"),
      };
      if (
        !Number.isSafeInteger(expense.amount) ||
        expense.amount <= 0 ||
        !expense.description
      ) {
        setFormError("Saisissez une description et un montant entier positif.");
        return;
      }
      setData((d) => ({
        ...d,
        expenses: editId
          ? d.expenses.map((x) => (x.id === id ? expense : x))
          : [expense, ...d.expenses],
      }));
    } else {
      const t: Truck = {
        id,
        plate: str("plate").toUpperCase(),
        driver: str("driver"),
        status: str("status") as Truck["status"],
      };
      if (data.trucks.some((x) => x.id !== id && x.plate === t.plate)) {
        setFormError("Cette immatriculation existe déjà.");
        return;
      }
      setData((d) => ({
        ...d,
        trucks: editId
          ? d.trucks.map((x) => (x.id === id ? t : x))
          : [...d.trucks, t],
      }));
    }
    setModal(null);
    setMessage("Enregistrement effectué avec succès.");
  }
  function remove(type: "trip" | "expense" | "truck", id: string) {
    if (
      type === "truck" &&
      (data.trips.some((t) => t.truckId === id) ||
        data.expenses.some((e) => e.truckId === id))
    ) {
      setMessage(
        "Ce camion possède des opérations. Conservez-le pour préserver votre historique.",
      );
      return;
    }
    if (
      !window.confirm(
        "Supprimer cet élément ? Cette action est irréversible. Les dépenses liées à un voyage seront conservées sans affectation.",
      )
    )
      return;
    setData((d) =>
      type === "trip"
        ? {
            ...d,
            trips: d.trips.filter((t) => t.id !== id),
            expenses: d.expenses.map((e) =>
              e.tripId === id ? { ...e, tripId: "" } : e,
            ),
          }
        : type === "expense"
          ? { ...d, expenses: d.expenses.filter((e) => e.id !== id) }
          : { ...d, trucks: d.trucks.filter((t) => t.id !== id) },
    );
    setMessage("Élément supprimé.");
  }
  async function doExport(format: "xlsx" | "pdf") {
    setBusy(true);
    setExportOpen(false);
    try {
      await exportReport(
        format,
        data,
        trips,
        expenses,
        `${filters.start || "Début"} au ${filters.end || "aujourd’hui"} • sélection filtrée`,
      );
      setMessage("Votre rapport a été exporté.");
    } catch {
      setMessage("Échec de l’export. Veuillez réessayer.");
    } finally {
      setBusy(false);
    }
  }
  const activeTrip = data.trips.find((t) => t.id === editId);
  const activeExpense = data.expenses.find((t) => t.id === editId);
  const activeTruck = data.trucks.find((t) => t.id === editId);
  const chartDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${filters.end || localDate()}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 6 + i);
    const date = d.toISOString().slice(0, 10);
    return {
      date,
      revenue: trips
        .filter((t) => t.date === date)
        .reduce((a, t) => a + total(t), 0),
      spent: expenses
        .filter((e) => e.date === date)
        .reduce((a, e) => a + e.amount, 0),
    };
  });
  const chartMax = Math.max(
    100000,
    ...chartDays.map((d) => Math.max(d.revenue, d.spent)),
  );
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "show" : ""}`}>
        <a
          className="brand"
          href="#"
          onClick={() => {
            setPage("Vue d’ensemble");
            setMobileNav(false);
          }}
        >
          <div className="brand-icon">
            <TruckIcon size={25} />
          </div>
          <div>
            OASIS<span>TRANSPORT & LOGISTICS</span>
          </div>
        </a>
        <div className="workspace">
          <span className="workspace-avatar">O</span>
          <div>
            Oasis Logistics<small>Espace de gestion</small>
          </div>
          <ChevronDown size={15} />
        </div>
        <p className="nav-label">ESPACE DE TRAVAIL</p>
        <nav>
          {nav.map((n) => (
            <button
              key={n.name}
              className={page === n.name ? "nav-item active" : "nav-item"}
              onClick={() => {
                setPage(n.name);
                setMobileNav(false);
              }}
            >
              <n.icon size={19} />
              {n.name}
              {n.name === "Voyages & shifts" && (
                <span className="nav-count">
                  {data.trips.reduce((a, t) => a + t.quantity, 0)}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="support-card">
            <span className="support-icon">
              <Anchor size={23} />
            </span>
            <strong>Chaque voyage compte.</strong>
            <p>Gardez le cap sur votre activité.</p>
            <button
              onClick={() => {
                setPage("Finances & rapports");
                setMobileNav(false);
              }}
            >
              Voir mes performances <ArrowUpRight size={15} />
            </button>
          </div>
          <button
            className={`nav-item ${page === "Paramètres" ? "active" : ""}`}
            onClick={() => {
              setPage("Paramètres");
              setMobileNav(false);
            }}
          >
            <Settings size={19} />
            Paramètres
          </button>
          <div className="profile">
            <div className="avatar">AD</div>
            <div>
              Administrateur<small>Gestionnaire de flotte</small>
            </div>
            <span className="online" />
          </div>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              onClick={() => setMobileNav(!mobileNav)}
              aria-label="Menu"
            >
              <Menu size={20} />
            </button>
            <span>Espace de travail</span>
            <span className="slash">/</span>
            <strong>{page}</strong>
          </div>
          <div className="top-actions">
            <span className="abidjan">
              <span className="online" /> Abidjan, Côte d’Ivoire
            </span>
            <button
              className="icon-button"
              aria-label="Informations sur les données"
              onClick={() =>
                setMessage(
                  "Mode local : les données sont enregistrées uniquement dans ce navigateur. Pensez à exporter vos rapports.",
                )
              }
            >
              <Bell size={19} />
              <i />
            </button>
            <span className="avatar small">AD</span>
          </div>
        </header>
        <main>
          <div className="demo-notice">
            <span>
              <span className="online" />
              {storageOk
                ? "Espace de démonstration · Données locales dans ce navigateur"
                : "Stockage indisponible · Exportez vos données avant de fermer"}
            </span>
            <span>FCFA · Afrique / Abidjan</span>
          </div>
          <div className="page-heading">
            <div>
              <div className="eyebrow">VOTRE ACTIVITÉ, EN UN COUP D’ŒIL</div>
              <h1>{page === "Vue d’ensemble" ? "Tableau de bord" : page}</h1>
              <p>
                {isOverview
                  ? "Bienvenue ! Voici ce qui se passe sur votre flotte."
                  : page === "Voyages & shifts"
                    ? "Chaque rotation, chaque shift, chaque recette. Tout est ici."
                    : page === "Dépenses"
                      ? "Suivez vos charges et gardez le contrôle sur vos coûts."
                      : page === "Camions"
                        ? "Votre flotte et vos chauffeurs, au même endroit."
                        : page === "Paramètres"
                          ? "Un espace clair pour bien démarrer et protéger vos données."
                          : "Transformez vos opérations en décisions éclairées."}
              </p>
            </div>
            <div className="heading-actions">
              <div className="export-wrap">
                <button
                  className="button secondary"
                  disabled={busy || !loaded}
                  onClick={() => setExportOpen(!exportOpen)}
                >
                  <Download size={16} />
                  {busy ? "Export en cours…" : "Exporter"}
                  <ChevronDown size={14} />
                </button>
                {exportOpen && (
                  <div className="dropdown">
                    <button onClick={() => doExport("xlsx")}>
                      Tableau Excel (.xlsx)
                    </button>
                    <button onClick={() => doExport("pdf")}>
                      Rapport PDF (.pdf)
                    </button>
                    <small>Voyages et dépenses filtrés + parc complet</small>
                  </div>
                )}
              </div>
              <button
                className="button primary"
                disabled={!loaded}
                onClick={() =>
                  open(
                    page === "Dépenses"
                      ? "expense"
                      : page === "Camions"
                        ? "truck"
                        : "trip",
                  )
                }
              >
                <Plus size={18} />
                {page === "Dépenses"
                  ? "Nouvelle dépense"
                  : page === "Camions"
                    ? "Ajouter un camion"
                    : "Nouveau voyage"}
              </button>
            </div>
          </div>
          {page !== "Paramètres" && (
            <>
              <section className="filterbar">
                <div className="period-field">
                  <span>Période</span>
                  <input
                    aria-label="Date de début"
                    type="date"
                    value={filters.start}
                    onChange={(e) => setFilter("start", e.target.value)}
                  />
                  <span>→</span>
                  <input
                    aria-label="Date de fin"
                    min={filters.start}
                    type="date"
                    value={filters.end}
                    onChange={(e) => setFilter("end", e.target.value)}
                  />
                </div>
                <select
                  aria-label="Filtrer par camion"
                  value={filters.truck}
                  onChange={(e) => setFilter("truck", e.target.value)}
                >
                  <option value="">Tous les camions</option>
                  {data.trucks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.plate}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Filtrer par shift"
                  value={filters.shift}
                  onChange={(e) => setFilter("shift", e.target.value)}
                >
                  <option value="">Tous les shifts</option>
                  <option>Jour</option>
                  <option>Nuit</option>
                </select>
                <button
                  className={`button filter-button ${advanced ? "selected" : ""}`}
                  onClick={() => setAdvanced(!advanced)}
                >
                  <SlidersHorizontal size={15} />
                  Filtres
                </button>
                {Object.values(filters).some(Boolean) && (
                  <button
                    className="reset-button"
                    onClick={() => setFilters(emptyFilters)}
                    title="Réinitialiser les filtres"
                  >
                    <RefreshCw size={16} />
                  </button>
                )}
              </section>
              {advanced && (
                <section className="advanced-filters">
                  <select
                    aria-label="Terminal"
                    value={filters.terminal}
                    onChange={(e) => setFilter("terminal", e.target.value)}
                  >
                    <option value="">Tous les terminaux</option>
                    <option value="ATL">ATL · Abidjan Terminal</option>
                    <option value="CIT">CIT · Côte d’Ivoire Terminal</option>
                  </select>
                  <select
                    aria-label="Conteneur"
                    value={filters.container}
                    onChange={(e) => setFilter("container", e.target.value)}
                  >
                    <option value="">Tous les conteneurs</option>
                    {containers.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  <select
                    aria-label="État du conteneur"
                    value={filters.load}
                    onChange={(e) => setFilter("load", e.target.value)}
                  >
                    <option value="">Plein et vide</option>
                    <option>Plein</option>
                    <option>Vide</option>
                  </select>
                  <small>
                    Les filtres de voyage excluent les dépenses non affectées.
                  </small>
                </section>
              )}
              {filters.start && filters.end && filters.start > filters.end && (
                <p className="form-error">
                  La date de fin doit être postérieure à la date de début.
                </p>
              )}
            </>
          )}
          {(isOverview || page === "Finances & rapports") && (
            <>
              <section className="stats-grid">
                <Stat
                  title="Chiffre d’affaires"
                  value={money(stats.revenue)}
                  suffix="FCFA"
                  icon={<Wallet size={20} />}
                  detail={`${money(stats.paid)} FCFA encaissés`}
                  tone="green"
                />
                <Stat
                  title="Voyages réalisés"
                  value={String(stats.count)}
                  icon={<Route size={20} />}
                  detail={`${trips.length} lignes de voyages · ${new Set(trips.map((t) => t.shift)).size} shift(s)`}
                  tone="blue"
                />
                <Stat
                  title="Dépenses totales"
                  value={money(stats.spent)}
                  suffix="FCFA"
                  icon={<ArrowDownRight size={20} />}
                  detail={`${expenses.length} dépenses enregistrées`}
                  tone="orange"
                />
                <Stat
                  title="Résultat d’exploitation"
                  value={money(stats.profit)}
                  suffix="FCFA"
                  icon={<ChartNoAxesCombined size={20} />}
                  detail="Recettes calculées − dépenses"
                  tone="purple"
                />
              </section>
              <section className="analytics-grid">
                <div className="card chart-card">
                  <div className="card-heading">
                    <div>
                      <h2>Évolution de l’activité</h2>
                      <p>Recettes et dépenses · FCFA</p>
                    </div>
                    <span className="subtle-pill">7 derniers jours</span>
                  </div>
                  <div className="chart-legend">
                    <span>
                      <i className="legend-dot green" />
                      Recettes
                    </span>
                    <span>
                      <i className="legend-dot orange" />
                      Dépenses
                    </span>
                  </div>
                  <div className="chart">
                    <div className="y-axis">
                      {[1, 0.75, 0.5, 0.25, 0].map((v) => (
                        <span key={v}>
                          {Math.round((chartMax * v) / 1000)} k
                        </span>
                      ))}
                    </div>
                    <div className="plot">
                      <div className="grid-lines">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <i key={i} />
                        ))}
                      </div>
                      <div className="bar-groups">
                        {chartDays.map((d) => (
                          <div className="bar-group" key={d.date}>
                            <div className="bars">
                              <div
                                className="bar revenue"
                                style={{
                                  height: `${(d.revenue / chartMax) * 100}%`,
                                }}
                                title={`${dateLabel(d.date)} : ${money(d.revenue)} FCFA de recettes`}
                              />
                              <div
                                className="bar expense"
                                style={{
                                  height: `${(d.spent / chartMax) * 100}%`,
                                }}
                                title={`${money(d.spent)} FCFA de dépenses`}
                              />
                            </div>
                            <span>{dateLabel(d.date)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="chart-footer">
                    <span>
                      <span className="online" /> Les chiffres reflètent les
                      filtres sélectionnés
                    </span>
                    <button
                      className="text-button"
                      onClick={() => setPage("Finances & rapports")}
                    >
                      Voir le rapport <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
                <div className="card shifts-card">
                  <div className="card-heading">
                    <div>
                      <h2>Répartition des shifts</h2>
                      <p>À chaque équipe, sa performance</p>
                    </div>
                    <span className="mini-icon">
                      <Sun size={19} />
                    </span>
                  </div>
                  {(["Jour", "Nuit"] as const).map((shift) => {
                    const group = trips.filter((t) => t.shift === shift);
                    const count = group.reduce((a, t) => a + t.quantity, 0);
                    return (
                      <div
                        className={`shift-summary ${shift === "Nuit" ? "night" : ""}`}
                        key={shift}
                      >
                        <div className="shift-summary-top">
                          <span className="shift-icon">
                            {shift === "Jour" ? (
                              <Sun size={20} />
                            ) : (
                              <Moon size={20} />
                            )}
                          </span>
                          <div>
                            <strong>
                              Shift {shift === "Jour" ? "jour" : "soir"}
                            </strong>
                            <small>
                              {shift === "Jour"
                                ? "06h00 – 18h30"
                                : "19h00 – 06h00 (J+1)"}
                            </small>
                          </div>
                          <b>
                            {count}
                            <small>voyages</small>
                          </b>
                        </div>
                        <div className="progress">
                          <span
                            style={{
                              width: `${stats.count ? (count / stats.count) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        <div className="shift-bottom">
                          <span>Recettes du shift</span>
                          <strong>
                            {money(group.reduce((a, t) => a + total(t), 0))}{" "}
                            <small>FCFA</small>
                          </strong>
                        </div>
                      </div>
                    );
                  })}
                  <div className="shift-note">
                    <CircleHelp size={14} />
                    Le shift soir est rattaché à sa date de départ.
                  </div>
                </div>
              </section>
            </>
          )}
          {(isOverview || page === "Voyages & shifts") && (
            <section className="card table-card">
              <div className="table-heading">
                <div>
                  <h2>
                    {isOverview ? "Derniers voyages" : "Registre des voyages"}{" "}
                    <span className="count-pill">{trips.length}</span>
                  </h2>
                  <p>Un suivi précis de vos opérations portuaires.</p>
                </div>
                <div className="table-tools">
                  <label className="search">
                    <Search size={16} />
                    <input
                      aria-label="Rechercher des opérations"
                      placeholder="Rechercher un camion…"
                      value={filters.query}
                      onChange={(e) => setFilter("query", e.target.value)}
                    />
                  </label>
                  {isOverview && (
                    <button
                      className="text-button"
                      onClick={() => setPage("Voyages & shifts")}
                    >
                      Tout voir <ArrowRight size={15} />
                    </button>
                  )}
                </div>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>DATE</th>
                      <th>CAMION / CHAUFFEUR</th>
                      <th>SHIFT</th>
                      <th>TERMINAL</th>
                      <th>CONTENEUR</th>
                      <th>VOYAGES</th>
                      <th>RECETTES</th>
                      <th>PAIEMENT</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {(isOverview ? sorted.slice(0, 5) : sorted).map((t) => (
                      <tr key={t.id}>
                        <td className="date-cell">
                          {dateLabel(t.date)}
                          <small>{t.date.slice(0, 4)}</small>
                        </td>
                        <td>
                          <div className="truck-cell">
                            <span className="truck-mini">
                              <TruckIcon size={17} />
                            </span>
                            <div>
                              <strong>{truckName(t.truckId)}</strong>
                              <small>
                                {
                                  data.trucks.find((x) => x.id === t.truckId)
                                    ?.driver
                                }
                              </small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`badge ${t.shift === "Jour" ? "day" : "night"}`}
                          >
                            {t.shift === "Jour" ? (
                              <Sun size={12} />
                            ) : (
                              <Moon size={12} />
                            )}{" "}
                            {t.shift === "Jour" ? "Jour" : "Soir"}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`terminal ${t.terminal.toLowerCase()}`}
                          >
                            {t.terminal}
                          </span>
                        </td>
                        <td>
                          <strong className="container-label">
                            {t.container}
                          </strong>
                          <small>
                            <span
                              className={`tiny-dot ${t.load === "Plein" ? "green" : ""}`}
                            />
                            {t.load}
                          </small>
                        </td>
                        <td className="quantity">
                          {t.quantity.toString().padStart(2, "0")}
                        </td>
                        <td className="amount">
                          {money(total(t))}
                          <small>FCFA · {money(t.price)} / voyage</small>
                        </td>
                        <td>
                          <span
                            className={`badge ${t.paid === total(t) ? "paid" : "pending"}`}
                          >
                            {t.paid === total(t)
                              ? "Encaissé"
                              : t.paid
                                ? "Partiel"
                                : "À encaisser"}
                          </span>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button
                              aria-label="Modifier le voyage"
                              onClick={() => open("trip", t.id)}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              aria-label="Supprimer le voyage"
                              onClick={() => remove("trip", t.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!trips.length && (
                  <Empty
                    text="Aucun voyage pour cette sélection."
                    onClick={() => open("trip")}
                  />
                )}
              </div>
              <div className="table-footer">
                <span>
                  {isOverview ? Math.min(5, trips.length) : trips.length} sur{" "}
                  {trips.length} lignes de voyages
                </span>
                <span>
                  {money(stats.revenue)} FCFA de recettes sur la sélection
                </span>
              </div>
            </section>
          )}
          {page === "Dépenses" && (
            <>
              <section className="mini-stats">
                <Stat
                  title="Dépenses de la sélection"
                  value={money(stats.spent)}
                  suffix="FCFA"
                  icon={<Wallet size={20} />}
                  detail={`${expenses.length} opérations`}
                  tone="orange"
                />
                <Stat
                  title="Coût moyen par voyage"
                  value={money(stats.count ? stats.spent / stats.count : 0)}
                  suffix="FCFA"
                  icon={<Route size={20} />}
                  detail="Dépenses filtrées / voyages filtrés"
                  tone="blue"
                />
              </section>
              <section className="card table-card">
                <div className="table-heading">
                  <div>
                    <h2>Registre des dépenses</h2>
                    <p>
                      Les dépenses sont considérées payées à leur date de
                      saisie.
                    </p>
                  </div>
                  <label className="search">
                    <Search size={16} />
                    <input
                      placeholder="Rechercher une dépense…"
                      value={filters.query}
                      onChange={(e) => setFilter("query", e.target.value)}
                    />
                  </label>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>DATE</th>
                        <th>DESCRIPTION</th>
                        <th>CATÉGORIE</th>
                        <th>CAMION</th>
                        <th>AFFECTATION</th>
                        <th>MONTANT</th>
                        <th>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...expenses]
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .map((e) => (
                          <tr key={e.id}>
                            <td>{dateLabel(e.date)}</td>
                            <td>
                              <strong>{e.description}</strong>
                            </td>
                            <td>
                              <span className="badge neutral">
                                {e.category}
                              </span>
                            </td>
                            <td>{truckName(e.truckId)}</td>
                            <td>
                              {e.tripId
                                ? `Voyage du ${dateLabel(data.trips.find((t) => t.id === e.tripId)?.date || e.date)}`
                                : "Non affectée"}
                            </td>
                            <td className="amount">
                              {money(e.amount)} <small>FCFA</small>
                            </td>
                            <td>
                              <div className="row-actions">
                                <button
                                  aria-label="Modifier la dépense"
                                  onClick={() => open("expense", e.id)}
                                >
                                  <Pencil size={15} />
                                </button>
                                <button
                                  aria-label="Supprimer la dépense"
                                  onClick={() => remove("expense", e.id)}
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  {!expenses.length && (
                    <Empty
                      text="Aucune dépense pour cette sélection."
                      onClick={() => open("expense")}
                    />
                  )}
                </div>
              </section>
            </>
          )}
          {page === "Camions" && (
            <section className="trucks-grid">
              {data.trucks
                .filter((t) => !filters.truck || t.id === filters.truck)
                .map((t) => {
                  const ts = trips.filter((v) => v.truckId === t.id);
                  const s = summarize(
                    ts,
                    expenses.filter((e) => e.truckId === t.id),
                  );
                  return (
                    <article className="card truck-card" key={t.id}>
                      <div className="truck-card-top">
                        <span className="large-truck">
                          <TruckIcon size={32} />
                        </span>
                        <span
                          className={`badge ${t.status === "Maintenance" ? "pending" : "paid"}`}
                        >
                          {t.status}
                        </span>
                      </div>
                      <h2>{t.plate}</h2>
                      <p>{t.driver}</p>
                      <div className="truck-metrics">
                        <div>
                          <small>Voyages</small>
                          <strong>{s.count}</strong>
                        </div>
                        <div>
                          <small>Recettes (FCFA)</small>
                          <strong>{money(s.revenue)}</strong>
                        </div>
                      </div>
                      <div className="truck-card-bottom">
                        <button
                          className="text-button"
                          onClick={() => open("truck", t.id)}
                        >
                          <Pencil size={14} />
                          Modifier
                        </button>
                        <button
                          className="icon-button danger"
                          aria-label="Supprimer le camion"
                          onClick={() => remove("truck", t.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </article>
                  );
                })}
              <button className="add-truck" onClick={() => open("truck")}>
                <Plus size={30} />
                <strong>Ajouter un camion</strong>
                <span>Agrandissez votre flotte</span>
              </button>
            </section>
          )}
          {page === "Finances & rapports" && (
            <section className="finance-grid">
              <div className="card finance-card">
                <span className="eyebrow">TRÉSORERIE DE LA SÉLECTION</span>
                <h2>
                  {money(stats.cash)} <small>FCFA</small>
                </h2>
                <p>Encaissements déclarés − dépenses payées.</p>
                <div className="finance-line">
                  <span>Chiffre d’affaires calculé</span>
                  <strong>{money(stats.revenue)} FCFA</strong>
                </div>
                <div className="finance-line">
                  <span>Montant encaissé</span>
                  <strong>{money(stats.paid)} FCFA</strong>
                </div>
                <div className="finance-line">
                  <span>Reste à encaisser</span>
                  <strong className="orange-text">
                    {money(stats.pending)} FCFA
                  </strong>
                </div>
                <div className="finance-line">
                  <span>Dépenses payées</span>
                  <strong>{money(stats.spent)} FCFA</strong>
                </div>
                <small>
                  Les encaissements sont rattachés à la date du voyage, pas à
                  une date bancaire. Ce suivi simplifié ne remplace pas une
                  comptabilité.
                </small>
              </div>
              <div className="card finance-card">
                <h2>Où va votre argent ?</h2>
                <p>Répartition des dépenses par catégorie</p>
                {categories.map((c) => {
                  const amount = expenses
                    .filter((e) => e.category === c)
                    .reduce((a, e) => a + e.amount, 0);
                  return (
                    <div className="category-row" key={c}>
                      <div>
                        <span>{c}</span>
                        <strong>{money(amount)} FCFA</strong>
                      </div>
                      <div className="progress">
                        <span
                          style={{
                            width: `${stats.spent ? (amount / stats.spent) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
          {page === "Paramètres" && (
            <section className="settings-grid">
              <div className="card finance-card">
                <h2>Votre espace OASIS</h2>
                <p>Configuration métier de cette première version</p>
                <div className="finance-line">
                  <span>Devise</span>
                  <strong>Franc CFA (XOF)</strong>
                </div>
                <div className="finance-line">
                  <span>Shift jour</span>
                  <strong>06h00 – 18h30</strong>
                </div>
                <div className="finance-line">
                  <span>Shift soir</span>
                  <strong>19h00 – 06h00 (J+1)</strong>
                </div>
                <div className="finance-line">
                  <span>Terminaux</span>
                  <strong>ATL / CIT</strong>
                </div>
                <p>
                  ATL : Abidjan Terminal
                  <br />
                  CIT : Côte d’Ivoire Terminal
                </p>
                <p>
                  Conteneurs : 20 pieds DRY, 40 pieds DRY, 40 pieds REEFER. Le
                  tarif est saisi librement pour chaque ligne de voyages
                  homogènes.
                </p>
              </div>
              <div className="card finance-card">
                <h2>Données & sauvegarde</h2>
                <p>
                  Cette version fonctionne sans serveur ni compte utilisateur.
                  Ne saisissez pas de données sensibles sur un poste partagé.
                </p>
                <div className="notice-box">
                  <CircleHelp size={20} />
                  <span>
                    Les données sont conservées dans ce navigateur. Effacer les
                    données du navigateur les supprimera. Exportez
                    régulièrement.
                  </span>
                </div>
                <button
                  className="button secondary"
                  onClick={() => {
                    const a = document.createElement("a");
                    const url = URL.createObjectURL(
                      new Blob([JSON.stringify(data, null, 2)], {
                        type: "application/json",
                      }),
                    );
                    a.href = url;
                    a.download = `oasis-sauvegarde-${localDate()}.json`;
                    a.click();
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                  }}
                >
                  <Download size={16} />
                  Sauvegarder en JSON
                </button>
                <label className="button secondary import-button">
                  Restaurer une sauvegarde
                  <input
                    type="file"
                    accept=".json"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const { backupSchema } =
                          await import("@/lib/validation");
                        const parsed = backupSchema.parse(
                          JSON.parse(await file.text()),
                        );
                        if (
                          window.confirm(
                            "Remplacer toutes les données par cette sauvegarde ?",
                          )
                        ) {
                          setData(parsed);
                          setStorageOk(true);
                          setMessage("Sauvegarde restaurée.");
                        }
                      } catch {
                        setMessage(
                          "Sauvegarde invalide. Aucune donnée modifiée.",
                        );
                      }
                      e.target.value = "";
                    }}
                  />
                </label>
                <button
                  className="button danger-button"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Effacer toutes les données et charger à nouveau la démonstration ?",
                      )
                    ) {
                      setData(demoData());
                      setStorageOk(true);
                      setFilters(emptyFilters);
                      setMessage("Démonstration réinitialisée.");
                    }
                  }}
                >
                  <RefreshCw size={16} />
                  Réinitialiser la démonstration
                </button>
              </div>
            </section>
          )}
          <footer className="footer">
            <span>
              <span className="footer-logo">O</span> OASIS TRANSPORT & LOGISTICS
            </span>
            <span>
              Conçu pour avancer. Ensemble.{" "}
              <span className="footer-dot">✦</span>
            </span>
          </footer>
        </main>
      </div>
      {message && (
        <div role="status" className="toast">
          <CheckCircle2 size={20} />
          {message}
          <button aria-label="Fermer le message" onClick={() => setMessage("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {modal && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className="modal"
          >
            <div className="modal-heading">
              <div>
                <span className="eyebrow">OASIS · OPÉRATIONS</span>
                <h2 id="modal-title">
                  {editId
                    ? "Modifier"
                    : modal === "expense"
                      ? "Nouvelle"
                      : "Nouveau"}{" "}
                  {modal === "trip"
                    ? "voyage"
                    : modal === "expense"
                      ? "dépense"
                      : "camion"}
                </h2>
              </div>
              <button
                className="icon-button"
                aria-label="Fermer"
                onClick={() => setModal(null)}
              >
                <X size={21} />
              </button>
            </div>
            <form onSubmit={save} key={`${modal}-${editId}`}>
              {modal === "trip" && (
                <>
                  <div className="notice-box">
                    <Route size={19} />
                    <span>
                      Une ligne regroupe des voyages de même camion, shift,
                      terminal, conteneur, état et prix. Le shift soir est daté
                      du jour de départ.
                    </span>
                  </div>
                  <div className="form-grid">
                    <Field label="Date de départ">
                      <input
                        name="date"
                        type="date"
                        max="9999-12-31"
                        required
                        defaultValue={activeTrip?.date || localDate()}
                      />
                    </Field>
                    <Field label="Camion">
                      <select
                        name="truckId"
                        required
                        defaultValue={activeTrip?.truckId || ""}
                      >
                        <option value="" disabled>
                          Sélectionner un camion
                        </option>
                        {data.trucks.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.plate} · {t.driver}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Shift">
                      <select
                        name="shift"
                        defaultValue={activeTrip?.shift || "Jour"}
                      >
                        <option value="Jour">Jour · 06h00 – 18h30</option>
                        <option value="Nuit">Soir · 19h00 – 06h00 (J+1)</option>
                      </select>
                    </Field>
                    <Field label="Terminal">
                      <select
                        name="terminal"
                        defaultValue={activeTrip?.terminal || "ATL"}
                      >
                        <option value="ATL">ATL · Abidjan Terminal</option>
                        <option value="CIT">
                          CIT · Côte d’Ivoire Terminal
                        </option>
                      </select>
                    </Field>
                    <Field label="Type de conteneur">
                      <select
                        name="container"
                        defaultValue={activeTrip?.container || containers[0]}
                      >
                        {containers.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="État du conteneur">
                      <select
                        name="load"
                        defaultValue={activeTrip?.load || "Plein"}
                      >
                        <option>Plein</option>
                        <option>Vide</option>
                      </select>
                    </Field>
                    <Field label="Nombre de voyages">
                      <input
                        name="quantity"
                        type="number"
                        min="1"
                        max="10000"
                        step="1"
                        required
                        defaultValue={activeTrip?.quantity || 1}
                      />
                    </Field>
                    <Field label="Prix par voyage (FCFA)">
                      <input
                        name="price"
                        type="number"
                        min="1"
                        step="1"
                        required
                        defaultValue={activeTrip?.price || 45000}
                      />
                    </Field>
                    <Field label="Montant déjà encaissé (FCFA)">
                      <input
                        name="paid"
                        type="number"
                        min="0"
                        step="1"
                        required
                        defaultValue={activeTrip?.paid || 0}
                      />
                    </Field>
                  </div>
                  <TripPreview />
                  <p className="form-hint">
                    Le total est calculé automatiquement. Modifiez
                    l’encaissement lorsque le client vous règle.
                  </p>
                  {!data.trucks.length && (
                    <p className="form-error">
                      Ajoutez d’abord un camion dans le module Camions.
                    </p>
                  )}
                </>
              )}
              {modal === "expense" && (
                <div className="form-grid">
                  <Field label="Date de paiement">
                    <input
                      name="date"
                      type="date"
                      max="9999-12-31"
                      required
                      defaultValue={activeExpense?.date || localDate()}
                    />
                  </Field>
                  <Field label="Catégorie">
                    <select
                      name="category"
                      defaultValue={activeExpense?.category || categories[0]}
                    >
                      {categories.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Camion (facultatif)">
                    <select
                      name="truckId"
                      defaultValue={activeExpense?.truckId || ""}
                    >
                      <option value="">Charge générale</option>
                      {data.trucks.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.plate}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Voyage lié (facultatif)">
                    <select
                      name="tripId"
                      defaultValue={activeExpense?.tripId || ""}
                    >
                      <option value="">Non affectée</option>
                      {data.trips.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.date} · {truckName(t.truckId)} · {t.shift} ·{" "}
                          {t.container}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Description">
                    <input
                      name="description"
                      maxLength={200}
                      required
                      defaultValue={activeExpense?.description}
                      placeholder="Ex. Gasoil — station Vridi"
                    />
                  </Field>
                  <Field label="Montant payé (FCFA)">
                    <input
                      name="amount"
                      type="number"
                      min="1"
                      step="1"
                      required
                      defaultValue={activeExpense?.amount}
                    />
                  </Field>
                </div>
              )}
              {modal === "truck" && (
                <div className="form-grid">
                  <Field label="Immatriculation">
                    <input
                      name="plate"
                      required
                      maxLength={30}
                      placeholder="AA 4821 CI"
                      defaultValue={activeTruck?.plate}
                    />
                  </Field>
                  <Field label="Chauffeur">
                    <input
                      name="driver"
                      required
                      maxLength={100}
                      placeholder="Nom du chauffeur"
                      defaultValue={activeTruck?.driver}
                    />
                  </Field>
                  <Field label="Statut">
                    <select
                      name="status"
                      defaultValue={activeTruck?.status || "Disponible"}
                    >
                      <option>Disponible</option>
                      <option>En mission</option>
                      <option>Maintenance</option>
                    </select>
                  </Field>
                </div>
              )}
              {formError && (
                <p role="alert" className="form-error">
                  {formError}
                </p>
              )}
              <div className="modal-footer">
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setModal(null)}
                >
                  Annuler
                </button>
                <button className="button primary" type="submit">
                  <Check size={17} />
                  Enregistrer
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
function Stat({
  title,
  value,
  suffix,
  icon,
  detail,
  tone,
}: {
  title: string;
  value: string;
  suffix?: string;
  icon: React.ReactNode;
  detail: string;
  tone: string;
}) {
  return (
    <article className="stat-card card">
      <div className="stat-top">
        <span>{title}</span>
        <span className={`stat-icon ${tone}`}>{icon}</span>
      </div>
      <div className="stat-value">
        {value} {suffix && <small>{suffix}</small>}
      </div>
      <div className="stat-detail">
        <span className={`stat-trend ${tone}`}>
          <ArrowUpRight size={13} />
        </span>
        {detail}
      </div>
    </article>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children as ReactElement<{ id: string }>, { id })}
    </div>
  );
}
function Empty({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <div className="empty">
      <Package size={32} />
      <strong>{text}</strong>
      <button className="text-button" onClick={onClick}>
        Ajouter une opération <Plus size={15} />
      </button>
    </div>
  );
}
function TripPreview() {
  const [amount, setAmount] = useState<number | null>(null);
  useEffect(() => {
    const form = document.querySelector(".modal form");
    if (!form) return;
    const update = () => {
      const f = new FormData(form as HTMLFormElement);
      setAmount(Number(f.get("quantity")) * Number(f.get("price")));
    };
    update();
    form.addEventListener("input", update);
    return () => form.removeEventListener("input", update);
  }, []);
  return (
    <div className="total-preview">
      <span>Recette calculée</span>
      <strong>
        {money(amount || 0)} <small>FCFA</small>
      </strong>
    </div>
  );
}
