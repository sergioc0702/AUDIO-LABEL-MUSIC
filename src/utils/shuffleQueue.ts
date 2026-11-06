import type { Track } from '../types/Track';

export function shuffleTracks(
  tracks: Track[],
  random: () => number = Math.random,
): Track[] {
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

export function shuffleUpcomingTracks(
  queue: Track[],
  activeTrackId: string,
  random: () => number = Math.random,
): Track[] {
  const activeIndex = queue.findIndex(track => track.id === activeTrackId);
  if (activeIndex < 0) {
    return shuffleTracks(queue, random);
  }
  return [
    ...queue.slice(0, activeIndex + 1),
    ...shuffleTracks(queue.slice(activeIndex + 1), random),
  ];
}

export function restoreUpcomingTrackOrder(
  queue: Track[],
  originalQueue: Track[],
  activeTrackId: string,
): Track[] {
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
