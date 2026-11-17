import TrackPlayer from 'react-native-track-player';
import {
  getStoredPreference,
  storePreference,
} from '../src/native/musicLibrary';
import {
  longAudioSeconds,
  rememberPosition,
  resumeIfLong,
  resumeTarget,
  skipNextResume,
} from '../src/services/playback/resumePositions';
import type { Track } from '../src/types/Track';
import {
  listDeviceFolders,
  readExcludedFolders,
  withoutExcludedFolders,
} from '../src/domain/folders';
import {
  applyTrackEdits,
  buildTrackEdit,
  readTrackEdits,
} from '../src/domain/trackEdits';

jest.mock('react-native-track-player', () => ({
  __esModule: true,
  default: {
    getProgress: jest.fn().mockResolvedValue({ position: 0 }),
    seekTo: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../src/native/musicLibrary', () => ({
  getStoredPreference: jest.fn().mockResolvedValue(null),
  storePreference: jest.fn().mockResolvedValue(undefined),
}));

function track(id: string, overrides: Partial<Track> = {}): Track {
  return {
    id,
    uri: `file:///${id}.mp3`,
    title: `Tema ${id}`,
    artist: 'Artista',
    album: 'Álbum',
    albumId: 'album-1',
    duration: 180,
    dateAdded: 1,
    artwork: null,
    folder: 'Music',
    ...overrides,
  };
}

describe('folders of the library', () => {
  const tracks = [
    track('1'),
    track('2', { folder: 'WhatsApp/Media/WhatsApp Audio' }),
    track('3', { folder: 'WhatsApp/Media/WhatsApp Audio' }),
    track('4', { folder: '' }),
  ];

  test('lists every folder with its number of songs', () => {
    expect(listDeviceFolders(tracks)).toEqual([
      { path: '', name: 'Almacenamiento interno', count: 1 },
      { path: 'Music', name: 'Music', count: 1 },
      {
        path: 'WhatsApp/Media/WhatsApp Audio',
        name: 'WhatsApp Audio',
        count: 2,
      },
    ]);
  });

  test('leaves out the songs of hidden folders', () => {
    const shown = withoutExcludedFolders(tracks, [
      'WhatsApp/Media/WhatsApp Audio',
    ]);
    expect(shown.map(item => item.id)).toEqual(['1', '4']);
    expect(withoutExcludedFolders(tracks, [])).toBe(tracks);
  });

  test('a damaged setting hides nothing', () => {
    expect(readExcludedFolders('{oops')).toEqual([]);
    expect(readExcludedFolders('true')).toEqual([]);
    expect(readExcludedFolders('["Music", 3]')).toEqual(['Music']);
  });
});

describe('corrections to a song', () => {
  const form = {
    title: 'Tema 1',
    artist: 'Artista',
    album: 'Álbum',
    genre: '',
    year: '',
  };

  test('only what changed is kept', () => {
    expect(buildTrackEdit(track('1'), form)).toBeNull();
    expect(
      buildTrackEdit(track('1'), {
        ...form,
        title: '  Otro nombre ',
        year: '1999',
      }),
    ).toEqual({ title: 'Otro nombre', year: 1999 });
    // An empty title or a year that is not one are ignored.
    expect(
      buildTrackEdit(track('1'), { ...form, title: ' ', year: '12' }),
    ).toBeNull();
  });

  test('corrected songs show the new data and keep the rest', () => {
    const tracks = [track('1'), track('2')];
    const edited = applyTrackEdits(tracks, { '2': { artist: 'Otra' } });
    expect(edited[0]).toBe(tracks[0]);
    expect(edited[1]).toMatchObject({
      artist: 'Otra',
      title: 'Tema 2',
      albumId: 'album-1',
    });
    expect(applyTrackEdits(tracks, {})).toBe(tracks);
  });

  test('a song moved to an album joins the album of that name', () => {
    const tracks = [
      track('1', { album: 'Grandes éxitos', albumId: 'album-9' }),
      track('2'),
      track('3'),
    ];
    const edited = applyTrackEdits(tracks, {
      '2': { album: 'grandes exitos' },
      '3': { album: 'Nuevo' },
    });
    expect(edited[1].albumId).toBe('album-9');
    expect(edited[2].albumId).toBe('edit:nuevo');
  });

  test('a damaged setting changes nothing', () => {
    expect(readTrackEdits('[1]')).toEqual({});
    expect(readTrackEdits('nope')).toEqual({});
    expect(readTrackEdits('{"1":{"title":"A"}}')).toEqual({
      '1': { title: 'A' },
    });
  });
});

describe('resuming long audios', () => {
  const long = longAudioSeconds + 600;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(TrackPlayer.getProgress).mockResolvedValue({
      position: 0,
      duration: long,
      buffered: 0,
    });
  });

  test('only long audios, away from both ends, are resumed', () => {
    expect(resumeTarget(300, long)).toBe(300);
    expect(resumeTarget(300, 240)).toBeNull();
    expect(resumeTarget(5, long)).toBeNull();
    expect(resumeTarget(long - 10, long)).toBeNull();
    expect(resumeTarget(undefined, long)).toBeNull();
  });

  test('a long audio continues where it was left', async () => {
    await rememberPosition('pod', 754, long);
    expect(storePreference).toHaveBeenCalledWith(
      'resumePositions',
      expect.stringContaining('"pod"'),
    );

    await resumeIfLong('pod', long);
    expect(TrackPlayer.seekTo).toHaveBeenCalledWith(754);
    expect(getStoredPreference).toHaveBeenCalledTimes(1);
  });

  test('songs are never moved and a finished audio starts over', async () => {
    await rememberPosition('song', 100, 200);
    await resumeIfLong('song', 200);
    expect(TrackPlayer.seekTo).not.toHaveBeenCalled();

    await rememberPosition('pod', 754, long);
    await rememberPosition('pod', long - 5, long);
    await resumeIfLong('pod', long);
    expect(TrackPlayer.seekTo).not.toHaveBeenCalled();
  });

  test('the restored session and a manual seek are respected', async () => {
    await rememberPosition('pod', 754, long);
    skipNextResume('pod');
    await resumeIfLong('pod', long);
    expect(TrackPlayer.seekTo).not.toHaveBeenCalled();

    jest.mocked(TrackPlayer.getProgress).mockResolvedValue({
      position: 900,
      duration: long,
      buffered: 0,
    });
    await resumeIfLong('pod', long);
    expect(TrackPlayer.seekTo).not.toHaveBeenCalled();
  });
});
