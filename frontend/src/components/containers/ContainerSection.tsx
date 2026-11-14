import { AnimatePresence, motion } from "motion/react";
import { Check, Container, Package } from "lucide-react";
import type { Row } from "../../types";
import {
  type ContainerMode,
  containerModeLabel,
} from "../../utils/containers";

function NumberField({
  index,
  label,
  value,
  error,
  onChange,
}: {
  index: number;
  label: string;
  value: string;
  error?: string;
  onChange: (index: number, value: string) => void;
}) {
  const id = `container-number-${index}`;
  return (
    <div className="field">
      <label htmlFor={id}>{label} <b> *</b></label>
      <input
        id={id}
        className={`container-number ${error ? "invalid" : ""}`}
        value={value}
        onChange={(event) => onChange(index, event.target.value)}
        maxLength={11}
        placeholder="MSCU1234566"
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <small id={`${id}-error`} className="error" role="alert">
          {error}
        </small>
      )}
    </div>
  );
}

export default function ContainerSection({
  mode,
  numbers,
  typeId,
  types,
  fieldErrors,
  error,
  loading = false,
  onModeChange,
  onNumberChange,
  onTypeChange,
}: {
  mode: ContainerMode;
  numbers: string[];
  typeId: string;
  types: Row[];
  fieldErrors: string[];
  error: string | null;
  loading?: boolean;
  onModeChange: (mode: ContainerMode) => void;
  onNumberChange: (index: number, value: string) => void;
  onTypeChange: (id: string) => void;
}) {
  const available = types.filter((type) => type.active || type.id === typeId);
  const twenty = available.find((type) => type.kind === "20_DRY");
  const forty = available.filter((type) => String(type.kind).startsWith("40"));
  const selected = available.find((type) => type.id === typeId);
  const selectedIsRight =
    mode === "2x20"
      ? selected?.kind === "20_DRY"
      : String(selected?.kind || "").startsWith("40");
  const noType = !loading && (mode === "2x20" ? !twenty : !forty.length);
  const wrongType = !loading && !noType && !selectedIsRight;

  return (
    <fieldset className="container-panel">
      <legend>
        <span className="container-panel-icon">
          <Container size={18} />
        </span>
        Informations sur les conteneurs
        <span className="container-count">
          {mode === "2x20" ? "2" : "1"} conteneur{mode === "2x20" ? "s" : ""}
        </span>
      </legend>
      <p className="container-intro">
        Sélectionnez la configuration réelle de la mission. Les numéros sont
        vérifiés au format ISO 6346 puis enregistrés en majuscules.
      </p>

      <div
        className="container-mode-grid"
        role="radiogroup"
        aria-label="Configuration des conteneurs"
      >
        <button
          type="button"
          role="radio"
          aria-checked={mode === "2x20"}
          className={`container-mode-card ${mode === "2x20" ? "selected" : ""}`}
          onClick={() => onModeChange("2x20")}
        >
          <span className="container-mode-icon two">
            <Container size={22} />
            <Container size={22} />
          </span>
          <span>
            <strong>2 conteneurs de 20 pieds</strong>
            <small>Deux numéros obligatoires</small>
          </span>
          {mode === "2x20" && <Check className="container-check" size={17} />}
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={mode === "1x40"}
          className={`container-mode-card ${mode === "1x40" ? "selected" : ""}`}
          onClick={() => onModeChange("1x40")}
        >
          <span className="container-mode-icon">
            <Package size={24} />
          </span>
          <span>
            <strong>1 conteneur de 40 pieds</strong>
            <small>Un seul numéro obligatoire</small>
          </span>
          {mode === "1x40" && <Check className="container-check" size={17} />}
        </button>
      </div>

      <div className="container-type-row">
        {loading ? (
          <span className="container-type-loading">
            <span className="spinner" /> Chargement des types de conteneurs…
          </span>
        ) : mode === "2x20" ? (
          <span className="container-type-badge">
            Type : {twenty?.name || "20 pieds"}
          </span>
        ) : forty.length > 1 ? (
          <label className="container-type-select">
            Type de 40 pieds
            <select
              value={forty.some((type) => type.id === typeId) ? typeId : ""}
              onChange={(event) => onTypeChange(event.target.value)}
            >
              <option value="">Sélectionner…</option>
              {forty.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <span className="container-type-badge">
            Type : {forty[0]?.name || "40 pieds"}
          </span>
        )}
        <span className="container-mode-caption">{containerModeLabel(mode)}</span>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={mode}
          className={`container-fields ${mode === "1x40" ? "single" : ""}`}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.18 }}
        >
          {mode === "2x20" ? (
            <>
              <NumberField
                index={0}
                label="Numéro du conteneur 1"
                value={numbers[0] || ""}
                error={fieldErrors[0]}
                onChange={onNumberChange}
              />
              <NumberField
                index={1}
                label="Numéro du conteneur 2"
                value={numbers[1] || ""}
                error={fieldErrors[1]}
                onChange={onNumberChange}
              />
            </>
          ) : (
            <NumberField
              index={0}
              label="Numéro du conteneur"
              value={numbers[0] || ""}
              error={fieldErrors[0]}
              onChange={onNumberChange}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {noType && (
        <p className="container-error" role="alert">
          {mode === "2x20"
            ? "Aucun type de conteneur 20 pieds actif n’est configuré pour cette entreprise."
            : "Aucun type de conteneur 40 pieds actif n’est configuré pour cette entreprise."}{" "}
          Demandez à un administrateur de compléter les types de conteneurs.
        </p>
      )}
      {wrongType && (
        <p className="container-error" role="alert">
          Sélectionnez un type de conteneur{" "}
          {mode === "2x20" ? "20 pieds" : "40 pieds"} pour cette mission.
        </p>
      )}
      {error && (
        <p className="container-error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
