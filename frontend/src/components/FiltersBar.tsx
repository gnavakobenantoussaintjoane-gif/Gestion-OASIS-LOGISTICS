import { useState } from "react";
import { Search, SlidersHorizontal, RotateCcw } from "lucide-react";
import { useReferences, rowLabel } from "../hooks/useReferences";
import { periodRange, selectedPeriod } from "../utils/periods";
import type { Filters } from "../types";
export default function FiltersBar({
  value,
  onChange,
}: {
  value: Filters;
  onChange: (f: Filters) => void;
}) {
  const [more, setMore] = useState(false);
  const refs = useReferences();
  const set = (k: string, v: string) =>
    onChange({ ...value, [k]: v, page: "1" });
  function period(v: string) {
    onChange({ ...value, ...periodRange(v), page: "1" });
  }
  const referenceSelect = (key: string, table: string, title: string) => (
    <select
      aria-label={title}
      value={value[key] || ""}
      onChange={(e) => set(key, e.target.value)}
    >
      <option value="">{title}</option>
      {refs.data?.[table]?.map((r) => (
        <option key={r.id} value={r.id}>
          {rowLabel(r)}
        </option>
      ))}
    </select>
  );
  return (
    <div className="filters-card">
      <div className="filters-main">
        <label className="search">
          <Search size={16} />
          <input
            placeholder="Rechercher…"
            aria-label="Rechercher"
            value={value.q || ""}
            onChange={(e) => set("q", e.target.value)}
          />
        </label>
        <select
          aria-label="Période prédéfinie"
          value={selectedPeriod(value.start, value.end)}
          onChange={(e) => period(e.target.value)}
        >
          <option value="">Toutes les périodes</option>
          <option value="custom" disabled>
            Période personnalisée
          </option>
          <option value="today">Aujourd’hui</option>
          <option value="yesterday">Hier</option>
          <option value="week">Cette semaine</option>
          <option value="month">Ce mois</option>
          <option value="quarter">Ce trimestre</option>
          <option value="year">Cette année</option>
        </select>
        <input
          aria-label="Date de début"
          type="date"
          value={value.start || ""}
          onChange={(e) => set("start", e.target.value)}
        />
        <span className="filter-arrow">→</span>
        <input
          aria-label="Date de fin"
          type="date"
          min={value.start}
          value={value.end || ""}
          onChange={(e) => set("end", e.target.value)}
        />
        <button
          className={`button subtle ${more ? "selected" : ""}`}
          onClick={() => setMore((v) => !v)}
        >
          <SlidersHorizontal size={15} />
          Filtres
        </button>
        <button
          className="icon-button"
          aria-label="Réinitialiser les filtres"
          onClick={() => onChange({ page: "1", limit: "20" })}
        >
          <RotateCcw size={16} />
        </button>
      </div>
      {more && (
        <div className="filters-expanded">
          {referenceSelect("truck_id", "trucks", "Tous les camions")}
          {referenceSelect("driver_id", "drivers", "Tous les chauffeurs")}
          <select
            aria-label="Shift"
            value={value.shift || ""}
            onChange={(e) => set("shift", e.target.value)}
          >
            <option value="">Tous les shifts</option>
            <option value="day">Jour · 06h–18h30</option>
            <option value="night">Soir · 19h–06h J+1</option>
          </select>
          {referenceSelect("terminal_id", "terminals", "Tous les terminaux")}
          {referenceSelect(
            "container_type_id",
            "container_types",
            "Tous les conteneurs",
          )}
          <select
            aria-label="État"
            value={value.load || ""}
            onChange={(e) => set("load", e.target.value)}
          >
            <option value="">Plein et vide</option>
            <option>Plein</option>
            <option>Vide</option>
          </select>
          {referenceSelect(
            "category_id",
            "expense_categories",
            "Toutes les catégories",
          )}
          <input
            aria-label="Montant minimum"
            type="number"
            placeholder="Minimum FCFA"
            min="0"
            value={value.min || ""}
            onChange={(e) => set("min", e.target.value)}
          />
          <input
            aria-label="Montant maximum"
            type="number"
            placeholder="Maximum FCFA"
            min="0"
            value={value.max || ""}
            onChange={(e) => set("max", e.target.value)}
          />
          <small>
            Les filtres sans correspondance avec ce registre ne s’appliquent
            pas. Les filtres terminal/conteneur/état des rapports excluent les
            dépenses non liées aux voyages sélectionnés.
          </small>
        </div>
      )}
    </div>
  );
}
