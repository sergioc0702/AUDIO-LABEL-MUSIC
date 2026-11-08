import type { Track } from '../types/Track';

export type TrackSort = 'titleAsc' | 'titleDesc' | 'dateAdded';

export type TrackFilterOptions = {
  query: string;
  favoritesOnly: boolean;
  favoriteIds: ReadonlySet<string>;
  sort: TrackSort;
  genre?: string | null;
};

const compareText = new Intl.Collator('es', {
  numeric: true,
  sensitivity: 'base',
}).compare;

const spanishGenres: Record<string, string> = {
  ambient: 'Ambiental',
  alternative: 'Alternativo',
  'alternative rock': 'Rock alternativo',
  blues: 'Blues',
  'classic rock': 'Rock clásico',
  classic: 'Clásica',
  classical: 'Clásica',
  country: 'Country',
  dance: 'Dance',
  disco: 'Disco',
  electronic: 'Electrónica',
  'electronica/dance': 'Electrónica',
  folk: 'Folk',
  funk: 'Funk',
  gospel: 'Góspel',
  grunge: 'Grunge',
  hardcore: 'Hardcore',
  'hard rock': 'Hard rock',
  hip_hop: 'Hip hop',
  hiphop: 'Hip hop',
  'hip-hop': 'Hip hop',
  house: 'House',
  indie: 'Indie',
  'indie rock': 'Rock independiente',
  industrial: 'Industrial',
  jazz: 'Jazz',
  'k-pop': 'K-pop',
  latin: 'Latina',
  'lateinamerikanische musik': 'Latina',
  'rap/hip hop': 'Rap y hip hop',
  metal: 'Metal',
  'heavy metal': 'Heavy metal',
  'new age': 'New age',
  opera: 'Ópera',
  pop: 'Pop',
  punk: 'Punk',
  'punk rock': 'Punk rock',
  rap: 'Rap',
  reggae: 'Reggae',
  'rhythm and blues': 'R&B',
  'r&b': 'R&B',
  rock: 'Rock',
  'rock & roll': 'Rock and roll',
  ska: 'Ska',
  soul: 'Soul',
  soundtrack: 'Banda sonora',
  'spoken word': 'Palabra hablada',
  techno: 'Tecno',
  trance: 'Trance',
  'trip-hop': 'Trip hop',
  'vocal pop': 'Pop vocal',
  world: 'Música del mundo',
};

export function normalizeGenre(genre: string | null | undefined): string {
  const trimmed = genre?.trim();
  if (!trimmed) {
    return '';
  }
  const key = trimmed.toLocaleLowerCase().replace(/\s+/g, ' ');
  return spanishGenres[key] ?? trimmed;
}

export function sortTracks(tracks: Track[], sort: TrackSort): Track[] {
  return [...tracks].sort((first, second) => {
    switch (sort) {
      case 'titleAsc':
        return compareText(first.title, second.title);
      case 'titleDesc':
        return compareText(second.title, first.title);
      case 'dateAdded':
        return second.dateAdded - first.dateAdded;
    }
  });
}

export function findAlphabeticalTrackIndex(
  tracks: Track[],
  letter: string,
  sort: TrackSort,
): number {
  const isLetter = (track: Track) => {
    const first = track.title
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .charAt(0)
      .toLocaleUpperCase();
    return /^[A-Z]$/.test(first) ? first : null;
  };

  return tracks.findIndex(track => {
    const first = isLetter(track);
    if (letter === '#') {
      return first === null;
    }
    if (first === null) {
      return false;
    }
    return sort === 'titleDesc' ? first <= letter : first >= letter;
  });
}

export function filterAndSortTracks(
  tracks: Track[],
  options: TrackFilterOptions,
): Track[] {
  const query = options.query.trim().toLocaleLowerCase();
  const filteredTracks = tracks.filter(
    track =>
      (!options.favoritesOnly || options.favoriteIds.has(track.id)) &&
      (!options.genre ||
        normalizeGenre(track.genre) === normalizeGenre(options.genre)) &&
      (!query ||
        `${track.title} ${track.artist} ${track.album} ${track.genre ?? ''} ${
          track.year ?? ''
        }`
          .toLocaleLowerCase()
          .includes(query)),
  );
  return sortTracks(filteredTracks, options.sort);
}
