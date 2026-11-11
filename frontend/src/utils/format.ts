export const money = (value: string | number | bigint = 0) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(
    typeof value === "string" ? BigInt(value) : value,
  );
export const dateLabel = (value: string) =>
  new Date(
    value.length === 10 ? `${value}T12:00:00Z` : value,
  ).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Abidjan",
  });
export function shiftAt(value: string) {
  const d = new Date(value.endsWith("Z") ? value : `${value}Z`);
  if (Number.isNaN(d.valueOf())) return null;
  const minutes =
    d.getUTCHours() * 3600 + d.getUTCMinutes() * 60 + d.getUTCSeconds();
  if (minutes >= 21600 && minutes <= 66600)
    return { shift: "day", date: d.toISOString().slice(0, 10) };
  if (minutes >= 68400)
    return { shift: "night", date: d.toISOString().slice(0, 10) };
  if (minutes < 21600) {
    d.setUTCDate(d.getUTCDate() - 1);
    return { shift: "night", date: d.toISOString().slice(0, 10) };
  }
  return null;
}
