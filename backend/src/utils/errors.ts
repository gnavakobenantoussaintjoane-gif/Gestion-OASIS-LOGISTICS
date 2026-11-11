export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function check(error: { code?: string; message: string } | null) {
  if (!error) return;
  if (error.code === "23505")
    throw new HttpError(
      409,
      "Cette opération existe déjà. Vérifiez les doublons.",
    );
  if (error.code === "23503")
    throw new HttpError(
      409,
      "Cet élément est utilisé ou la référence est invalide.",
    );
  if (error.code === "42501") throw new HttpError(403, "Action non autorisée.");
  if (error.code === "23514" || error.code === "P0001")
    throw new HttpError(422, error.message);
  throw new HttpError(
    502,
    "Le service de données est indisponible. Veuillez réessayer.",
  );
}
