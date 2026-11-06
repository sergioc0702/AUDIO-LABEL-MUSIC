export function formatTrackCount(count: number): string {
  return `${count} ${count === 1 ? 'canción' : 'canciones'}`;
}
