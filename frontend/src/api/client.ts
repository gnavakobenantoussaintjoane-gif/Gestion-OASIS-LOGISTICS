export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: { field: string; message: string }[],
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      credentials: "same-origin",
      headers: {
        ...(options.body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        "X-Gestion-Client": "web",
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(0, "Connexion au serveur impossible. Réessayez.");
  }
  const body = await response
    .json()
    .catch(() => ({ error: "Réponse du serveur invalide." }));
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith("/auth/"))
      window.dispatchEvent(new Event("gestion-session-expired"));
    throw new ApiError(
      response.status,
      body.error || "Opération impossible.",
      body.details,
    );
  }
  return body;
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
  const response = await fetch(
    `/api/reports/${format}?${queryString(filters)}`,
    { credentials: "same-origin" },
  );
  if (!response.ok) {
    const e = await response.json();
    throw new Error(e.error || "Export impossible.");
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gestion-rapport-${new Date().toISOString().slice(0, 10)}.${format}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
