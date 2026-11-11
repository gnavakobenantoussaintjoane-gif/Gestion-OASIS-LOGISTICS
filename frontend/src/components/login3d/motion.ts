/** Slow travel in world units; capped delta prevents jumps after tab suspension. */
export function advanceTruck(distance: number, delta: number) {
  return (distance + Math.max(0, Math.min(delta, 0.05)) * 1.3) % 44;
}
export const WHEEL_RADIUS = 0.3;
