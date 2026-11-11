export const periodKeys = [
  "today",
  "yesterday",
  "week",
  "month",
  "quarter",
  "year",
] as const;
export function periodRange(key: string, now = new Date()) {
  const start = new Date(now);
  const end = new Date(now);
  if (!key) return { start: "", end: "" };
  if (key === "yesterday") {
    start.setUTCDate(start.getUTCDate() - 1);
    end.setUTCDate(end.getUTCDate() - 1);
  }
  if (key === "week")
    start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  if (key === "month") start.setUTCDate(1);
  if (key === "quarter")
    start.setUTCMonth(Math.floor(start.getUTCMonth() / 3) * 3, 1);
  if (key === "year") start.setUTCMonth(0, 1);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}
export function selectedPeriod(start = "", end = "", now = new Date()) {
  if (!start && !end) return "";
  return (
    periodKeys.find((key) => {
      const range = periodRange(key, now);
      return range.start === start && range.end === end;
    }) || "custom"
  );
}
