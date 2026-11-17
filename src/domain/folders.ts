import type { Track } from '../types/Track';
import { folderName } from './collections';

export type DeviceFolder = {
  /** Path as Android reports it; empty for the root of the storage. */
  path: string;
  name: string;
  count: number;
};

export function readExcludedFolders(stored: string | null): string[] {
  if (!stored) {
    return [];
  }
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

/** Every folder that holds audio, with how many files, sorted by name. */
export function listDeviceFolders(tracks: Track[]): DeviceFolder[] {
  const counts = new Map<string, number>();
  tracks.forEach(track => {
    const path = track.folder ?? '';
    counts.set(path, (counts.get(path) ?? 0) + 1);
  });
  return Array.from(counts, ([path, count]) => ({
    path,
    name: folderName(path),
    count,
  })).sort(
    (first, second) =>
      first.name.localeCompare(second.name, 'es', { sensitivity: 'base' }) ||
      first.path.localeCompare(second.path),
  );
}

export function withoutExcludedFolders(
  tracks: Track[],
  excluded: readonly string[],
): Track[] {
  if (excluded.length === 0) {
    return tracks;
  }
  const hidden = new Set(excluded);
  return tracks.filter(track => !hidden.has(track.folder ?? ''));
}
