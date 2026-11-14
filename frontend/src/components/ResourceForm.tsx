import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resourceFormSchema } from "../schemas/resourceForm";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Route } from "lucide-react";
import { api, ApiError } from "../api/client";
import {
  useReferences,
  rowLabel,
  referenceLabel,
} from "../hooks/useReferences";
import { configs } from "../services/resources";
import { shiftAt, money } from "../utils/format";
import { useSession } from "../contexts/SessionContext";
import type { Row, ListResult } from "../types";
import ContainerSection from "./containers/ContainerSection";
import {
  type ContainerMode,
  type TripContainer,
  type TripContainerInput,
  validateTripContainers,
} from "../utils/containers";
export default function ResourceForm({
  resource,
  row,
  onClose,
  quick = false,
}: {
  resource: string;
  row?: Row;
  onClose: () => void;
  quick?: boolean;
}) {
  const config = configs[resource];
  const refs = useReferences();
  const { session } = useSession();
  const client = useQueryClient();
  const [saving, setSaving] = useState(false);
  const initialContainers = useMemo(
    () =>
      [...((row?.trip_containers || []) as TripContainer[])].sort(
        (a, b) =>
          String(a.created_at || "").localeCompare(String(b.created_at || "")) ||
          String(a.number).localeCompare(String(b.number)),
      ),
    [row?.trip_containers],
  );
  const initialMode: ContainerMode = initialContainers.some(
    (c) => Number(c.size) === 40,
  )
    ? "1x40"
    : "2x20";
  const [containerMode, setContainerMode] =
    useState<ContainerMode>(initialMode);
  const [containerNumbers, setContainerNumbers] = useState<string[]>(() =>
    initialMode === "2x20"
      ? [initialContainers[0]?.number || "", initialContainers[1]?.number || ""]
      : [initialContainers[0]?.number || ""],
  );
  const [containerFieldErrors, setContainerFieldErrors] = useState<string[]>(
    [],
  );
  const [containerError, setContainerError] = useState<string | null>(null);
  const modeInitialized = useRef(false);
  const recent = useQuery({
    queryKey: ["recent-trips"],
    queryFn: () => api<ListResult>("/trips?limit=100"),
    enabled: resource === "expenses",
  });
  const members = useQuery({
    queryKey: ["members"],
    queryFn: () => api<Row[]>("/members"),
    enabled:
      resource === "drivers" &&
      ["admin", "manager"].includes(session?.role || ""),
  });
  // Les références secondaires ne doivent pas échouer silencieusement.
  const auxiliaryError =
    resource === "expenses"
      ? recent.error
      : resource === "drivers"
        ? members.error
        : null;
  const defaults = useMemo(
    () =>
      Object.fromEntries(
        config.fields
          .map((f) => [
            f.name,
            row?.[f.name] ??
              (f.type === "checkbox"
                ? f.name === "active"
                : f.type === "datetime-local"
                  ? new Date().toISOString().slice(0, 19)
                  : f.type === "date"
                    ? new Date().toISOString().slice(0, 10)
                    : f.options?.[0]?.[0] || ""),
          ])
          .map(([k, v]) => [
            k,
            k === "occurred_at" && row ? String(v).slice(0, 19) : v,
          ]),
      ),
    [row, config],
  );
  const schema = useMemo(() => resourceFormSchema(config.fields), [config]);
  const form = useForm<Record<string, any>>({
    defaultValues: defaults,
    resolver: zodResolver(schema) as any,
  });
  const watched = form.watch();
  const containerTypes = refs.data?.container_types || [];
  const twentyType = containerTypes.find(
    (type) => type.active && type.kind === "20_DRY",
  );
  const fortyTypes = containerTypes.filter(
    (type) => type.active && String(type.kind).startsWith("40"),
  );
  const shift =
    resource === "trips" ? shiftAt(watched.occurred_at || "") : null;
  const tariffs = (refs.data?.tariff_rules || []).filter(
    (t) =>
      t.active &&
      t.terminal_id === watched.terminal_id &&
      t.container_type_id === watched.container_type_id &&
      t.load === watched.load &&
      t.shift === shift?.shift,
  );
  const selectedTariff = tariffs.find((t) => t.id === watched.tariff_rule_id);
  useEffect(() => {
    if (resource !== "trips") return;
    if (!modeInitialized.current) {
      if (initialContainers.length) {
        const target = initialContainers.some((c) => Number(c.size) === 40)
          ? "1x40"
          : "2x20";
        if (target !== containerMode) {
          setContainerMode(target);
          return;
        }
        modeInitialized.current = true;
      } else if (row?.container_type_id) {
        const current = containerTypes.find(
          (type) => type.id === row.container_type_id,
        );
        if (current) {
          const target = current.kind === "20_DRY" ? "2x20" : "1x40";
          if (target !== containerMode) {
            setContainerMode(target);
            return;
          }
          modeInitialized.current = true;
        }
      } else if (!refs.isPending) {
        modeInitialized.current = true;
      }
    }
    const current = containerTypes.find(
      (type) => type.id === watched.container_type_id,
    );
    if (containerMode === "2x20" && current?.kind !== "20_DRY") {
      if (twentyType)
        form.setValue("container_type_id", twentyType.id, {
          shouldValidate: true,
        });
    } else if (
      containerMode === "1x40" &&
      !String(current?.kind || "").startsWith("40")
    ) {
      const target =
        fortyTypes.find((type) => type.id === watched.container_type_id) ||
        fortyTypes[0];
      if (target)
        form.setValue("container_type_id", target.id, { shouldValidate: true });
    }
  }, [
    resource,
    containerMode,
    containerTypes,
    twentyType,
    fortyTypes,
    watched.container_type_id,
    form,
    initialContainers,
    row?.container_type_id,
    refs.isPending,
  ]);
  function changeContainerMode(next: ContainerMode) {
    modeInitialized.current = true;
    setContainerMode(next);
    setContainerError(null);
    setContainerFieldErrors([]);
    const target =
      next === "2x20"
        ? twentyType
        : fortyTypes.find((type) => type.id === watched.container_type_id) ||
          fortyTypes[0];
    if (target)
      form.setValue("container_type_id", target.id, { shouldValidate: true });
    setContainerNumbers((prev) =>
      next === "1x40" ? [prev[0] || ""] : [prev[0] || "", prev[1] || ""],
    );
  }
  function changeContainerNumber(index: number, value: string) {
    setContainerNumbers((prev) =>
      prev.map((number, i) => (i === index ? value.toUpperCase() : number)),
    );
    setContainerFieldErrors([]);
    setContainerError(null);
  }
  const submit = form.handleSubmit(async (values) => {
    if (resource === "trips" && !shift) {
      toast.error("L’heure choisie est hors shift.");
      return;
    }
    let containers: TripContainerInput[] | undefined;
    if (resource === "trips") {
      const selectedType = containerTypes.find(
        (type) => type.id === values.container_type_id,
      );
      if (!selectedType) {
        setContainerError("Sélectionnez un type de conteneur actif.");
        return;
      }
      if (containerMode === "2x20" && selectedType.kind !== "20_DRY") {
        setContainerError(
          "La configuration 2 × 20 pieds exige un type de conteneur 20 pieds.",
        );
        return;
      }
      if (
        containerMode === "1x40" &&
        !String(selectedType.kind).startsWith("40")
      ) {
        setContainerError(
          "La configuration 1 × 40 pieds exige un type de conteneur 40 pieds.",
        );
        return;
      }
      const check = validateTripContainers(containerMode, containerNumbers);
      setContainerFieldErrors(check.fieldErrors);
      if (check.error) {
        setContainerError(check.error);
        return;
      }
      setContainerError(null);
      containers = check.containers;
    }
    if (
      !window.confirm(
        resource === "trips"
          ? `Enregistrer ce voyage au tarif de ${money(selectedTariff?.price || row?.price || 0)} FCFA avec ${containerMode === "2x20" ? "2 conteneurs 20 pieds" : "1 conteneur 40 pieds"} ?`
          : "Confirmer l’enregistrement ?",
      )
    )
      return;
    setSaving(true);
    try {
      const payload: Record<string, any> = { ...values };
      config.fields.forEach((f) => {
        if (f.ref && !payload[f.name]) payload[f.name] = null;
        if (f.type === "datetime-local")
          payload[f.name] = new Date(`${payload[f.name]}Z`).toISOString();
      });
      if (resource === "trips") payload.containers = containers;
      await api(`/${resource}${row ? "/" + row.id : ""}`, {
        method: row ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      await Promise.all([
        client.invalidateQueries({ queryKey: ["records"] }),
        client.invalidateQueries({ queryKey: ["references"] }),
        client.invalidateQueries({ queryKey: ["dashboard"] }),
        client.invalidateQueries({ queryKey: ["recent-trips"] }),
        client.invalidateQueries({ queryKey: ["notifications"] }),
      ]);
      toast.success("Opération enregistrée dans votre entreprise.");
      if (quick && !row) {
        form.reset({
          ...values,
          observations: "",
          occurred_at: new Date().toISOString().slice(0, 19),
        });
        if (resource === "trips") {
          setContainerNumbers(containerMode === "2x20" ? ["", ""] : [""]);
          setContainerFieldErrors([]);
          setContainerError(null);
        }
      } else onClose();
    } catch (e) {
      if (e instanceof ApiError) {
        let containerMessage: string | null = null;
        e.details?.forEach((d) => {
          if (d.field === "containers" || d.field?.startsWith("containers."))
            containerMessage = d.message;
          else form.setError(d.field, { message: d.message });
        });
        if (containerMessage) setContainerError(containerMessage);
      }
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  });
  return (
    <form onSubmit={submit}>
      {resource === "trips" && (
        <div className="info-box">
          <Route size={18} />
          <span>
            Un voyage = une recette. Le shift et la date comptable sont calculés
            automatiquement à partir de l’heure de départ.
          </span>
        </div>
      )}
      {refs.error && (
        <div className="empty" role="alert">
          <p>
            Les références indispensables n’ont pas pu être chargées. Aucun
            enregistrement ne sera possible avant leur rétablissement.
          </p>
          <button
            type="button"
            className="button secondary"
            onClick={() => void refs.refetch()}
          >
            Réessayer
          </button>
        </div>
      )}
      {auxiliaryError && (
        <div className="empty" role="alert">
          <p>
            {resource === "drivers"
              ? "La liste des comptes disponibles n’a pas pu être chargée."
              : "La liste des voyages récents n’a pas pu être chargée."}
          </p>
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              if (resource === "expenses") void recent.refetch();
              else void members.refetch();
            }}
          >
            Réessayer
          </button>
        </div>
      )}
      <div className="form-grid">
        {config.fields.map((field) => {
          if (resource === "trips" && field.name === "container_type_id")
            return null;
          const id = `field-${field.name}`;
          const table = field.ref;
          let options =
            table === "tariff_rules"
              ? tariffs
              : table === "members"
                ? members.data
                : table === "recent_trips"
                  ? recent.data?.rows
                  : table
                    ? refs.data?.[table]
                    : [];
          if (table === "trucks")
            options = options?.filter(
              (t) => !t.archived || t.id === row?.truck_id,
            );
          return (
            <Fragment key={field.name}>
              {resource === "trips" && field.name === "load" && (
                <div className="container-field">
                  <ContainerSection
                    mode={containerMode}
                    numbers={containerNumbers}
                    typeId={String(watched.container_type_id || "")}
                    types={containerTypes}
                    fieldErrors={containerFieldErrors}
                    error={containerError}
                    loading={refs.isPending}
                    onModeChange={changeContainerMode}
                    onNumberChange={changeContainerNumber}
                    onTypeChange={(id) => {
                      form.setValue("container_type_id", id, {
                        shouldValidate: true,
                      });
                      setContainerError(null);
                    }}
                  />
                </div>
              )}
              <div
                className={`field ${field.type === "textarea" ? "full" : ""}`}
              >
              <label htmlFor={id}>
                {field.label}
                {field.required && <b> *</b>}
              </label>
              {field.type === "select" ? (
                <select id={id} {...form.register(field.name)}>
                  <option value="">
                    {field.required ? "Sélectionner…" : "Non affecté"}
                  </option>
                  {field.options?.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                  {options?.map((r) => (
                    <option key={r.id} value={r.id}>
                      {table === "tariff_rules"
                        ? `${money(r.price)} FCFA · ${referenceLabel(refs.data, "terminals", r.terminal_id)} · ${r.shift === "day" ? "Jour" : "Soir"}`
                        : rowLabel(r)}
                    </option>
                  ))}
                  {field.name === "tariff_rule_id" &&
                    row &&
                    !tariffs.some((t) => t.id === row.tariff_rule_id) && (
                      <option value={row.tariff_rule_id}>
                        Tarif historique · {money(row.price)} FCFA
                      </option>
                    )}
                </select>
              ) : field.type === "textarea" ? (
                <textarea
                  id={id}
                  maxLength={500}
                  rows={3}
                  {...form.register(field.name)}
                />
              ) : field.type === "checkbox" ? (
                <input id={id} type="checkbox" {...form.register(field.name)} />
              ) : (
                <input
                  id={id}
                  type={field.type || "text"}
                  min={field.min}
                  max={field.max}
                  step={
                    field.type === "number" || field.type === "datetime-local"
                      ? 1
                      : undefined
                  }
                  maxLength={
                    field.type === "text" || !field.type ? 100 : undefined
                  }
                  {...form.register(field.name)}
                />
              )}{" "}
              {form.formState.errors[field.name] && (
                <small className="error">
                  {String(form.formState.errors[field.name]?.message)}
                </small>
              )}
              </div>
            </Fragment>
          );
        })}
      </div>
      {resource === "trips" && (
        <div className="tariff-preview">
          <div>
            <small>
              {shift
                ? `${shift.shift === "day" ? "Jour" : "Soir"} · Date comptable ${shift.date}`
                : "Horaire hors shift"}
            </small>
            <strong>
              {selectedTariff
                ? `${money(selectedTariff.price)} FCFA`
                : row
                  ? `${money(row.price)} FCFA (historique)`
                  : "Tarif à configurer"}
            </strong>
          </div>
          {!tariffs.length && !row && (
            <small>
              Aucun tarif correspondant. Demandez à votre administrateur de
              configurer la grille tarifaire.
            </small>
          )}
        </div>
      )}
      <footer className="modal-footer">
        <button className="button secondary" type="button" onClick={onClose}>
          Annuler
        </button>
        <button
          className="button primary"
          disabled={saving || refs.isPending || !!refs.error}
        >
          <Check size={16} />
          {saving
            ? "Enregistrement…"
            : quick
              ? "Enregistrer et continuer"
              : "Enregistrer"}
        </button>
      </footer>
    </form>
  );
}
