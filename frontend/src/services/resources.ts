export type Field = {
  name: string;
  label: string;
  type?:
    | "text"
    | "number"
    | "date"
    | "datetime-local"
    | "textarea"
    | "select"
    | "checkbox";
  required?: boolean;
  ref?: string;
  options?: [string, string][];
  min?: number;
  max?: number;
};
export type ResourceConfig = {
  title: string;
  singular: string;
  description: string;
  fields: Field[];
  columns: string[];
  writers: string[];
};
const ref = (
  name: string,
  label: string,
  table: string,
  required = false,
): Field => ({ name, label, ref: table, type: "select", required });
const status = (options: string[]): Field => ({
  name: "status",
  label: "Statut",
  type: "select",
  options: options.map((v) => [v, v]),
  required: true,
});
const load: Field = {
  name: "load",
  label: "État du conteneur",
  type: "select",
  options: [
    ["Plein", "Plein"],
    ["Vide", "Vide"],
  ],
  required: true,
};
const shift: Field = {
  name: "shift",
  label: "Shift",
  type: "select",
  options: [
    ["day", "Jour · 06h–18h30"],
    ["night", "Soir · 19h–06h J+1"],
  ],
  required: true,
};
export const configs: Record<string, ResourceConfig> = {
  trucks: {
    title: "Camions",
    singular: "camion",
    description: "Une flotte bien suivie, une activité qui avance.",
    writers: ["admin", "manager"],
    columns: ["plate", "brand", "model", "driver_id", "status", "archived"],
    fields: [
      { name: "plate", label: "Immatriculation", required: true },
      { name: "brand", label: "Marque", required: true },
      { name: "model", label: "Modèle", required: true },
      {
        name: "year",
        label: "Année",
        type: "number",
        required: true,
        min: 1950,
        max: 2200,
      },
      { name: "chassis", label: "Numéro de châssis" },
      ref("driver_id", "Chauffeur associé", "drivers"),
      status(["Disponible", "En voyage", "En maintenance", "Hors service"]),
      { name: "description", label: "Description", type: "textarea" },
      { name: "archived", label: "Camion archivé", type: "checkbox" },
    ],
  },
  drivers: {
    title: "Chauffeurs",
    singular: "chauffeur",
    description: "Les personnes qui font avancer votre entreprise.",
    writers: ["admin", "manager"],
    columns: [
      "first_name",
      "last_name",
      "phone",
      "license_number",
      "license_expiry",
      "status",
    ],
    fields: [
      { name: "first_name", label: "Prénom", required: true },
      { name: "last_name", label: "Nom", required: true },
      { name: "phone", label: "Téléphone", required: true },
      { name: "address", label: "Adresse" },
      { name: "license_number", label: "Numéro de permis", required: true },
      {
        name: "license_expiry",
        label: "Validité du permis",
        type: "date",
        required: true,
      },
      status(["Actif", "Inactif"]),
      ref("user_id", "Compte chauffeur (pour ses missions)", "members"),
    ],
  },
  trips: {
    title: "Voyages",
    singular: "voyage",
    description: "Chaque mouvement, chaque conteneur, chaque recette.",
    writers: ["admin", "manager", "operator"],
    columns: [
      "reference",
      "accounting_date",
      "occurred_at",
      "truck_id",
      "driver_id",
      "shift",
      "terminal_id",
      "container_type_id",
      "load",
      "price",
    ],
    fields: [
      ref("truck_id", "Camion", "trucks", true),
      ref("driver_id", "Chauffeur", "drivers", true),
      {
        name: "occurred_at",
        label: "Date et heure de départ · Abidjan",
        type: "datetime-local",
        required: true,
      },
      ref("terminal_id", "Terminal portuaire", "terminals", true),
      ref("container_type_id", "Conteneur", "container_types", true),
      load,
      ref("tariff_rule_id", "Tarif appliqué", "tariff_rules", true),
      { name: "observations", label: "Observations", type: "textarea" },
    ],
  },
  expenses: {
    title: "Dépenses",
    singular: "dépense",
    description: "Gardez le contrôle sur vos coûts d’exploitation.",
    writers: ["admin", "manager"],
    columns: [
      "reference",
      "date",
      "description",
      "category_id",
      "truck_id",
      "shift",
      "amount",
      "receipt_path",
    ],
    fields: [
      { name: "date", label: "Date de paiement", type: "date", required: true },
      {
        name: "amount",
        label: "Montant payé · FCFA",
        type: "number",
        required: true,
        min: 1,
        max: 1e12,
      },
      ref("category_id", "Catégorie", "expense_categories", true),
      {
        name: "description",
        label: "Description",
        required: true,
        type: "textarea",
      },
      ref("truck_id", "Camion (facultatif)", "trucks"),
      ref("driver_id", "Chauffeur (facultatif)", "drivers"),
      ref("trip_id", "Voyage lié (facultatif)", "recent_trips"),
      { ...shift, required: false },
    ],
  },
  tariff_rules: {
    title: "Grille tarifaire",
    singular: "tarif",
    description:
      "Vos prix, vos règles. Les voyages conservent leur tarif historique.",
    writers: ["admin"],
    columns: [
      "terminal_id",
      "container_type_id",
      "load",
      "shift",
      "price",
      "active",
    ],
    fields: [
      ref("terminal_id", "Terminal", "terminals", true),
      ref("container_type_id", "Conteneur", "container_types", true),
      load,
      shift,
      {
        name: "price",
        label: "Prix du voyage · FCFA",
        type: "number",
        required: true,
        min: 1,
        max: 1e12,
      },
      { name: "active", label: "Tarif actif", type: "checkbox" },
    ],
  },
  terminals: {
    title: "Terminaux",
    singular: "terminal",
    description: "Gérez vos points d’opération portuaires.",
    writers: ["admin"],
    columns: ["code", "name", "active"],
    fields: [
      { name: "code", label: "Code", required: true },
      { name: "name", label: "Nom du terminal", required: true },
      { name: "active", label: "Actif", type: "checkbox" },
    ],
  },
  container_types: {
    title: "Conteneurs",
    singular: "conteneur",
    description: "Types de conteneurs disponibles pour vos opérations.",
    writers: ["admin"],
    columns: ["name", "kind", "active"],
    fields: [
      { name: "name", label: "Libellé", required: true },
      {
        name: "kind",
        label: "Type",
        type: "select",
        options: [
          ["20_DRY", "20 pieds DRY"],
          ["40_DRY", "40 pieds DRY"],
          ["40_REEFER", "40 pieds REEFER"],
        ],
        required: true,
      },
      { name: "active", label: "Actif", type: "checkbox" },
    ],
  },
  expense_categories: {
    title: "Catégories de dépenses",
    singular: "catégorie",
    description: "Structurez vos charges pour des rapports lisibles.",
    writers: ["admin"],
    columns: ["name", "active"],
    fields: [
      { name: "name", label: "Nom", required: true },
      { name: "active", label: "Active", type: "checkbox" },
    ],
  },
};
export const columnLabels: Record<string, string> = {
  reference: "Référence",
  plate: "Immatriculation",
  brand: "Marque",
  model: "Modèle",
  year: "Année",
  driver_id: "Chauffeur",
  truck_id: "Camion",
  status: "Statut",
  archived: "Archivé",
  first_name: "Prénom",
  last_name: "Nom",
  phone: "Téléphone",
  license_number: "Permis",
  license_expiry: "Validité",
  accounting_date: "Date comptable",
  occurred_at: "Départ",
  shift: "Shift",
  terminal_id: "Terminal",
  container_type_id: "Conteneur",
  load: "État",
  price: "Recette · FCFA",
  date: "Date",
  description: "Description",
  category_id: "Catégorie",
  amount: "Montant · FCFA",
  receipt_path: "Justificatif",
  active: "Actif",
  code: "Code",
  name: "Nom",
  kind: "Type",
};
