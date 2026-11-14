export type ContainerMode = "2x20" | "1x40";
export type ContainerSize = 20 | 40;
export type TripContainer = {
  id?: string;
  number: string;
  size: ContainerSize;
  created_at?: string;
  created_by?: string;
};
export type TripContainerInput = Pick<TripContainer, "number" | "size">;
// ISO 6346 : mêmes valeurs que le backend, pour un retour immédiat dans le formulaire.
const LETTER_VALUES: Record<string, number> = {
  A: 10,
  B: 12,
  C: 13,
  D: 14,
  E: 15,
  F: 16,
  G: 17,
  H: 18,
  I: 19,
  J: 20,
  K: 21,
  L: 23,
  M: 24,
  N: 25,
  O: 26,
  P: 27,
  Q: 28,
  R: 29,
  S: 30,
  T: 31,
  U: 32,
  V: 34,
  W: 35,
  X: 36,
  Y: 37,
  Z: 38,
};
export const containerModeLabel = (mode: ContainerMode) =>
  mode === "2x20" ? "2 × 20 pieds" : "1 × 40 pieds";
export function normalizeContainerNumber(value: string) {
  return value.trim().toUpperCase();
}
export function isValidIso6346(value: string) {
  const number = normalizeContainerNumber(value);
  if (!/^[A-Z]{4}\d{7}$/.test(number)) return false;
  let total = 0;
  for (let i = 0; i < 10; i++) {
    const char = number[i];
    const base = /\d/.test(char) ? Number(char) : LETTER_VALUES[char];
    if (base === undefined) return false;
    total += base * 2 ** i;
  }
  return (total % 11) % 10 === Number(number[10]);
}
export function validateTripContainers(
  mode: ContainerMode,
  rawNumbers: string[],
): {
  containers: TripContainerInput[];
  fieldErrors: string[];
  error: string | null;
} {
  const expected = mode === "2x20" ? 2 : 1;
  const numbers = Array.from({ length: expected }, (_, index) =>
    normalizeContainerNumber(rawNumbers[index] || ""),
  );
  const fieldErrors = numbers.map((number, index) => {
    if (!number)
      return expected === 2
        ? `Saisissez le numéro du conteneur ${index + 1}.`
        : "Saisissez le numéro du conteneur.";
    if (!isValidIso6346(number))
      return "Format ISO 6346 invalide (ex. MSCU1234566).";
    return "";
  });
  if (fieldErrors.some(Boolean))
    return {
      containers: [],
      fieldErrors,
      error: "Corrigez les numéros de conteneurs.",
    };
  if (new Set(numbers).size !== numbers.length)
    return {
      containers: [],
      fieldErrors: fieldErrors.map(() => ""),
      error:
        "Un même numéro de conteneur ne peut pas être utilisé deux fois dans cette mission.",
    };
  return {
    containers: numbers.map((number) => ({
      number,
      size: mode === "2x20" ? 20 : 40,
    })),
    fieldErrors: fieldErrors.map(() => ""),
    error: null,
  };
}
