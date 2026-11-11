/** Montants entiers uniquement : BigInt évite les pertes de précision des additions Number.
 * Retourner des chaînes, car JSON ne sérialise pas directement les BigInt.
 */
export function financialTotals(
  trips: { price: number | string }[],
  expenses: { amount: number | string }[],
) {
  const revenue = trips.reduce((s, t) => s + BigInt(t.price), 0n);
  const spent = expenses.reduce((s, e) => s + BigInt(e.amount), 0n);
  return {
    revenue: revenue.toString(),
    expenses: spent.toString(),
    profit: (revenue - spent).toString(),
    trips: trips.length,
  };
}
