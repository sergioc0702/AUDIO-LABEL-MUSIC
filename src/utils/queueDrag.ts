const edgeSize = 72;
const maxStep = 12;

/**
 * How far the queue scrolls on this frame while a row is dragged. It only
 * scrolls the way the finger is heading: up near the top, down near the bottom.
 */
export function queueAutoScrollStep(
  pointerY: number,
  viewportHeight: number,
  direction: -1 | 0 | 1,
) {
  if (viewportHeight <= 0 || direction === 0) {
    return 0;
  }
  const distanceToEdge = direction < 0 ? pointerY : viewportHeight - pointerY;
  if (distanceToEdge >= edgeSize) {
    return 0;
  }
  const depth = Math.min(1, (edgeSize - distanceToEdge) / edgeSize);
  return direction * Math.max(2, Math.round(depth * maxStep));
}
