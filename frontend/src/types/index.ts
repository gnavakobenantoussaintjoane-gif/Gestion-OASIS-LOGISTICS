export type Row = Record<string, any> & { id: string };
export type Role = "admin" | "manager" | "operator" | "driver";
export type Session = {
  isSuperAdmin?: boolean;
  user: { id: string; email: string };
  profile: Row | null;
  role: Role | null;
  company: Row | null;
};
export type ReferenceData = Record<string, Row[]>;
export type Filters = Record<string, string>;
export type ListResult = {
  rows: Row[];
  total: number;
  page: number;
  limit: number;
};
export const roleNames: Record<Role, string> = {
  admin: "Administrateur",
  manager: "Gestionnaire",
  operator: "Opérateur",
  driver: "Chauffeur",
};
