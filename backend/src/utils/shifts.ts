/** Abidjan est à UTC+0 : calcul UTC pour éviter le fuseau local de l’hébergement.
 * Jour : 06:00–18:30 inclus ; nuit dès 19:00 et avant 06:00.
 * La portion après 18:30 et avant 19:00 est volontairement refusée.
 */
export function resolveShift(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.valueOf())) throw new Error("Date invalide");
  const day = d.toISOString().slice(0, 10);
  const seconds =
    d.getUTCHours() * 3600 + d.getUTCMinutes() * 60 + d.getUTCSeconds();
  if (seconds >= 21600 && seconds <= 66600)
    return { shift: "day" as const, accounting_date: day };
  if (seconds >= 68400)
    return { shift: "night" as const, accounting_date: day };
  if (seconds < 21600) {
    // Après minuit, la nuit appartient à la date comptable de la veille.
    d.setUTCDate(d.getUTCDate() - 1);
    return {
      shift: "night" as const,
      accounting_date: d.toISOString().slice(0, 10),
    };
  }
  throw new Error("Hors shift : 18h30–19h00");
}
