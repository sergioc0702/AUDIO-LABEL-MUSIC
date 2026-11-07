import type { Track } from '../types/Track';

export type M3uEntry = {
  path: string;
  title: string | null;
  artist: string | null;
  durationSeconds: number | null;
};

export type PlaylistImportResult = {
  trackIds: string[];
  missing: M3uEntry[];
  duplicates: M3uEntry[];
  malformedLines: number;
};

function normalizeText(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function normalizePath(path: string): string {
  const trimmed = path.trim().replace(/^file:\/\//i, '');
  try {
    return decodeURIComponent(trimmed).replace(/\\/g, '/');
  } catch {
    return trimmed.replace(/\\/g, '/');
  }
}

function splitDisplayName(value: string): { artist: string | null; title: string } {
  const separator = value.indexOf(' - ');
  if (separator <= 0) {
    return { artist: null, title: value.trim() };
  }
  return {
    artist: value.slice(0, separator).trim() || null,
    title: value.slice(separator + 3).trim(),
  };
}

export function parseM3u(contents: string): { entries: M3uEntry[]; malformedLines: number } {
  const entries: M3uEntry[] = [];
  let malformedLines = 0;
  let pending: Omit<M3uEntry, 'path'> | null = null;
  const lines = contents.replace(/^\uFEFF/, '').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.toUpperCase() === '#EXTM3U') {
      continue;
    }
    if (line.toUpperCase().startsWith('#EXTINF:')) {
      const comma = line.indexOf(',');
      if (comma < 0) {
        malformedLines += 1;
        pending = null;
        continue;
      }
      const seconds = Number(line.slice(8, comma));
      const label = line.slice(comma + 1).trim();
      const validDuration = Number.isFinite(seconds) && (seconds === -1 || seconds >= 0);
      if (!validDuration || !label) {
        malformedLines += 1;
      }
      const display = splitDisplayName(label);
      pending = {
        title: display.title || null,
        artist: display.artist,
        durationSeconds: validDuration && seconds >= 0 ? seconds : null,
      };
      continue;
    }
    if (line.startsWith('#')) {
      continue;
    }
    entries.push({
      path: line,
      title: pending?.title ?? null,
      artist: pending?.artist ?? null,
      durationSeconds: pending?.durationSeconds ?? null,
    });
    pending = null;
  }
  if (pending) {
    malformedLines += 1;
  }
  return { entries, malformedLines };
}

export function resolveM3uEntries(entries: M3uEntry[], tracks: Track[]): PlaylistImportResult {
  const byPath = new Map<string, Track>();
  const byMetadata = new Map<string, Track[]>();
  const byTitle = new Map<string, Track[]>();
  for (const track of tracks) {
    for (const location of [track.filePath, track.uri]) {
      if (location) {
        byPath.set(normalizePath(location), track);
      }
    }
    const metadataKey = `${normalizeText(track.artist)}|${normalizeText(track.title)}`;
    const matches = byMetadata.get(metadataKey) ?? [];
    matches.push(track);
    byMetadata.set(metadataKey, matches);
    const titleKey = normalizeText(track.title);
    const titleMatches = byTitle.get(titleKey) ?? [];
    titleMatches.push(track);
    byTitle.set(titleKey, titleMatches);
  }

  const trackIds: string[] = [];
  const seen = new Set<string>();
  const missing: M3uEntry[] = [];
  const duplicates: M3uEntry[] = [];
  for (const entry of entries) {
    const pathMatch = byPath.get(normalizePath(entry.path));
    const metadataKey = entry.title
      ? `${normalizeText(entry.artist)}|${normalizeText(entry.title)}`
      : '';
    const titleOnlyKey = entry.title ? `|${normalizeText(entry.title)}` : '';
    const titleMatches = entry.title ? byTitle.get(normalizeText(entry.title)) ?? [] : [];
    const metadataMatch = entry.artist
      ? byMetadata.get(metadataKey)?.[0]
      : titleOnlyKey && titleMatches.length === 1
      ? titleMatches[0]
      : undefined;
    const match = pathMatch ?? metadataMatch;
    if (!match) {
      missing.push(entry);
    } else if (seen.has(match.id)) {
      duplicates.push(entry);
    } else {
      seen.add(match.id);
      trackIds.push(match.id);
    }
  }
  return { trackIds, missing, duplicates, malformedLines: 0 };
}

export function resolveM3u(contents: string, tracks: Track[]): PlaylistImportResult {
  const parsed = parseM3u(contents);
  const resolved = resolveM3uEntries(parsed.entries, tracks);
  return { ...resolved, malformedLines: parsed.malformedLines };
}

export function buildM3u(tracks: Track[]): string {
  const lines = ['#EXTM3U'];
  for (const track of tracks) {
    const display = [track.artist.trim(), track.title.trim()].filter(Boolean).join(' - ');
    lines.push(`#EXTINF:${Math.max(0, Math.round(track.duration))},${display}`);
    lines.push(track.filePath || track.uri);
  }
  return `${lines.join('\r\n')}\r\n`;
}
