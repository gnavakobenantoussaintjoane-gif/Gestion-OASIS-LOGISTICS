/** Avance lente en unités de scène ; delta borné pour éviter un saut après suspension.
 * Le modulo recycle le trajet de 44 unités sans accumuler une position infinie.
 */
export function advanceTruck(distance: number, delta: number) {
  return (distance + Math.max(0, Math.min(delta, 0.05)) * 1.3) % 44;
}
export const WHEEL_RADIUS = 0.3;
