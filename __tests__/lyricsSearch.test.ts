import {
  cleanTitle,
  findOnlineLyrics,
  isSynced,
  pickBest,
} from '../src/services/lyricsSearch';

const track = {
  title: 'Pa Ti (feat. Bryant Myers)',
  artist: 'Bad Bunny',
  album: 'Pa Ti',
  duration: 192,
};

function respond(status: number, body: unknown) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

test('drops featured artists and edition tags from titles', () => {
  expect(cleanTitle('Pa Ti (feat. Bryant Myers)')).toBe('Pa Ti');
  expect(cleanTitle('Luz [ft. Noa]')).toBe('Luz');
  expect(cleanTitle('Ruta once - Remastered 2020')).toBe('Ruta once');
});

test('uses the exact match when it has synced lyrics', async () => {
  const fetcher = jest.fn(() =>
    respond(200, { duration: 192, syncedLyrics: '[00:01.00] Hola' }),
  );
  const found = await findOnlineLyrics(track, fetcher as never);
  expect(found).toEqual({ kind: 'synced', contents: '[00:01.00] Hola' });
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(String((fetcher.mock.calls[0] as unknown[])[0])).toContain(
    'artist_name=Bad%20Bunny',
  );
});

test('falls back to a search and keeps the recording closest in length', async () => {
  const fetcher = jest.fn((url: string) =>
    url.includes('/get?')
      ? respond(404, null)
      : respond(200, [
          { duration: 230, syncedLyrics: '[00:01.00] Otra versión' },
          { duration: 193, syncedLyrics: '[00:01.00] Esta' },
        ]),
  );
  const found = await findOnlineLyrics(track, fetcher as never);
  expect(found).toEqual({ kind: 'synced', contents: '[00:01.00] Esta' });
});

test('keeps plain lyrics when no synced ones exist', () => {
  expect(
    pickBest([{ duration: 192, plainLyrics: 'Sin tiempos' }], 192),
  ).toEqual({ kind: 'plain', contents: 'Sin tiempos' });
});

test('says so when the song has no lyrics anywhere', async () => {
  const fetcher = jest.fn((url: string) =>
    url.includes('/get?') ? respond(404, null) : respond(200, []),
  );
  expect(await findOnlineLyrics(track, fetcher as never)).toEqual({
    kind: 'none',
  });
});

test('fails loudly without a connection', async () => {
  const fetcher = jest.fn(() => Promise.reject(new Error('offline')));
  await expect(findOnlineLyrics(track, fetcher as never)).rejects.toThrow();
});

test('tells synced from plain lyrics', () => {
  expect(isSynced('[01:02.30] Hola')).toBe(true);
  expect(isSynced('Hola')).toBe(false);
});
