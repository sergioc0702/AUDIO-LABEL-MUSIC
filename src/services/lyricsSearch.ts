import type { Track } from '../types/Track';

/**
 * Free lyrics from LRCLIB (https://lrclib.net): an open database that needs
 * no account or key. Only the song's title, artist, album and length are sent.
 */
const API = 'https://lrclib.net/api';
const USER_AGENT =
  'MiMusica/1.0 (https://github.com/sergioc0702/AUDIO-LABEL-MUSIC)';
const TIMEOUT_MS = 10000;
/** Seconds a found song may differ from ours and still be the same recording. */
const DURATION_TOLERANCE = 4;

type LrclibRecord = {
  trackName?: string;
  artistName?: string;
  duration?: number;
  instrumental?: boolean;
  plainLyrics?: string | null;
  syncedLyrics?: string | null;
};

export type FoundLyrics =
  | { kind: 'synced'; contents: string }
  | { kind: 'plain'; contents: string }
  | { kind: 'instrumental' }
  | { kind: 'none' };

const UNKNOWN = /^(<unknown>|unknown|desconocido|artista desconocido)$/i;

/** "Song (feat. X) [Remix]" → "Song", for a second, looser search. */
export function cleanTitle(title: string): string {
  return title
    .replace(/\s*[([](feat\.?|ft\.?|with|con)\b[^)\]]*[)\]]/gi, '')
    .replace(/\s+(feat\.?|ft\.?)\s+.*$/i, '')
    .replace(/\s*-\s*(remaster(ed)?|live|en vivo|version|versión)\b.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function asFound(record: LrclibRecord): FoundLyrics {
  if (record.syncedLyrics?.trim()) {
    return { kind: 'synced', contents: record.syncedLyrics.trim() };
  }
  if (record.instrumental) return { kind: 'instrumental' };
  if (record.plainLyrics?.trim()) {
    return { kind: 'plain', contents: record.plainLyrics.trim() };
  }
  return { kind: 'none' };
}

const rank = (found: FoundLyrics) =>
  found.kind === 'synced'
    ? 3
    : found.kind === 'plain'
    ? 2
    : found.kind === 'instrumental'
    ? 1
    : 0;

/** The search result that best matches our song: synced first, then closest length. */
export function pickBest(
  records: LrclibRecord[],
  durationSeconds: number,
): FoundLyrics {
  let best: { found: FoundLyrics; gap: number } | null = null;
  for (const record of records) {
    const found = asFound(record);
    if (found.kind === 'none') continue;
    const gap =
      durationSeconds > 0 && record.duration
        ? Math.abs(record.duration - durationSeconds)
        : 0;
    if (durationSeconds > 0 && record.duration && gap > DURATION_TOLERANCE)
      continue;
    if (
      !best ||
      rank(found) > rank(best.found) ||
      (rank(found) === rank(best.found) && gap < best.gap)
    ) {
      best = { found, gap };
    }
  }
  return best?.found ?? { kind: 'none' };
}

type Fetch = typeof fetch;

async function getJson(fetcher: Fetch, url: string): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetcher(url, {
      headers: { 'User-Agent': USER_AGENT, 'Lrclib-Client': USER_AGENT },
      signal: controller.signal,
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`LRCLIB respondió ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

const query = (params: Record<string, string | number | undefined>) =>
  Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join('&');

/**
 * Looks the song up online. Throws only when there is no connection or the
 * service fails; a song that simply has no lyrics returns `{ kind: 'none' }`.
 */
export async function findOnlineLyrics(
  track: Pick<Track, 'title' | 'artist' | 'album' | 'duration'>,
  fetcher: Fetch = fetch,
): Promise<FoundLyrics> {
  const artist = UNKNOWN.test(track.artist.trim()) ? '' : track.artist.trim();
  const album = UNKNOWN.test(track.album.trim()) ? '' : track.album.trim();
  const duration = Math.round(track.duration);
  const title = track.title.trim();
  if (!title) return { kind: 'none' };

  let fallback: FoundLyrics = { kind: 'none' };
  if (artist) {
    const exact = await getJson(
      fetcher,
      `${API}/get?${query({
        track_name: title,
        artist_name: artist,
        album_name: album,
        duration: duration || undefined,
      })}`,
    );
    if (exact && typeof exact === 'object') {
      const found = asFound(exact as LrclibRecord);
      if (found.kind === 'synced' || found.kind === 'instrumental')
        return found;
      fallback = found;
    }
  }

  const titles = Array.from(new Set([title, cleanTitle(title)])).filter(
    Boolean,
  );
  for (const name of titles) {
    const results = await getJson(
      fetcher,
      `${API}/search?${
        artist
          ? query({ track_name: name, artist_name: artist })
          : query({ q: name })
      }`,
    );
    if (Array.isArray(results)) {
      const found = pickBest(results as LrclibRecord[], track.duration);
      if (found.kind === 'synced') return found;
      if (rank(found) > rank(fallback)) fallback = found;
    }
  }
  return fallback;
}

/** Plain lyrics are stored without timestamps; this marks them as such. */
export function isSynced(contents: string): boolean {
  return /\[\d{1,3}:\d{2}(?:\.\d{1,3})?\]/.test(contents);
}
