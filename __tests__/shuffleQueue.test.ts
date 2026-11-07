import { resolveActiveQueueIndex } from '../src/utils/shuffleQueue';

test('prefers the native active index when it is valid', () => {
  expect(resolveActiveQueueIndex(['a', 'b', 'c'], 2, 'a')).toBe(2);
});

test('preserves the known active track when native index is unavailable', () => {
  expect(resolveActiveQueueIndex(['a', 'b', 'c'], null, 'b')).toBe(1);
  expect(resolveActiveQueueIndex(['a', 'b', 'c'], 20, 'b')).toBe(1);
});

test('returns no active index when neither source identifies a queued track', () => {
  expect(resolveActiveQueueIndex(['a', 'b', 'c'], null, 'missing')).toBe(-1);
});
