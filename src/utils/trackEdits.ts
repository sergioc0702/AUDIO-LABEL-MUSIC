import type { Track } from '../types/Track';
import { normalizeText } from './collections';

/** Corrections the person typed for a song. The audio file is not changed. */
export type TrackEdit = {
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
  year?: number;
};

export type TrackEdits = Record<string, TrackEdit>;

export type TrackEditForm = {
  title: string;
  artist: string;
  album: string;
  genre: string;
  year: string;
};

export function readTrackEdits(stored: string | null): TrackEdits {
  if (!stored) {
    return {};
  }
  try {
    const parsed = JSON.parse(stored);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as TrackEdits)
      : {};
  } catch {
    return {};
  }
}

/** Keeps only the fields that differ from what the file says. */
export function buildTrackEdit(
  original: Track,
  form: TrackEditForm,
): TrackEdit | null {
  const edit: TrackEdit = {};
  const title = form.title.trim();
  const artist = form.artist.trim();
  const album = form.album.trim();
  const genre = form.genre.trim();
  const year = Number.parseInt(form.year.trim(), 10);
  if (title && title !== original.title) {
    edit.title = title;
  }
  if (artist && artist !== original.artist) {
    edit.artist = artist;
  }
  if (album && album !== original.album) {
    edit.album = album;
  }
  if (genre !== (original.genre ?? '') && genre) {
    edit.genre = genre;
  }
  if (year >= 1000 && year <= 9999 && year !== original.year) {
    edit.year = year;
  }
  return Object.keys(edit).length > 0 ? edit : null;
}

/**
 * Returns the songs with the person's corrections. A song moved to another
 * album joins the album of that name if there is one, so both show together.
 */
export function applyTrackEdits(tracks: Track[], edits: TrackEdits): Track[] {
  if (Object.keys(edits).length === 0) {
    return tracks;
  }
  const albumIds = new Map<string, string>();
  tracks.forEach(track => {
    if (!edits[track.id]?.album) {
      albumIds.set(normalizeText(track.album), track.albumId);
    }
  });
  return tracks.map(track => {
    const edit = edits[track.id];
    if (!edit) {
      return track;
    }
    const album = edit.album ?? track.album;
    return {
      ...track,
      title: edit.title ?? track.title,
      artist: edit.artist ?? track.artist,
      album,
      albumId: edit.album
        ? albumIds.get(normalizeText(album)) ?? `edit:${normalizeText(album)}`
        : track.albumId,
      genre: edit.genre ?? track.genre,
      year: edit.year ?? track.year,
    };
  });
}
