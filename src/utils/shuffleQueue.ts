export type QueueItem = { id: string };

export type QueueMove = { from: number; to: number };

/** Use player state as a fallback when the native active index is temporarily unavailable. */
export function resolveActiveQueueIndex(
  queueIds: string[],
  nativeIndex: number | null | undefined,
  fallbackActiveId?: string | null,
): number {
  if (nativeIndex != null && nativeIndex >= 0 && nativeIndex < queueIds.length) {
    return nativeIndex;
  }
  return fallbackActiveId ? queueIds.indexOf(fallbackActiveId) : -1;
}

/** Build deterministic native move operations for the part of the queue after the current item. */
export function buildQueueMoves(
  currentIds: string[],
  targetIds: string[],
  firstMovableIndex: number,
): QueueMove[] {
  if (
    new Set(currentIds).size !== currentIds.length ||
    new Set(targetIds).size !== targetIds.length ||
    currentIds.length !== targetIds.length ||
    currentIds.some(id => !targetIds.includes(id))
  ) {
    throw new Error('La cola cambió mientras se reordenaba.');
  }

  const updatedIds = [...currentIds];
  const moves: QueueMove[] = [];
  const start = Math.max(0, Math.min(firstMovableIndex, updatedIds.length));
  for (let targetIndex = start; targetIndex < targetIds.length; targetIndex += 1) {
    const currentIndex = updatedIds.indexOf(targetIds[targetIndex], targetIndex);
    if (currentIndex < 0) {
      throw new Error('No se pudo encontrar una canción en la cola.');
    }
    if (currentIndex !== targetIndex) {
      moves.push({ from: currentIndex, to: targetIndex });
      const [moved] = updatedIds.splice(currentIndex, 1);
      updatedIds.splice(targetIndex, 0, moved);
    }
  }
  return moves;
}

export function shuffleTracks<T>(
  tracks: T[],
  random: () => number = Math.random,
): T[] {
  const shuffled = [...tracks];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index],
    ];
  }
  return shuffled;
}

export function shuffleUpcomingTracks<T extends QueueItem>(
  queue: T[],
  activeTrackId: string,
  random: () => number = Math.random,
): T[] {
  const activeIndex = queue.findIndex(track => track.id === activeTrackId);
  if (activeIndex < 0) {
    return shuffleTracks(queue, random);
  }
  return [
    ...queue.slice(0, activeIndex + 1),
    ...shuffleTracks(queue.slice(activeIndex + 1), random),
  ];
}

export function restoreUpcomingTrackOrder<T extends QueueItem>(
  queue: T[],
  originalQueue: T[],
  activeTrackId: string,
): T[] {
  const activeIndex = queue.findIndex(track => track.id === activeTrackId);
  if (activeIndex < 0) {
    const queueIds = new Set(queue.map(track => track.id));
    const restored = originalQueue.filter(track => queueIds.has(track.id));
    const restoredIds = new Set(restored.map(track => track.id));
    return [...restored, ...queue.filter(track => !restoredIds.has(track.id))];
  }

  const prefix = queue.slice(0, activeIndex + 1);
  const upcoming = queue.slice(activeIndex + 1);
  const upcomingIds = new Set(upcoming.map(track => track.id));
  const restored = originalQueue.filter(track => upcomingIds.has(track.id));
  const restoredIds = new Set(restored.map(track => track.id));
  return [
    ...prefix,
    ...restored,
    ...upcoming.filter(track => !restoredIds.has(track.id)),
  ];
}
