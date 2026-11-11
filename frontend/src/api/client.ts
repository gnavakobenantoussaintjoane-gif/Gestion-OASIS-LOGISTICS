export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: { field: string; message: string }[],
  ) {
    super(message);
  }
}
function expired(status: number, path: string) {
  if (status === 401 && !path.startsWith("/auth/"))
    window.dispatchEvent(new Event("gestion-session-expired"));
}
async function readJson(response: Response) {
  try {
    const body: unknown = await response.json();
    if (!body || typeof body !== "object")
      throw new Error("Invalid JSON shape");
    return body as Record<string, any>;
  } catch {
    throw new ApiError(
      response.ok ? 502 : response.status,
      "Réponse du serveur invalide. Vérifiez la configuration de l’API.",
    );
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("X-Gestion-Client", "web");
  if (!(options.body instanceof FormData) && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      credentials: "same-origin",
      headers,
    });
  } catch {
    throw new ApiError(0, "Connexion au serveur impossible. Réessayez.");
  }
  expired(response.status, path);
  const body = await readJson(response);
  if (!response.ok)
    throw new ApiError(
      response.status,
      body.error || "Opération impossible.",
      body.details,
    );
  return body as T;
}
export const queryString = (filters: Record<string, string>) => {
  const p = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v) p.set(k, v);
  });
  return p.toString();
};
export async function downloadReport(
  format: "xlsx" | "pdf",
  filters: Record<string, string>,
) {
  let response: Response;
  try {
    response = await fetch(`/api/reports/${format}?${queryString(filters)}`, {
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError(0, "Connexion au serveur impossible. Réessayez.");
  }
  expired(response.status, "/reports");
  if (!response.ok) {
    const e = await readJson(response);
    throw new ApiError(response.status, e.error || "Export impossible.");
  }
  const mime =
    format === "pdf"
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (!response.headers.get("Content-Type")?.includes(mime))
    throw new ApiError(502, "Le serveur n’a pas renvoyé un rapport valide.");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gestion-rapport-${new Date().toISOString().slice(0, 10)}.${format}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
