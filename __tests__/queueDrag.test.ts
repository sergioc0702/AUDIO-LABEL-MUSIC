import { queueAutoScrollStep } from '../src/utils/queueDrag';

const height = 1000;

test('stays still away from the edges', () => {
  expect(queueAutoScrollStep(500, height, -1)).toBe(0);
  expect(queueAutoScrollStep(500, height, 1)).toBe(0);
});

test('scrolls up only when dragging up near the top', () => {
  expect(queueAutoScrollStep(20, height, -1)).toBeLessThan(0);
  expect(queueAutoScrollStep(20, height, 1)).toBe(0);
  expect(queueAutoScrollStep(20, height, 0)).toBe(0);
});

test('scrolls down only when dragging down near the bottom', () => {
  expect(queueAutoScrollStep(980, height, 1)).toBeGreaterThan(0);
  expect(queueAutoScrollStep(980, height, -1)).toBe(0);
  expect(queueAutoScrollStep(980, height, 0)).toBe(0);
});

test('scrolls faster the closer the finger is to the edge', () => {
  expect(Math.abs(queueAutoScrollStep(5, height, -1))).toBeGreaterThan(
    Math.abs(queueAutoScrollStep(60, height, -1)),
  );
});

test('does nothing before the list has a size', () => {
  expect(queueAutoScrollStep(0, 0, -1)).toBe(0);
});
