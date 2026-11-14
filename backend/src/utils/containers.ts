// ISO 6346 : 4 lettres (propriétaire + catégorie), 6 chiffres de série et
// une clé de contrôle. Les valeurs de lettres excluent les multiples de 11.
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
export type ContainerSize = 20 | 40;
export type TripContainerInput = { number: string; size: ContainerSize };
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
export function validateContainerSet(containers: TripContainerInput[]) {
  if (containers.length === 2) {
    if (!containers.every((c) => c.size === 20))
      return "Une mission 2 × 20 pieds doit contenir exactement deux conteneurs de 20 pieds.";
  } else if (containers.length === 1) {
    if (containers[0].size !== 40)
      return "Une mission 1 × 40 pieds doit contenir exactement un conteneur de 40 pieds.";
  } else {
    return "Une mission doit contenir deux conteneurs de 20 pieds ou un conteneur de 40 pieds.";
  }
  const numbers = containers.map((c) => normalizeContainerNumber(c.number));
  if (new Set(numbers).size !== numbers.length)
    return "Un même numéro de conteneur ne peut pas être utilisé deux fois dans cette mission.";
  if (numbers.some((n) => !isValidIso6346(n)))
    return "Un des numéros ne respecte pas le format ISO 6346.";
  return null;
}
